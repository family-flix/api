package database

import (
	"fmt"

	"github.com/family-flix/api/migrations"
	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/sqlite3"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/rs/zerolog/log"
)

// Migrator 处理数据库迁移
type Migrator struct {
	config *DatabaseConfig
}

// NewMigrator 创建新的迁移器
func NewMigrator(cfg *DatabaseConfig) *Migrator {
	return &Migrator{
		config: cfg,
	}
}

// MigrateUp 运行所有向上迁移
func (m *Migrator) MigrateUp() error {
	migrator, err := m.createMigrator()
	if err != nil {
		return err
	}
	defer func() {
		sourceErr, dbErr := migrator.Close()
		if sourceErr != nil {
			log.Error().Err(sourceErr).Msg("Error closing migration source")
		}
		if dbErr != nil {
			log.Error().Err(dbErr).Msg("Error closing migration database")
		}
	}()

	if err := migrator.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	log.Info().Msg("Database migrations completed successfully")
	return nil
}

// MigrateDown 回滚所有迁移
func (m *Migrator) MigrateDown() error {
	migrator, err := m.createMigrator()
	if err != nil {
		return err
	}
	defer func() {
		sourceErr, dbErr := migrator.Close()
		if sourceErr != nil {
			log.Error().Err(sourceErr).Msg("Error closing migration source")
		}
		if dbErr != nil {
			log.Error().Err(dbErr).Msg("Error closing migration database")
		}
	}()

	if err := migrator.Down(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("failed to rollback migrations: %w", err)
	}

	log.Info().Msg("Database rollback completed successfully")
	return nil
}

// MigrateTo 迁移到特定版本
func (m *Migrator) MigrateTo(version uint) error {
	migrator, err := m.createMigrator()
	if err != nil {
		return err
	}
	defer func() {
		sourceErr, dbErr := migrator.Close()
		if sourceErr != nil {
			log.Error().Err(sourceErr).Msg("Error closing migration source")
		}
		if dbErr != nil {
			log.Error().Err(dbErr).Msg("Error closing migration database")
		}
	}()

	if err := migrator.Migrate(version); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("failed to migrate to version %d: %w", version, err)
	}

	log.Info().Msg(fmt.Sprintf("Database migrated to version %d successfully", version))
	return nil
}

// createMigrator 创建迁移实例
func (m *Migrator) createMigrator() (*migrate.Migrate, error) {
	var dsn string
	var driver string

	switch m.config.DBType {
	case "mysql":
		dsn = fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?multiStatements=true",
			m.config.DBUser, m.config.DBPassword, m.config.DBHost, m.config.DBPort, m.config.DBName)
		driver = "mysql"
	case "postgres":
		dsn = fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
			m.config.DBUser, m.config.DBPassword, m.config.DBHost, m.config.DBPort, m.config.DBName)
		driver = "postgres"
	case "sqlite":
		dsn = m.config.DBPath
		driver = "sqlite3"
	default:
		return nil, fmt.Errorf("unsupported database type: %s", m.config.DBType)
	}

	source, err := iofs.New(migrations.FS, ".")
	if err != nil {
		return nil, fmt.Errorf("failed to create migration source: %w", err)
	}

	migrator, err := migrate.NewWithSourceInstance("iofs", source, fmt.Sprintf("%s://%s", driver, dsn))
	if err != nil {
		return nil, fmt.Errorf("failed to create migrator: %w", err)
	}

	log.Info().Msg("Migrator created successfully")

	return migrator, nil
}
