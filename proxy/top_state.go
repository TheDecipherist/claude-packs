// The monitor's picture of the machine (typescript order W8.9 item 4): each project's progress, its lead and agents, what each runs
// and its last actions. It is read from files, which every project has: `docs/workorders/*/status.json` and `agents/*.json`, and the
// event log `.claude/logs/events.jsonl`. The daemon's state (top_daemon.go) and the sampler's usage overlay what the files say.
package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

const (
	// eventTail is how much of the event log's end is read: enough for every agent's last 20 actions.
	eventTail = 512 << 10
	// recentEvent: an agent with an event this recent is running.
	recentEvent = 5 * time.Minute
	// recentAgentFile: an unfinished agent's own file this recent counts as running.
	recentAgentFile = 30 * time.Minute
	// staleAfter: a project with nothing newer than this is stale.
	staleAfter = 10 * time.Minute
	maxActions = 20
	leadName   = "lead"
	worktrees  = "/.claude/worktrees/"
)

// usage is what runs under one owner: CPU as percent of a core, memory in MB, processes.
type usage struct {
	CPU   float64 `json:"cpu"`
	RssMb float64 `json:"rssMb"`
	Procs int     `json:"procs"`
}

type action struct {
	At   time.Time
	Text string
}

// topRow is the lead or one agent of a project.
type topRow struct {
	Name, Step, Model, Worktree, Last string
	Silent                            time.Duration
	Use                               usage
	Actions                           []action
}

type topProject struct {
	Name, Path, Step string
	Percent, Left    int
	Stale            bool
	Rows             []*topRow // the lead first, then the agents
	Newest           time.Time
}

func (p *topProject) agents() int { return len(p.Rows) - 1 }

type event struct {
	T           string `json:"t"`
	Cwd         string `json:"cwd"`
	Event       string `json:"event"`
	Tool        string `json:"tool"`
	File        string `json:"file"`
	Command     string `json:"command"`
	Description string `json:"description"`
}

type agentFile struct {
	Name, Step, Model, Updated string
	Items, Done                int
}

type orderStatus struct {
	Updated string `json:"updated"`
	Steps   []struct {
		ID, Title   string
		Items, Done int
	} `json:"steps"`
}

func parseTime(s string) time.Time {
	t, _ := time.Parse(time.RFC3339Nano, s)
	return t
}

// entityOf names who an event is of: the agent whose worktree folder is the event's, else the lead.
func entityOf(cwd string) string {
	if i := strings.Index(cwd, worktrees); i >= 0 {
		name, _, _ := strings.Cut(cwd[i+len(worktrees):], "/")
		return name
	}
	return leadName
}

// shorten: one line of at most n runes.
func shorten(s string, n int) string {
	s = strings.Join(strings.Fields(s), " ")
	if r := []rune(s); len(r) > n {
		return string(r[:n-3]) + "..."
	}
	return s
}

// actionText: the tool and a short form of its input, a file as the path inside its checkout.
func actionText(e event) string {
	in := e.Command
	if e.File != "" {
		in = strings.TrimPrefix(e.File, e.Cwd+"/")
	}
	if in == "" {
		in = e.Description
	}
	return strings.TrimSpace(e.Tool + " " + shorten(in, 48))
}

// readEvents: the project's event log's tail, as lines of JSON.
func readEvents(project string) []event {
	f, err := os.Open(filepath.Join(project, ".claude", "logs", "events.jsonl"))
	if err != nil {
		return nil
	}
	defer f.Close()
	st, err := f.Stat()
	if err != nil {
		return nil
	}
	skip := st.Size() > eventTail
	if skip {
		f.Seek(st.Size()-eventTail, 0)
	}
	body := make([]byte, min(st.Size(), eventTail))
	n, _ := f.Read(body)
	lines := strings.Split(string(body[:n]), "\n")
	if skip {
		lines = lines[1:] // the first is cut in two
	}
	var out []event
	for _, line := range lines {
		var e event
		if json.Unmarshal([]byte(line), &e) == nil && e.T != "" {
			out = append(out, e)
		}
	}
	return out
}

