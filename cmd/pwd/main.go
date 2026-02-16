package main

import (
	"fmt"
	"os"

	"github.com/family-flix/api/internal/config"
	user "github.com/family-flix/api/internal/domain/user"
	"github.com/family-flix/api/internal/model"
	"github.com/family-flix/api/pkg/database"
	"github.com/rs/zerolog/log"
	"gorm.io/gorm"
)

func main() {
	cfg, err := config.New()
	if err != nil {
		fmt.Printf("ERROR 加载配置文件失败: %v\n", err.Error())
		os.Exit(1)
	}

	datacfg := database.DatabaseConfig{
		DBType:         cfg.GetString("database.type"),
		DBHost:         cfg.GetString("database.host"),
		DBPort:         cfg.GetString("database.port"),
		DBUser:         cfg.GetString("database.user"),
		DBPassword:     cfg.GetString("database.password"),
		DBName:         cfg.GetString("database.name"),
		DBPath:         cfg.GetString("database.path"),
		MigrationsPath: cfg.GetString("database.migrations_path"),
	}
	if cfg.BaseDir != "" {
		datacfg.DBPath = cfg.BaseDir + "/" + cfg.GetString("database.path")
		datacfg.MigrationsPath = cfg.BaseDir + "/" + cfg.GetString("database.migrations_path")
	}

	db, err := database.NewDatabase(&datacfg)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to database")
		os.Exit(1)
	}

	migrator := database.NewMigrator(&datacfg)
	if err := migrator.MigrateUp(); err != nil {
		log.Fatal().Err(err).Msg("Failed to run migrations")
		os.Exit(1)
	}

	args := os.Args
	if len(args) < 2 {
		fmt.Println("用法: pwd <新密码>")
		os.Exit(1)
	}
	newPassword := args[1]

	if err := changeAdminPassword(newPassword, db); err != nil {
		fmt.Printf("ERROR 修改密码失败: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("密码修改成功")
}

func changeAdminPassword(password string, db *gorm.DB) error {
	var cred model.Credential
	if err := db.Order("id").First(&cred).Error; err != nil {
		return fmt.Errorf("未找到管理员账号: %v", err)
	}

	_, err := user.ChangePassword(cred.Email, password, db)
	return err
}
