package service

import (
	"context"
	"time"

	"github.com/family-flix/api/internal/domain/member"
	"github.com/family-flix/api/internal/model"
	"github.com/family-flix/api/internal/repository"
)

type HistoryService interface {
	GetHistory(ctx context.Context, memberID, mediaID string) (*model.PlayHistoryV2, error)
	ListHistory(ctx context.Context, memberID string, pageSize int, nextMarker string, page int) ([]model.PlayHistoryV2, int64, error)
	UpdateHistory(ctx context.Context, memberID string, req HistoryUpdateRequest) error
	DeleteHistory(ctx context.Context, memberID, mediaID string) error
	ClearThumbnails(ctx context.Context, userID string) error
}

type HistoryUpdateRequest struct {
	MediaID       string
	MediaSourceID string
	CurrentTime   float64
	Duration      float64
	Thumbnail     string
}

type historyService struct {
	repo repository.HistoryRepository
}

func NewHistoryService(repo repository.HistoryRepository) HistoryService {
	return &historyService{repo: repo}
}

func (s *historyService) GetHistory(ctx context.Context, memberID, mediaID string) (*model.PlayHistoryV2, error) {
	return s.repo.Get(ctx, memberID, mediaID)
}

func (s *historyService) ListHistory(ctx context.Context, memberID string, pageSize int, nextMarker string, page int) ([]model.PlayHistoryV2, int64, error) {
	if pageSize <= 0 {
		pageSize = 20
	}
	return s.repo.List(ctx, memberID, pageSize, nextMarker, page)
}

func (s *historyService) UpdateHistory(ctx context.Context, memberID string, req HistoryUpdateRequest) error {
	h, err := s.repo.Get(ctx, memberID, req.MediaID)
	if err != nil {
		// Create
		h = &model.PlayHistoryV2{
			ID:            member.Rid(),
			MediaID:       req.MediaID,
			MediaSourceID: req.MediaSourceID,
			CurrentTime:   req.CurrentTime,
			Duration:      req.Duration,
			MemberID:      memberID,
		}
		if req.Thumbnail != "" {
			h.ThumbnailPath = &req.Thumbnail
		}
		return s.repo.Create(ctx, h)
	}

	// Update
	updates := map[string]interface{}{
		"media_source_id": req.MediaSourceID,
		"current_time":    req.CurrentTime,
		"duration":        req.Duration,
		"updated":         time.Now(),
	}
	if req.Thumbnail != "" {
		updates["thumbnail_path"] = req.Thumbnail
	}
	return s.repo.Update(ctx, h, updates)
}

func (s *historyService) DeleteHistory(ctx context.Context, memberID, mediaID string) error {
	return s.repo.Delete(ctx, memberID, mediaID)
}

func (s *historyService) ClearThumbnails(ctx context.Context, userID string) error {
	return s.repo.ClearThumbnails(ctx, userID)
}
