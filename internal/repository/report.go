package repository

import (
	"github.com/family-flix/api/internal/model"
	"gorm.io/gorm"
)

type ReportRepository interface {
	GetReport(id, userID string) (*model.ReportV2, error)
	ListReports(userID string, typeVal *int, nextMarker string, pageSize int, page int) ([]model.ReportV2, int64, error)
	UpdateReport(report *model.ReportV2) error
	CreateNotification(notification *model.MemberNotification) error
	GetNotificationByUniqueID(uniqueID string) (*model.MemberNotification, error)
}

type reportRepository struct {
	db *gorm.DB
}

func NewReportRepository(db *gorm.DB) ReportRepository {
	return &reportRepository{db: db}
}

func (r *reportRepository) GetReport(id, userID string) (*model.ReportV2, error) {
	var report model.ReportV2
	if err := r.db.Where("id = ? AND user_id = ?", id, userID).First(&report).Error; err != nil {
		return nil, err
	}
	return &report, nil
}

func (r *reportRepository) ListReports(userID string, typeVal *int, nextMarker string, pageSize int, page int) ([]model.ReportV2, int64, error) {
	var total int64
	db := r.db.Model(&model.ReportV2{}).Where("user_id = ?", userID)
	if typeVal != nil {
		db = db.Where("type = ?", *typeVal)
	}
	db.Count(&total)

	if page > 0 {
		db = db.Offset((page - 1) * pageSize)
	} else if nextMarker != "" {
		db = db.Where("id < ?", nextMarker)
	}

	var reports []model.ReportV2
	if err := db.Preload("Media.Profile").Preload("MediaSource.Profile").Preload("Member").
		Order("created DESC").Limit(pageSize).Find(&reports).Error; err != nil {
		return nil, 0, err
	}
	return reports, total, nil
}

func (r *reportRepository) UpdateReport(report *model.ReportV2) error {
	return r.db.Save(report).Error
}

func (r *reportRepository) CreateNotification(notification *model.MemberNotification) error {
	return r.db.Create(notification).Error
}

func (r *reportRepository) GetNotificationByUniqueID(uniqueID string) (*model.MemberNotification, error) {
	var n model.MemberNotification
	if err := r.db.Where("unique_id = ?", uniqueID).First(&n).Error; err != nil {
		return nil, err
	}
	return &n, nil
}
