// `hook-proxy sample`: the resident Go sampler (typescript order W8.7, d-30). The daemon starts it with its pid and reads its stdout:
// one JSON line per snapshot, every two seconds, until the daemon's pid is gone or its pipe closes (KWB-195's --exit-with). Each line
// lists the processes that belong to the project: any whose working folder is inside it, and every descendant of a `claude` process
// that is. A process's CPU is the cores it used since the previous snapshot (CPU time over wall time), so a first sight reads 0.
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// maxArgs: the longest argument text a snapshot carries of a process (enough to tell `node --test` from a server).
const maxArgs = 300

// procInfo is what a source reads of one process, without its folder or its arguments (those are asked for only when needed).
type procInfo struct {
	Pid, Ppid int
	// Start is a number that changes when a pid is reused (the start time, in the source's own unit).
	Start int64
	CPUNs uint64
	RSS   uint64
	Comm  string
	// Args is set only by a source that has them for free (`ps`).
	Args string
}

// source reads processes: native system calls (sample_darwin.go, sample_proc.go) or `ps` (sample_ps.go).
type source interface {
	name() string
	list() ([]procInfo, error)
	cwd(p procInfo) string
	args(p procInfo) string
}

// sampleProc is one process of a snapshot on the wire. Cpu is cores (1.0 is one core held), Rss is bytes.
type sampleProc struct {
	Pid    int     `json:"pid"`
	Ppid   int     `json:"ppid"`
	Cpu    float64 `json:"cpu"`
	Rss    uint64  `json:"rss"`
	Comm   string  `json:"comm"`
	Cwd    string  `json:"cwd"`
	Args   string  `json:"args,omitempty"`
	Orphan bool    `json:"orphan,omitempty"`
	Claude bool    `json:"claude,omitempty"`
}

// snapshot is one line of the sampler's output.
type snapshot struct {
	At     int64        `json:"at"`
	Dt     int64        `json:"dt"`
	Self   int          `json:"self"`
	Source string       `json:"source"`
	Procs  []sampleProc `json:"procs"`
}

type ident struct {
	pid   int
	start int64
}

type cpuMark struct {
	start int64
	ns    uint64
}

// sampler keeps what one snapshot needs of the last: CPU marks, and each process's folder and arguments (asked for once per process).
type sampler struct {
	src     source
	project string
	prev    map[int]cpuMark
	prevAt  time.Time
	cwds    map[ident]string
	argv    map[ident]string
}

func newSampler(src source, project string) *sampler {
	return &sampler{src: src, project: project, prev: map[int]cpuMark{}, cwds: map[ident]string{}, argv: map[ident]string{}}
}

// isClaude: a Claude Code process. Its name is `claude` where the binary is called that, but the native install's binary is named by
// its version (`2.1.322`), and the npm one is a node process, so its first argument and its install path say it too.
func isClaude(comm, args string) bool {
	first, _, _ := strings.Cut(args, " ")
	return strings.HasPrefix(comm, "claude") || filepath.Base(first) == "claude" || strings.Contains(args, "/claude/versions/") || strings.Contains(args, "claude-code/cli")
}

func (s *sampler) inside(cwd string) bool {
	return s.project == "" || cwd == s.project || strings.HasPrefix(cwd, s.project+"/")
}

// memo asks `ask` once for a process and keeps the answer until the process is gone.
func memo(kept map[ident]string, p procInfo, ask func(procInfo) string) string {
	id := ident{p.Pid, p.Start}
	if v, ok := kept[id]; ok {
		return v
	}
	v := ask(p)
	kept[id] = v
	return v
}

func forget(kept map[ident]string, live map[ident]bool) {
	for id := range kept {
		if !live[id] {
			delete(kept, id)
		}
	}
}

