package main

import (
	"bytes"
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"
)

// planted is a source that reads a table the test plants.
type planted struct {
	procs []procInfo
	cwds  map[int]string
	argv  map[int]string
}

func (f *planted) name() string              { return "fake" }
func (f *planted) list() ([]procInfo, error) { return f.procs, nil }
func (f *planted) cwd(p procInfo) string     { return f.cwds[p.Pid] }
func (f *planted) args(p procInfo) string    { return f.argv[p.Pid] }
func (f *planted) setCPU(pid int, ns uint64) {
	for i := range f.procs {
		if f.procs[i].Pid == pid {
			f.procs[i].CPUNs = ns
		}
	}
}

func table() *planted {
	return &planted{
		procs: []procInfo{
			{Pid: 1, Ppid: 0, Comm: "launchd"},
			{Pid: 100, Ppid: 1, Comm: "2.1.322", Start: 5}, // a session: named by its version
			{Pid: 101, Ppid: 100, Comm: "bash", Start: 6},  // its shell, which moved to /tmp
			{Pid: 102, Ppid: 101, Comm: "node", Start: 7},  // a test run under it
			{Pid: 200, Ppid: 1, Comm: "node", Start: 8},    // an orphan in a worktree
			{Pid: 300, Ppid: 1, Comm: "node", Start: 9},    // somebody else's, in another project
			{Pid: 400, Ppid: 1, Comm: "claude", Start: 10}, // another project's session
			{Pid: 401, Ppid: 400, Comm: "node", Start: 11}, // its child
		},
		cwds: map[int]string{100: "/p", 101: "/tmp", 102: "/p/pkg", 200: "/p/.claude/worktrees/a1", 300: "/elsewhere", 400: "/elsewhere", 401: "/elsewhere"},
		argv: map[int]string{100: "claude -p secret prompt", 102: "node --test a.test.mjs", 200: "node spin.js"},
	}
}

func pidsOf(s *snapshot) string {
	var ids []string
	for _, p := range s.Procs {
		ids = append(ids, string(rune('0'+p.Pid/100)))
	}
	return strings.Join(ids, "")
}

func TestTakeKeepsTheProjectsProcessesAndASessionsDescendants(t *testing.T) {
	f := table()
	s := newSampler(f, "/p")
	snap, err := s.take(time.Unix(1000, 0))
	if err != nil {
		t.Fatal(err)
	}
	got := map[int]sampleProc{}
	for _, p := range snap.Procs {
		got[p.Pid] = p
	}
	for _, want := range []int{100, 101, 102, 200} {
		if _, ok := got[want]; !ok {
			t.Errorf("pid %d missing from %v", want, pidsOf(snap))
		}
	}
	for _, not := range []int{1, 300, 400, 401} {
		if _, ok := got[not]; ok {
			t.Errorf("pid %d is not the project's", not)
		}
	}
	if !got[100].Claude || got[100].Args != "" {
		t.Errorf("the session is marked and carries no arguments (its prompt): %+v", got[100])
	}
	if got[102].Args != "node --test a.test.mjs" || got[200].Args != "node spin.js" {
		t.Errorf("node processes carry their arguments: %+v %+v", got[102], got[200])
	}
	if !got[200].Orphan || got[102].Orphan || !got[100].Orphan {
		t.Errorf("orphan: parent gone or init (200, 100 here), not a child with a live parent: %v %v %v", got[200].Orphan, got[102].Orphan, got[100].Orphan)
	}
	if snap.Dt != 0 || got[200].Cpu != 0 {
		t.Errorf("a first snapshot has no interval and reads 0 CPU: dt %d cpu %v", snap.Dt, got[200].Cpu)
	}
}

func TestCPUIsCoresOverTheInterval(t *testing.T) {
	f := table()
	s := newSampler(f, "/p")
	s.take(time.Unix(1000, 0))
	f.setCPU(200, 2_000_000_000) // 2 s of CPU in 2 s: one core
	f.setCPU(102, 1_000_000_000) // half a core
	snap, _ := s.take(time.Unix(1002, 0))
	cpu := map[int]float64{}
	for _, p := range snap.Procs {
		cpu[p.Pid] = p.Cpu
	}
	if cpu[200] != 1 || cpu[102] != 0.5 || snap.Dt != 2000 {
		t.Errorf("cpu %v dt %d", cpu, snap.Dt)
	}
	// a reused pid (another start time) with less CPU time reads 0, never a negative or a huge number
	f.procs[4].Start = 99
	f.setCPU(200, 10)
	snap, _ = s.take(time.Unix(1004, 0))
	for _, p := range snap.Procs {
		if p.Pid == 200 && p.Cpu != 0 {
			t.Errorf("a reused pid reads %v", p.Cpu)
		}
	}
}

