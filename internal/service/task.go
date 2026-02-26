package service

import (
	"github.com/family-flix/api/internal/model"
	"github.com/family-flix/api/internal/repository"
)

type TaskService interface {
	GetTask(id, userID string) (*model.AsyncTask, error)
	ListTasks(userID string, status *int, nextMarker string, pageSize int) ([]model.AsyncTask, int64, error)
	PauseTask(id, userID string) error
}

type taskService struct {
	repo repository.TaskRepository
}

func NewTaskService(repo repository.TaskRepository) TaskService {
	return &taskService{repo: repo}
}

func (s *taskService) GetTask(id, userID string) (*model.AsyncTask, error) {
	return s.repo.GetTaskByID(id, userID)
}

func (s *taskService) ListTasks(userID string, status *int, nextMarker string, pageSize int) ([]model.AsyncTask, int64, error) {
	return s.repo.ListTasks(userID, status, nextMarker, pageSize)
}

func (s *taskService) PauseTask(id, userID string) error {
	task, err := s.repo.GetTaskByID(id, userID)
	if err != nil {
		return err
	}
	task.NeedStop = 1
	return s.repo.UpdateTask(task)
}
