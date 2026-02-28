package service

import (
	"encoding/json"
	"time"

	"github.com/family-flix/api/internal/model"
	"github.com/family-flix/api/internal/repository"
)

type DashboardService interface {
	GetDashboard(userID string) (map[string]interface{}, error)
	RefreshDashboard(userID string) error
	ListAddedMedia(userID string, startTime, endTime string, nextMarker string, pageSize int, page int) ([]model.MediaSource, string, error)
}

type dashboardService struct {
	repo repository.DashboardRepository
}

func NewDashboardService(repo repository.DashboardRepository) DashboardService {
	return &dashboardService{repo: repo}
}

func (s *dashboardService) GetDashboard(userID string) (map[string]interface{}, error) {
	stats, err := s.repo.GetStatistics(userID)
	if err != nil {
		return map[string]interface{}{}, nil
	}
	var data map[string]interface{}
	if err := json.Unmarshal([]byte(stats.Data), &data); err != nil {
		return map[string]interface{}{}, nil
	}
	return data, nil
}

func (s *dashboardService) RefreshDashboard(userID string) error {
	driveCount, _ := s.repo.CountDrives(userID)
	movieCount, _ := s.repo.CountMovies(userID)
	seasonCount, _ := s.repo.CountSeasons(userID)
	episodeCount, _ := s.repo.CountEpisodes(userID)
	syncTaskCount, _ := s.repo.CountSyncTasks(userID)
	reportCount, _ := s.repo.CountReports(userID)
	invalidMovieCount, _ := s.repo.CountInvalidMovies(userID)
	invalidSeasonCount, _ := s.repo.CountInvalidSeasons(userID)
	unknownCount, _ := s.repo.CountUnknownMedia(userID)

	data := map[string]interface{}{
		"drive_count":          driveCount,
		"movie_count":          movieCount,
		"season_count":         seasonCount,
		"episode_count":        episodeCount,
		"sync_task_count":      syncTaskCount,
		"report_count":         reportCount,
		"invalid_movie_count":  invalidMovieCount,
		"invalid_season_count": invalidSeasonCount,
		"unknown_media_count":  unknownCount,
		"updated_at":           time.Now(),
	}

	dataJSON, _ := json.Marshal(data)
	return s.repo.UpdateStatistics(userID, string(dataJSON))
}

func (s *dashboardService) ListAddedMedia(userID string, startTimeStr, endTimeStr string, nextMarker string, pageSize int, page int) ([]model.MediaSource, string, error) {
	now := time.Now()
	startTime := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	endTime := startTime.Add(24 * time.Hour)

	if startTimeStr != "" {
		if t, err := time.Parse("2006-01-02", startTimeStr); err == nil {
			startTime = t
		}
	}
	if endTimeStr != "" {
		if t, err := time.Parse("2006-01-02", endTimeStr); err == nil {
			endTime = t
		}
	}

	sources, err := s.repo.ListRecentMediaSources(userID, startTime, endTime, nextMarker, pageSize, page)
	if err != nil {
		return nil, "", err
	}

	uniqueSources := make([]model.MediaSource, 0)
	seen := make(map[string]bool)
	var lastID string

	for _, s := range sources {
		lastID = s.ID
		if s.Media == nil {
			continue
		}
		// Assuming MediaID is string based on usage in handler
		if seen[s.MediaID] {
			continue
		}
		seen[s.MediaID] = true
		uniqueSources = append(uniqueSources, s)
	}

	return uniqueSources, lastID, nil
}
