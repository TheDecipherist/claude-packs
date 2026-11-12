//go:build !darwin && !linux

package main

import "errors"

// one-off: newNative is the one name each build tag gives its own reader (darwin, linux, the rest); a build holds exactly one.
// Here there is no raw reader, and the sampler falls back to `ps`.
func newNative() (source, error) { return nil, errors.New("no native process reader") }
