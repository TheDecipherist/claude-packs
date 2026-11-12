package main

import (
	"strings"
	"testing"
	"time"
)

// Each field a wrong offset could spoil is found, and a right reading passes.
func TestCheckSelfFindsEachDisagreement(t *testing.T) {
	now := time.Unix(1_800_000_000, 0)
	good := procInfo{Pid: 7, Ppid: 3, Comm: "hook-proxy", Start: now.Unix() - 5, RSS: 20 << 20}
	if err := checkSelf(good, 7, 3, "/x/hook-proxy", now); err != nil {
		t.Fatal(err)
	}
	long := good
	long.Comm = "a-very-long-name"
	if err := checkSelf(long, 7, 3, "/x/a-very-long-name-indeed", now); err != nil {
		t.Errorf("a name cut at 16: %v", err)
	}
	for field, bad := range map[string]procInfo{
		"pid": {Pid: 8, Ppid: 3, Comm: "hook-proxy", Start: good.Start, RSS: good.RSS}, "parent": {Pid: 7, Ppid: 4, Comm: "hook-proxy", Start: good.Start, RSS: good.RSS},
		"name": {Pid: 7, Ppid: 3, Comm: "xx", Start: good.Start, RSS: good.RSS}, "start": {Pid: 7, Ppid: 3, Comm: "hook-proxy", Start: 0, RSS: good.RSS},
		"resident": {Pid: 7, Ppid: 3, Comm: "hook-proxy", Start: good.Start, RSS: 12},
	} {
		if err := checkSelf(bad, 7, 3, "hook-proxy", now); err == nil || !strings.Contains(err.Error(), map[string]string{"pid": "pid", "parent": "parent", "name": "name", "start": "start", "resident": "resident"}[field]) {
			t.Errorf("%s: %v", field, err)
		}
	}
}
