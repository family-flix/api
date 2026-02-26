package service

import (
	"time"

	"github.com/family-flix/api/internal/model"
	"github.com/family-flix/api/internal/repository"
)

type SyncTaskService interface {
	GetSyncTask(id, userID string) (*model.ResourceSyncTask, error)
	ListSyncTasks(userID string, name string, status, invalid *int, nextMarker string, pageSize int) ([]model.ResourceSyncTask, int64, error)
	CreateSyncTask(task *model.ResourceSyncTask) error
	UpdateSyncTask(task *model.ResourceSyncTask) error
	DeleteSyncTask(id, userID string) error
	UpdateSyncTaskMedia(taskID, mediaID, userID string) error
	CompleteSyncTask(taskID, userID string) error
	OverrideSyncTask(taskID, userID string, updates map[string]interface{}) error
}

type syncTaskService struct {
	repo repository.SyncTaskRepository
}

func NewSyncTaskService(repo repository.SyncTaskRepository) SyncTaskService {
	return &syncTaskService{repo: repo}
}

func (s *syncTaskService) GetSyncTask(id, userID string) (*model.ResourceSyncTask, error) {
	return s.repo.GetSyncTask(id, userID)
}

func (s *syncTaskService) ListSyncTasks(userID string, name string, status, invalid *int, nextMarker string, pageSize int) ([]model.ResourceSyncTask, int64, error) {
	return s.repo.ListSyncTasks(userID, name, status, invalid, nextMarker, pageSize)
}

func (s *syncTaskService) CreateSyncTask(task *model.ResourceSyncTask) error {
	return s.repo.CreateSyncTask(task)
}

func (s *syncTaskService) UpdateSyncTask(task *model.ResourceSyncTask) error {
	return s.repo.UpdateSyncTask(task)
}

func (s *syncTaskService) DeleteSyncTask(id, userID string) error {
	return s.repo.DeleteSyncTask(id, userID)
}

func (s *syncTaskService) UpdateSyncTaskMedia(taskID, mediaID, userID string) error {
	task, err := s.repo.GetSyncTask(taskID, userID)
	if err != nil {
		return err
	}
	media, err := s.repo.GetMedia(mediaID, userID)
	if err != nil {
		return err
	}
	task.MediaID = &media.ID
	task.Status = 2
	return s.repo.UpdateSyncTask(task)
}

func (s *syncTaskService) CompleteSyncTask(taskID, userID string) error {
	task, err := s.repo.GetSyncTask(taskID, userID)
	if err != nil {
		return err
	}
	task.Status = 3
	// Update time is handled by GORM hooks usually, but let's be explicit if needed
	// In the original handler: c.DB().Model(&t).Updates(map[string]interface{}{"status": 3, "updated": time.Now()})
	now := model.LocalTime{Time: time.Now()}
	task.Updated = now
	return s.repo.UpdateSyncTask(task)
}

func (s *syncTaskService) OverrideSyncTask(taskID, userID string, updates map[string]interface{}) error {
	task, err := s.repo.GetSyncTask(taskID, userID)
	if err != nil {
		return err
	}

	task.Invalid = 0

	if val, ok := updates["url"].(string); ok && val != "" {
		task.URL = val
	}
	if val, ok := updates["pwd"].(string); ok && val != "" {
		pwd := val
		task.PWD = &pwd
	}
	if val, ok := updates["file_id"].(string); ok && val != "" {
		task.FileID = val
	}
	if val, ok := updates["name"].(string); ok && val != "" {
		task.Name = val
	}

	return s.repo.UpdateSyncTask(task)
}
