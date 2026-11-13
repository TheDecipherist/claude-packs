package main

import (
	"bytes"
	"encoding/binary"
	"encoding/json"
	"io"
	"net"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// plantTop writes the planted machine of testdata/top-plant.json (3 projects, one with 4 live agents, one with none, one stale, and a
// governor with 2 jobs and 1 waiter) into a temp folder and returns it; the TypeScript frame test reads the same file.
func plantTop(t *testing.T) string {
	t.Helper()
	body, err := os.ReadFile("testdata/top-plant.json")
	if err != nil {
		t.Fatal(err)
	}
	var plant struct {
		Files map[string]string `json:"files"`
	}
	if err := json.Unmarshal(body, &plant); err != nil {
		t.Fatal(err)
	}
	dir := t.TempDir()
	for name, text := range plant.Files {
		file := filepath.Join(dir, name)
		os.MkdirAll(filepath.Dir(file), 0o755)
		if err := os.WriteFile(file, []byte(text), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	return dir
}

func topFrame(t *testing.T, dir string, extra ...string) string {
	t.Helper()
	args := []string{"--once", "--now", "2026-11-13T12:00:00Z", "--width", "118", "--load", "2.10 1.80 1.50", "--usage", ".claude/top-usage.json",
		"--governor", filepath.Join(dir, "governor"), "--no-daemon"}
	args = append(append(args, extra...), filepath.Join(dir, "shop"), filepath.Join(dir, "quiet"), filepath.Join(dir, "old"))
	var out bytes.Buffer
	if code := runTop(args, &out); code != 0 {
		t.Fatalf("top exit %d: %s", code, out.String())
	}
	return out.String()
}

// The planted state renders to the golden frame, every agent with its last action and the time since it.
func TestTopFrameIsTheGolden(t *testing.T) {
	got := topFrame(t, plantTop(t))
	golden := filepath.Join("testdata", "top-frame.golden")
	if os.Getenv("UPDATE_GOLDEN") != "" {
		os.WriteFile(golden, []byte(got), 0o644)
	}
	want, err := os.ReadFile(golden)
	if err != nil {
		t.Fatal(err)
	}
	if got != string(want) {
		t.Errorf("frame differs from the golden:\n%s\n--- golden:\n%s", got, want)
	}
}

// Each field of an agent's row is in the frame; a frame that dropped one is named (the plant: the last action cut from every row).
func TestTopFrameHoldsEveryField(t *testing.T) {
	got := topFrame(t, plantTop(t))
	for _, want := range []string{"a1", "a4", "sonnet", "opus", ".claude/worktrees/a1", "142%", "1.2G", "5p", "2s ago", "Edit src/import.ts", "Bash npm run test:changed", "Write lib/new.ts", "load 2.10 1.80 1.50", "4 agents", "stale"} {
		if !strings.Contains(got, want) {
			t.Errorf("the frame lacks %q", want)
		}
	}
	if missing := missingFields(strings.ReplaceAll(got, "Edit src/import.ts", "")); len(missing) == 0 {
		t.Errorf("a frame with a last action dropped passed the field check")
	}
}

// Enter on an agent shows its last 20 actions; the quiet project's lead has one.
func TestTopOpenShowsActions(t *testing.T) {
	got := topFrame(t, plantTop(t), "--open", "shop/a2")
	if !strings.Contains(got, "a2") || !strings.Contains(got, "Bash npm run test:changed") || strings.Contains(got, "a1 ") {
		t.Errorf("the agent's page is wrong:\n%s", got)
	}
}

func TestTopStaleProjectHasNoAgents(t *testing.T) {
	got := topFrame(t, plantTop(t))
	if strings.Contains(got, "z1") {
		t.Errorf("a stale agent is listed:\n%s", got)
	}
}

// missingFields names the planted fields a frame lacks (what the dropped-field plant is judged by).
func missingFields(frame string) []string {
	var out []string
	for _, f := range []string{"Edit src/import.ts", "Bash npm run test:changed", "Write lib/new.ts", "2s ago", "142%", "1.2G", "5p", "sonnet"} {
		if !strings.Contains(frame, f) {
			out = append(out, f)
		}
	}
	return out
}

// A daemon that answers `status` lays its board over the files: its agent is listed with the daemon's usage and last action, and a
// project with no files of its own is not stale.
func TestTopReadsTheDaemonsBoard(t *testing.T) {
	needNode(t)
	r, err := newRig("")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(r.dir)
	f, err := serve(r.socket(), func(c net.Conn) {
		n := make([]byte, 4)
		io.ReadFull(c, n)
		body := make([]byte, binary.BigEndian.Uint32(n))
		io.ReadFull(c, body)
		if !strings.Contains(string(body), `"status":true`) {
			t.Errorf("the ask is not a status ask: %s", body)
		}
		state := `{"usage":{"agent:dd":{"cpu":250,"rssMb":512,"procs":4}},"board":[{"who":"lead","owner":"session:1","tool":"Bash","target":"git log","silentMs":3000},{"who":"dd","owner":"agent:dd","tool":"Edit","target":"a.ts","silentMs":9000}]}`
		out, _ := json.Marshal(map[string]any{"code": 0, "stdout": state, "stderr": ""})
		c.Write(record(out))
	})
	if err != nil {
		t.Fatal(err)
	}
	defer f.listener.Close()
	tp := newTopper(&topOptions{})
	tp.proc = r.p
	p := loadProject(r.project, time.Now())
	tp.overlayDaemon(p, time.Now())
	if p.Stale || p.agents() != 1 || p.Rows[1].Name != "dd" || p.Rows[1].Use.Procs != 4 || p.Rows[1].Last != "Edit a.ts" || p.Rows[1].Silent != 9*time.Second {
		t.Errorf("the board was not laid over the files: %+v", p.Rows[1])
	}
}

// Keys: an arrow moves, enter opens the item, q and escape and enter go back, q at the top quits.
func TestTopKeys(t *testing.T) {
	tp := &topper{}
	s := &topScreen{Projects: []*topProject{{Name: "p", Rows: []*topRow{{Name: leadName}, {Name: "a"}}}}}
	steps := []struct {
		bytes string
		open  string
		quit  bool
	}{{"\x1b[B", "", false}, {"\x1b[B", "", false}, {"\r", "p/a", false}, {"\x1b", "", false}, {"\x1b[A", "", false}, {"\r", "p/lead", false}, {"q", "", false}, {"q", "", true}}
	for _, st := range steps {
		if quit := tp.press(keyOf([]byte(st.bytes)), s); quit != st.quit || tp.open != st.open {
			t.Fatalf("key %q: open %q quit %v, want %q %v", st.bytes, tp.open, quit, st.open, st.quit)
		}
	}
}
