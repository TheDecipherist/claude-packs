// The protocol and the names the client shares with the resident runner (packs/base/hooks/lib/proxy-wire.mts is the owner: the
// frame, the request and the reply, the daemon's key and its files). A request is frame(header JSON) then frame(stdin's bytes); a
// reply is frame(JSON {code, stdout, stderr}), with "fallback":"ts" when the client is to run the TypeScript runner itself.
package main

import (
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"path/filepath"
	"slices"
	"strconv"
	"strings"
	"syscall"
)

type reply struct {
	Code     int
	Stdout   string
	Stderr   string
	Fallback bool
}

// record is one record on the wire: its length (big-endian u32), then its bytes.
func record(body []byte) []byte {
	return append(binary.BigEndian.AppendUint32(nil, uint32(len(body))), body...)
}

// request is the whole request, in one buffer so it goes out in one write: the header's record, then stdin's.
func request(header, stdin []byte) []byte { return append(record(header), record(stdin)...) }

// readReply reads one whole reply record. Anything short of that is an error: a cut reply is never exit 0.
func readReply(r io.Reader) (*reply, error) {
	n := make([]byte, 4)
	if _, err := io.ReadFull(r, n); err != nil {
		return nil, fmt.Errorf("reply cut before its length: %w", err)
	}
	size := binary.BigEndian.Uint32(n)
	if size > maxReply {
		return nil, fmt.Errorf("reply of %d bytes", size)
	}
	body := make([]byte, size)
	if _, err := io.ReadFull(r, body); err != nil {
		return nil, fmt.Errorf("reply cut short: %w", err)
	}
	var raw struct {
		Code     *int    `json:"code"`
		Stdout   *string `json:"stdout"`
		Stderr   *string `json:"stderr"`
		Fallback string  `json:"fallback"`
	}
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, fmt.Errorf("reply not a record: %w", err)
	}
	if raw.Code == nil || raw.Stdout == nil || raw.Stderr == nil {
		return nil, errors.New("reply is not {code, stdout, stderr}")
	}
	return &reply{Code: *raw.Code, Stdout: *raw.Stdout, Stderr: *raw.Stderr, Fallback: raw.Fallback == "ts"}, nil
}

func sha(text string) string {
	sum := sha256.Sum256([]byte(text))
	return hex.EncodeToString(sum[:])
}

// daemonKey: the 16 hex characters that name a daemon: the user, the project's real path, the lock's hash and node's path.
func daemonKey(uid int, project, lock, node string) string {
	return sha(strings.Join([]string{wireName, strconv.Itoa(uid), project, sha(lock), node}, "\x00"))[:16]
}

// cacheFolder: CLAUDE_PACKS_CACHE, else $XDG_RUNTIME_DIR/claude-packs, else ~/Library/Caches/claude-packs (macOS) or ~/.cache/claude-packs.
func cacheFolder(get func(string) string, home, goos string) string {
	if v := get(envCache); v != "" {
		return v
	}
	if v := get(envRuntime); v != "" {
		return filepath.Join(v, wireName)
	}
	if goos == "darwin" {
		return filepath.Join(home, "Library", "Caches", wireName)
	}
	return filepath.Join(home, ".cache", wireName)
}

// files: the daemon's files for a key, all in one folder, which is /tmp/claude-packs-<uid> when the socket's path would be too long.
type files struct{ folder, socket, lock string }

func daemonFiles(folder, key string, uid int) files {
	at := func(dir string) files {
		return files{folder: dir, socket: filepath.Join(dir, key+suffixSocket), lock: filepath.Join(dir, key+suffixLock)}
	}
	first := at(folder)
	if len(first.socket) > maxSocketPath {
		return at(filepath.Join("/tmp", tmpPrefix+strconv.Itoa(uid)))
	}
	return first
}

// pidAlive: whether a process exists. A process another user owns (EPERM) is alive, as lib/daemon-find.mts `alive` reads it.
func pidAlive(pid int) bool {
	err := syscall.Kill(pid, 0)
	return err == nil || err == syscall.EPERM
}

// keptEnv: the environment a detached daemon carries (daemonKeeps), the cache folder being the one the client resolved.
func keptEnv(get func(string) string, folder string) []string {
	out := []string{}
	for _, k := range daemonKeeps {
		v := get(k)
		if k == envCache {
			v = folder
		}
		if v != "" {
			out = append(out, k+"="+v)
		}
	}
	return out
}

// logLine: one hooks.log line in the column order of the table; a column the client has no value for reads as the empty mark.
func logLine(values map[string]string) string {
	cols := []string{}
	for _, c := range logColumns {
		v, ok := values[c]
		if !ok {
			if slices.Contains(logOptional, c) {
				continue
			}
			v = logEmpty
		}
		cols = append(cols, v)
	}
	return strings.Join(cols, "\t") + "\n"
}
