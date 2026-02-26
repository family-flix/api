package repository

import (
	"github.com/family-flix/api/internal/model"
	"gorm.io/gorm"
)

type SettingsRepository interface {
	GetSettings(userID string) (*model.Settings, error)
	UpdateSettings(userID string, detail string) error
}

type settingsRepository struct {
	db *gorm.DB
}

func NewSettingsRepository(db *gorm.DB) SettingsRepository {
	return &settingsRepository{db: db}
}

func (r *settingsRepository) GetSettings(userID string) (*model.Settings, error) {
	var settings model.Settings
	if err := r.db.Where("user_id = ?", userID).First(&settings).Error; err != nil {
		return nil, err
	}
	return &settings, nil
}

func (r *settingsRepository) UpdateSettings(userID string, detail string) error {
	return r.db.Model(&model.Settings{}).Where("user_id = ?", userID).Update("detail", detail).Error
}
