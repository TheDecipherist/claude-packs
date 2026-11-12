//go:build darwin

package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// The raw system calls read this very process right: its parent, its name, CPU and memory, its working folder and its arguments,
// with CGO_ENABLED=0 (the probe's claim, d-30), and the offsets agree with `ps` on a child.
func TestNativeReadsThisProcess(t *testing.T) {
	n, err := newNative()
	if err != nil {
		t.Fatal(err)
	}
	all, err := n.list()
	if err != nil || len(all) < 10 {
		t.Fatalf("%d processes, %v", len(all), err)
	}
	var me procInfo
	for _, p := range all {
		if p.Pid == os.Getpid() {
			me = p
		}
	}
	if me.Pid == 0 || me.Ppid != os.Getppid() || me.RSS < 1<<20 || me.Start == 0 {
		t.Fatalf("%+v (parent %d)", me, os.Getppid())
	}
	if me.CPUNs == 0 || me.CPUNs > 60_000_000_000 {
		t.Errorf("cpu %d ns", me.CPUNs)
	}
	want, _ := filepath.EvalSymlinks(func() string { d, _ := os.Getwd(); return d }())
	if got := n.cwd(me); got != want {
		t.Errorf("cwd %q, want %q", got, want)
	}
	if !strings.Contains(n.args(me), ".test") {
		t.Errorf("args %q", n.args(me))
	}
	if len(me.Comm) == 0 || len(me.Comm) > 16 {
		t.Errorf("comm %q", me.Comm)
	}
}
