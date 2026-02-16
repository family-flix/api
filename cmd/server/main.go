package main

import (
	"embed"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/family-flix/api/internal/config"
	"github.com/family-flix/api/pkg/database"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

//go:embed all:migrations
var migrations embed.FS

var AppVer = "0.1.0"

func main() {
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
		DBType: "sqlite",
	}
	database, err := database.NewDatabase(&datacfg)
	if err != nil {
		logger.Fatal("Failed to connect to database", err)
	}

	// 运行数据库迁移
	migrator := database.NewMigrator(datacfg, logger)
	if err := migrator.MigrateUp(); err != nil {
		logger.Fatal("Failed to run migrations", err)
	}
}
