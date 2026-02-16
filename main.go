package main

import (
	"fmt"
	"os"

	nfo "github.com/family-flix/api/cmd/nfo"
	pwd "github.com/family-flix/api/cmd/pwd"
	server "github.com/family-flix/api/cmd/server"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: flixapi <command> [args...]")
		fmt.Println("Commands: server, pwd, nfo")
		os.Exit(1)
	}

	cmd := os.Args[1]
	os.Args = os.Args[1:]

	switch cmd {
	case "server":
		server.Main()
	case "pwd":
		pwd.Main()
	case "nfo":
		nfo.Main()
	default:
		fmt.Printf("unknown command: %s\n", cmd)
		os.Exit(1)
	}
}
