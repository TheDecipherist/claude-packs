package main

import (
	"bytes"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

func needNode(t *testing.T) {
	t.Helper()
	if _, err := exec.LookPath("node"); err != nil {
		t.Skip("node is not on PATH")
	}
}

// The selftest is the client's proof: every plant is caught (hook-proxy --selftest runs the same cases).
func TestSelftest(t *testing.T) {
	needNode(t)
	var out bytes.Buffer
	if code := selftest(&out); code != 0 {
		t.Fatalf("selftest exit %d:\n%s", code, out.String())
	}
}

// The key and the folder are the TypeScript owner's (proxy-wire.mts daemonKey): the vectors were made by it.
func TestKeyIsTheTypeScriptKey(t *testing.T) {
	if got := daemonKey(501, "/work/p", "{\"a\":1}\n", "/usr/local/bin/node"); got != "d77e272e6e58fdfc" {
		t.Errorf("key %s", got)
	}
	if got := daemonKey(0, "/work/ünï", "", "/n"); got != "111a3723b5fa4e36" {
		t.Errorf("key %s", got)
	}
}

func TestCacheFolderOrder(t *testing.T) {
	env := func(m map[string]string) func(string) string { return func(k string) string { return m[k] } }
	cases := []struct {
		env  map[string]string
		goos string
		want string
	}{
		{map[string]string{"CLAUDE_PACKS_CACHE": "/c", "XDG_RUNTIME_DIR": "/x"}, "darwin", "/c"},
		{map[string]string{"XDG_RUNTIME_DIR": "/x"}, "linux", "/x/claude-packs"},
		{nil, "darwin", "/h/Library/Caches/claude-packs"},
		{nil, "linux", "/h/.cache/claude-packs"},
	}
	for _, c := range cases {
		if got := cacheFolder(env(c.env), "/h", c.goos); got != c.want {
			t.Errorf("%v %s: %s, want %s", c.env, c.goos, got, c.want)
		}
	}
}

// A socket path over 100 bytes (macOS allows 104) moves every file to /tmp/claude-packs-<uid>; a 90-character HOME does too.
func TestSocketPathStaysUnderTheLimit(t *testing.T) {
	home := "/Users/" + strings.Repeat("h", 82)
	f := daemonFiles(cacheFolder(func(string) string { return "" }, home, "darwin"), "0123456789abcdef", 501)
	if f.folder != "/tmp/claude-packs-501" || len(f.socket) >= 104 || filepath.Dir(f.lock) != f.folder {
		t.Errorf("%+v", f)
	}
	short := daemonFiles("/c", "0123456789abcdef", 501)
	if short.socket != "/c/0123456789abcdef.sock" {
		t.Errorf("%+v", short)
	}
}

// No prefix of a reply record is a reply: a cut reply is never read as exit 0.
func TestEveryPrefixOfAReplyIsNotAReply(t *testing.T) {
	whole := record([]byte(`{"code":2,"stdout":"o","stderr":"e"}`))
	if r, err := readReply(bytes.NewReader(whole)); err != nil || r.Code != 2 || r.Stdout != "o" || r.Stderr != "e" || r.Fallback {
		t.Fatalf("whole: %+v %v", r, err)
	}
	for n := 0; n < len(whole); n++ {
		if r, err := readReply(bytes.NewReader(whole[:n])); err == nil {
			t.Fatalf("a prefix of %d bytes was read as %+v", n, r)
		}
	}
	for _, bad := range []string{`{}`, `{"code":1}`, `{"code":"2","stdout":"","stderr":""}`, `nope`} {
		if _, err := readReply(bytes.NewReader(record([]byte(bad)))); err == nil {
			t.Errorf("%s was read as a reply", bad)
		}
	}
}

// A request over 64 MB is the TypeScript runner's and no connection is made.
func TestAHugeRequestIsJudgedByTypeScript(t *testing.T) {
	needNode(t)
	r, err := newRig("")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(r.dir)
	f, err := serve(r.socket(), answers(0, "", ""))
	if err != nil {
		t.Fatal(err)
	}
	defer f.listener.Close()
	r.p.stdin = make([]byte, maxStdin+1)
	if code := r.run(); code != 2 || !strings.Contains(r.err.String(), judgedMark) || f.conns.Load() != 0 {
		t.Errorf("exit %d, stderr %q, connections %d", code, r.err.String(), f.conns.Load())
	}
}

// The client's own line in hooks.log: the event's name and tool, its wall, hook proxy and source proxy.
func TestTheProxyLine(t *testing.T) {
	needNode(t)
	r, err := newRig("")
	if err != nil {
		t.Fatal(err)
	}
	defer os.RemoveAll(r.dir)
	f, _ := serve(r.socket(), answers(0, "", ""))
	defer f.listener.Close()
	r.run()
	log, _ := os.ReadFile(filepath.Join(r.project, ".claude", "hooks.log"))
	line := regexp.MustCompile(`^\d{4}-\d\d-\d\dT[\d:.]+Z\tPreToolUse\tproxy\t\d+\t0\tBash\t0\tproxy\n$`)
	if !line.Match(log) {
		t.Errorf("hooks.log: %q", log)
	}
}
