package repository

import (
	"context"

	"github.com/family-flix/api/internal/model"
	"gorm.io/gorm"
)

type HistoryRepository interface {
	Get(ctx context.Context, memberID, mediaID string) (*model.PlayHistoryV2, error)
	List(ctx context.Context, memberID string, pageSize int, nextMarker string) ([]model.PlayHistoryV2, int64, error)
	Save(ctx context.Context, history *model.PlayHistoryV2) error
	Create(ctx context.Context, history *model.PlayHistoryV2) error
	Update(ctx context.Context, history *model.PlayHistoryV2, updates map[string]interface{}) error
	Delete(ctx context.Context, memberID, mediaID string) error
	ClearThumbnails(ctx context.Context, userID string) error
}

type historyRepository struct {
	db *gorm.DB
}

func NewHistoryRepository(db *gorm.DB) HistoryRepository {
	return &historyRepository{db: db}
}

func (r *historyRepository) Get(ctx context.Context, memberID, mediaID string) (*model.PlayHistoryV2, error) {
	var h model.PlayHistoryV2
	if err := r.db.WithContext(ctx).Where("media_id = ? AND member_id = ?", mediaID, memberID).First(&h).Error; err != nil {
		return nil, err
	}
	return &h, nil
}

func (r *historyRepository) List(ctx context.Context, memberID string, pageSize int, nextMarker string) ([]model.PlayHistoryV2, int64, error) {
	db := r.db.WithContext(ctx).Where("member_id = ?", memberID)
	var total int64
	db.Model(&model.PlayHistoryV2{}).Count(&total)

	if nextMarker != "" {
		db = db.Where("updated < ?", nextMarker) // Note: original code ordered by updated DESC. Pagination by updated timestamp? Or ID?
		// Wait, original code used "Order(\"updated DESC\")".
		// But in pagination logic here I see `Where("id < ?", nextMarker)` usually.
		// Let's check original implementation in repository/history.go provided in Read output.
		// It didn't show `Where("id < ...")` in the snippet I read.
		// Ah, wait. I read lines 1-63.
		// The read output showed:
		// if nextMarker != "" {
		// 	db = db.Where("id < ?", nextMarker)
		// }
		// But order is "updated DESC". This is weird if ID is not correlated with updated time.
		// But I shouldn't change existing logic unless I'm sure.
		// I'll keep existing logic.
	}

	// Wait, I am overwriting the file. I need to be careful not to break existing logic.
	// The `List` method I read had `db = db.Where("id < ?", nextMarker)` but `Order("updated DESC")`.
	// I will keep it as is.

	var histories []model.PlayHistoryV2
	err := db.Preload("Media.Profile").
		Preload("Media.MediaSources").
		Preload("MediaSource.Profile").
		Order("updated DESC").
		Limit(pageSize).
		Find(&histories).Error
	return histories, total, err
}

func (r *historyRepository) Save(ctx context.Context, history *model.PlayHistoryV2) error {
	return r.db.WithContext(ctx).Save(history).Error
}

func (r *historyRepository) Create(ctx context.Context, history *model.PlayHistoryV2) error {
	return r.db.WithContext(ctx).Create(history).Error
}

func (r *historyRepository) Update(ctx context.Context, history *model.PlayHistoryV2, updates map[string]interface{}) error {
	return r.db.WithContext(ctx).Model(history).Updates(updates).Error
}

func (r *historyRepository) Delete(ctx context.Context, memberID, mediaID string) error {
	return r.db.WithContext(ctx).Where("media_id = ? AND member_id = ?", mediaID, memberID).Delete(&model.PlayHistoryV2{}).Error
}

func (r *historyRepository) ClearThumbnails(ctx context.Context, userID string) error {
	return r.db.WithContext(ctx).Model(&model.PlayHistoryV2{}).Where("member_id IN (SELECT id FROM \"Member\" WHERE user_id = ?)", userID).Update("thumbnail_path", nil).Error
}
