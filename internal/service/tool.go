package service

import (
	"errors"

	"github.com/family-flix/api/internal/model"
	"github.com/family-flix/api/internal/repository"
)

type ToolService interface {
	CheckSharedFile(url, userID string) (*model.SharedFile, bool, error)
	SearchSharedFiles(userID, name, nextMarker string, pageSize int) ([]model.SharedFile, int64, error)
	ListSharedFileSaveInProgress(userID, nextMarker string, pageSize int) ([]model.SharedFileInProgress, error)
}

type toolService struct {
	repo repository.ToolRepository
}

func NewToolService(repo repository.ToolRepository) ToolService {
	return &toolService{repo: repo}
}

func (s *toolService) CheckSharedFile(url, userID string) (*model.SharedFile, bool, error) {
	existing, err := s.repo.CheckSharedFileExists(url, userID)
	if err == nil {
		return existing, true, nil
	}
	return nil, false, nil
}

func (s *toolService) SearchSharedFiles(userID, name, nextMarker string, pageSize int) ([]model.SharedFile, int64, error) {
	if pageSize <= 0 {
		pageSize = 20
	}
	return s.repo.ListSharedFiles(userID, name, nextMarker, pageSize)
}

func (s *toolService) ListSharedFileSaveInProgress(userID, nextMarker string, pageSize int) ([]model.SharedFileInProgress, error) {
	if pageSize <= 0 {
		pageSize = 20
	}
	return s.repo.ListSharedFileSaveInProgress(userID, nextMarker, pageSize)
}

// Stubs for future implementation
func (s *toolService) ParseDriveFile(userID string) error {
	return errors.New("not implemented")
}

func (s *toolService) ShortLink(userID string) error {
	return errors.New("not implemented")
}
