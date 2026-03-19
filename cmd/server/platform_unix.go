//go:build !windows

package server

import (
	"fmt"
	"os"
	"os/exec"
	"syscall"
)

func configureDaemon(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{Setsid: true}
}

func terminateProcess(proc *os.Process) error {
	return proc.Signal(syscall.SIGTERM)
}

func checkProcessAlive(cmd *exec.Cmd) error {
	if err := cmd.Process.Signal(syscall.Signal(0)); err != nil {
		fmt.Println("守护进程启动后立即退出! 请检查 daemon.log")
		// 尝试读取最后几行日志并显示
		if data, err := os.ReadFile("daemon.log"); err == nil {
			lines := string(data)
			if len(lines) > 500 {
				lines = lines[len(lines)-500:]
			}
			fmt.Printf("日志末尾:\n%s\n", lines)
		}
		os.Exit(1)
	}
	return nil
}
