// The monitor's frame: plain text, one string, drawn from a topScreen. The live loop adds the ANSI (selection, dimming) around it; the
// golden test and `top --once` print it as it is.
package main

import (
	"fmt"
	"sort"
	"strings"
	"time"
)

// govJob and govWait are what the governor's file says of a job holding slots and a job waiting for them.
type govJob struct {
	ID, Kind, Project string
	Slots             int
	Started           time.Time
	Paused            bool
}

type govState struct {
	Jobs    []govJob
	Waiting []govJob
}

type topScreen struct {
	Now      time.Time
	Load     string
	Gov      govState
	Projects []*topProject
	Cursor   int
	Open     string // the key of the page that is open: `project` or `project/agent`
	Width    int
}

// topItem is one line the cursor can stand on: a project or one of its rows.
type topItem struct {
	Key     string
	Project *topProject
	Row     *topRow
}

const barCells = 10

func (s *topScreen) items() []topItem {
	var out []topItem
	for _, p := range s.Projects {
		out = append(out, topItem{Key: p.Name, Project: p})
		for _, r := range p.Rows {
			out = append(out, topItem{Key: p.Name + "/" + r.Name, Project: p, Row: r})
		}
	}
	return out
}

func since(d time.Duration) string {
	switch {
	case d < 0:
		return "-"
	case d < time.Minute:
		return fmt.Sprintf("%ds ago", int(d.Seconds()))
	case d < time.Hour:
		return fmt.Sprintf("%dm ago", int(d.Minutes()))
	}
	return fmt.Sprintf("%dh ago", int(d.Hours()))
}

func memText(mb float64) string {
	if mb >= 1024 {
		return fmt.Sprintf("%.1fG", mb/1024)
	}
	return fmt.Sprintf("%dM", int(mb+0.5))
}

func bar(percent int) string {
	full := percent * barCells / 100
	return strings.Repeat("█", full) + strings.Repeat("░", barCells-full)
}

// pad cuts or pads a cell to n runes.
func pad(s string, n int) string {
	r := []rune(s)
	if len(r) > n {
		return string(r[:n])
	}
	return s + strings.Repeat(" ", n-len(r))
}

func (s *topScreen) top() []string {
	slots := 0
	for _, j := range s.Gov.Jobs {
		slots += j.Slots
	}
	lines := []string{fmt.Sprintf("claude-packs top  %s   load %s   grants: %d slots held by %d jobs, %d waiting",
		s.Now.UTC().Format("2006-01-02 15:04:05Z"), s.Load, slots, len(s.Gov.Jobs), len(s.Gov.Waiting))}
	for _, j := range s.Gov.Jobs {
		lines = append(lines, fmt.Sprintf("  %s %s %d slots  %s  %s%s", pad(j.ID, 9), pad(j.Kind, 6), j.Slots, pad(baseName(j.Project), 10), strings.TrimSuffix(since(s.Now.Sub(j.Started)), " ago"), map[bool]string{true: "  paused"}[j.Paused]))
	}
	for _, j := range s.Gov.Waiting {
		lines = append(lines, fmt.Sprintf("  %s %s waits for %d slots  %s", pad(j.ID, 9), pad(j.Kind, 6), j.Slots, baseName(j.Project)))
	}
	return lines
}

func baseName(path string) string { return path[strings.LastIndex(path, "/")+1:] }

func (p *topProject) header() string {
	var sum usage
	for _, r := range p.Rows {
		sum.CPU, sum.RssMb, sum.Procs = sum.CPU+r.Use.CPU, sum.RssMb+r.Use.RssMb, sum.Procs+r.Use.Procs
	}
	return fmt.Sprintf("%s %s %3d%%  %d items left · %s · %d agents  %d proc · %.1f cpu · %s", pad(p.Name, 12), bar(p.Percent), p.Percent, p.Left, orDash(p.Step), p.agents(), sum.Procs, sum.CPU/100, memText(sum.RssMb))
}

func (r *topRow) line() string {
	return fmt.Sprintf("%s %s %s %s %s %s %s %s  %s", pad(r.Name, 8), pad(r.Step, 8), pad(r.Model, 7), pad(r.Worktree, 21),
		pad(fmt.Sprintf("%d%%", int(r.Use.CPU+0.5)), 5), pad(memText(r.Use.RssMb), 6), pad(fmt.Sprintf("%dp", r.Use.Procs), 4), pad(since(r.Silent), 8), r.Last)
}

const rowHead = "    NAME     STEP     MODEL   WORKTREE              CPU   MEM    PROC SINCE     LAST ACTION"

// render draws the frame; a page when one is open.
func (s *topScreen) render() string {
	var lines []string
	if s.Open != "" {
		lines = s.page()
	} else {
		lines = append(s.top(), "", rowHead)
		for i, it := range s.items() {
			mark := "  "
			if i == s.Cursor {
				mark = "> "
			}
			if it.Row == nil {
				lines = append(lines, mark+it.Project.headerAt(s.Now))
			} else {
				lines = append(lines, mark+"  "+it.Row.line())
			}
		}
		lines = append(lines, "", "q quit   up/down move   enter open")
	}
	for i, l := range lines {
		if s.Width > 0 {
			lines[i] = strings.TrimRight(pad(l, max(s.Width, 20)), " ")
		}
	}
	return strings.Join(lines, "\n") + "\n"
}

// headerAt: the project's line, a stale one saying how long since anything moved.
func (p *topProject) headerAt(now time.Time) string {
	if !p.Stale {
		return p.header()
	}
	return fmt.Sprintf("%s %s %3d%%  %d items left · stale, last seen %s", pad(p.Name, 12), bar(p.Percent), p.Percent, p.Left, since(now.Sub(p.Newest)))
}

// page: the open item's last 20 actions, a project's across its lead and agents.
func (s *topScreen) page() []string {
	var title string
	var acts []action
	for _, it := range s.items() {
		if it.Key != s.Open {
			continue
		}
		if it.Row != nil {
			title = fmt.Sprintf("%s / %s   %s   %s   %s", it.Project.Name, it.Row.Name, it.Row.Step, it.Row.Model, it.Row.Worktree)
			acts = it.Row.Actions
			break
		}
		title = fmt.Sprintf("%s   %s", it.Project.Name, it.Project.headerAt(s.Now)[13:])
		for _, r := range it.Project.Rows {
			for _, a := range r.Actions {
				acts = append(acts, action{a.At, pad(r.Name, 8) + " " + a.Text})
			}
		}
		sort.SliceStable(acts, func(i, j int) bool { return acts[i].At.Before(acts[j].At) })
	}
	lines := []string{title, "", "last " + fmt.Sprint(maxActions) + " actions:"}
	acts = acts[max(len(acts)-maxActions, 0):]
	for i := len(acts) - 1; i >= 0; i-- {
		lines = append(lines, fmt.Sprintf("  %s  %s  (%s)", acts[i].At.UTC().Format("15:04:05"), acts[i].Text, since(s.Now.Sub(acts[i].At))))
	}
	if len(acts) == 0 {
		lines = append(lines, "  none in the event log")
	}
	return append(lines, "", "enter, q or esc: back")
}
