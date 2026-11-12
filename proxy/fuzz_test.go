package main

import (
	"bytes"
	"encoding/binary"
	"net"
	"os"
	"strings"
	"testing"
)

// The client's frame reader under abuse (typescript order W10b item 3). A seed run is part of `go test`; the 10-minute run is
// `go test -run '^$' -fuzz FuzzReadReply -fuzztime 10m` (its output is kept in build/evidence/W10b/).
// The seeds are the abuse the order names: a cut frame, a length over the cap, bad JSON, a zero length, a megabyte of garbage.
func replySeeds() map[string][]byte {
	whole := record([]byte(`{"code":2,"stdout":"","stderr":"no"}`))
	over := binary.BigEndian.AppendUint32(nil, maxReply+1)
	huge := binary.BigEndian.AppendUint32(nil, 0xffffffff)
	garbage := bytes.Repeat([]byte{0xde, 0xad, 0xbe, 0xef, 0x00, 0x7b}, 1<<20/6)
	return map[string][]byte{
		"whole":          whole,
		"cut in length":  whole[:2],
		"cut in body":    whole[:len(whole)-3],
		"empty":          {},
		"zero length":    record(nil),
		"over the cap":   over,
		"max u32":        huge,
		"bad json":       record([]byte(`{"code":`)),
		"not an object":  record([]byte(`[1,2]`)),
		"null fields":    record([]byte(`{"code":null,"stdout":null,"stderr":null}`)),
		"missing stderr": record([]byte(`{"code":0,"stdout":""}`)),
		"code a string":  record([]byte(`{"code":"0","stdout":"","stderr":""}`)),
		"garbage":        garbage,
		"garbage framed": record(garbage),
	}
}

// A reply is whole or an error, nothing else: it never panics, and a reply it returns carries all three fields.
func FuzzReadReply(f *testing.F) {
	for _, seed := range replySeeds() {
		f.Add(seed)
	}
	f.Fuzz(func(t *testing.T, data []byte) {
		r, err := readReply(bytes.NewReader(data))
		if (r == nil) == (err == nil) {
			t.Fatalf("reply %v with error %v", r, err)
		}
		if r != nil && (len(data) < 4 || int(binary.BigEndian.Uint32(data)) > len(data)-4) {
			t.Fatalf("a reply from %d bytes whose frame is not whole", len(data))
		}
	})
}

// A whole record read back is the one written: framing is the same both ways.
func FuzzRecordRoundTrip(f *testing.F) {
	f.Add([]byte("x"))
	f.Add([]byte{})
	f.Fuzz(func(t *testing.T, body []byte) {
		out := record(body)
		if n := binary.BigEndian.Uint32(out); int(n) != len(body) || !bytes.Equal(out[4:], body) {
			t.Fatalf("record of %d bytes is %d + %d", len(body), n, len(out)-4)
		}
		if r, err := readReply(bytes.NewReader(out)); err == nil && r == nil {
			t.Fatal("no reply and no error")
		}
	})
}

// Every seed, served by a daemon that sends it and hangs up (or hangs on), is judged by the TypeScript path: exit 2 from the
// stand-in runner, never exit 0 and never a wait past the deadline.
func TestEveryAbusiveReplyIsJudged(t *testing.T) {
	needNode(t)
	for name, seed := range replySeeds() {
		if name == "whole" {
			continue // a whole, honest reply is the daemon's own word
		}
		t.Run(name, func(t *testing.T) {
			r, err := newRig("")
			if err != nil {
				t.Fatal(err)
			}
			f, err := serve(r.socket(), func(c net.Conn) { c.Write(seed) })
			if err != nil {
				t.Fatal(err)
			}
			defer f.listener.Close()
			defer os.RemoveAll(r.dir)
			if code := r.run(); code != 2 || !strings.Contains(r.err.String(), judgedMark) {
				t.Fatalf("exit %d, stderr %q", code, r.err.String())
			}
		})
	}
}
