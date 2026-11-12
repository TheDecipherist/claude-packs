//go:build darwin

// The macOS source, with CGO_ENABLED=0: two raw system calls, no libproc and no cgo (the probe, d-30). sysctl KERN_PROC_ALL
// (syscall 202) lists every process with its pid, parent, start time and name in one call; proc_info (syscall 336) reads the CPU
// time and resident size (PROC_PIDTASKINFO), the working folder (PROC_PIDVNODEPATHINFO) of one pid, and sysctl KERN_PROCARGS2 its
// arguments. The struct offsets are those of kinfo_proc (648 bytes, the same on arm64 and amd64) and proc_taskinfo (96).
package main

import (
	"bytes"
	"encoding/binary"
	"errors"
	"syscall"
	"unsafe"
)

const (
	sysSysctl   = 202
	sysProcInfo = 336
	kinfoSize   = 648
	// offsets in kinfo_proc
	offStartSec = 0
	offStat     = 36
	offPid      = 40
	offComm     = 243
	offPpid     = 560
	// proc_info: call PIDINFO, flavours TASKINFO and VNODEPATHINFO
	callPidInfo   = 2
	flavorTask    = 4
	flavorVnode   = 9
	taskInfoSize  = 96
	vnodeInfoSize = 2352
	vnodePathAt   = 152
	zombie        = 5
)

type darwin struct {
	// nsPerTick converts proc_taskinfo's mach ticks to nanoseconds: 125/3 on Apple silicon (a 24 MHz counter), 1 on Intel.
	nsPerTick float64
}

// one-off: newNative is the one name each build tag gives its own reader (darwin, linux, the rest); a build holds exactly one.
func newNative() (source, error) {
	d := &darwin{nsPerTick: 1}
	// hw.tbfrequency is a 64-bit value; syscall.Sysctl returns its bytes as a string, cut of one trailing zero byte
	if raw, err := syscall.Sysctl("hw.tbfrequency"); err == nil && len(raw) > 0 && len(raw) <= 8 {
		var b [8]byte
		copy(b[:], raw)
		if hz := binary.LittleEndian.Uint64(b[:]); hz > 0 {
			d.nsPerTick = 1e9 / float64(hz)
		}
	}
	// the offsets are private: a reading that disagrees with this very process is refused, and the sampler uses `ps` (finding 21)
	if err := d.selfCheck(); err != nil {
		return nil, err
	}
	return d, nil
}

func (d *darwin) name() string { return "native (sysctl + proc_info, no cgo)" }

func sysctl(mib []int32) ([]byte, error) {
	var n uintptr
	if _, _, e := syscall.Syscall6(sysSysctl, uintptr(unsafe.Pointer(&mib[0])), uintptr(len(mib)), 0, uintptr(unsafe.Pointer(&n)), 0, 0); e != 0 {
		return nil, e
	}
	buf := make([]byte, n+n/8+4096) // processes may start between the two calls
	n = uintptr(len(buf))
	if _, _, e := syscall.Syscall6(sysSysctl, uintptr(unsafe.Pointer(&mib[0])), uintptr(len(mib)), uintptr(unsafe.Pointer(&buf[0])), uintptr(unsafe.Pointer(&n)), 0, 0); e != 0 {
		return nil, e
	}
	return buf[:n], nil
}

func procInfoCall(pid int, flavor int, buf []byte) error {
	r, _, e := syscall.Syscall6(sysProcInfo, callPidInfo, uintptr(pid), uintptr(flavor), 0, uintptr(unsafe.Pointer(&buf[0])), uintptr(len(buf)))
	if e != 0 {
		return e
	}
	if int(r) < len(buf) && flavor == flavorTask {
		return errors.New("short proc_taskinfo")
	}
	return nil
}

func cString(b []byte) string {
	if i := bytes.IndexByte(b, 0); i >= 0 {
		b = b[:i]
	}
	return string(b)
}

func (d *darwin) list() ([]procInfo, error) {
	raw, err := sysctl([]int32{1, 14, 0}) // CTL_KERN, KERN_PROC, KERN_PROC_ALL
	if err != nil {
		return nil, err
	}
	if len(raw) < kinfoSize {
		return nil, errors.New("sysctl kern.proc.all read nothing")
	}
	out := make([]procInfo, 0, len(raw)/kinfoSize)
	var task [taskInfoSize]byte
	for at := 0; at+kinfoSize <= len(raw); at += kinfoSize {
		k := raw[at : at+kinfoSize]
		pid := int(int32(binary.LittleEndian.Uint32(k[offPid:])))
		if pid <= 0 || k[offStat] == zombie {
			continue
		}
		p := procInfo{Pid: pid, Ppid: int(int32(binary.LittleEndian.Uint32(k[offPpid:]))), Start: int64(binary.LittleEndian.Uint64(k[offStartSec:])), Comm: cString(k[offComm : offComm+16])}
		// another user's process refuses its task info: it is listed with no CPU or memory, never skipped (its children matter)
		if procInfoCall(pid, flavorTask, task[:]) == nil {
			p.RSS = binary.LittleEndian.Uint64(task[8:])
			ticks := binary.LittleEndian.Uint64(task[16:]) + binary.LittleEndian.Uint64(task[24:])
			p.CPUNs = uint64(float64(ticks) * d.nsPerTick)
		}
		out = append(out, p)
	}
	return out, nil
}

func (d *darwin) cwd(p procInfo) string {
	buf := make([]byte, vnodeInfoSize)
	if procInfoCall(p.Pid, flavorVnode, buf) != nil {
		return ""
	}
	return cString(buf[vnodePathAt : vnodePathAt+1024])
}

// args: KERN_PROCARGS2 holds argc, the executable's path, padding zeros, then argc arguments, each ended by a zero.
func (d *darwin) args(p procInfo) string {
	raw, err := sysctl([]int32{1, 49, int32(p.Pid)})
	if err != nil || len(raw) < 4 {
		return ""
	}
	return argvOf(raw)
}

func argvOf(raw []byte) string {
	argc := int(binary.LittleEndian.Uint32(raw))
	rest := raw[4:]
	if i := bytes.IndexByte(rest, 0); i >= 0 {
		rest = rest[i:]
	}
	rest = bytes.TrimLeft(rest, "\x00")
	parts := bytes.SplitN(rest, []byte{0}, argc+1)
	if len(parts) > argc {
		parts = parts[:argc]
	}
	joined := bytes.Join(parts, []byte(" "))
	return string(joined[:min(len(joined), maxArgs)])
}
