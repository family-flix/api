package service

import (
	"encoding/json"

	"github.com/family-flix/api/internal/repository"
)

type SettingsService interface {
	GetSettings(userID string) (map[string]interface{}, error)
	UpdateSettings(userID string, updates map[string]interface{}) error
}

type settingsService struct {
	repo repository.SettingsRepository
}

func NewSettingsService(repo repository.SettingsRepository) SettingsService {
	return &settingsService{repo: repo}
}

func (s *settingsService) GetSettings(userID string) (map[string]interface{}, error) {
	settings, err := s.repo.GetSettings(userID)
	if err != nil {
		return nil, err
	}

	var data map[string]interface{}
	var detailBytes []byte
	if settings.Detail != nil {
		detailBytes = []byte(*settings.Detail)
	} else {
		detailBytes = []byte("{}")
	}

	if err := json.Unmarshal(detailBytes, &data); err != nil {
		return make(map[string]interface{}), nil
	}
	return data, nil
}

func (s *settingsService) UpdateSettings(userID string, updates map[string]interface{}) error {
	settings, err := s.repo.GetSettings(userID)
	if err != nil {
		return err
	}

	var current map[string]interface{}
	var detailBytes []byte
	if settings.Detail != nil {
		detailBytes = []byte(*settings.Detail)
	} else {
		detailBytes = []byte("{}")
	}

	if err := json.Unmarshal(detailBytes, &current); err != nil {
		current = make(map[string]interface{})
	}

	for k, v := range updates {
		current[k] = v
	}

	detail, err := json.Marshal(current)
	if err != nil {
		return err
	}

	return s.repo.UpdateSettings(userID, string(detail))
}
