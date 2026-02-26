package repository

import (
	"context"

	"github.com/family-flix/api/internal/model"
	"gorm.io/gorm"
)

type DriveRepository interface {
	Get(ctx context.Context, id string, userID string) (*model.Drive, error)
	GetByUniqueID(ctx context.Context, uniqueID string, userID string) (*model.Drive, error)
	List(ctx context.Context, userID string, filter DriveFilter) ([]model.Drive, int64, error)
	Create(ctx context.Context, drive *model.Drive) error
	Update(ctx context.Context, drive *model.Drive, updates map[string]interface{}) error
	Delete(ctx context.Context, id string, userID string) error

	// Token related
	CreateToken(ctx context.Context, token *model.DriveToken) error
	GetToken(ctx context.Context, id string) (*model.DriveToken, error)
	UpdateToken(ctx context.Context, token *model.DriveToken, updates map[string]interface{}) error
}

type DriveFilter struct {
	Type       *int
	Name       string
	Hidden     *int
	NextMarker string
	PageSize   int
}

type driveRepository struct {
	db *gorm.DB
}

func NewDriveRepository(db *gorm.DB) DriveRepository {
	return &driveRepository{db: db}
}

func (r *driveRepository) Get(ctx context.Context, id string, userID string) (*model.Drive, error) {
	var drive model.Drive
	err := r.db.WithContext(ctx).Where("id = ? AND user_id = ?", id, userID).First(&drive).Error
	if err != nil {
		return nil, err
	}
	return &drive, nil
}

func (r *driveRepository) GetByUniqueID(ctx context.Context, uniqueID string, userID string) (*model.Drive, error) {
	var drive model.Drive
	err := r.db.WithContext(ctx).Where("unique_id = ? AND user_id = ?", uniqueID, userID).First(&drive).Error
	if err != nil {
		return nil, err
	}
	return &drive, nil
}

func (r *driveRepository) List(ctx context.Context, userID string, filter DriveFilter) ([]model.Drive, int64, error) {
	db := r.db.WithContext(ctx).Where("user_id = ?", userID)

	if filter.Type != nil {
		db = db.Where("type = ?", *filter.Type)
	}
	if filter.Name != "" {
		db = db.Where("name LIKE ?", "%"+filter.Name+"%")
	}
	if filter.Hidden != nil {
		db = db.Where("hidden = ?", *filter.Hidden)
	}

	var total int64
	db.Model(&model.Drive{}).Count(&total)

	if filter.NextMarker != "" {
		db = db.Where("id < ?", filter.NextMarker)
	}

	if filter.PageSize <= 0 {
		filter.PageSize = 20
	}

	var drives []model.Drive
	err := db.Order("created DESC").Limit(filter.PageSize).Find(&drives).Error

	return drives, total, err
}

func (r *driveRepository) Create(ctx context.Context, drive *model.Drive) error {
	return r.db.WithContext(ctx).Create(drive).Error
}

func (r *driveRepository) Update(ctx context.Context, drive *model.Drive, updates map[string]interface{}) error {
	return r.db.WithContext(ctx).Model(drive).Updates(updates).Error
}

func (r *driveRepository) Delete(ctx context.Context, id string, userID string) error {
	return r.db.WithContext(ctx).Where("id = ? AND user_id = ?", id, userID).Delete(&model.Drive{}).Error
}

func (r *driveRepository) CreateToken(ctx context.Context, token *model.DriveToken) error {
	return r.db.WithContext(ctx).Create(token).Error
}

func (r *driveRepository) GetToken(ctx context.Context, id string) (*model.DriveToken, error) {
	var token model.DriveToken
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&token).Error
	if err != nil {
		return nil, err
	}
	return &token, nil
}

func (r *driveRepository) UpdateToken(ctx context.Context, token *model.DriveToken, updates map[string]interface{}) error {
	return r.db.WithContext(ctx).Model(token).Updates(updates).Error
}
