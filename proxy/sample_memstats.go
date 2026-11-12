//go:build darwin || linux

package main

import (
	"fmt"
	"io"
	"os"
	"os/signal"
	"runtime"
	"syscall"
)

// watchMemstats answers SIGUSR1 with one line on `out` (the sampler's stderr, which the daemon copies into its log as `sampler: ...`):
// the Go heap in use, what the Go runtime holds from the system, and the goroutines (typescript order W10b item 1, the soak's sample of
// the sampler). It returns what stops the watch.
func watchMemstats(out io.Writer) func() {
	ch := make(chan os.Signal, 1)
	signal.Notify(ch, syscall.SIGUSR1)
	done := make(chan struct{})
	go func() {
		for {
			select {
			case <-ch:
				fmt.Fprintln(out, memstatsLine())
			case <-done:
				return
			}
		}
	}()
	return func() { signal.Stop(ch); close(done) }
}

func memstatsLine() string {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	return fmt.Sprintf("memstats heapAlloc=%d heapSys=%d goroutines=%d", m.HeapAlloc, m.HeapSys, runtime.NumGoroutine())
}
