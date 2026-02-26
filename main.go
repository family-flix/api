package main

import (
	"fmt"
	"os"

	nfo "github.com/family-flix/api/cmd/nfo"
	pwd "github.com/family-flix/api/cmd/pwd"
	restart "github.com/family-flix/api/cmd/restart"
	server "github.com/family-flix/api/cmd/server"
	"github.com/family-flix/api/cmd/status"
)

// version will be set by build flags
var version = "dev"

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: flixapi <command> [args...]")
		fmt.Println("Commands: server, pwd, nfo, version, restart, status")
		os.Exit(1)
	}

	// Inject version into server package if needed, or just use it here
	server.AppVer = version

	cmd := os.Args[1]
	os.Args = os.Args[1:]

	switch cmd {
	case "version":
		fmt.Println(version)
	case "server":
		server.Main()
	case "pwd":
		pwd.Main()
	case "nfo":
		nfo.Main()
	case "restart":
		restart.Main()
	case "status":
		status.Main()
	default:
		fmt.Printf("unknown command: %s\n", cmd)
		os.Exit(1)
	}
}
