// The monitor's terminal loop: the screen's alternate buffer, the terminal in raw mode (`stty`, no library), one redraw a second and on
// every key. Keys: q quits (or goes back), arrows or j and k move, enter opens or goes back, escape goes back.
package main

import (
	"fmt"
	"io"
	"os"
	"os/exec"
	"strings"
	"time"
)

// sttyDo runs stty on the terminal; its output is what `-g` saved.
func sttyDo(args ...string) (string, error) {
	cmd := exec.Command("stty", args...)
	cmd.Stdin = os.Stdin
	b, err := cmd.Output()
	return strings.TrimSpace(string(b)), err
}

// keyOf names what the bytes of one read are: an arrow (escape, `[`, A or B), a lone escape, or the first byte.
func keyOf(b []byte) string {
	switch {
	case len(b) >= 3 && b[0] == keyEscape && b[1] == '[':
		return map[byte]string{keyUp: "up", keyDown: "down"}[b[2]]
	case len(b) == 1 && b[0] == keyEscape:
		return "esc"
	case len(b) >= 1 && (b[0] == keyEnter || b[0] == '\n'):
		return "enter"
	case len(b) >= 1 && b[0] == keyCtrlC:
		return "q"
	case len(b) >= 1:
		return map[byte]string{'q': "q", 'k': "up", 'j': "down"}[b[0]]
	}
	return ""
}

// press applies a key to the cursor and the open page; it says whether the monitor ends.
func (t *topper) press(key string, s *topScreen) (quit bool) {
	items := s.items()
	switch {
	case key == "q" && t.open == "":
		return true
	case key == "q" || key == "esc" || (key == "enter" && t.open != ""):
		t.open = ""
	case key == "up":
		t.cursor = max(t.cursor-1, 0)
	case key == "down":
		t.cursor = min(t.cursor+1, max(len(items)-1, 0))
	case key == "enter" && t.cursor < len(items):
		t.open = items[t.cursor].Key
	}
	return false
}

func (t *topper) live(out io.Writer) int {
	saved, err := sttyDo("-g")
	if err != nil {
		fmt.Fprintln(os.Stderr, "hook-proxy top: stdin is not a terminal (use --once to print a frame)")
		return 1
	}
	sttyDo("raw", "-echo")
	fmt.Fprint(out, altScreenOn)
	defer func() { fmt.Fprint(out, altScreenOff); sttyDo(saved) }()
	keys := make(chan string)
	go func() {
		buf := make([]byte, 8)
		for {
			n, err := os.Stdin.Read(buf)
			if err != nil {
				close(keys)
				return
			}
			keys <- keyOf(buf[:n])
		}
	}()
	tick := time.NewTicker(topTick)
	defer tick.Stop()
	s := t.drawn(out, nil)
	for {
		select {
		case key, ok := <-keys:
			if !ok || t.press(key, s) {
				return 0
			}
			s = t.drawn(out, s)
		case <-tick.C:
			s = t.drawn(out, nil)
		}
	}
}

// drawn draws the frame, from a fresh reading of the machine unless `again` is the screen of a moment ago.
func (t *topper) drawn(out io.Writer, again *topScreen) *topScreen {
	s := again
	if s == nil {
		t.o.width = ttySize()
		s = t.screen(true)
	}
	s.Cursor, s.Open = t.cursor, t.open
	fmt.Fprint(out, clearAndHome, highlight(strings.ReplaceAll(s.render(), "\n", "\r\n"), t.open == ""))
	return s
}

// highlight puts the cursor's line in reverse video (the line the frame marks with `>`), and a stale project's in dim.
func highlight(frame string, marked bool) string {
	lines := strings.Split(frame, "\r\n")
	for i, l := range lines {
		switch {
		case marked && strings.HasPrefix(l, "> "):
			lines[i] = reverseOn + l + reverseOff
		case strings.Contains(l, "· stale, last seen"):
			lines[i] = dimOn + l + reverseOff
		}
	}
	return strings.Join(lines, "\r\n")
}
