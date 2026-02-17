package main

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"

	"github.com/family-flix/api/internal/config"
	"github.com/spf13/viper"
)

func main() {
	_, err := config.New()
	if err != nil {
		log.Fatalf("加载配置失败: %v", err)
	}

	proxy := viper.GetString("javbus.proxy")
	fmt.Printf("proxy: %s\n", proxy)

	// 直接测试 proxy 转发
	target := "https://www.javbus.com/search/SSNI"
	reqURL := proxy + "/api/proxy/?u=" + url.QueryEscape(target)
	fmt.Printf("request: %s\n", reqURL)

	resp, err := http.Get(reqURL)
	if err != nil {
		log.Fatalf("请求失败: %v", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	fmt.Printf("status: %d\n", resp.StatusCode)
	fmt.Printf("body length: %d\n", len(body))
	// 打印前 2000 字符
	s := string(body)
	if len(s) > 2000 {
		s = s[:2000]
	}
	fmt.Println(s)
}
