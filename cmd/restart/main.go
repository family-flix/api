package restart

import (
	"fmt"
	"time"

	"github.com/family-flix/api/cmd/server"
)

func Main() {
	fmt.Println("正在重启服务...")
	if err := server.StopDaemon(); err != nil {
		fmt.Printf("提示: 停止服务时遇到问题 (可能服务未运行): %v\n", err)
	} else {
		// 等待端口释放
		time.Sleep(1 * time.Second)
	}

	server.StartDaemon()
}
