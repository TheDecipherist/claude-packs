// The client Claude Code starts for each hook event (typescript order W8.2, d-10, review-2-go). It names the project's resident
// runner's socket from the user, the project's real path, the lock's hash and node's path, sends the event, writes the reply's
// stdout then its stderr, and exits with its code. With no daemon, a stale socket, a cut reply or a missed deadline it never exits 0
// unjudged: it runs `node .claude/hooks/run-hooks.mjs` on the same stdin, and starts the daemon beside that run. It fails open
// only when node cannot start, in a systemMessage.
package main

import (
	"bufio"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"
)

// proc is what the client takes of its process, so a selftest can give it another one.
type proc struct {
	env     []string
	cwd     string
	ppid    int
	uid     int
	goos    string
	stdin   []byte
	stdout  io.Writer
	stderr  io.Writer
	timeout time.Duration // the settings entry's timeout: the daemon is asked to answer a second before it
	start   time.Time
	// spawn: whether a missing daemon is started; ready: how long to wait for its word (0: none, the client exits at once)
	spawn bool
	ready time.Duration
}

// job is one event once its project, node and socket are known.
type job struct {
	*proc
	project string
	node    string
	folder  string
	files   files
}

// unreachable: nothing is listening (no socket, or a stale one). Any other failure of the conversation is a sick daemon.
type unreachable struct{ error }

func (p *proc) get(key string) string {
	for i := len(p.env) - 1; i >= 0; i-- {
		if v, ok := strings.CutPrefix(p.env[i], key+"="); ok {
			return v
		}
	}
	return ""
}

// lookPath finds a program on a PATH value: node from PATH, as settings runs it today.
func lookPath(path, name string) string {
	for _, dir := range filepath.SplitList(path) {
		file := filepath.Join(dir, name)
		if st, err := os.Stat(file); err == nil && !st.IsDir() && st.Mode()&0o111 != 0 {
			return file
		}
	}
	return ""
}

func realPath(path string) string {
	if real, err := filepath.EvalSymlinks(path); err == nil {
		return real
	}
	return path
}

// folderRefused says why the daemon's folder must not be used: it is there and it is not the user's at mode 700.
func folderRefused(folder string, uid int) string {
	st, err := os.Stat(folder)
	if err != nil {
		return ""
	}
	owner, known := st.Sys().(*syscall.Stat_t)
	if !st.IsDir() || st.Mode().Perm() != 0o700 || (known && int(owner.Uid) != uid) {
		return folder + " is not the user's folder at mode 700"
	}
	return ""
}

// run judges one event and returns the exit code, and records the call's wall as the `proxy` line of the project's hooks.log.
func (p *proc) run() int {
	project := p.get("CLAUDE_PROJECT_DIR")
	if project == "" {
		project = p.cwd
	}
	code := p.judge(project)
	p.logWall(project, code)
	return code
}

func (p *proc) judge(project string) int {
	node := lookPath(p.get("PATH"), "node")
	if node == "" {
		return p.failOpen("node is not on PATH")
	}
	j := p.jobFor(project, node)
	switch {
	case p.get("CLAUDE_PACKS_DAEMON") == "off":
		return j.fallback("", false)
	case len(p.stdin) > maxStdin:
		return j.fallback("", false) // too large to hold in the daemon
	}
	if why := folderRefused(j.files.folder, p.uid); why != "" {
		return j.fallback(why, false)
	}
	r, err := j.ask()
	var none unreachable
	switch {
	case err == nil && !r.Fallback:
		io.WriteString(p.stdout, r.Stdout)
		io.WriteString(p.stderr, r.Stderr)
		return r.Code
	case err == nil:
		return j.fallback("", false) // the daemon declined this event (another project's, a protocol it does not speak)
	case errors.As(err, &none):
		return j.fallback("", true) // no daemon, or a stale socket: this event is judged here, and the next one has a daemon
	default:
		return j.fallback(err.Error(), false)
	}
}

