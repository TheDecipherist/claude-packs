// hook-proxy: `hook-proxy [<timeout seconds>]` judges the hook event on stdin (client.go); `hook-proxy status` and `hook-proxy load ...`
// ask the daemon for the status line (status.go) and the load governor's answer (load.go); `hook-proxy --selftest` runs its plants
// against fake daemons it starts in-process (selftest.go) and exits 0 when each was caught.
package main

import (
	"io"
	"os"
	"runtime"
	"strconv"
	"time"
)

// defaultTimeout is the entry's timeout when the command names none.
const defaultTimeout = 10 * time.Second

func main() {
	start := time.Now()
	timeout := defaultTimeout
	if len(os.Args) > 1 {
		if os.Args[1] == "--selftest" {
			os.Exit(selftest(os.Stdout))
		}
		if os.Args[1] == "status" {
			cwd, _ := os.Getwd()
			p := &proc{env: os.Environ(), cwd: cwd, ppid: os.Getppid(), uid: os.Getuid(), goos: runtime.GOOS, stdin: stdinText(), stdout: os.Stdout, stderr: os.Stderr, start: start}
			os.Exit(p.runStatus())
		}
		if os.Args[1] == "load" {
			cwd, _ := os.Getwd()
			p := &proc{env: os.Environ(), cwd: cwd, ppid: os.Getppid(), uid: os.Getuid(), goos: runtime.GOOS, stdout: os.Stdout, stderr: os.Stderr, start: start}
			os.Exit(p.runLoad(os.Args[2:]))
		}
		if os.Args[1] == "sample" {
			os.Exit(runSample(os.Args[2:], os.Stdout))
		}
		if seconds, err := strconv.Atoi(os.Args[1]); err == nil && seconds > 0 {
			timeout = time.Duration(seconds) * time.Second
		}
	}
	// fail-open by contract: the proxy never blocks a call on its own fault, so a stdin or cwd it cannot read is an empty one
	stdin, _ := io.ReadAll(os.Stdin)
	cwd, _ := os.Getwd()
	p := &proc{env: os.Environ(), cwd: cwd, ppid: os.Getppid(), uid: os.Getuid(), goos: runtime.GOOS, stdin: stdin, stdout: os.Stdout, stderr: os.Stderr, timeout: timeout, start: start, spawn: true}
	os.Exit(p.run())
}
