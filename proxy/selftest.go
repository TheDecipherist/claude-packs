// hook-proxy --selftest: the client's own proof, the way every hook has one (review-2-go 6.1). Each case plants a fault in a fake daemon
// it starts in-process (a stale socket, a reply cut after 3 bytes, a reply past the deadline, a path over 104 bytes, a folder at mode
// 755, no node on PATH) and runs the client against a scratch project whose TypeScript runner is a stand-in that refuses (exit 2).
// A client that let the call through unjudged, or hung, fails the case. Each case was seen red by breaking the client in that way.
package main

import (
	"bytes"
	"fmt"
	"io"
	"net"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync/atomic"
	"time"
)

const (
	judgedMark = "judged by the TypeScript stand-in"
	// the stand-in runner: it reads the event and refuses it, the way `rm -rf` is refused by the real one
	runnerStub   = "import { readFileSync } from 'node:fs';\nreadFileSync(0);\nprocess.stderr.write('" + judgedMark + "\\n');\nprocess.exit(2);\n"
	residentStub = "import { writeFileSync } from 'node:fs';\n" +
		"writeFileSync(new URL('./started.json', import.meta.url), JSON.stringify({ cwd: process.cwd(), env: Object.keys(process.env).sort(), args: process.argv.slice(2) }));\n" +
		"writeFileSync(3, 'ready 1\\n');\n"
)

// rig is a scratch project, its daemon folder and a client process to run in them.
type rig struct {
	dir, project, cache string
	out, err            bytes.Buffer
	p                   *proc
}

func newRig(path string) (*rig, error) {
	dir, err := os.MkdirTemp("/tmp", "hp-") // short: a socket path is at most 104 bytes
	if err != nil {
		return nil, err
	}
	r := &rig{dir: realPath(dir)}
	r.project, r.cache = filepath.Join(r.dir, "project"), filepath.Join(r.dir, "cache")
	hooks := filepath.Join(r.project, ".claude", "hooks")
	for _, d := range []string{hooks, r.cache} {
		if err = os.MkdirAll(d, 0o700); err != nil {
			return nil, err
		}
	}
	for file, text := range map[string]string{filepath.Join(r.project, ".claude", "claude-packs.lock.json"): "{}\n", filepath.Join(hooks, "run-hooks.mjs"): runnerStub} {
		if err = os.WriteFile(file, []byte(text), 0o600); err != nil {
			return nil, err
		}
	}
	if path == "" {
		path = os.Getenv("PATH")
	}
	env := []string{"PATH=" + path, "HOME=" + r.dir, "CLAUDE_PROJECT_DIR=" + r.project, "CLAUDE_PACKS_CACHE=" + r.cache}
	r.p = &proc{env: env, cwd: r.project, ppid: os.Getppid(), uid: os.Getuid(), goos: runtime.GOOS, stdin: []byte(`{"hook_event_name":"PreToolUse","tool_name":"Bash"}`), stdout: &r.out, stderr: &r.err, timeout: 10 * time.Second, start: time.Now()}
	return r, nil
}

// setCache moves the daemon's folder (CLAUDE_PACKS_CACHE) to `dir`, made at mode 700.
func (r *rig) setCache(dir string) {
	os.MkdirAll(dir, 0o700)
	r.cache = dir
	r.p.env = append(r.p.env, "CLAUDE_PACKS_CACHE="+dir) // the last one wins
}

// socket is where the client will look for its daemon (the same names the client reads: wire.go).
func (r *rig) socket() string {
	node := realPath(lookPath(r.p.get("PATH"), "node"))
	return daemonFiles(r.cache, daemonKey(r.p.uid, r.project, "{}\n", node), r.p.uid).socket
}

func (r *rig) run() int {
	r.p.start = time.Now()
	return r.p.run()
}

// fake is a daemon in this process: it listens on `socket`, and `handle` answers each connection.
type fake struct {
	listener net.Listener
	conns    atomic.Int32
}

func serve(socket string, handle func(net.Conn)) (*fake, error) {
	l, err := net.Listen("unix", socket)
	if err != nil {
		return nil, err
	}
	f := &fake{listener: l}
	go func() {
		for {
			c, err := l.Accept()
			if err != nil {
				return
			}
			f.conns.Add(1)
			go func() { defer c.Close(); handle(c) }()
		}
	}()
	return f, nil
}

func answers(code int, out, errText string) func(net.Conn) {
	return func(c net.Conn) {
		io.CopyN(io.Discard, c, 4)
		c.Write(record([]byte(fmt.Sprintf(`{"code":%d,"stdout":%q,"stderr":%q}`, code, out, errText))))
	}
}

type result struct{ name, fault string }

func expect(name string, ok bool, detail func() string) result {
	if ok {
		return result{name, ""}
	}
	return result{name, detail()}
}

