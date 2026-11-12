package main

import (
	"fmt"
	"path/filepath"
	"time"
)

// checkSelf compares what a native reader says of this very process with what Go knows of it (review finding 21): the raw reader
// rests on private struct offsets, and a macOS update that moves one gives wrong numbers, not an error. `exe` is os.Args[0].
// A disagreement is the reason the sampler gives for using `ps` instead. The kernel's comm is the executable's name cut at 16 bytes.
func checkSelf(p procInfo, pid, ppid int, exe string, now time.Time) error {
	comm := filepath.Base(exe)
	comm = comm[:min(len(comm), 16)]
	switch {
	case p.Pid != pid:
		return fmt.Errorf("pid %d, want %d", p.Pid, pid)
	case p.Ppid != ppid:
		return fmt.Errorf("parent %d, want %d", p.Ppid, ppid)
	case p.Comm != comm:
		return fmt.Errorf("name %q, want %q", p.Comm, comm)
	case p.Start <= 0 || p.Start > now.Unix()+60 || p.Start < now.Unix()-24*3600:
		return fmt.Errorf("start %d, now %d", p.Start, now.Unix())
	case p.RSS < 1<<20 || p.RSS > 1<<40:
		return fmt.Errorf("resident size %d", p.RSS)
	}
	return nil
}
