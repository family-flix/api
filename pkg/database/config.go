package database

type DatabaseConfig struct {
	Environment string

	// 数据库配置
	DBType     string // mysql, postgres, sqlite
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBPath     string // 用于SQLite

	// 迁移配置
	MigrationsPath string
}
