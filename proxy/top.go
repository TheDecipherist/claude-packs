// `hook-proxy top` (typescript order W8.9 item 4; the command is `claude-packs top`): the terminal monitor. Full screen, plain ANSI, no
// library. Every second it reads the governor's file, each project's daemon over its socket (top_daemon.go) and, where no daemon
// answers, the project's files and the sampler (top_state.go); it draws one frame (top_render.go) and reads keys:
// q quits, up and down move, enter opens a project or an agent (its last 20 actions), enter, q or escape goes back.
// `top --once` prints one frame and exits: what the golden tests read.
//
//	top [--once] [--now T] [--width N] [--load "a b c"] [--usage FILE] [--governor DIR] [--no-daemon] [--open KEY] [PROJECT...]
package main

import (
	"flag"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"time"
)

const (
	topTick      = time.Second
	defaultWidth = 120
	keyEscape    = 0x1b
	keyCtrlC     = 0x03
	keyEnter     = '\r'
	keyDown      = 'B'
	keyUp        = 'A'
	altScreenOn  = "\x1b[?1049h\x1b[?25l"
	altScreenOff = "\x1b[?25h\x1b[?1049l"
	clearAndHome = "\x1b[H\x1b[2J"
	reverseOn    = "\x1b[7m"
	reverseOff   = "\x1b[0m"
	dimOn        = "\x1b[2m"
	governorFile = "jobs.json"
	loadFallback = "-"
)

type topOptions struct {
	once, noDaemon bool
	now            time.Time
	width          int
	load, usage    string
	governor, open string
	projects       []string
}

func parseTop(args []string) (*topOptions, error) {
	o := &topOptions{}
	fs := flag.NewFlagSet("top", flag.ContinueOnError)
	fs.SetOutput(io.Discard)
	now := fs.String("now", "", "the clock, RFC 3339 (a test's)")
	fs.BoolVar(&o.once, "once", false, "print one frame and exit")
	fs.BoolVar(&o.noDaemon, "no-daemon", false, "read the files, never the daemon")
	fs.IntVar(&o.width, "width", 0, "the frame's width")
	fs.StringVar(&o.load, "load", "", "the load average to show (a test's)")
	fs.StringVar(&o.usage, "usage", "", "a file of each project, owner to usage, instead of the sampler (a test's)")
	fs.StringVar(&o.governor, "governor", "", "the governor's folder")
	fs.StringVar(&o.open, "open", "", "the page to show: project or project/agent")
	if err := fs.Parse(args); err != nil {
		return nil, err
	}
	o.projects = fs.Args()
	if *now != "" {
		t, err := time.Parse(time.RFC3339, *now)
		if err != nil {
			return nil, err
		}
		o.now = t
	}
	return o, nil
}

// runTop is the `top` command: args are the flags and projects after the word.
func runTop(args []string, out io.Writer) int {
	o, err := parseTop(args)
	if err != nil {
		fmt.Fprintln(os.Stderr, "hook-proxy top:", err)
		return 2
	}
	t := newTopper(o)
	if o.once {
		fmt.Fprint(out, t.screen(o.now.IsZero()).render())
		return 0
	}
	return t.live(out)
}

// topper keeps what lives between frames: the samplers, and the cursor.
type topper struct {
	o        *topOptions
	proc     *proc
	samplers map[string]*sampler
	src      source
	cursor   int
	open     string
}

func newTopper(o *topOptions) *topper {
	cwd, _ := os.Getwd()
	t := &topper{o: o, samplers: map[string]*sampler{}, open: o.open}
	t.proc = &proc{env: os.Environ(), cwd: cwd, ppid: os.Getppid(), uid: os.Getuid(), goos: runtime.GOOS}
	return t
}

func governorDir(o *topOptions, get func(string) string) string {
	for _, d := range []string{o.governor, get("CLAUDE_PACKS_GOVERNOR_DIR")} {
		if d != "" {
			return d
		}
	}
	base := get("XDG_CACHE_HOME")
	if base == "" {
		home, _ := os.UserHomeDir()
		base = filepath.Join(home, ".cache")
	}
	return filepath.Join(base, "claude-packs", "governor")
}

