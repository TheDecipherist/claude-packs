// The /proc source (Linux): `stat` gives the parent, CPU ticks, start time and resident pages, `cwd` is a link, `cmdline` the
// arguments. No tag: the parser reads a tree it is given the root of, so a planted /proc tree proves it on any machine.
package main

import (
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

type procfs struct {
	root     string
	hz       int64
	pageSize int64
}

func (f *procfs) name() string { return "native (/proc)" }

// parseStat reads one /proc/<pid>/stat line. The name is in parentheses and may hold spaces and parentheses itself, so the fields
// are counted from the last `)`: state, ppid, ... utime (14th field), stime, ... starttime (22nd), vsize, rss in pages (24th).
func (f *procfs) parseStat(pid int, line string) (procInfo, bool) {
	open, end := strings.IndexByte(line, '('), strings.LastIndexByte(line, ')')
	if open < 0 || end < open {
		return procInfo{}, false
	}
	fields := strings.Fields(line[end+1:])
	if len(fields) < 22 || fields[0] == "Z" || fields[0] == "X" {
		return procInfo{}, false
	}
	num := func(i int) int64 { n, _ := strconv.ParseInt(fields[i], 10, 64); return n }
	hz := max(f.hz, 1)
	return procInfo{
		Pid: pid, Ppid: int(num(1)), Start: num(19), Comm: line[open+1 : end],
		CPUNs: uint64(num(11)+num(12)) * uint64(1_000_000_000/hz), RSS: uint64(max(num(21), 0) * f.pageSize),
	}, true
}

func (f *procfs) list() ([]procInfo, error) {
	entries, err := os.ReadDir(f.root)
	if err != nil {
		return nil, err
	}
	out := make([]procInfo, 0, len(entries))
	for _, e := range entries {
		pid, err := strconv.Atoi(e.Name())
		if err != nil || pid <= 0 {
			continue
		}
		raw, err := os.ReadFile(filepath.Join(f.root, e.Name(), "stat"))
		if err != nil {
			continue // gone since the listing
		}
		if p, ok := f.parseStat(pid, string(raw)); ok {
			out = append(out, p)
		}
	}
	return out, nil
}

func (f *procfs) cwd(p procInfo) string {
	to, _ := os.Readlink(filepath.Join(f.root, strconv.Itoa(p.Pid), "cwd")) // another user's: unreadable, so no folder
	return to
}

func (f *procfs) args(p procInfo) string {
	raw, _ := os.ReadFile(filepath.Join(f.root, strconv.Itoa(p.Pid), "cmdline"))
	text := strings.TrimRight(strings.ReplaceAll(string(raw), "\x00", " "), " ")
	return text[:min(len(text), maxArgs)]
}
