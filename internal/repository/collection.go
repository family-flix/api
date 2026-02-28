package repository

import (
	"context"

	"github.com/family-flix/api/internal/model"
	"gorm.io/gorm"
)

type CollectionRepository interface {
	Get(ctx context.Context, id string, userID string) (*model.CollectionV2, error)
	List(ctx context.Context, userID string, filter CollectionFilter) ([]model.CollectionV2, int64, error)
	Create(ctx context.Context, collection *model.CollectionV2) error
	Update(ctx context.Context, collection *model.CollectionV2, updates map[string]interface{}) error
	Delete(ctx context.Context, id string, userID string) error
}

type CollectionFilter struct {
	Type       *int
	Name       string
	NextMarker string
	PageSize   int
	Page       int
}

type collectionRepository struct {
	db *gorm.DB
}

func NewCollectionRepository(db *gorm.DB) CollectionRepository {
	return &collectionRepository{db: db}
}

func (r *collectionRepository) Get(ctx context.Context, id string, userID string) (*model.CollectionV2, error) {
	var col model.CollectionV2
	err := r.db.WithContext(ctx).
		Preload("Medias.Profile").
		Where("id = ? AND user_id = ?", id, userID).
		First(&col).Error
	if err != nil {
		return nil, err
	}
	return &col, nil
}

func (r *collectionRepository) List(ctx context.Context, userID string, filter CollectionFilter) ([]model.CollectionV2, int64, error) {
	db := r.db.WithContext(ctx).Where("user_id = ?", userID)

	if filter.Type != nil {
		db = db.Where("type = ?", *filter.Type)
	}
	if filter.Name != "" {
		db = db.Where("title LIKE ?", "%"+filter.Name+"%")
	}

	var total int64
	db.Model(&model.CollectionV2{}).Count(&total)

	if filter.Page > 0 {
		db = db.Offset((filter.Page - 1) * filter.PageSize)
	} else if filter.NextMarker != "" {
		db = db.Where("id < ?", filter.NextMarker)
	}

	if filter.PageSize <= 0 {
		filter.PageSize = 20
	}

	var collections []model.CollectionV2
	err := db.Preload("Medias.Profile").
		Order("sort DESC, created DESC").
		Limit(filter.PageSize).
		Find(&collections).Error

	return collections, total, err
}

func (r *collectionRepository) Create(ctx context.Context, collection *model.CollectionV2) error {
	return r.db.WithContext(ctx).Create(collection).Error
}

func (r *collectionRepository) Update(ctx context.Context, collection *model.CollectionV2, updates map[string]interface{}) error {
	return r.db.WithContext(ctx).Model(collection).Updates(updates).Error
}

func (r *collectionRepository) Delete(ctx context.Context, id string, userID string) error {
	return r.db.WithContext(ctx).Where("id = ? AND user_id = ?", id, userID).Delete(&model.CollectionV2{}).Error
}
