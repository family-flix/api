package repository

import (
	"github.com/family-flix/api/internal/model"
	"gorm.io/gorm"
)

type ToolRepository interface {
	CheckSharedFileExists(url, userID string) (*model.SharedFile, error)
	ListSharedFiles(userID, name, nextMarker string, pageSize int, page int) ([]model.SharedFile, int64, error)
	ListSharedFileSaveInProgress(userID, nextMarker string, pageSize int, page int) ([]model.SharedFileInProgress, error)
}

type toolRepository struct {
	db *gorm.DB
}

func NewToolRepository(db *gorm.DB) ToolRepository {
	return &toolRepository{db: db}
}

func (r *toolRepository) CheckSharedFileExists(url, userID string) (*model.SharedFile, error) {
	var existing model.SharedFile
	if err := r.db.Where("url = ? AND user_id = ?", url, userID).First(&existing).Error; err != nil {
		return nil, err
	}
	return &existing, nil
}

func (r *toolRepository) ListSharedFiles(userID, name, nextMarker string, pageSize int, page int) ([]model.SharedFile, int64, error) {
	var total int64
	db := r.db.Model(&model.SharedFile{}).Where("user_id = ?", userID)
	if name != "" {
		db = db.Where("title LIKE ? OR url LIKE ?", "%"+name+"%", "%"+name+"%")
	}
	db.Count(&total)

	if page > 0 {
		db = db.Offset((page - 1) * pageSize)
	} else if nextMarker != "" {
		db = db.Where("id < ?", nextMarker)
	}

	var files []model.SharedFile
	if err := db.Order("created DESC").Limit(pageSize).Find(&files).Error; err != nil {
		return nil, 0, err
	}
	return files, total, nil
}

func (r *toolRepository) ListSharedFileSaveInProgress(userID, nextMarker string, pageSize int, page int) ([]model.SharedFileInProgress, error) {
	db := r.db.Model(&model.SharedFileInProgress{}).Where("user_id = ?", userID)
	if page > 0 {
		db = db.Offset((page - 1) * pageSize)
	} else if nextMarker != "" {
		db = db.Where("id < ?", nextMarker)
	}
	var files []model.SharedFileInProgress
	if err := db.Preload("Drive").Order("created DESC").Limit(pageSize).Find(&files).Error; err != nil {
		return nil, err
	}
	return files, nil
}
