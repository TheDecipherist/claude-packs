// `hook-proxy status` (typescript order W8.6): the status line, served by the daemon. Claude Code runs it every second with its session
// JSON on stdin; the client asks the project's daemon for the line with a 50 ms deadline and prints the answer, which the daemon draws
// from the facts it keeps as events arrive. With no daemon, a stale socket or a late answer it prints the TypeScript status line's own
// render (`node .claude/tools/statusline.mjs`, which says `hooks: slow path` when no daemon serves the hooks). It never starts a
// daemon (only a hook event does) and a status line that fails prints nothing: it never stops a call.
package main

import (
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// statusWait is the longest the client waits for the daemon's line.
const statusWait = 50 * time.Millisecond

// stdinText reads the piped session JSON; a terminal (the command run by hand) has none.
func stdinText() []byte {
	if st, err := os.Stdin.Stat(); err != nil || st.Mode()&os.ModeCharDevice != 0 {
		return nil
	}
	body, _ := io.ReadAll(os.Stdin)
	return body
}

func (p *proc) runStatus() int {
	project := p.get(envProject)
	if project == "" {
		project = p.cwd
	}
	node := lookPath(p.get(envPath), "node")
	if node == "" {
		return 0
	}
	j := p.jobFor(project, node)
	if p.get(envDaemon) != "off" && folderRefused(j.files.folder, p.uid) == "" {
		if r, err := j.exchange(map[string]any{"status": true, "render": true}, statusWait); err == nil && !r.Fallback && r.Code == 0 {
			p.stdout.Write([]byte(r.Stdout))
			return 0
		}
	}
	return j.slowStatus()
}

// slowStatus prints the TypeScript status line's render of the same stdin.
func (j *job) slowStatus() int {
	cmd := exec.Command(j.node, filepath.Join(j.project, ".claude", "tools", "statusline.mjs"))
	cmd.Dir, cmd.Env, cmd.Stdin, cmd.Stdout, cmd.Stderr = j.cwd, j.env, strings.NewReader(string(j.stdin)), j.stdout, nil
	_ = cmd.Run() // a status line that cannot draw draws nothing
	return 0
}
