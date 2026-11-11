// W1.5 probe of d-10's client (not the product; W8.2 writes proxy/client.go). Per event: name the socket from the user, the
// project's realpath, the lock's hash and node's path; send a framed request and stdin; write the reply's stdout, then its
// stderr, and exit with its code. With no daemon, a stale socket, a cut reply or a missed deadline, it never exits 0 unjudged:
// it runs the TypeScript runner on the same stdin and starts one daemon behind it under an exclusive start lock.
//   env: CLAUDE_PROJECT_DIR, CLAUDE_PACKS_CACHE (the socket folder), PROBE_DAEMON (resident-probe.mjs), PROBE_TABLE (hook
//   names), PROBE_POOL, PROBE_DEADLINE_MS, PROBE_TRACE (a file the client appends its path to: "socket" or "fallback: why")
package main

import (
	"bufio"
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"
)

type reply struct {
	Code   int    `json:"code"`
	Stdout string `json:"stdout"`
	Stderr string `json:"stderr"`
}

func trace(line string) {
	if f, err := os.OpenFile(os.Getenv("PROBE_TRACE"), os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o600); err == nil {
		fmt.Fprintf(f, "%d %s\n", os.Getpid(), line)
		f.Close()
	}
}

func socketPath(project, node string) (dir, key, sock string, err error) {
	lock, _ := os.ReadFile(filepath.Join(project, ".claude", "claude-packs.lock.json"))
	lockSum := sha256.Sum256(lock)
	sum := sha256.Sum256([]byte(fmt.Sprintf("%d\x00%s\x00%x\x00%s", os.Getuid(), project, lockSum, node)))
	key = hex.EncodeToString(sum[:])[:16]
	dir = os.Getenv("CLAUDE_PACKS_CACHE")
	if err = os.MkdirAll(dir, 0o700); err != nil {
		return
	}
	st, err := os.Stat(dir)
	if err != nil {
		return
	}
	if st.Mode().Perm() != 0o700 || st.Sys().(*syscall.Stat_t).Uid != uint32(os.Getuid()) {
		err = fmt.Errorf("socket folder %s is not the user's at mode 700", dir)
		return
	}
	sock = filepath.Join(dir, key+".sock")
	if len(sock) > 100 { // a unix socket path is at most 104 bytes on macOS: the short folder
		short := fmt.Sprintf("/tmp/claude-packs-%d", os.Getuid())
		os.MkdirAll(short, 0o700)
		sock = filepath.Join(short, key+".sock")
	}
	return
}

func frame(w io.Writer, body []byte) error {
	n := make([]byte, 4)
	binary.BigEndian.PutUint32(n, uint32(len(body)))
	if _, err := w.Write(n); err != nil {
		return err
	}
	_, err := w.Write(body)
	return err
}

func ask(sock string, stdin []byte, deadline time.Duration) (*reply, error) {
	c, err := net.DialTimeout("unix", sock, 200*time.Millisecond)
	if err != nil {
		if _, statErr := os.Stat(sock); statErr == nil {
			os.Remove(sock) // unlinked only after a failed connect: a stale socket
		}
		return nil, fmt.Errorf("connect: %w", err)
	}
	defer c.Close()
	c.SetDeadline(time.Now().Add(deadline))
	cwd, _ := os.Getwd()
	env := map[string]string{}
	for _, kv := range os.Environ() {
		if k, v, ok := strings.Cut(kv, "="); ok && (strings.HasPrefix(k, "CLAUDE") || k == "HOME" || k == "PATH") {
			env[k] = v
		}
	}
	head, _ := json.Marshal(map[string]any{"v": 1, "env": env, "cwd": cwd, "ppid": os.Getppid(), "deadline": time.Now().Add(deadline).UnixMilli()})
	if err = frame(c, head); err == nil {
		err = frame(c, stdin)
	}
	if err != nil {
		return nil, fmt.Errorf("send: %w", err)
	}
	r := bufio.NewReader(c)
	n := make([]byte, 4)
	if _, err = io.ReadFull(r, n); err != nil {
		return nil, fmt.Errorf("reply cut before its length: %w", err)
	}
	body := make([]byte, binary.BigEndian.Uint32(n))
	if _, err = io.ReadFull(r, body); err != nil {
		return nil, fmt.Errorf("reply cut short: %w", err)
	}
	var out reply
	if err = json.Unmarshal(body, &out); err != nil {
		return nil, fmt.Errorf("reply not a record: %w", err)
	}
	return &out, nil
}

