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
	"strconv"
	"strings"
)

const (
	protocol = 1
	// a request whose stdin is longer than this is the TypeScript runner's (review-2 1.9)
	maxStdin = 64 * 1024 * 1024
	maxReply = 64 * 1024 * 1024
	// macOS's sun_path is 104 bytes and Linux's 108: past this the socket lives under /tmp (review-2 3.11)
	maxSocketPath = 100
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
	return sha(strings.Join([]string{"claude-packs", strconv.Itoa(uid), project, sha(lock), node}, "\x00"))[:16]
}

// cacheFolder: CLAUDE_PACKS_CACHE, else $XDG_RUNTIME_DIR/claude-packs, else ~/Library/Caches/claude-packs (macOS) or ~/.cache/claude-packs.
func cacheFolder(get func(string) string, home, goos string) string {
	if v := get("CLAUDE_PACKS_CACHE"); v != "" {
		return v
	}
	if v := get("XDG_RUNTIME_DIR"); v != "" {
		return filepath.Join(v, "claude-packs")
	}
	if goos == "darwin" {
		return filepath.Join(home, "Library", "Caches", "claude-packs")
	}
	return filepath.Join(home, ".cache", "claude-packs")
}

// files: the daemon's files for a key, all in one folder, which is /tmp/claude-packs-<uid> when the socket's path would be too long.
type files struct{ folder, socket, lock string }

func daemonFiles(folder, key string, uid int) files {
	at := func(dir string) files {
		return files{folder: dir, socket: filepath.Join(dir, key+".sock"), lock: filepath.Join(dir, key+".lock")}
	}
	first := at(folder)
	if len(first.socket) > maxSocketPath {
		return at(filepath.Join("/tmp", "claude-packs-"+strconv.Itoa(uid)))
	}
	return first
}
