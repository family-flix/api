package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/family-flix/api/internal/model"
	"gorm.io/gorm"
)

type HistoryRepository interface {
	Get(ctx context.Context, memberID, mediaID string) (*model.PlayHistoryV2, error)
	List(ctx context.Context, memberID string, pageSize int, nextMarker string, page int) ([]model.PlayHistoryV2, int64, error)
	ListUpdated(ctx context.Context, memberID string, page int, pageSize int) ([]model.HistoryUpdatedItem, error)
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

func (r *historyRepository) List(ctx context.Context, memberID string, pageSize int, nextMarker string, page int) ([]model.PlayHistoryV2, int64, error) {
	db := r.db.WithContext(ctx).Model(&model.PlayHistoryV2{}).Where("member_id = ?", memberID)
	var total int64
	db.Count(&total)

	if pageSize <= 0 {
		pageSize = 20
	}

	if page > 0 {
		db = db.Offset((page - 1) * pageSize)
	} else if nextMarker != "" {
		if t, err := time.Parse(time.RFC3339Nano, nextMarker); err == nil {
			db = db.Where("updated < ?", t)
		} else if t, err := time.Parse(time.RFC3339, nextMarker); err == nil {
			db = db.Where("updated < ?", t)
		} else {
			db = db.Where("updated < ?", nextMarker)
		}
	}

	var histories []model.PlayHistoryV2
	err := db.Preload("Media.Profile").
		Preload("Media.MediaSources").
		Preload("MediaSource.Profile").
		Order("updated DESC").
		Limit(pageSize).
		Find(&histories).Error
	return histories, total, err
}

func (r *historyRepository) ListUpdated(ctx context.Context, memberID string, page int, pageSize int) ([]model.HistoryUpdatedItem, error) {
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	quoteIdent := func(s string) string {
		switch r.db.Dialector.Name() {
		case "mysql":
			return "`" + s + "`"
		default:
			return `"` + s + `"`
		}
	}
	qc := func(alias, col string) string {
		return alias + "." + quoteIdent(col)
	}

	h := "h"
	m := "m"
	mp := "mp"
	ce := "ce"
	le := "le"
	h2 := "h2"
	ms2 := "ms2"
	msp := "msp"
	ms := "ms"
	mx := "mx"
	msp2 := "msp2"

	hTable := quoteIdent("PlayHistoryV2")
	mTable := quoteIdent("Media")
	mpTable := quoteIdent("MediaProfile")
	msTable := quoteIdent("MediaSource")
	mspTable := quoteIdent("MediaSourceProfile")

	sql := fmt.Sprintf(`
SELECT
  %s AS id,
  %s AS name,
  %s AS poster_path,
  %s AS updated,
  %s AS cur_episode_order,
  %s AS cur_episode_name,
  %s AS thumbnail_path,
  %s AS latest_episode_created,
  %s AS latest_episode_order,
  %s AS latest_episode_name
FROM %s %s
JOIN %s %s ON %s = %s
JOIN %s %s ON %s = %s
JOIN (
  SELECT
    %s AS history_id,
    %s AS cur_episode_order,
    %s AS cur_episode_name
  FROM %s %s
  JOIN %s %s ON %s = %s
  JOIN %s %s ON %s = %s
) %s ON %s = %s
JOIN (
  SELECT
    %s AS media_id,
    %s AS latest_episode_created,
    %s AS latest_episode_order,
    %s AS latest_episode_name
  FROM %s %s
  JOIN (
    SELECT %s AS media_id, MAX(%s) AS max_created
    FROM %s
    GROUP BY %s
  ) %s ON %s = %s AND %s = %s
  JOIN %s %s ON %s = %s
) %s ON %s = %s
WHERE %s = ? AND %s = ? AND %s > %s
ORDER BY %s DESC
LIMIT ? OFFSET ?`,
		qc(m, "id"),
		qc(mp, "name"),
		qc(mp, "poster_path"),
		qc(h, "updated"),
		qc(ce, "cur_episode_order"),
		qc(ce, "cur_episode_name"),
		qc(h, "thumbnail_path"),
		qc(le, "latest_episode_created"),
		qc(le, "latest_episode_order"),
		qc(le, "latest_episode_name"),
		hTable, h,
		mTable, m, qc(m, "id"), qc(h, "media_id"),
		mpTable, mp, qc(mp, "id"), qc(m, "profile_id"),
		qc(h2, "id"),
		qc(msp, "order"),
		qc(msp, "name"),
		hTable, h2,
		msTable, ms2, qc(ms2, "id"), qc(h2, "media_source_id"),
		mspTable, msp, qc(msp, "id"), qc(ms2, "profile_id"),
		ce, qc(ce, "history_id"), qc(h, "id"),
		qc(ms, "media_id"),
		qc(ms, "created"),
		qc(msp2, "order"),
		qc(msp2, "name"),
		msTable, ms,
		quoteIdent("media_id"), quoteIdent("created"),
		msTable,
		quoteIdent("media_id"),
		mx, qc(mx, "media_id"), qc(ms, "media_id"), qc(mx, "max_created"), qc(ms, "created"),
		mspTable, msp2, qc(msp2, "id"), qc(ms, "profile_id"),
		le, qc(le, "media_id"), qc(m, "id"),
		qc(m, "type"),
		qc(h, "member_id"),
		qc(le, "latest_episode_created"),
		qc(h, "updated"),
		qc(le, "latest_episode_created"),
	)

	var items []model.HistoryUpdatedItem
	err := r.db.WithContext(ctx).Raw(sql, 1, memberID, pageSize, offset).Scan(&items).Error
	return items, err
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