// take reads every process once and returns the snapshot of the project's.
func (s *sampler) take(now time.Time) (*snapshot, error) {
	all, err := s.src.list()
	if err != nil {
		return nil, err
	}
	first := s.prevAt.IsZero()
	dt := time.Duration(0)
	if !first {
		dt = now.Sub(s.prevAt)
	}
	known := make(map[int]bool, len(all))
	kids := map[int][]int{}
	for _, p := range all {
		known[p.Pid] = true
		kids[p.Ppid] = append(kids[p.Ppid], p.Pid)
	}
	keep := map[int]bool{}
	var work []int
	for _, p := range all {
		if s.inside(memo(s.cwds, p, s.src.cwd)) {
			keep[p.Pid] = true
			if isClaude(p.Comm, memo(s.argv, p, s.src.args)) {
				work = append(work, p.Pid)
			}
		}
	}
	// every descendant of a session of the project belongs to it, whatever folder its command moved to
	for len(work) > 0 {
		pid := work[len(work)-1]
		work = work[:len(work)-1]
		for _, k := range kids[pid] {
			if !keep[k] {
				keep[k] = true
				work = append(work, k)
			}
		}
	}
	out := &snapshot{At: now.UnixMilli(), Dt: dt.Milliseconds(), Self: os.Getpid(), Source: s.src.name(), Procs: []sampleProc{}}
	for _, p := range all {
		if !keep[p.Pid] {
			continue
		}
		sp := sampleProc{Pid: p.Pid, Ppid: p.Ppid, Rss: p.RSS, Comm: p.Comm, Cwd: memo(s.cwds, p, s.src.cwd), Orphan: p.Ppid <= 1 || !known[p.Ppid]}
		if m, ok := s.prev[p.Pid]; ok && !first && m.start == p.Start && p.CPUNs >= m.ns && dt > 0 {
			sp.Cpu = round3(float64(p.CPUNs-m.ns) / float64(dt.Nanoseconds()))
		}
		// a session's own arguments hold its prompt: they never leave the sampler, only the fact that it is one
		args := memo(s.argv, p, s.src.args)
		if sp.Claude = isClaude(p.Comm, args); !sp.Claude && (p.Comm == "node" || p.Comm == "bun") {
			sp.Args = args
		}
		out.Procs = append(out.Procs, sp)
	}
	s.prev = make(map[int]cpuMark, len(all))
	live := make(map[ident]bool, len(all))
	for _, p := range all {
		s.prev[p.Pid] = cpuMark{p.Start, p.CPUNs}
		live[ident{p.Pid, p.Start}] = true
	}
	forget(s.cwds, live)
	forget(s.argv, live)
	s.prevAt = now
	return out, nil
}

func round3(f float64) float64 { return float64(int64(f*1000+0.5)) / 1000 }

// chooseSource: native system calls where there are some, else `ps` (and `lsof` for the folders). `which` is auto, native or ps.
func chooseSource(which string) (source, error) {
	if which != "ps" {
		n, err := newNative()
		if err == nil {
			_, err = n.list()
		}
		if err == nil {
			return n, nil
		}
		if which == "native" {
			return nil, fmt.Errorf("native process reading is not available on this system: %w", err)
		}
		// the sampler's stderr goes to the daemon's log: the reason `ps` is used is kept there
		fmt.Fprintf(os.Stderr, "hook-proxy sample: native reading refused (%v), using ps\n", err)
	}
	return newPS(), nil
}

// runSample is the `sample` command: args are the flags after the word.
func runSample(args []string, out io.Writer) int {
	fs := flag.NewFlagSet("sample", flag.ContinueOnError)
	fs.SetOutput(os.Stderr)
	project := fs.String("project", "", "the project's folder: only its processes are listed")
	interval := fs.Duration("interval", 2*time.Second, "time between snapshots")
	exitWith := fs.Int("exit-with", 0, "end when this pid is gone")
	which := fs.String("source", "auto", "auto, native or ps")
	bench := fs.Int("bench", 0, "take this many snapshots back to back and say what each cost")
	if fs.Parse(args) != nil {
		return 2
	}
	root := *project
	if r, err := filepath.EvalSymlinks(root); err == nil && root != "" {
		root = r
	}
	src, err := chooseSource(*which)
	if err != nil {
		fmt.Fprintln(os.Stderr, "hook-proxy sample:", err)
		return 1
	}
	s := newSampler(src, root)
	if *bench > 0 {
		return s.runBench(*bench, out)
	}
	enc := json.NewEncoder(out)
	tick := time.NewTicker(*interval)
	defer tick.Stop()
	for {
		snap, err := s.take(time.Now())
		if err != nil {
			fmt.Fprintln(os.Stderr, "hook-proxy sample:", err)
			return 1
		}
		if enc.Encode(snap) != nil {
			return 0 // the daemon's pipe is closed: the daemon is gone
		}
		<-tick.C
		if *exitWith > 0 && !pidAlive(*exitWith) {
			return 0
		}
	}
}
