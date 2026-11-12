package main

import (
	"encoding/binary"
	"io"
	"net"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// loadRig is a rig whose project has a TypeScript load tool that prints its words after SLOW and exits 1.
func loadRig(t *testing.T) *rig {
	t.Helper()
	needNode(t)
	r, err := newRig("")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { os.RemoveAll(r.dir) })
	tools := filepath.Join(r.project, ".claude", "tools")
	os.MkdirAll(tools, 0o700)
	os.WriteFile(filepath.Join(tools, "load.mjs"), []byte("process.stdout.write('SLOW ' + process.argv.slice(2).join(' ')); process.exit(1);\n"), 0o600)
	return r
}

// The ask carries the words in the header's `load`; the daemon's answer is printed and its code is the exit code.
func TestLoadPrintsTheDaemonsAnswer(t *testing.T) {
	r := loadRig(t)
	seen := make(chan string, 1)
	f, err := serve(r.socket(), func(c net.Conn) {
		n := make([]byte, 4)
		io.ReadFull(c, n)
		body := make([]byte, binary.BigEndian.Uint32(n))
		io.ReadFull(c, body)
		seen <- string(body)
		c.Write(record([]byte(`{"code":1,"stdout":"wait: load 14.1 over the ceiling 13\n","stderr":""}`)))
	})
	if err != nil {
		t.Fatal(err)
	}
	defer f.listener.Close()
	if code := r.p.runLoad([]string{"ask", "--for", "test"}); code != 1 || r.out.String() != "wait: load 14.1 over the ceiling 13\n" {
		t.Fatalf("exit %d, stdout %q", code, r.out.String())
	}
	if got := <-seen; !strings.Contains(got, `"load":["ask","--for","test"]`) {
		t.Errorf("the request lacks the words: %q", got)
	}
}

// No daemon, and a daemon that declines: the TypeScript tool answers the same words, its exit code kept; no daemon is started.
func TestLoadFallsBackToTheTypeScriptTool(t *testing.T) {
	r := loadRig(t)
	if code := r.p.runLoad([]string{"ask", "--json"}); code != 1 || r.out.String() != "SLOW ask --json" {
		t.Fatalf("no daemon: exit %d, stdout %q", code, r.out.String())
	}
	if _, err := os.Stat(r.socket()); err == nil {
		t.Error("the load client started a daemon")
	}
	r.out.Reset()
	declines, _ := serve(r.socket(), func(c net.Conn) {
		io.CopyN(io.Discard, c, 4)
		c.Write(record([]byte(`{"code":0,"stdout":"","stderr":"","fallback":"ts"}`)))
	})
	defer declines.listener.Close()
	if code := r.p.runLoad([]string{"jobs"}); code != 1 || r.out.String() != "SLOW jobs" {
		t.Errorf("a declined ask: exit %d, stdout %q", code, r.out.String())
	}
}
