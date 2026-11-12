package main

import (
	"encoding/binary"
	"io"
	"net"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// statusRig is a rig whose project has a TypeScript status line (a node script that prints SLOW) and the session JSON on stdin.
func statusRig(t *testing.T) *rig {
	t.Helper()
	needNode(t)
	r, err := newRig("")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { os.RemoveAll(r.dir) })
	tools := filepath.Join(r.project, ".claude", "tools")
	os.MkdirAll(tools, 0o700)
	os.WriteFile(filepath.Join(tools, "statusline.mjs"), []byte("process.stdout.write('SLOW');\n"), 0o600)
	r.p.stdin = []byte(`{"session_id":"s"}`)
	return r
}

// The ask is a status ask that wants the line drawn, carries the session JSON as stdin, and the reply's stdout is the line.
func TestStatusPrintsTheDaemonsLine(t *testing.T) {
	r := statusRig(t)
	seen := make(chan string, 1)
	f, err := serve(r.socket(), func(c net.Conn) {
		var got strings.Builder
		for i := 0; i < 2; i++ { // the header's record, then stdin's
			n := make([]byte, 4)
			io.ReadFull(c, n)
			body := make([]byte, binary.BigEndian.Uint32(n))
			io.ReadFull(c, body)
			got.Write(body)
		}
		seen <- got.String()
		c.Write(record([]byte(`{"code":0,"stdout":"THE LINE","stderr":""}`)))
	})
	if err != nil {
		t.Fatal(err)
	}
	defer f.listener.Close()
	if code := r.p.runStatus(); code != 0 || r.out.String() != "THE LINE" {
		t.Fatalf("exit %d, stdout %q", code, r.out.String())
	}
	got := <-seen
	for _, want := range []string{`"status":true`, `"render":true`, `{"session_id":"s"}`} {
		if !strings.Contains(got, want) {
			t.Errorf("the request lacks %s: %q", want, got)
		}
	}
}

// No daemon, a daemon that declines, and a daemon that does not answer in 50 ms: the TypeScript line is printed; no daemon is started.
func TestStatusFallsBackToTheTypeScriptLine(t *testing.T) {
	r := statusRig(t)
	if code := r.p.runStatus(); code != 0 || r.out.String() != "SLOW" {
		t.Fatalf("no daemon: exit %d, stdout %q", code, r.out.String())
	}
	if _, err := os.Stat(r.socket()); err == nil {
		t.Error("the status client started a daemon")
	}
	r.out.Reset()
	declines, _ := serve(r.socket(), func(c net.Conn) {
		io.CopyN(io.Discard, c, 4)
		c.Write(record([]byte(`{"code":0,"stdout":"","stderr":"","fallback":"ts"}`)))
	})
	r.p.start = time.Now()
	r.p.runStatus()
	declines.listener.Close()
	os.Remove(r.socket())
	if r.out.String() != "SLOW" {
		t.Errorf("a declined ask: stdout %q", r.out.String())
	}
	r.out.Reset()
	hung, _ := serve(r.socket(), func(c net.Conn) { io.Copy(io.Discard, c) })
	defer hung.listener.Close()
	r.p.start = time.Now()
	began := time.Now()
	r.p.runStatus()
	if r.out.String() != "SLOW" || time.Since(began) > time.Second {
		t.Errorf("a hung daemon: stdout %q after %v", r.out.String(), time.Since(began))
	}
}