// jobFor names the project's daemon files: its real path, node's, and the socket the lock's hash and node give.
func (p *proc) jobFor(project, node string) *job {
	j := &job{proc: p, project: realPath(project), node: realPath(node)}
	// fail-open: a lock that cannot be read reads as no lock, and no home folder as an empty one (the call goes through unjudged)
	lock, _ := os.ReadFile(filepath.Join(j.project, ".claude", "claude-packs.lock.json"))
	home := p.get("HOME")
	if home == "" {
		home, _ = os.UserHomeDir()
	}
	j.folder = cacheFolder(p.get, home, p.goos)
	j.files = daemonFiles(j.folder, daemonKey(p.uid, j.project, string(lock), j.node), p.uid)
	return j
}

// ask sends the event and waits for a whole reply, until the deadline.
func (j *job) ask() (*reply, error) {
	return j.exchange(map[string]any{}, max(j.timeout-time.Second, 250*time.Millisecond))
}

// exchange sends one request (the header's own fields and `extra`) with stdin and reads the reply, waiting `wait` at most.
func (j *job) exchange(extra map[string]any, wait time.Duration) (*reply, error) {
	conn, err := net.DialTimeout("unix", j.files.socket, 500*time.Millisecond)
	if err != nil {
		return nil, unreachable{err}
	}
	defer conn.Close()
	deadline := j.start.Add(wait)
	conn.SetDeadline(deadline)
	env := map[string]string{}
	for _, kv := range j.env {
		if k, v, ok := strings.Cut(kv, "="); ok {
			env[k] = v
		}
	}
	// Marshal of this map of strings and numbers cannot fail
	fields := map[string]any{"v": protocol, "env": env, "cwd": j.cwd, "ppid": j.ppid, "deadline": deadline.UnixMilli()}
	for k, v := range extra {
		fields[k] = v
	}
	header, _ := json.Marshal(fields)
	if _, err = conn.Write(request(header, j.stdin)); err != nil {
		return nil, fmt.Errorf("the resident runner took no request: %w", err)
	}
	r, err := readReply(bufio.NewReader(conn))
	if err != nil {
		return nil, fmt.Errorf("the resident runner's reply was not whole: %w", err)
	}
	return r, nil
}

// fallback judges the event by the TypeScript runner, on the same stdin: as slow as today, and judged. A daemon is started beside it
// when `start` (nothing was listening); `why` is said on stderr when the daemon was there and failed.
func (j *job) fallback(why string, start bool) int {
	var word <-chan string
	if start && j.spawn {
		word = j.startDaemon()
	}
	code := j.runTypeScript()
	if why != "" {
		fmt.Fprintf(j.stderr, "claude-packs: %s, so this call was judged by the TypeScript runner\n", why)
	}
	if word != nil && j.ready > 0 {
		select {
		case <-word:
		case <-time.After(j.ready):
		}
	}
	return code
}

func (j *job) runTypeScript() int {
	cmd := exec.Command(j.node, filepath.Join(j.project, ".claude", "hooks", "run-hooks.mjs"))
	cmd.Dir, cmd.Env, cmd.Stdin, cmd.Stdout, cmd.Stderr = j.cwd, j.env, strings.NewReader(string(j.stdin)), j.stdout, j.stderr
	// its own process group, so that when Claude ends this client (the entry's timeout) the runner and the hooks it started end with it
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	signals := make(chan os.Signal, 1)
	signal.Notify(signals, syscall.SIGTERM, syscall.SIGINT, syscall.SIGHUP)
	defer signal.Stop(signals)
	if err := cmd.Start(); err != nil {
		return j.failOpen("node could not start (" + err.Error() + ")")
	}
	done := make(chan error, 1)
	go func() { done <- cmd.Wait() }()
	var err error
	select {
	case err = <-done:
	case <-signals:
		syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL)
		<-done
		return 1 // told to end: a crash, never exit 0
	}
	if err != nil {
		var exit *exec.ExitError
		if errors.As(err, &exit) && exit.ExitCode() > 0 {
			return exit.ExitCode()
		}
		return 1 // killed, or not waited for: a crash, never exit 0
	}
	return 0
}

// failOpen: the one way a call goes through unjudged, said in a systemMessage.
func (p *proc) failOpen(why string) int {
	// Marshal of a string map cannot fail
	msg, _ := json.Marshal(map[string]string{"systemMessage": "claude-packs: " + why + ", so this call was not judged"})
	fmt.Fprintf(p.stdout, "%s\n", msg)
	return 0
}
