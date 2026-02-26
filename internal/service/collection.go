package service

import (
	"context"

	"github.com/family-flix/api/internal/domain/member"
	"github.com/family-flix/api/internal/model"
	"github.com/family-flix/api/internal/repository"
)

type CollectionService interface {
	GetCollection(ctx context.Context, id string, userID string) (*model.CollectionV2, error)
	ListCollection(ctx context.Context, userID string, filter repository.CollectionFilter) ([]model.CollectionV2, int64, error)
	CreateCollection(ctx context.Context, userID string, req CollectionCreateRequest) error
	UpdateCollection(ctx context.Context, userID string, req CollectionUpdateRequest) error
	DeleteCollection(ctx context.Context, id string, userID string) error
}

type CollectionCreateRequest struct {
	Title string
	Desc  string
	Sort  int
}

type CollectionUpdateRequest struct {
	ID    string
	Title *string
	Desc  *string
	Sort  *int
}

type collectionService struct {
	repo repository.CollectionRepository
}

func NewCollectionService(repo repository.CollectionRepository) CollectionService {
	return &collectionService{repo: repo}
}

func (s *collectionService) GetCollection(ctx context.Context, id string, userID string) (*model.CollectionV2, error) {
	return s.repo.Get(ctx, id, userID)
}

func (s *collectionService) ListCollection(ctx context.Context, userID string, filter repository.CollectionFilter) ([]model.CollectionV2, int64, error) {
	return s.repo.List(ctx, userID, filter)
}

func (s *collectionService) CreateCollection(ctx context.Context, userID string, req CollectionCreateRequest) error {
	desc := req.Desc
	col := &model.CollectionV2{
		ID:     member.Rid(),
		Title:  req.Title,
		Desc:   &desc,
		Sort:   req.Sort,
		Type:   1, // Default type
		UserID: userID,
	}
	return s.repo.Create(ctx, col)
}

func (s *collectionService) UpdateCollection(ctx context.Context, userID string, req CollectionUpdateRequest) error {
	col, err := s.repo.Get(ctx, req.ID, userID)
	if err != nil {
		return err
	}

	updates := map[string]interface{}{}
	if req.Title != nil {
		updates["title"] = *req.Title
	}
	if req.Desc != nil {
		updates["desc"] = *req.Desc
	}
	if req.Sort != nil {
		updates["sort"] = *req.Sort
	}

	if len(updates) > 0 {
		return s.repo.Update(ctx, col, updates)
	}
	return nil
}

func (s *collectionService) DeleteCollection(ctx context.Context, id string, userID string) error {
	return s.repo.Delete(ctx, id, userID)
}
