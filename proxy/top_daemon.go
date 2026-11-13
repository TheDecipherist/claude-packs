// The monitor's two other sources: the governor's file (jobs holding slots, jobs waiting) and a project's daemon, asked over its socket
// with the `status` request the proxy already speaks. The daemon's reply carries the sampler's usage by owner and the agent board
// (who, tool, target, how long since its last event); what it says replaces what the files and the sampler said of the same agent.
package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"time"
)

// daemonWait is the longest a second's frame waits for one daemon.
const daemonWait = 150 * time.Millisecond

type boardRow struct {
	Who      string  `json:"who"`
	Owner    string  `json:"owner"`
	Tool     string  `json:"tool"`
	Target   string  `json:"target"`
	SilentMs float64 `json:"silentMs"`
}

type daemonState struct {
	Usage map[string]usage `json:"usage"`
	Board []boardRow       `json:"board"`
}

type govFile struct {
	Jobs []struct {
		ID, Kind, Project string
		Slots, Want       int
		Start, Since      int64
		PausedAt          *int64
		Pid               int
	} `json:"jobs"`
	Waiting []struct {
		ID, Kind, Project string
		Want              int
		Since             int64
		Pid               int
	} `json:"waiting"`
}

// readGovernor: the governor's jobs and waiters whose process is alive (`alive` is off for a test's planted pids).
func readGovernor(dir string, alive bool) govState {
	var f govFile
	var g govState
	if !readJSON(filepath.Join(dir, governorFile), &f) {
		return g
	}
	for _, j := range f.Jobs {
		if !alive || pidAlive(j.Pid) {
			g.Jobs = append(g.Jobs, govJob{ID: j.ID, Kind: j.Kind, Project: j.Project, Slots: j.Slots, Started: time.UnixMilli(j.Start), Paused: j.PausedAt != nil})
		}
	}
	for _, w := range f.Waiting {
		if !alive || pidAlive(w.Pid) {
			g.Waiting = append(g.Waiting, govJob{ID: w.ID, Kind: w.Kind, Project: w.Project, Slots: w.Want, Started: time.UnixMilli(w.Since)})
		}
	}
	return g
}

// askDaemon: the project's daemon state, or nil when none answers (no socket, a stale one, a late or a fallback reply).
func (t *topper) askDaemon(path string) *daemonState {
	node := lookPath(t.proc.get(envPath), "node")
	if node == "" {
		return nil
	}
	q := *t.proc
	q.start = time.Now()
	j := q.jobFor(path, node)
	if folderRefused(j.files.folder, q.uid) != "" {
		return nil
	}
	r, err := j.exchange(map[string]any{"status": true}, daemonWait)
	if err != nil || r.Fallback || r.Code != 0 {
		return nil
	}
	var d daemonState
	if json.Unmarshal([]byte(r.Stdout), &d) != nil {
		return nil
	}
	return &d
}

// overlayDaemon lays the daemon's board and usage over the project's rows; an agent only the daemon knows is added, and a project
// the daemon has live rows for is not stale.
func (t *topper) overlayDaemon(p *topProject, now time.Time) {
	if _, err := os.Stat(p.Path); err != nil {
		return
	}
	d := t.askDaemon(p.Path)
	if d == nil || len(d.Board) == 0 {
		return
	}
	p.Stale = false
	have := map[string]*topRow{}
	for _, r := range p.Rows {
		have[r.Name] = r
	}
	if have[leadName] == nil {
		have[leadName] = &topRow{Name: leadName, Step: p.Step, Model: "-", Worktree: ".", Silent: -1}
		p.Rows = append([]*topRow{have[leadName]}, p.Rows...)
	}
	for _, b := range d.Board {
		r := have[b.Who]
		if r == nil {
			r = &topRow{Name: b.Who, Model: "-", Step: "", Worktree: worktrees[1:] + b.Who}
			have[b.Who] = r
			p.Rows = append(p.Rows, r)
		}
		r.Silent = time.Duration(b.SilentMs) * time.Millisecond
		if b.Tool != "" {
			r.Last = shorten(b.Tool+" "+b.Target, 56)
		}
		if u, ok := d.Usage[b.Owner]; ok {
			r.Use = u
		}
	}
}