// The TypeScript runner on the same stdin: judged, as slow as today.
func fallback(project, node string, stdin []byte) int {
	args := []string{filepath.Join(project, ".claude", "hooks", "run-hooks.mjs")}
	for _, h := range strings.Split(os.Getenv("PROBE_TABLE"), ",") {
		if _, err := os.Stat(filepath.Join(project, ".claude", "hooks", h+".mjs")); err == nil {
			args = append(args, ".claude/hooks/"+h+".mjs")
		}
	}
	cmd := exec.Command(node, args...)
	cmd.Dir, cmd.Stdin, cmd.Stdout, cmd.Stderr = project, strings.NewReader(string(stdin)), os.Stdout, os.Stderr
	if err := cmd.Run(); err != nil {
		var exit *exec.ExitError
		if errors.As(err, &exit) {
			return exit.ExitCode()
		}
		fmt.Fprintf(os.Stdout, `{"systemMessage":"claude-packs: node could not start (%s): this call was not judged"}`+"\n", err)
		return 0
	}
	return 0
}

// One daemon, however many clients race: the start lock is created exclusively and holds the starter's pid.
func startDaemon(project, node, dir, key, sock string) {
	lockPath := filepath.Join(dir, key+".start")
	f, err := os.OpenFile(lockPath, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0o600)
	if err != nil {
		if st, e := os.Stat(lockPath); e == nil && time.Since(st.ModTime()) > 10*time.Second {
			os.Remove(lockPath) // a starter that died: the next client starts it
		}
		return
	}
	fmt.Fprintf(f, "%d\n", os.Getpid())
	f.Close()
	cmd := exec.Command(node, os.Getenv("PROBE_DAEMON"), "--sock", sock, "--hooks", filepath.Join(project, ".claude", "hooks"),
		"--table", os.Getenv("PROBE_TABLE"), "--pool", os.Getenv("PROBE_POOL"), "--pidfile", filepath.Join(dir, key+".pid"))
	cmd.Dir = "/"
	cmd.Env = []string{"HOME=" + os.Getenv("HOME"), "PATH=" + os.Getenv("PATH"), "CLAUDE_PACKS_CACHE=" + dir, "CLAUDE_PROJECT_DIR=" + project}
	cmd.SysProcAttr = &syscall.SysProcAttr{Setsid: true}
	ready, _ := cmd.StdoutPipe()
	if err = cmd.Start(); err != nil {
		os.Remove(lockPath)
		return
	}
	done := make(chan struct{})
	go func() { bufio.NewReader(ready).ReadString('\n'); close(done) }()
	select {
	case <-done:
	case <-time.After(3 * time.Second):
	}
	cmd.Process.Release()
	os.Remove(lockPath)
}

func main() {
	stdin, _ := io.ReadAll(os.Stdin)
	project, _ := filepath.EvalSymlinks(os.Getenv("CLAUDE_PROJECT_DIR"))
	node, err := exec.LookPath("node")
	if err != nil {
		fmt.Println(`{"systemMessage":"claude-packs: node is not on PATH: this call was not judged"}`)
		os.Exit(0)
	}
	deadline := 5 * time.Second
	if ms, e := strconv.Atoi(os.Getenv("PROBE_DEADLINE_MS")); e == nil {
		deadline = time.Duration(ms) * time.Millisecond
	}
	dir, key, sock, err := socketPath(project, node)
	if err == nil {
		var r *reply
		if r, err = ask(sock, stdin, deadline); err == nil {
			trace("socket " + sock)
			os.Stdout.WriteString(r.Stdout)
			os.Stderr.WriteString(r.Stderr)
			os.Exit(r.Code)
		}
	}
	trace("fallback: " + err.Error())
	code := fallback(project, node, stdin)
	if dir != "" {
		startDaemon(project, node, dir, key, sock)
	}
	os.Exit(code)
}
