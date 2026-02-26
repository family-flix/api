package service

import (
	"context"
	"fmt"
	"time"

	"github.com/family-flix/api/internal/domain/member"
	"github.com/family-flix/api/internal/model"
	"github.com/family-flix/api/internal/repository"
)

type WechatService interface {
	// Auth
	Login(ctx context.Context, email, pwd string) (*model.Member, *model.MemberToken, error)
	Register(ctx context.Context, email, pwd, code string) (*model.Member, *model.MemberToken, error)
	CreateAuthCode(ctx context.Context) (string, int, error)
	CheckAuthCode(ctx context.Context, codeID string) (int, *model.Member, *model.MemberToken, error)
	ConfirmAuthCode(ctx context.Context, codeID string, status int, memberID string) error

	// Member
	UpdateEmail(ctx context.Context, memberID, email string) error
	UpdatePassword(ctx context.Context, memberID, pwd string) error
	GetProfile(ctx context.Context, memberID string) (*model.Member, error)
	GetToken(ctx context.Context, memberID string) (*model.Member, *model.MemberToken, error)
	ListInvitationCodes(ctx context.Context, memberID string) ([]model.InvitationCode, error)
	CreateInvitationCode(ctx context.Context, memberID string) (*model.InvitationCode, error)

	// Media
	ListMedia(ctx context.Context, userID string, filter repository.WechatMediaFilter) ([]model.Media, int64, error)
	GetMedia(ctx context.Context, mediaID, userID string) (*model.Media, error)
	ListEpisodes(ctx context.Context, mediaID string, nextMarker string, pageSize int) ([]model.MediaSource, error)
	GetSource(ctx context.Context, sourceID, userID string) (*model.MediaSource, error)
	ListTVLives(ctx context.Context, userID string) ([]model.TVLive, error)
	ListRanks(ctx context.Context, userID string) ([]model.CollectionV2, error)
	GetSeries(ctx context.Context, mediaID, userID string) ([]model.Media, error)

	// Notifications & Reports
	ListNotifications(ctx context.Context, memberID string, status, typeVal *int, nextMarker string, pageSize int) ([]model.MemberNotification, int64, error)
	ReadNotification(ctx context.Context, id, memberID string) error
	ReadAllNotifications(ctx context.Context, memberID string) error
	CreateReport(ctx context.Context, report *model.ReportV2) error
	HideReport(ctx context.Context, id, memberID string) error
	ListReports(ctx context.Context, memberID string, status, typeVal *int, nextMarker string, pageSize int) ([]model.ReportV2, error)
	ListDiaries(ctx context.Context, memberID string, nextMarker string, pageSize int) ([]model.MemberDiary, error)
}

type wechatService struct {
	repo        repository.WechatRepository
	userService UserService
}

func NewWechatService(repo repository.WechatRepository, userService UserService) WechatService {
	return &wechatService{repo: repo, userService: userService}
}

func (s *wechatService) Login(ctx context.Context, email, pwd string) (*model.Member, *model.MemberToken, error) {
	if _, err := s.repo.GetAdminUser(ctx); err != nil {
		return nil, nil, fmt.Errorf("没有管理员账号")
	}

	auth, err := s.repo.GetAuthByEmail(ctx, email)
	if err != nil {
		return nil, nil, fmt.Errorf("该邮箱不存在")
	}

	m, err := s.repo.GetMember(ctx, auth.MemberID)
	if err != nil {
		return nil, nil, fmt.Errorf("无效的成员")
	}

	if auth.ProviderArg1 == nil || *auth.ProviderArg1 != pwd {
		return nil, nil, fmt.Errorf("密码验证失败")
	}

	tokenValue, err := s.userService.EncodeToken(m.ID)
	if err != nil {
		return nil, nil, err
	}

	mt, err := s.repo.GetMemberToken(ctx, m.ID)
	if err != nil {
		mt = &model.MemberToken{ID: member.Rid(), Token: tokenValue, MemberID: m.ID}
		s.repo.CreateMemberToken(ctx, mt)
	}

	return m, mt, nil
}

