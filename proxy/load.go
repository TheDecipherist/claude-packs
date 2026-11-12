// `hook-proxy load ask|take|free|jobs ...` (typescript order W8.8): the load governor's straight answer without a node start. The client
// asks the project's daemon over its socket, which answers with the load tool's own verbs; with no daemon, a stale socket, a late answer
// or a fallback reply it runs the TypeScript tool itself (`node .claude/tools/load.mjs ...`), which gives the same answer, slower. It
// never starts a daemon (only a hook event does). Its exit code is the tool's: 0 go, granted or freed; 1 wait; 2 a wrong word.
package main

import (
	"os/exec"
	"path/filepath"
	"time"
)

// loadWait is the longest the client waits for the daemon's answer before it asks the tool itself.
const loadWait = 200 * time.Millisecond

func (p *proc) runLoad(args []string) int {
	project := p.get(envProject)
	if project == "" {
		project = p.cwd
	}
	node := lookPath(p.get(envPath), "node")
	if node == "" {
		p.stderr.Write([]byte("hook-proxy load: no node on PATH\n"))
		return 1
	}
	j := p.jobFor(project, node)
	if p.get(envDaemon) != "off" && folderRefused(j.files.folder, p.uid) == "" {
		if r, err := j.exchange(map[string]any{"load": args}, loadWait); err == nil && !r.Fallback {
			p.stdout.Write([]byte(r.Stdout))
			p.stderr.Write([]byte(r.Stderr))
			return r.Code
		}
	}
	return j.slowLoad(args)
}

// slowLoad runs the TypeScript tool on the same words, its streams the caller's.
func (j *job) slowLoad(args []string) int {
	cmd := exec.Command(j.node, append([]string{filepath.Join(j.project, ".claude", "tools", "load.mjs")}, args...)...)
	cmd.Dir, cmd.Env, cmd.Stdout, cmd.Stderr = j.cwd, j.env, j.stdout, j.stderr
	if err := cmd.Run(); err != nil {
		if exit, ok := err.(*exec.ExitError); ok {
			return exit.ExitCode()
		}
		j.stderr.Write([]byte("hook-proxy load: " + err.Error() + "\n"))
		return 1
	}
	return 0
}
