// `hook-proxy sample --bench n`: what one snapshot costs, by this process's own CPU time (getrusage) and by wall time.
package main

import (
	"fmt"
	"io"
	"os"
	"syscall"
	"time"
)

func cpuNow() time.Duration {
	var ru syscall.Rusage
	if syscall.Getrusage(syscall.RUSAGE_SELF, &ru) != nil {
		return 0
	}
	return time.Duration(ru.Utime.Nano() + ru.Stime.Nano())
}

func ms(d time.Duration) float64 { return float64(d.Microseconds()) / 1000 }

// runBench: the first snapshot (every folder asked for) and then n-1 more (a folder asked for only of a new process).
func (s *sampler) runBench(n int, out io.Writer) int {
	var firstCPU, firstWall time.Duration
	var kept, listed int
	cpu0, wall0 := cpuNow(), time.Now()
	for i := 0; i < n; i++ {
		c, w := cpuNow(), time.Now()
		snap, err := s.take(w)
		if err != nil {
			fmt.Fprintln(os.Stderr, "hook-proxy sample:", err)
			return 1
		}
		kept = len(snap.Procs)
		if i == 0 {
			firstCPU, firstWall, listed = cpuNow()-c, time.Since(w), len(s.prev)
		}
	}
	rest := time.Duration(max(n-1, 1))
	fmt.Fprintf(out, "source=%s processes=%d kept=%d first: cpu=%.3fms wall=%.3fms; steady (%d more): cpu=%.3fms wall=%.3fms\n",
		s.src.name(), listed, kept, ms(firstCPU), ms(firstWall), n-1, ms((cpuNow()-cpu0-firstCPU)/rest), ms((time.Since(wall0)-firstWall)/rest))
	return 0
}
