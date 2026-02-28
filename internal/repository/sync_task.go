package repository

import (
	"github.com/family-flix/api/internal/model"
	"gorm.io/gorm"
)

type SyncTaskRepository interface {
	GetSyncTask(id, userID string) (*model.ResourceSyncTask, error)
	ListSyncTasks(userID string, name string, status, invalid *int, nextMarker string, pageSize int, page int) ([]model.ResourceSyncTask, int64, error)
	CreateSyncTask(task *model.ResourceSyncTask) error
	UpdateSyncTask(task *model.ResourceSyncTask) error
	DeleteSyncTask(id, userID string) error
	GetMedia(id, userID string) (*model.Media, error)
}

type syncTaskRepository struct {
	db *gorm.DB
}

func NewSyncTaskRepository(db *gorm.DB) SyncTaskRepository {
	return &syncTaskRepository{db: db}
}

func (r *syncTaskRepository) GetSyncTask(id, userID string) (*model.ResourceSyncTask, error) {
	var task model.ResourceSyncTask
	if err := r.db.Preload("Media.Profile").Preload("Drive").
		Where("id = ? AND user_id = ?", id, userID).First(&task).Error; err != nil {
		return nil, err
	}
	return &task, nil
}

func (r *syncTaskRepository) ListSyncTasks(userID string, name string, status, invalid *int, nextMarker string, pageSize int, page int) ([]model.ResourceSyncTask, int64, error) {
	var total int64
	db := r.db.Model(&model.ResourceSyncTask{}).Where("\"ResourceSyncTask\".user_id = ?", userID)
	if name != "" {
		db = db.Where("\"ResourceSyncTask\".name LIKE ?", "%"+name+"%")
	}
	if status != nil {
		db = db.Where("\"ResourceSyncTask\".status = ?", *status)
	}
	if invalid != nil {
		db = db.Where("\"ResourceSyncTask\".invalid = ?", *invalid)
	}
	db.Count(&total)

	if page > 0 {
		db = db.Offset((page - 1) * pageSize)
	} else if nextMarker != "" {
		db = db.Where("\"ResourceSyncTask\".id < ?", nextMarker)
	}

	var tasks []model.ResourceSyncTask
	if err := db.Preload("Media.Profile").Preload("Drive").
		Order("\"ResourceSyncTask\".created DESC").Limit(pageSize).Find(&tasks).Error; err != nil {
		return nil, 0, err
	}
	return tasks, total, nil
}

func (r *syncTaskRepository) CreateSyncTask(task *model.ResourceSyncTask) error {
	return r.db.Create(task).Error
}

func (r *syncTaskRepository) UpdateSyncTask(task *model.ResourceSyncTask) error {
	return r.db.Save(task).Error
}

func (r *syncTaskRepository) DeleteSyncTask(id, userID string) error {
	return r.db.Where("id = ? AND user_id = ?", id, userID).Delete(&model.ResourceSyncTask{}).Error
}

func (r *syncTaskRepository) GetMedia(id, userID string) (*model.Media, error) {
	var m model.Media
	if err := r.db.Where("id = ? AND user_id = ?", id, userID).First(&m).Error; err != nil {
		return nil, err
	}
	return &m, nil
}
