# The hook proxy

The Go client Claude Code starts for each hook event (the typescript order's d-10, d-13): it names the project's resident runner's
socket, sends the event, writes the reply's stdout and stderr and exits with its code, and runs the TypeScript runner itself when no
runner answers. It is the kit's one hand-written source that is not TypeScript. The order's W8.2 writes `client.go` and its tests here.
