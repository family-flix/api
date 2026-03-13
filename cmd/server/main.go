package server

import (
	"crypto/rand"
	"encoding/hex"
	"flag"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"syscall"
	"time"

	"github.com/family-flix/api/internal/config"
	user "github.com/family-flix/api/internal/domain/user"
	"github.com/family-flix/api/internal/handler"
	"github.com/family-flix/api/internal/model"
	"github.com/family-flix/api/pkg/database"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"gorm.io/gorm"
)

var AppVer = "0.1.0"

func PidFile(baseDir string) string {
	return filepath.Join(baseDir, "server.pid")
}

func Main() {
	if len(os.Args) > 1 && os.Args[1] == "stop" {
		if err := StopDaemon(); err != nil {
			os.Exit(1)
		}
		return
	}

	daemon := flag.Bool("d", false, "以守护进程模式运行")
	flag.Parse()

	if *daemon {
		StartDaemon()
		return
	}
	zerolog.SetGlobalLevel(zerolog.InfoLevel)
	zerolog.TimeFieldFormat = time.RFC3339Nano
	log.Logger = log.Output(os.Stderr)
	log.Logger = log.With().
		Str("service", "main.go").
		Str("version", AppVer).
		Logger()

	cfg, err := config.New()
	if err != nil {
		fmt.Printf("ERROR 加载配置文件失败: %v\n", err.Error())
		os.Exit(1)
	}

	// Ensure logs directory exists
	log_filepath := filepath.Join(cfg.BaseDir, "app.log")
	log_file, err := os.OpenFile(log_filepath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		log.Error().Err(err).Msg("创建日志文件失败")
		return
	}
	defer log_file.Close()

	logger := zerolog.New(log_file).With().Timestamp().Logger()

	datacfg := database.DatabaseConfig{
		DBType:     cfg.GetString("database.type"),
		DBHost:     cfg.GetString("database.host"),
		DBPort:     cfg.GetString("database.port"),
		DBUser:     cfg.GetString("database.user"),
		DBPassword: cfg.GetString("database.password"),
		DBName:     cfg.GetString("database.name"),
		DBPath:     filepath.Join(cfg.BaseDir, cfg.GetString("database.path")),
	}
	db, err := database.NewDatabase(&datacfg)
	if err != nil {
		logger.Fatal().Err(err).Msg("Failed to connect to database")
		os.Exit(1)
	}

	migrator := database.NewMigrator(&datacfg)
	if err := migrator.MigrateUp(); err != nil {
		logger.Fatal().Err(err).Msg("Failed to run migrations")
		os.Exit(1)
	}

	ensureAdmin(db)

	e := echo.New()
	e.HideBanner = true

	e.Use(middleware.Logger())
	e.Use(middleware.Recover())

	ffmpegBin := cfg.GetString("ffmpeg.bin")
	cacheDir := filepath.Join(cfg.BaseDir, cfg.GetString("ffmpeg.cache_dir"))
	localFileIgnoreNames := cfg.GetStringSlice("drive.local.ignore_names")
	handler.SetupRouter(e, db, cfg.BaseDir, cacheDir, ffmpegBin, localFileIgnoreNames)

	port := cfg.GetInt("server.port")
	addr := fmt.Sprintf(":%d", port)
	logger.Info().Str("addr", addr).Msg("Starting server")

	fmt.Println()
	fmt.Println("Paths")
	fmt.Println("----------")
	fmt.Println("静态资源", cfg.BaseDir)
	fmt.Println("数据库", datacfg.DBPath)
	fmt.Println()
	fmt.Println("> 管理后台")
	fmt.Printf("http://localhost:%d/admin/home/index\n", port)
	fmt.Println("> 视频播放移动端")
	fmt.Printf("http://localhost:%d/mobile/home/index\n", port)
	fmt.Println("> 视频播放桌面端")
	fmt.Printf("http://localhost:%d/pc/home/index\n", port)
	fmt.Println()

	// 写入 PID 文件
	pidPath := PidFile(cfg.BaseDir)
	os.WriteFile(pidPath, []byte(strconv.Itoa(os.Getpid())), 0644)
	defer os.Remove(pidPath)

	if err := e.Start(addr); err != nil {
		logger.Fatal().Err(err).Msg("Server failed")
		os.Exit(1)
	}
}

func StartDaemon() {
	exe, _ := os.Executable()
	cmd := exec.Command(exe, "server")

	// 重定向输出到日志文件以便调试
	logFile, err := os.OpenFile("daemon.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err == nil {
		cmd.Stdout = logFile
		cmd.Stderr = logFile
	} else {
		fmt.Printf("警告: 无法创建 daemon.log: %v\n", err)
		cmd.Stdout = nil
		cmd.Stderr = nil
	}

	cmd.SysProcAttr = &syscall.SysProcAttr{Setsid: true}
	if err := cmd.Start(); err != nil {
		fmt.Printf("启动守护进程失败: %v\n", err)
		os.Exit(1)
	}

	// 等待一秒钟，检查进程是否存活
	time.Sleep(1 * time.Second)

	// 尝试向进程发送 0 信号来检查是否存在
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

	fmt.Printf("守护进程已启动, PID: %d\n", cmd.Process.Pid)
	cmd.Process.Release()
}

func StopDaemon() error {
	cfg, err := config.New()
	if err != nil {
		fmt.Printf("加载配置失败: %v\n", err)
		return err
	}
	pidPath := PidFile(cfg.BaseDir)
	data, err := os.ReadFile(pidPath)
	if err != nil {
		fmt.Println("未找到运行中的服务")
		return err
	}
	pid, _ := strconv.Atoi(string(data))
	proc, err := os.FindProcess(pid)
	if err != nil {
		fmt.Println("未找到进程")
		os.Remove(pidPath)
		return err
	}
	if err := proc.Signal(syscall.SIGTERM); err != nil {
		fmt.Printf("停止服务失败: %v\n", err)
		return err
	}
	os.Remove(pidPath)
	fmt.Printf("服务已停止 (PID: %d)\n", pid)
	return nil
}

func ensureAdmin(db *gorm.DB) {
	var count int64
	db.Model(&model.User{}).Count(&count)
	if count > 0 {
		return
	}
	email := "admin@flix.com"
	b := make([]byte, 3)
	rand.Read(b)
	pwd := hex.EncodeToString(b)
	_, err := user.Create(email, pwd, db)
	if err != nil {
		fmt.Printf("初始化管理员账号失败: %v\n", err)
		return
	}
	fmt.Println()
	fmt.Println("管理员信息")
	fmt.Println("帐号", email)
	fmt.Println("密码", pwd)
	fmt.Println()
}