func readJSON(file string, into any) bool {
	body, err := os.ReadFile(file)
	return err == nil && json.Unmarshal(body, into) == nil
}

// progress sums the project's orders: items, done, the current step and the newest update.
func progress(project string) (items, done int, step string, updated time.Time) {
	files, _ := filepath.Glob(filepath.Join(project, "docs", "workorders", "*", "status.json"))
	for _, file := range files {
		var o orderStatus
		if !readJSON(file, &o) {
			continue
		}
		updated = later(updated, parseTime(o.Updated))
		for _, s := range o.Steps {
			items, done = items+s.Items, done+s.Done
			if step == "" && s.Done < s.Items {
				step = strings.TrimSpace(s.ID + " " + s.Title)
			}
		}
	}
	return
}

func later(a, b time.Time) time.Time {
	if b.After(a) {
		return b
	}
	return a
}

// loadProject reads one project's files at `now`. Rows hold the lead and each running agent.
func loadProject(path string, now time.Time) *topProject {
	p := &topProject{Name: filepath.Base(path), Path: path}
	items, done, step, updated := progress(path)
	p.Step, p.Left, p.Newest = step, items-done, updated
	if items > 0 {
		p.Percent = (done*100 + items/2) / items
	}
	rows := map[string]*topRow{leadName: {Name: leadName, Step: strings.Fields(step + " -")[0], Model: "-", Worktree: "."}}
	lastSeen := map[string]time.Time{}
	for _, e := range readEvents(path) {
		who := entityOf(e.Cwd)
		r := rows[who]
		if r == nil {
			r = &topRow{Name: who, Model: "-", Worktree: worktrees[1:] + who}
			rows[who] = r
		}
		at := parseTime(e.T)
		lastSeen[who] = at
		p.Newest = later(p.Newest, at)
		if e.Event == "PreToolUse" && e.Tool != "" {
			r.Actions = append(r.Actions, action{at, actionText(e)})
		}
	}
	files, _ := filepath.Glob(filepath.Join(path, "docs", "workorders", "*", "agents", "*.json"))
	for _, file := range files {
		var a agentFile
		if !readJSON(file, &a) || a.Name == "" {
			continue
		}
		at := parseTime(a.Updated)
		p.Newest = later(p.Newest, at)
		ran := !lastSeen[a.Name].IsZero() && now.Sub(lastSeen[a.Name]) <= recentEvent
		if !ran && (now.Sub(at) > recentAgentFile || (a.Items > 0 && a.Done >= a.Items)) {
			continue // finished, or gone quiet for good
		}
		r := rows[a.Name]
		if r == nil {
			r = &topRow{Name: a.Name, Worktree: worktrees[1:] + a.Name}
			rows[a.Name] = r
		}
		r.Step, r.Model = a.Step, orDash(a.Model)
		if lastSeen[a.Name].IsZero() {
			lastSeen[a.Name] = at
		}
	}
	p.Stale = now.Sub(p.Newest) > staleAfter
	if p.Stale {
		return p
	}
	for who, r := range rows {
		if who != leadName && r.Step == "" && now.Sub(lastSeen[who]) > recentEvent {
			continue // an event of a long-gone agent
		}
		r.Silent = -1 // no event seen
		if !lastSeen[who].IsZero() {
			r.Silent = now.Sub(lastSeen[who])
		}
		if n := len(r.Actions); n > 0 {
			r.Last = r.Actions[n-1].Text
		}
		p.Rows = append(p.Rows, r)
	}
	sort.Slice(p.Rows, func(i, j int) bool {
		a, b := p.Rows[i], p.Rows[j]
		if (a.Name == leadName) != (b.Name == leadName) {
			return a.Name == leadName
		}
		return a.Name < b.Name
	})
	return p
}