// projectsOf: the ones named, else the current project and every project the governor holds a job for.
func (t *topper) projectsOf(gov govState) []string {
	if len(t.o.projects) > 0 {
		return t.o.projects
	}
	seen := map[string]bool{}
	var out []string
	add := func(p string) {
		if st, err := os.Stat(p); p != "" && err == nil && st.IsDir() && !seen[p] {
			seen[p] = true
			out = append(out, p)
		}
	}
	add(t.proc.get(envProject))
	if t.proc.get(envProject) == "" {
		add(t.proc.cwd)
	}
	for _, j := range append(append([]govJob{}, gov.Jobs...), gov.Waiting...) {
		add(j.Project)
	}
	return out
}

// screen reads the machine once: the governor, then each project's files with the daemon's and the sampler's answers laid over.
func (t *topper) screen(live bool) *topScreen {
	now := t.o.now
	if live || now.IsZero() {
		now = time.Now()
	}
	s := &topScreen{Now: now, Width: t.o.width, Open: t.open, Cursor: t.cursor, Load: t.o.load}
	s.Gov = readGovernor(governorDir(t.o, t.proc.get), t.o.now.IsZero())
	if s.Load == "" {
		s.Load = loadAverage()
	}
	for _, path := range t.projectsOf(s.Gov) {
		p := loadProject(path, now)
		t.overlayUsage(p)
		if !t.o.noDaemon {
			t.overlayDaemon(p, now)
		}
		s.Projects = append(s.Projects, p)
	}
	sortProjects(s.Projects)
	return s
}

func sortProjects(ps []*topProject) {
	for i := 1; i < len(ps); i++ {
		for j := i; j > 0 && (ps[j-1].Stale && !ps[j].Stale || ps[j-1].Stale == ps[j].Stale && ps[j-1].Name > ps[j].Name); j-- {
			ps[j-1], ps[j] = ps[j], ps[j-1]
		}
	}
}

// overlayUsage: a planted usage file, else the sampler's reading of the project's processes.
func (t *topper) overlayUsage(p *topProject) {
	var by map[string]usage
	if t.o.usage != "" {
		readJSON(filepath.Join(p.Path, t.o.usage), &by)
	} else if !p.Stale {
		by = t.sample(p)
	}
	for _, r := range p.Rows {
		key := "agent:" + r.Name
		if r.Name == leadName {
			key = leadName
		}
		r.Use = by[key]
	}
}

// sample owns each of the project's processes by its folder: an agent's worktree, else the lead.
func (t *topper) sample(p *topProject) map[string]usage {
	if t.src == nil {
		src, err := chooseSource("auto")
		if err != nil {
			return nil
		}
		t.src = src
	}
	s := t.samplers[p.Path]
	if s == nil {
		s = newSampler(t.src, realPath(p.Path))
		t.samplers[p.Path] = s
	}
	snap, err := s.take(time.Now())
	if err != nil {
		return nil
	}
	by := map[string]usage{}
	for _, pr := range snap.Procs {
		key := leadName
		if who := entityOf(pr.Cwd); who != leadName {
			key = "agent:" + who
		}
		u := by[key]
		by[key] = usage{CPU: u.CPU + pr.Cpu*100, RssMb: u.RssMb + float64(pr.Rss)/(1<<20), Procs: u.Procs + 1}
	}
	return by
}

// loadAverage: the machine's three load numbers, from /proc or sysctl; a dash where neither answers.
func loadAverage() string {
	if b, err := os.ReadFile("/proc/loadavg"); err == nil {
		if f := strings.Fields(string(b)); len(f) >= 3 {
			return strings.Join(f[:3], " ")
		}
	}
	if b, err := exec.Command("sysctl", "-n", "vm.loadavg").Output(); err == nil {
		if f := strings.Fields(strings.Trim(string(b), "{} \n")); len(f) >= 3 {
			return strings.Join(f[:3], " ")
		}
	}
	return loadFallback
}

func ttySize() int {
	cmd := exec.Command("stty", "size")
	cmd.Stdin = os.Stdin
	if b, err := cmd.Output(); err == nil {
		if f := strings.Fields(string(b)); len(f) == 2 {
			if n, err := strconv.Atoi(f[1]); err == nil && n > 0 {
				return n
			}
		}
	}
	return defaultWidth
}
