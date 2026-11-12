// Starting the resident runner behind an event, and the client's own line in the project's hooks.log.
package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"
)

// holderAlive: the start lock names the pid of a daemon that is starting (the daemon takes the lock itself, so a client that finds it
// held does not start another).
func holderAlive(lockFile string) bool {
	text, err := os.ReadFile(lockFile)
	if err != nil {
		return false
	}
	pid, err := strconv.Atoi(strings.TrimSpace(string(text)))
	return err == nil && pid > 0 && syscall.Kill(pid, 0) == nil
}

// startDaemon starts `node .claude/hooks/resident.mjs --serve <project>` detached (its own session), in `/`, with HOME, PATH and the
// cache folder only: a daemon never carries the first client's environment, working folder or process group. The channel gets its
// word on the ready pipe (fd 3): `ready <pid>`, `busy`, or what refused it. Nil when no daemon was started.
func (j *job) startDaemon() <-chan string {
	hooks := filepath.Join(j.project, ".claude", "hooks")
	script := filepath.Join(hooks, "resident.mjs")
	if _, err := os.Stat(script); err != nil || holderAlive(j.files.lock) {
		return nil
	}
	read, write, err := os.Pipe()
	if err != nil {
		return nil
	}
	args := []string{script, "--serve", j.project, "--hooks", hooks, "--ready-fd", "3"}
	// this binary is the sampler the daemon starts and stops with itself (`hook-proxy sample`, W8.7)
	if self, err := os.Executable(); err == nil {
		args = append(args, "--proxy", self)
	}
	cmd := exec.Command(j.node, args...)
	cmd.Dir = "/"
	cmd.Env = []string{"HOME=" + j.get("HOME"), "PATH=" + j.get("PATH"), "CLAUDE_PACKS_CACHE=" + j.folder}
	cmd.ExtraFiles = []*os.File{write}
	cmd.SysProcAttr = &syscall.SysProcAttr{Setsid: true}
	err = cmd.Start()
	write.Close()
	if err != nil {
		read.Close()
		return nil
	}
	cmd.Process.Release()
	word := make(chan string, 1)
	go func() {
		line, err := bufio.NewReader(read).ReadString('\n')
		read.Close()
		if err != nil && strings.TrimSpace(line) == "" {
			// a daemon that closed the pipe without a word is not a ready one: say so instead of sending an empty line
			line = "no word from the daemon: " + err.Error()
		}
		word <- strings.TrimSpace(line)
	}()
	return word
}

// wallOf is what the log line says of the event: its name and its tool (or its source), read off the event on stdin.
func wallOf(stdin []byte) (event, tool string) {
	event, tool = "-", "-"
	if len(stdin) > 1<<20 {
		return
	}
	var ev struct {
		Name   string `json:"hook_event_name"`
		Tool   string `json:"tool_name"`
		Source string `json:"source"`
	}
	if json.Unmarshal(stdin, &ev) != nil {
		return
	}
	return orDash(ev.Name), orDash(ev.Tool + ev.Source)
}

func orDash(s string) string {
	if s == "" {
		return "-"
	}
	return strings.ReplaceAll(strings.ReplaceAll(s, "\t", " "), "\n", " ")
}

// logWall appends the client's own line (hook `proxy`, source `proxy`: its wall from its start to its exit) to the project's
// .claude/hooks.log, in one O_APPEND write, the format hook-log.mts's hookLogLine writes. A project with no .claude gets none.
func (p *proc) logWall(project string, code int) {
	dir := filepath.Join(project, ".claude")
	if st, err := os.Stat(dir); err != nil || !st.IsDir() {
		return
	}
	event, tool := wallOf(p.stdin)
	ms := time.Since(p.start).Round(time.Millisecond).Milliseconds()
	line := fmt.Sprintf("%s\t%s\tproxy\t%d\t%d\t%s\t0\tproxy\n", time.Now().UTC().Format("2006-01-02T15:04:05.000Z"), event, ms, code, tool)
	f, err := os.OpenFile(filepath.Join(dir, "hooks.log"), os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
	if err != nil {
		return
	}
	f.WriteString(line)
	f.Close()
}
