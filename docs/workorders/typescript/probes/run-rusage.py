# W11: run one hook command as Claude Code does (sh -c, the event on stdin) and print what it cost, from the kernel's own account of the
# child: "<wall ms> <user s> <sys s> <exit code>". The child's descendants it waited for are counted in the CPU (wait4's rusage), so a
# picker, a client and a runner all show; a process the command left running is not.
#   python3 -I -B run-rusage.py <cwd> <command>        (stdin passes through to the command)
import os
import subprocess
import sys
import time

started = time.perf_counter()
child = subprocess.Popen(['sh', '-c', sys.argv[2]], cwd=sys.argv[1], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
_, status, usage = os.wait4(child.pid, 0)
wall_ms = (time.perf_counter() - started) * 1000
print(f'{wall_ms:.3f} {usage.ru_utime:.6f} {usage.ru_stime:.6f} {os.waitstatus_to_exitcode(status)}')
