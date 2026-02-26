package service

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/family-flix/api/internal/model"
	"github.com/family-flix/api/internal/repository"
)

type MemberService interface {
	List(ctx context.Context, userID, name, nextMarker string, pageSize int) ([]model.Member, int64, string, error)
	Get(ctx context.Context, id, userID string) (*model.Member, error)
	Create(ctx context.Context, userID, remark string) (string, string, string, error)
	UpdatePermissions(ctx context.Context, userID, memberID string, permissions []string) error
	Delete(ctx context.Context, userID, memberID string) error
	AddToken(ctx context.Context, userID, memberID string) (string, string, error)
	GetHistories(ctx context.Context, memberID string, nextMarker string, pageSize int) ([]model.PlayHistoryV2, int64, string, error)
	CreateInvitee(ctx context.Context, userID, inviterID, remark string) (string, string, string, error)
	ListInvitees(ctx context.Context, inviterID string) ([]model.Member, error)
}

type memberService struct {
	repo        repository.MemberRepository
	userService UserService
}

func NewMemberService(repo repository.MemberRepository, userService UserService) MemberService {
	return &memberService{repo: repo, userService: userService}
}

func (s *memberService) List(ctx context.Context, userID, name, nextMarker string, pageSize int) ([]model.Member, int64, string, error) {
	filter := repository.MemberFilter{
		UserID:     userID,
		Name:       name,
		NextMarker: nextMarker,
		PageSize:   pageSize,
	}
	return s.repo.List(ctx, filter)
}

func (s *memberService) Get(ctx context.Context, id, userID string) (*model.Member, error) {
	return s.repo.Get(ctx, id, userID)
}

func (s *memberService) Create(ctx context.Context, userID, remark string) (string, string, string, error) {
	if _, err := s.repo.GetByRemark(ctx, remark, userID); err == nil {
		return "", "", "", fmt.Errorf("该备注已存在")
	}

	memberID := rid()
	member := &model.Member{ID: memberID, Remark: remark, UserID: userID}
	data := "{}"
	setting := &model.MemberSetting{ID: rid(), Data: data, MemberID: memberID}

	if err := s.repo.Create(ctx, member, setting); err != nil {
		return "", "", "", err
	}

	tokenValue, err := s.userService.EncodeToken(memberID)
	if err != nil {
		return "", "", "", err
	}

	tokenID := rid()
	token := &model.MemberToken{ID: tokenID, Token: tokenValue, MemberID: memberID}
	if err := s.repo.CreateToken(ctx, token); err != nil {
		return "", "", "", err
	}

	return memberID, tokenID, tokenValue, nil
}

func (s *memberService) UpdatePermissions(ctx context.Context, userID, memberID string, permissions []string) error {
	m, err := s.repo.Get(ctx, memberID, userID)
	if err != nil {
		return fmt.Errorf("成员不存在")
	}

	permsJSON, _ := json.Marshal(permissions)
	permStr := string(permsJSON)
	m.Permission = &permStr

	return s.repo.Update(ctx, m)
}

func (s *memberService) Delete(ctx context.Context, userID, memberID string) error {
	return s.repo.Delete(ctx, memberID, userID)
}

func (s *memberService) AddToken(ctx context.Context, userID, memberID string) (string, string, error) {
	// Verify ownership
	if _, err := s.repo.Get(ctx, memberID, userID); err != nil {
		return "", "", fmt.Errorf("成员不存在")
	}

	tokenValue, err := s.userService.EncodeToken(memberID)
	if err != nil {
		return "", "", err
	}

	tokenID := rid()
	token := &model.MemberToken{ID: tokenID, Token: tokenValue, MemberID: memberID}
	if err := s.repo.CreateToken(ctx, token); err != nil {
		return "", "", err
	}

	return tokenID, tokenValue, nil
}

func (s *memberService) GetHistories(ctx context.Context, memberID string, nextMarker string, pageSize int) ([]model.PlayHistoryV2, int64, string, error) {
	return s.repo.GetHistories(ctx, memberID, nextMarker, pageSize)
}

func (s *memberService) CreateInvitee(ctx context.Context, userID, inviterID, remark string) (string, string, string, error) {
	if _, err := s.repo.GetByRemark(ctx, remark, userID); err == nil {
		return "", "", "", fmt.Errorf("该备注已存在")
	}

	memberID := rid()
	member := &model.Member{ID: memberID, Remark: remark, UserID: userID, InviterID: &inviterID}
	data := "{}"
	setting := &model.MemberSetting{ID: rid(), Data: data, MemberID: memberID}

	if err := s.repo.Create(ctx, member, setting); err != nil {
		return "", "", "", err
	}

	tokenValue, err := s.userService.EncodeToken(memberID)
	if err != nil {
		return "", "", "", err
	}

	tokenID := rid()
	token := &model.MemberToken{ID: tokenID, Token: tokenValue, MemberID: memberID}
	if err := s.repo.CreateToken(ctx, token); err != nil {
		return "", "", "", err
	}

	return memberID, tokenID, tokenValue, nil
}

func (s *memberService) ListInvitees(ctx context.Context, inviterID string) ([]model.Member, error) {
	return s.repo.ListByInviter(ctx, inviterID)
}