// cases are the plants; each makes its own rig and returns what it saw.
func cases() []func() result {
	judged := func(r *rig, code int) bool { return code == 2 && strings.Contains(r.err.String(), judgedMark) }
	said := func(r *rig, code int) func() string {
		return func() string {
			return fmt.Sprintf("exit %d, stdout %q, stderr %q", code, r.out.String(), r.err.String())
		}
	}
	with := func(path string, plant func(r *rig) (*fake, error), check func(r *rig, code int, f *fake) result) func() result {
		return func() result {
			r, err := newRig(path)
			if err != nil {
				return result{"rig", err.Error()}
			}
			defer os.RemoveAll(r.dir)
			f, err := plant(r)
			if err != nil {
				return result{"plant", err.Error()}
			}
			if f != nil {
				defer f.listener.Close()
			}
			return check(r, r.run(), f)
		}
	}
	none := func(*rig) (*fake, error) { return nil, nil }
	return []func() result{
		with("", func(r *rig) (*fake, error) { return serve(r.socket(), answers(2, "S", "E")) }, func(r *rig, code int, f *fake) result {
			return expect("a daemon's reply is forwarded: stdout, stderr and its code", code == 2 && r.out.String() == "S" && r.err.String() == "E" && f.conns.Load() == 1, said(r, code))
		}),
		with("", func(r *rig) (*fake, error) {
			f, err := serve(r.socket(), answers(0, "", ""))
			if err == nil {
				f.listener.(*net.UnixListener).SetUnlinkOnClose(false)
				f.listener.Close()
			}
			return f, err
		}, func(r *rig, code int, _ *fake) result {
			return expect("a stale socket is judged by the TypeScript runner, never exit 0", judged(r, code), said(r, code))
		}),
		with("", func(r *rig) (*fake, error) {
			return serve(r.socket(), func(c net.Conn) { io.CopyN(io.Discard, c, 4); c.Write([]byte{0, 0, 0}) })
		}, func(r *rig, code int, _ *fake) result {
			return expect("a reply closed after 3 bytes is judged by the TypeScript runner, never exit 0", judged(r, code), said(r, code))
		}),
		with("", func(r *rig) (*fake, error) {
			r.p.timeout = 1250 * time.Millisecond // the deadline is a second less: 250 ms
			return serve(r.socket(), func(c net.Conn) { time.Sleep(3 * time.Second) })
		}, func(r *rig, code int, _ *fake) result {
			return expect("a reply past the deadline is judged by the TypeScript runner, and the client does not wait", judged(r, code) && time.Since(r.p.start) < 2500*time.Millisecond, said(r, code))
		}),
		with("", func(r *rig) (*fake, error) {
			r.setCache(longCache(r.dir)) // its socket would be over 100 bytes
			if err := os.MkdirAll(filepath.Dir(r.socket()), 0o700); err != nil {
				return nil, err
			}
			return serve(r.socket(), answers(0, `{"x":1}`, ""))
		}, func(r *rig, code int, _ *fake) result {
			return expect("a socket path over 104 bytes is served from the short folder", code == 0 && strings.HasPrefix(r.socket(), "/tmp/") && len(r.socket()) < 104 && r.out.String() == `{"x":1}`, said(r, code))
		}),
		with("", func(r *rig) (*fake, error) {
			return serve(r.socket(), func(c net.Conn) {
				io.CopyN(io.Discard, c, 4)
				c.Write(record([]byte(`{"code":0,"stdout":"","stderr":"","fallback":"ts"}`)))
			})
		}, func(r *rig, code int, _ *fake) result {
			return expect("a reply that declines the event (fallback ts) is judged by the TypeScript runner", judged(r, code), said(r, code))
		}),
		with("", func(r *rig) (*fake, error) {
			f, err := serve(r.socket(), answers(0, "", ""))
			os.Chmod(r.cache, 0o755)
			return f, err
		}, func(r *rig, code int, f *fake) result {
			return expect("a folder at mode 755 is not used: the daemon is not asked", judged(r, code) && f.conns.Load() == 0, said(r, code))
		}),
		func() result {
			empty, _ := os.MkdirTemp("", "hook-proxy-path-")
			defer os.RemoveAll(empty)
			r, err := newRig(empty)
			if err != nil {
				return result{"rig", err.Error()}
			}
			defer os.RemoveAll(r.dir)
			code := r.run()
			return expect("no node on PATH: the call goes through, said in a systemMessage", code == 0 && strings.Contains(r.out.String(), `"systemMessage"`) && strings.Contains(r.out.String(), "node is not on PATH"), said(r, code))
		},
		with("", none, func(r *rig, code int, _ *fake) result {
			r.p.spawn, r.p.ready = true, 10*time.Second
			os.WriteFile(filepath.Join(r.project, ".claude", "hooks", "resident.mjs"), []byte(residentStub), 0o600)
			r.out.Reset()
			r.err.Reset()
			code = r.run()
			started, _ := os.ReadFile(filepath.Join(r.project, ".claude", "hooks", "started.json"))
			ok := judged(r, code) && strings.Contains(string(started), `"cwd":"/"`) && strings.Contains(strings.ReplaceAll(string(started), `,"__CF_USER_TEXT_ENCODING"`, ""), `"env":["CLAUDE_PACKS_CACHE","HOME","PATH"]`) &&
				strings.Contains(string(started), `"--serve","`+r.project+`"`) && strings.Contains(string(started), `"--ready-fd","3"`)
			return expect("no daemon: this event is judged by the TypeScript runner and a daemon is started in `/` with HOME, PATH and the cache only", ok, func() string { return said(r, code)() + " started: " + string(started) })
		}),
	}
}

// longCache is a folder whose socket path would pass 100 bytes, for the case that needs one.
func longCache(base string) string { return filepath.Join(base, strings.Repeat("d", 70)) }

// selftest runs every case, says each on `w`, and returns the exit code: 0 when all were caught.
func selftest(w io.Writer) int {
	failed := 0
	all := cases()
	for _, run := range all {
		if r := run(); r.fault != "" {
			failed++
			fmt.Fprintf(w, "FAIL: %s\n      %s\n", r.name, r.fault)
		} else {
			fmt.Fprintf(w, "ok: %s\n", r.name)
		}
	}
	if failed > 0 {
		fmt.Fprintf(w, "%d of %d cases failed\n", failed, len(all))
		return 1
	}
	fmt.Fprintf(w, "OK: hook-proxy, %d cases\n", len(all))
	return 0
}
