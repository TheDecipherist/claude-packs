//go:build !darwin && !linux

package main

import "io"

// watchMemstats: no signal to answer on this system.
func watchMemstats(io.Writer) func() { return func() {} }
