// The `ps` source: what the sampler falls back to where native reading is not there (a system with neither macOS's calls nor /proc).
// One `ps` call lists the processes; the working folders come from one `lsof` call, at most every 10 s, because `lsof` costs about
// 25 times what `ps` does (d-30). It has no start time, so a reused pid is told by its CPU time going backwards.
package main

import (
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

type psSource struct {
	folders   map[int]string
	foldersAt time.Time
}

func newPS() *psSource { return &psSource{folders: map[int]string{}} }

func (s *psSource) name() string { return "ps" }

// cpuTime reads ps's TIME column: [[dd-]hh:]mm:ss[.ff] in nanoseconds.
func cpuTime(text string) uint64 {
	days := 0.0
	if d, rest, ok := strings.Cut(text, "-"); ok {
		n, _ := strconv.ParseFloat(d, 64)
		days, text = n, rest
	}
	secs := 0.0
	for _, part := range strings.Split(text, ":") {
		n, _ := strconv.ParseFloat(part, 64)
		secs = secs*60 + n
	}
	return uint64((days*86400 + secs) * 1e9)
}

// parsePS reads `ps -axo pid=,ppid=,rss=,time=,command=`: the command is the rest of the line, its first word names the process.
func parsePS(text string) []procInfo {
	var out []procInfo
	for _, line := range strings.Split(text, "\n") {
		f := strings.Fields(line)
		if len(f) < 5 {
			continue
		}
		pid, e1 := strconv.Atoi(f[0])
		ppid, e2 := strconv.Atoi(f[1])
		rss, e3 := strconv.ParseUint(f[2], 10, 64)
		if e1 != nil || e2 != nil || e3 != nil {
			continue
		}
		out = append(out, procInfo{Pid: pid, Ppid: ppid, RSS: rss * 1024, CPUNs: cpuTime(f[3]), Comm: filepath.Base(f[4]), Args: strings.Join(f[4:], " ")})
	}
	return out
}

// parseLsof reads `lsof -Fpn`: a `p<pid>` line, then that process's `n<path>` line.
func parseLsof(text string) map[int]string {
	out := map[int]string{}
	pid := 0
	for _, line := range strings.Split(text, "\n") {
		switch {
		case strings.HasPrefix(line, "p"):
			pid, _ = strconv.Atoi(line[1:])
		case strings.HasPrefix(line, "n") && pid > 0:
			out[pid] = line[1:]
		}
	}
	return out
}

func (s *psSource) list() ([]procInfo, error) {
	raw, err := exec.Command("ps", "-axo", "pid=,ppid=,rss=,time=,command=").Output()
	if err != nil {
		return nil, err
	}
	if time.Since(s.foldersAt) > 10*time.Second {
		// a failed or partial lsof (it exits 1 when it could not read some process) still gives the folders it read
		text, _ := exec.Command("lsof", "-a", "-d", "cwd", "-Fpn").Output()
		s.folders, s.foldersAt = parseLsof(string(text)), time.Now()
	}
	return parsePS(string(raw)), nil
}

func (s *psSource) cwd(p procInfo) string { return s.folders[p.Pid] }

func (s *psSource) args(p procInfo) string { return p.Args[:min(len(p.Args), maxArgs)] }