func (s *wechatService) Register(ctx context.Context, email, pwd, code string) (*model.Member, *model.MemberToken, error) {
	adminUser, err := s.repo.GetAdminUser(ctx)
	if err != nil {
		return nil, nil, fmt.Errorf("没有管理员账号")
	}

	var invitationCode *model.InvitationCode
	if code != "" {
		ic, err := s.repo.GetInvitationCode(ctx, code)
		if err != nil || ic.Used != 0 {
			return nil, nil, fmt.Errorf("无效的邀请码")
		}
		invitationCode = ic
	}

	if _, err := s.repo.GetAuthByEmail(ctx, email); err == nil {
		return nil, nil, fmt.Errorf("该邮箱已注册")
	}

	memberID := member.Rid()
	m := &model.Member{ID: memberID, Email: &email, UserID: adminUser.ID}

	auth := &model.MemberAuthentication{
		ID:           member.Rid(),
		MemberID:     memberID,
		Provider:     "credential",
		ProviderID:   email,
		ProviderArg1: &pwd,
	}

	tokenValue, err := s.userService.EncodeToken(memberID)
	if err != nil {
		return nil, nil, err
	}

	mt := &model.MemberToken{ID: member.Rid(), Token: tokenValue, MemberID: memberID}

	if err := s.repo.CreateMemberWithAuth(ctx, m, auth, mt, invitationCode); err != nil {
		return nil, nil, err
	}

	return m, mt, nil
}

func (s *wechatService) CreateAuthCode(ctx context.Context) (string, int, error) {
	adminUser, err := s.repo.GetAdminUser(ctx)
	if err != nil {
		return "", 0, fmt.Errorf("没有管理员账号")
	}
	code := model.AuthQRCode{
		ID:      member.Rid(),
		Step:    1,
		Expires: model.LocalTime{Time: time.Now().Add(3 * time.Minute)},
		UserID:  adminUser.ID,
	}
	if err := s.repo.CreateAuthQRCode(ctx, &code); err != nil {
		return "", 0, err
	}
	return code.ID, code.Step, nil
}

func (s *wechatService) CheckAuthCode(ctx context.Context, codeID string) (int, *model.Member, *model.MemberToken, error) {
	code, err := s.repo.GetAuthQRCode(ctx, codeID)
	if err != nil {
		return 0, nil, nil, fmt.Errorf("无效的二维码")
	}
	if time.Now().After(code.Expires.Time) {
		return 4, nil, nil, nil // Expired
	}
	if code.Step == 3 && code.MemberID != nil {
		tokenValue, err := s.userService.EncodeToken(*code.MemberID)
		if err != nil {
			return code.Step, nil, nil, err
		}
		// Fetch member to return details
		m, _ := s.repo.GetMember(ctx, *code.MemberID)

		mt := &model.MemberToken{Token: tokenValue} // Placeholder
		return code.Step, m, mt, nil
	}
	return code.Step, nil, nil, nil
}

func (s *wechatService) ConfirmAuthCode(ctx context.Context, codeID string, status int, memberID string) error {
	code, err := s.repo.GetAuthQRCode(ctx, codeID)
	if err != nil {
		return fmt.Errorf("无效的二维码")
	}
	if time.Now().After(code.Expires.Time) {
		return fmt.Errorf("二维码已过期")
	}
	code.Step = status
	if status == 3 {
		code.MemberID = &memberID
	}
	return s.repo.UpdateAuthQRCode(ctx, code)
}

func (s *wechatService) UpdateEmail(ctx context.Context, memberID, email string) error {
	m, err := s.repo.GetMember(ctx, memberID)
	if err != nil {
		return err
	}
	m.Email = &email
	if err := s.repo.UpdateMember(ctx, m); err != nil {
		return err
	}

	auth, err := s.repo.GetAuthByMemberID(ctx, memberID)
	if err != nil {
		// Should not happen if registered via credential
		return nil
	}
	auth.ProviderID = email
	return s.repo.UpdateAuth(ctx, auth)
}

func (s *wechatService) UpdatePassword(ctx context.Context, memberID, pwd string) error {
	auth, err := s.repo.GetAuthByMemberID(ctx, memberID)
	if err != nil {
		return err
	}
	auth.ProviderArg1 = &pwd
	return s.repo.UpdateAuth(ctx, auth)
}

func (s *wechatService) GetProfile(ctx context.Context, memberID string) (*model.Member, error) {
	return s.repo.GetMember(ctx, memberID)
}

