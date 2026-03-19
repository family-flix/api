package database

import (
	"fmt"
	"path/filepath"

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
	// var driver string // driver is no longer used separately

	switch m.config.DBType {
	case "mysql":
		dsn = fmt.Sprintf("mysql://%s:%s@tcp(%s:%s)/%s?multiStatements=true",
			m.config.DBUser, m.config.DBPassword, m.config.DBHost, m.config.DBPort, m.config.DBName)
	case "postgres":
		dsn = fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
			m.config.DBUser, m.config.DBPassword, m.config.DBHost, m.config.DBPort, m.config.DBName)
	case "sqlite":
		// On Windows, absolute paths like C:\Users\... can be parsed as scheme:host.
		// migrate uses net/url.Parse to parse the connection string.
		// We need to properly encode the path for Windows.
		// "sqlite3:///" + path (where path uses forward slashes) usually works.
		path := filepath.ToSlash(m.config.DBPath)
		if len(path) > 1 && path[1] == ':' {
			// Windows drive letter, e.g. C:/Users...
			// Prepend extra slash to make it ///C:/Users...
			dsn = "sqlite3:///" + path
		} else {
			dsn = "sqlite3://" + path
		}
	default:
		return nil, fmt.Errorf("unsupported database type: %s", m.config.DBType)
	}

	source, err := iofs.New(migrations.FS, ".")
	if err != nil {
		return nil, fmt.Errorf("failed to create migration source: %w", err)
	}

	migrator, err := migrate.NewWithSourceInstance("iofs", source, dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to create migrator: %w", err)
	}

	log.Info().Msg("Migrator created successfully")

	return migrator, nil
}
