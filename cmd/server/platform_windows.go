//go:build windows

package server

import (
	"os"
	"os/exec"
	"syscall"
)

func configureDaemon(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{
		CreationFlags: syscall.CREATE_NEW_PROCESS_GROUP,
	}
}

func terminateProcess(proc *os.Process) error {
	// Windows does not support SIGTERM. Kill the process.
	return proc.Kill()
}

func checkProcessAlive(cmd *exec.Cmd) error {
	// On Windows, checking if process is alive via Signal(0) is not reliable/supported.
	// If Start() succeeded and we waited a bit, we assume it's running.
	// We could use os.FindProcess but that just wraps the handle.
	// We could try to get exit code, but that is non-blocking.
	// For now, assume it's running.
	return nil
}