func (s *wechatService) GetToken(ctx context.Context, memberID string) (*model.Member, *model.MemberToken, error) {
	m, err := s.repo.GetMember(ctx, memberID)
	if err != nil {
		return nil, nil, err
	}
	mt, err := s.repo.GetMemberToken(ctx, memberID)
	if err != nil {
		return m, mt, nil
	}
	return m, mt, nil
}

func (s *wechatService) ListInvitationCodes(ctx context.Context, memberID string) ([]model.InvitationCode, error) {
	return s.repo.ListInvitationCodes(ctx, memberID)
}

func (s *wechatService) CreateInvitationCode(ctx context.Context, memberID string) (*model.InvitationCode, error) {
	code := &model.InvitationCode{
		ID:        member.Rid(),
		Text:      member.Rid(),
		InviterID: memberID,
	}
	if err := s.repo.CreateInvitationCode(ctx, code); err != nil {
		return nil, err
	}
	return code, nil
}

func (s *wechatService) ListMedia(ctx context.Context, userID string, filter repository.WechatMediaFilter) ([]model.Media, int64, error) {
	return s.repo.ListMedia(ctx, userID, filter)
}

func (s *wechatService) GetMedia(ctx context.Context, mediaID, userID string) (*model.Media, error) {
	return s.repo.GetMedia(ctx, mediaID, userID)
}

func (s *wechatService) ListEpisodes(ctx context.Context, mediaID string, nextMarker string, pageSize int) ([]model.MediaSource, error) {
	return s.repo.ListMediaSources(ctx, mediaID, nextMarker, pageSize)
}

func (s *wechatService) GetSource(ctx context.Context, sourceID, userID string) (*model.MediaSource, error) {
	return s.repo.GetMediaSource(ctx, sourceID, userID)
}

func (s *wechatService) ListTVLives(ctx context.Context, userID string) ([]model.TVLive, error) {
	return s.repo.ListTVLives(ctx, userID)
}

func (s *wechatService) ListRanks(ctx context.Context, userID string) ([]model.CollectionV2, error) {
	return s.repo.ListCollections(ctx, userID)
}

func (s *wechatService) GetSeries(ctx context.Context, mediaID, userID string) ([]model.Media, error) {
	media, err := s.repo.GetMedia(ctx, mediaID, userID)
	if err != nil {
		return nil, err
	}
	if media.Profile == nil || media.Profile.SeriesID == nil {
		return []model.Media{}, nil
	}
	// Simplified: just return current media for now as repo method missing
	// TODO: implement ListSeriesMedias in repo
	return []model.Media{*media}, nil
}

func (s *wechatService) ListNotifications(ctx context.Context, memberID string, status, typeVal *int, nextMarker string, pageSize int) ([]model.MemberNotification, int64, error) {
	return s.repo.ListNotifications(ctx, memberID, status, typeVal, nextMarker, pageSize)
}

func (s *wechatService) ReadNotification(ctx context.Context, id, memberID string) error {
	n, err := s.repo.GetNotification(ctx, id, memberID)
	if err != nil {
		return err
	}
	n.Status = 2
	return s.repo.UpdateNotification(ctx, n)
}

func (s *wechatService) ReadAllNotifications(ctx context.Context, memberID string) error {
	return s.repo.UpdateNotificationsStatus(ctx, memberID, 2)
}

func (s *wechatService) CreateReport(ctx context.Context, report *model.ReportV2) error {
	return s.repo.CreateReport(ctx, report)
}

func (s *wechatService) HideReport(ctx context.Context, id, memberID string) error {
	r, err := s.repo.GetReport(ctx, id, memberID)
	if err != nil {
		return err
	}
	r.Hidden = 1
	return s.repo.UpdateReport(ctx, r)
}

func (s *wechatService) ListReports(ctx context.Context, memberID string, status, typeVal *int, nextMarker string, pageSize int) ([]model.ReportV2, error) {
	return s.repo.ListReports(ctx, memberID, status, typeVal, nextMarker, pageSize)
}

func (s *wechatService) ListDiaries(ctx context.Context, memberID string, nextMarker string, pageSize int) ([]model.MemberDiary, error) {
	return s.repo.ListDiaries(ctx, memberID, nextMarker, pageSize)
}
