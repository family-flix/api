package repository

import (
	"github.com/family-flix/api/internal/model"
	"gorm.io/gorm"
)

type TaskRepository interface {
	GetTaskByID(id string, userID string) (*model.AsyncTask, error)
	ListTasks(userID string, status *int, nextMarker string, pageSize int) ([]model.AsyncTask, int64, error)
	UpdateTask(task *model.AsyncTask) error
}

type taskRepository struct {
	db *gorm.DB
}

func NewTaskRepository(db *gorm.DB) TaskRepository {
	return &taskRepository{db: db}
}

func (r *taskRepository) GetTaskByID(id string, userID string) (*model.AsyncTask, error) {
	var task model.AsyncTask
	if err := r.db.Preload("Output").Where("id = ? AND user_id = ?", id, userID).First(&task).Error; err != nil {
		return nil, err
	}
	return &task, nil
}

func (r *taskRepository) ListTasks(userID string, status *int, nextMarker string, pageSize int) ([]model.AsyncTask, int64, error) {
	var total int64
	db := r.db.Model(&model.AsyncTask{}).Where("user_id = ?", userID)
	if status != nil {
		db = db.Where("status = ?", *status)
	}
	db.Count(&total)

	if nextMarker != "" {
		db = db.Where("id < ?", nextMarker)
	}

	var tasks []model.AsyncTask
	if err := db.Order("created DESC").Limit(pageSize).Find(&tasks).Error; err != nil {
		return nil, 0, err
	}
	return tasks, total, nil
}

func (r *taskRepository) UpdateTask(task *model.AsyncTask) error {
	return r.db.Save(task).Error
}
