package status

import (
	"fmt"
	"os"
	"strconv"
	"syscall"
	"time"

	"github.com/family-flix/api/cmd/server"
	"github.com/family-flix/api/internal/config"
	"github.com/shirou/gopsutil/v3/process"
)

func Main() {
	cfg, err := config.New()
	if err != nil {
		fmt.Printf("加载配置失败: %v\n", err)
		os.Exit(1)
	}

	pidPath := server.PidFile(cfg.BaseDir)
	data, err := os.ReadFile(pidPath)
	if err != nil {
		fmt.Println("服务状态: 未运行 (PID 文件不存在)")
		os.Exit(1)
	}

	pid, err := strconv.Atoi(string(data))
	if err != nil {
		fmt.Printf("服务状态: 异常 (PID 文件内容无效: %s)\n", string(data))
		os.Exit(1)
	}

	// 检查进程是否存在
	proc, err := process.NewProcess(int32(pid))
	if err != nil {
		// 进程不存在，清理残留的 PID 文件
		fmt.Println("服务状态: 未运行 (进程不存在，清理残留 PID 文件)")
		os.Remove(pidPath)
		os.Exit(1)
	}

	// 再次确认进程是否正在运行（发送信号 0）
	if err := proc.SendSignal(syscall.Signal(0)); err != nil {
		fmt.Println("服务状态: 未运行 (进程无响应，清理残留 PID 文件)")
		os.Remove(pidPath)
		os.Exit(1)
	}

	// 获取进程详细信息
	name, _ := proc.Name()
	createTime, _ := proc.CreateTime()
	startTime := time.Unix(createTime/1000, 0)
	memoryInfo, _ := proc.MemoryInfo()
	cpuPercent, _ := proc.CPUPercent()

	fmt.Println("服务状态: 🟢 正在运行")
	fmt.Println("--------------------------------")
	fmt.Printf("进程 ID:    %d\n", pid)
	fmt.Printf("进程名称:   %s\n", name)
	fmt.Printf("启动时间:   %s (%s)\n", startTime.Format("2006-01-02 15:04:05"), time.Since(startTime).Round(time.Second))
	fmt.Printf("CPU 使用:   %.2f%%\n", cpuPercent)
	if memoryInfo != nil {
		fmt.Printf("内存使用:   %.2f MB\n", float64(memoryInfo.RSS)/1024/1024)
	}
	
	// 显示端口信息
	port := cfg.GetInt("server.port")
	fmt.Printf("监听端口:   %d\n", port)
	fmt.Printf("管理后台:   http://localhost:%d/admin/home/index\n", port)
}
