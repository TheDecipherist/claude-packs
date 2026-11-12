//go:build linux

package main

import "os"

// one-off: newNative is the one name each build tag gives its own reader (darwin, linux, the rest); a build holds exactly one.
// The clock tick is 100 a second on every Linux the kit builds for.
func newNative() (source, error) {
	return &procfs{root: "/proc", hz: 100, pageSize: int64(os.Getpagesize())}, nil
}
