package repository

import (
	"time"

	"github.com/family-flix/api/internal/model"
	"gorm.io/gorm"
)

type DashboardRepository interface {
	GetStatistics(userID string) (*model.Statistics, error)
	UpdateStatistics(userID string, data string) error
	
	CountDrives(userID string) (int64, error)
	CountMovies(userID string) (int64, error)
	CountSeasons(userID string) (int64, error)
	CountEpisodes(userID string) (int64, error)
	CountSyncTasks(userID string) (int64, error)
	CountReports(userID string) (int64, error)
	CountInvalidMovies(userID string) (int64, error)
	CountInvalidSeasons(userID string) (int64, error)
	CountUnknownMedia(userID string) (int64, error)
	
	ListRecentMediaSources(userID string, startTime, endTime time.Time, nextMarker string, pageSize int) ([]model.MediaSource, error)
}

type dashboardRepository struct {
	db *gorm.DB
}

func NewDashboardRepository(db *gorm.DB) DashboardRepository {
	return &dashboardRepository{db: db}
}

func (r *dashboardRepository) GetStatistics(userID string) (*model.Statistics, error) {
	var stats model.Statistics
	if err := r.db.Where("user_id = ?", userID).First(&stats).Error; err != nil {
		return nil, err
	}
	return &stats, nil
}

func (r *dashboardRepository) UpdateStatistics(userID string, data string) error {
	return r.db.Model(&model.Statistics{}).Where("user_id = ?", userID).Update("data", data).Error
}

func (r *dashboardRepository) CountDrives(userID string) (int64, error) {
	var count int64
	err := r.db.Model(&model.Drive{}).Where("user_id = ?", userID).Count(&count).Error
	return count, err
}

func (r *dashboardRepository) CountMovies(userID string) (int64, error) {
	var count int64
	err := r.db.Model(&model.Media{}).Where("user_id = ? AND type = 2", userID).Count(&count).Error
	return count, err
}

func (r *dashboardRepository) CountSeasons(userID string) (int64, error) {
	var count int64
	err := r.db.Model(&model.Media{}).Where("user_id = ? AND type = 1", userID).Count(&count).Error
	return count, err
}

func (r *dashboardRepository) CountEpisodes(userID string) (int64, error) {
	var count int64
	err := r.db.Model(&model.MediaSource{}).Where("user_id = ?", userID).Count(&count).Error
	return count, err
}

func (r *dashboardRepository) CountSyncTasks(userID string) (int64, error) {
	var count int64
	err := r.db.Model(&model.ResourceSyncTask{}).Where("user_id = ?", userID).Count(&count).Error
	return count, err
}

func (r *dashboardRepository) CountReports(userID string) (int64, error) {
	var count int64
	err := r.db.Model(&model.ReportV2{}).Where("user_id = ?", userID).Count(&count).Error
	return count, err
}

func (r *dashboardRepository) CountInvalidMovies(userID string) (int64, error) {
	var count int64
	err := r.db.Model(&model.InvalidMedia{}).Where("user_id = ? AND type = 2", userID).Count(&count).Error
	return count, err
}

func (r *dashboardRepository) CountInvalidSeasons(userID string) (int64, error) {
	var count int64
	err := r.db.Model(&model.InvalidMedia{}).Where("user_id = ? AND type = 1", userID).Count(&count).Error
	return count, err
}

func (r *dashboardRepository) CountUnknownMedia(userID string) (int64, error) {
	var count int64
	err := r.db.Model(&model.ParsedMedia{}).Where("user_id = ? AND media_profile_id IS NULL", userID).Count(&count).Error
	return count, err
}

func (r *dashboardRepository) ListRecentMediaSources(userID string, startTime, endTime time.Time, nextMarker string, pageSize int) ([]model.MediaSource, error) {
	db := r.db.Where("\"MediaSource\".user_id = ? AND \"MediaSource\".created >= ? AND \"MediaSource\".created < ?", userID, startTime, endTime)
	if nextMarker != "" {
		db = db.Where("\"MediaSource\".id < ?", nextMarker)
	}
	var sources []model.MediaSource
	if err := db.Preload("Media.Profile").Order("\"MediaSource\".created DESC").Limit(pageSize).Find(&sources).Error; err != nil {
		return nil, err
	}
	return sources, nil
}
