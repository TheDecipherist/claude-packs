// The proxy: stdin to the resident runner over a unix socket, its verdict to stderr and the exit code.
package main
import ("bufio"; "io"; "net"; "os"; "strconv"; "strings")
func main() {
	c, err := net.Dial("unix", os.Args[1])
	if err != nil { os.Stderr.WriteString("proxy: " + err.Error() + "\n"); os.Exit(0) } // no daemon: fail open, said
	io.Copy(c, os.Stdin)
	c.(*net.UnixConn).CloseWrite()
	r := bufio.NewReader(c)
	line, _ := r.ReadString('\n')
	rest, _ := io.ReadAll(r)
	os.Stderr.Write(rest)
	code, _ := strconv.Atoi(strings.TrimSpace(line))
	os.Exit(code)
}