func TestAProcessThatMovedIntoTheProjectIsPickedUp(t *testing.T) {
	f := table()
	s := newSampler(f, "/p")
	s.take(time.Unix(1000, 0))
	delete(f.cwds, 300)
	f.procs = f.procs[:len(f.procs)-3] // 400 and 401 and 300 are gone: no stale entry stays
	snap, _ := s.take(time.Unix(1002, 0))
	if len(s.cwds) != len(f.procs) {
		t.Errorf("folders kept for %d processes of %d", len(s.cwds), len(f.procs))
	}
	if len(snap.Procs) != 4 {
		t.Errorf("%v", pidsOf(snap))
	}
}

func TestProcTreeParsed(t *testing.T) {
	root := t.TempDir()
	plant := func(pid, stat, cwd, cmdline string) {
		dir := filepath.Join(root, pid)
		os.MkdirAll(dir, 0o755)
		os.WriteFile(filepath.Join(dir, "stat"), []byte(stat), 0o644)
		os.WriteFile(filepath.Join(dir, "cmdline"), []byte(cmdline), 0o644)
		if cwd != "" {
			os.Symlink(cwd, filepath.Join(dir, "cwd"))
		}
	}
	// the name holds a space and a parenthesis: fields are counted from the last `)`. utime 150 + stime 50 ticks at 100 Hz = 2 s;
	// starttime 4242; rss 25 pages of 4096
	plant("42", "42 (my (odd) name) S 7 42 42 0 -1 4194560 100 0 0 0 150 50 0 0 20 0 1 0 4242 1000000 25 18446744073709551615", "/work/p", "node\x00--test\x00a.mjs\x00")
	plant("43", "43 (zombie) Z 7 43 43 0 -1 0 0 0 0 0 0 0 0 0 20 0 1 0 5000 0 0 0", "", "")
	plant("self", "not a pid", "", "")
	os.MkdirAll(filepath.Join(root, "sys"), 0o755)
	f := &procfs{root: root, hz: 100, pageSize: 4096}
	got, err := f.list()
	if err != nil || len(got) != 1 {
		t.Fatalf("%v %v", got, err)
	}
	p := got[0]
	if p.Pid != 42 || p.Ppid != 7 || p.Comm != "my (odd) name" || p.CPUNs != 2_000_000_000 || p.Start != 4242 || p.RSS != 25*4096 {
		t.Errorf("%+v", p)
	}
	if f.cwd(p) != "/work/p" || f.args(p) != "node --test a.mjs" {
		t.Errorf("cwd %q args %q", f.cwd(p), f.args(p))
	}
}

func TestPSAndLsofParsed(t *testing.T) {
	text := "    1     0  1234   0:03.45 /sbin/launchd\n 5012  4990 20480 1-02:03:04 /opt/homebrew/bin/node --test spin.mjs\nbad line\n"
	got := parsePS(text)
	if len(got) != 2 {
		t.Fatalf("%+v", got)
	}
	if got[1].Pid != 5012 || got[1].Ppid != 4990 || got[1].RSS != 20480*1024 || got[1].Comm != "node" || got[1].Args != "/opt/homebrew/bin/node --test spin.mjs" {
		t.Errorf("%+v", got[1])
	}
	if got[0].CPUNs != 3_450_000_000 || got[1].CPUNs != uint64((86400+2*3600+3*60+4)*1e9) {
		t.Errorf("cpu %d %d", got[0].CPUNs, got[1].CPUNs)
	}
	folders := parseLsof("p100\nfcwd\nn/work/a\np200\nfcwd\nn/work b\n")
	if folders[100] != "/work/a" || folders[200] != "/work b" {
		t.Errorf("%v", folders)
	}
}

// The sampler ends when the pid it was started for is gone, and when its pipe is closed.
func TestSampleEndsWithItsDaemon(t *testing.T) {
	gone := exec.Command("true")
	gone.Run()
	var out bytes.Buffer
	start := time.Now()
	if code := runSample([]string{"--source", "ps", "--interval", "50ms", "--exit-with", strconv.Itoa(gone.Process.Pid)}, &out); code != 0 {
		t.Fatalf("exit %d", code)
	}
	if time.Since(start) > 3*time.Second || strings.Count(out.String(), "\n") != 1 {
		t.Errorf("took %v, wrote %q", time.Since(start), out.String()[:min(80, out.Len())])
	}
	var snap snapshot
	if json.Unmarshal(bytes.Split(out.Bytes(), []byte("\n"))[0], &snap) != nil || snap.Source != "ps" {
		t.Errorf("not a snapshot line: %q", out.String()[:min(80, out.Len())])
	}
}
