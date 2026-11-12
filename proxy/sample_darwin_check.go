//go:build darwin

package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"time"
)

// selfCheck reads this process natively and compares it with what Go knows (checkSelf), then its folder and its arguments. An error
// names the field that disagrees and the macOS version, so a log shows which release moved the private layout.
func (d *darwin) selfCheck() error {
	version, _ := syscall.Sysctl("kern.osproductversion")
	fail := func(err error) error {
		return fmt.Errorf("the native reading disagrees with this process on macOS %s: %w", version, err)
	}
	all, err := d.list()
	if err != nil {
		return fail(err)
	}
	var me procInfo
	for _, p := range all {
		if p.Pid == os.Getpid() {
			me = p
		}
	}
	if err := checkSelf(me, os.Getpid(), os.Getppid(), os.Args[0], time.Now()); err != nil {
		return fail(err)
	}
	wd, _ := os.Getwd()
	if want := realPath(wd); d.cwd(me) != want {
		return fail(fmt.Errorf("folder %q, want %q", d.cwd(me), want))
	}
	if !strings.Contains(d.args(me), filepath.Base(os.Args[0])) {
		return fail(fmt.Errorf("arguments %q", d.args(me)))
	}
	return nil
}
