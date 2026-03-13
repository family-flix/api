package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/family-flix/api/internal/domain/member"
	"github.com/family-flix/api/internal/model"
	"github.com/family-flix/api/internal/repository"
	"github.com/family-flix/api/pkg/drive_client"
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
	ListEpisodes(ctx context.Context, mediaID string, nextMarker string, pageSize int, page int) ([]model.MediaSource, error)
	GetSource(ctx context.Context, sourceID, userID string) (*model.MediaSource, error)
	GetDriveSource(ctx context.Context, sourceID, userID, resolutionType string) (*DriveSourceInfo, error)
	GetSourcePreview(ctx context.Context, source_id, user_id string) (*drive_client.PreviewInfo, error)
	ListTVLives(ctx context.Context, userID string) ([]model.TVLive, error)
	ListRanks(ctx context.Context, userID string) ([]model.CollectionV2, error)
	GetSeries(ctx context.Context, mediaID, userID string) ([]model.Media, error)
	GetPlayingInfo(ctx context.Context, mediaID string, history *model.PlayHistoryV2) (*PlayingInfo, error)

	// Notifications & Reports
	ListNotifications(ctx context.Context, memberID string, status, typeVal *int, nextMarker string, pageSize int, page int) ([]model.MemberNotification, int64, error)
	ReadNotification(ctx context.Context, id, memberID string) error
	ReadAllNotifications(ctx context.Context, memberID string) error
	CreateReport(ctx context.Context, report *model.ReportV2) error
	HideReport(ctx context.Context, id, memberID string) error
	ListReports(ctx context.Context, memberID string, status, typeVal *int, nextMarker string, pageSize int, page int) ([]model.ReportV2, error)
	ListDiaries(ctx context.Context, memberID string, nextMarker string, pageSize int, page int) ([]model.MemberDiary, error)
}

type wechatService struct {
	repo         repository.WechatRepository
	userService  UserService
	driveService DriveService
}

func NewWechatService(repo repository.WechatRepository, userService UserService, driveService DriveService) WechatService {
	return &wechatService{repo: repo, userService: userService, driveService: driveService}
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

func (s *wechatService) ListEpisodes(ctx context.Context, mediaID string, nextMarker string, pageSize int, page int) ([]model.MediaSource, error) {
	return s.repo.ListMediaSources(ctx, mediaID, nextMarker, pageSize, page)
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

func (s *wechatService) ListNotifications(ctx context.Context, memberID string, status, typeVal *int, nextMarker string, pageSize int, page int) ([]model.MemberNotification, int64, error) {
	return s.repo.ListNotifications(ctx, memberID, status, typeVal, nextMarker, pageSize, page)
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

func (s *wechatService) ListReports(ctx context.Context, memberID string, status, typeVal *int, nextMarker string, pageSize int, page int) ([]model.ReportV2, error) {
	return s.repo.ListReports(ctx, memberID, status, typeVal, nextMarker, pageSize, page)
}

func (s *wechatService) ListDiaries(ctx context.Context, memberID string, nextMarker string, pageSize int, page int) ([]model.MemberDiary, error) {
	return s.repo.ListDiaries(ctx, memberID, nextMarker, pageSize, page)
}

type PlayingInfo struct {
	MediaID      string       `json:"media_id"`
	CurSource    *CurSource   `json:"cur_source"`
	Sources      []SourceInfo `json:"sources"`
	SourceGroups []struct{}   `json:"source_groups"`
}

type CurSource struct {
	ID              string         `json:"id"`
	CurSourceFileID *string        `json:"cur_source_file_id"`
	CurrentTime     float64        `json:"current_time"`
	ThumbnailPath   *string        `json:"thumbnail_path"`
	Index           int            `json:"index"`
	Subtitles       []SubtitleInfo `json:"subtitles"`
	Sources         []FileInfo     `json:"sources"`
	Order           int            `json:"order"`
}

type SourceInfo struct {
	ID        string           `json:"id"`
	Name      string           `json:"name"`
	Order     int              `json:"order"`
	FileName  string           `json:"file_name"`
	StillPath *string          `json:"still_path"`
	Sources   []SourceFileInfo `json:"sources"`
}

type SourceFileInfo struct {
	ID          string `json:"id"`
	FileName    string `json:"file_name"`
	ParentPaths string `json:"parent_paths"`
}

type SubtitleInfo struct {
	ID       string `json:"id"`
	Type     int    `json:"type"`
	Name     string `json:"name"`
	Language string `json:"language"`
	URL      string `json:"url"`
}

type FileInfo struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	FileName string `json:"file_name"`
}

func (s *wechatService) GetPlayingInfo(ctx context.Context, media_id string, history *model.PlayHistoryV2) (*PlayingInfo, error) {
	// 1. Get Latest Source
	latest_source, err := s.repo.GetLatestMediaSource(ctx, media_id)
	if err != nil {
		return nil, fmt.Errorf("没有找到剧集")
	}
	total_count := 0
	if latest_source.Profile != nil {
		total_count = latest_source.Profile.Order
	}
	group_size := 20
	range_start := 1
	range_end := group_size
	if history != nil && history.MediaSource != nil && history.MediaSource.Profile != nil {
		order := history.MediaSource.Profile.Order
		groupIndex := (order - 1) / group_size
		range_start = groupIndex*group_size + 1
		range_end = (groupIndex + 1) * group_size
	}

	if range_end > total_count {
		range_end = total_count
	}

	// 1. Log
	fmt.Printf("GetPlayingInfo mediaID: %s, rangeStart: %d, rangeEnd: %d\n", media_id, range_start, range_end)

	// 2. Fetch Sources (Fetch all like GetAVProfile)
	sources, err := s.repo.ListMediaSources(ctx, media_id, "", 10000, 1)
	if err != nil {
		return nil, err
	}

	// 3. Construct Response
	res_sources := make([]SourceInfo, 0, len(sources))
	for _, mediasource := range sources {
		info := SourceInfo{
			ID:      mediasource.ID,
			Order:   0,
			Sources: make([]SourceFileInfo, 0),
		}
		if mediasource.Profile != nil {
			info.Name = mediasource.Profile.Name
			info.Order = mediasource.Profile.Order
			info.StillPath = mediasource.Profile.StillPath
		}
		if len(mediasource.Sources) > 0 {
			info.FileName = mediasource.Sources[0].FileName
			info.Sources = mapSourceFiles(mediasource.Sources)
		}
		res_sources = append(res_sources, info)
	}

	var cur_mediasource *CurSource
	if history != nil {
		cur_mediasource = &CurSource{
			ID:              history.MediaSourceID,
			CurSourceFileID: history.FileID,
			CurrentTime:     history.CurrentTime,
			ThumbnailPath:   history.ThumbnailPath,
			Order:           0,
		}
		if history.MediaSource != nil && history.MediaSource.Profile != nil {
			cur_mediasource.Order = history.MediaSource.Profile.Order
		}
		// Find index in sources
		for i, s := range sources {
			if s.ID == history.MediaSourceID {
				cur_mediasource.Index = i
				cur_mediasource.Subtitles = mapSubtitles(s.Subtitles)
				cur_mediasource.Sources = mapFiles(s.Sources)
				break
			}
		}
		// If not found in sources (because history is out of range? should not happen due to range logic),
		// we might need to fetch it separately or handle it.
		// For now assume it's in range.
		if cur_mediasource.Sources == nil {
			// fallback if not found in list (e.g. if we want to ensure robust code)
			// But for now let's assume it works.
		}
	} else if len(sources) > 0 {
		src := sources[0]
		cur_mediasource = &CurSource{
			ID:          src.ID,
			Index:       0,
			Order:       0,
			CurrentTime: 0,
		}
		if src.Profile != nil {
			cur_mediasource.Order = src.Profile.Order
			cur_mediasource.ThumbnailPath = src.Profile.StillPath
		}
		if len(src.Sources) > 0 {
			cur_mediasource.CurSourceFileID = &src.Sources[0].ID
		}
		cur_mediasource.Subtitles = mapSubtitles(src.Subtitles)
		cur_mediasource.Sources = mapFiles(src.Sources)
	}

	return &PlayingInfo{
		MediaID:      media_id,
		CurSource:    cur_mediasource,
		Sources:      res_sources,
		SourceGroups: []struct{}{},
	}, nil
}

func mapSubtitles(subs []model.SubtitleV2) []SubtitleInfo {
	res := make([]SubtitleInfo, 0, len(subs))
	for _, s := range subs {
		res = append(res, SubtitleInfo{
			ID:       s.ID,
			Type:     1,
			Name:     s.Name,
			Language: s.Language,
			URL:      s.UniqueID,
		})
	}
	return res
}

func mapFiles(files []model.ParsedMediaSource) []FileInfo {
	res := make([]FileInfo, 0, len(files))
	for _, f := range files {
		res = append(res, FileInfo{
			ID:       f.ID,
			Name:     f.Name,
			FileName: f.FileName,
		})
	}
	return res
}

func mapSourceFiles(files []model.ParsedMediaSource) []SourceFileInfo {
	res := make([]SourceFileInfo, 0, len(files))
	for _, f := range files {
		res = append(res, SourceFileInfo{
			ID:          f.ID,
			FileName:    f.FileName,
			ParentPaths: f.ParentPaths,
		})
	}
	return res
}

type DriveSourceInfo struct {
	ID            string                  `json:"id"`
	URL           string                  `json:"url"`
	ThumbnailPath string                  `json:"thumbnail_path,omitempty"`
	Type          string                  `json:"type"`
	Width         int                     `json:"width"`
	Height        int                     `json:"height"`
	Invalid       int                     `json:"invalid"`
	Other         []DriveSourceResolution `json:"other"`
	Subtitles     []DriveSourceSubtitle   `json:"subtitles"`
}

type DriveSourceResolution struct {
	Cur     bool   `json:"cur"`
	URL     string `json:"url"`
	Type    string `json:"type"`
	Width   int    `json:"width"`
	Height  int    `json:"height"`
	Invalid int    `json:"invalid"`
}

type DriveSourceSubtitle struct {
	Type     int      `json:"type"`
	ID       string   `json:"id"`
	Name     string   `json:"name"`
	URL      string   `json:"url"`
	Language []string `json:"language"`
}

func (s *wechatService) GetDriveSource(ctx context.Context, sourceID, userID, resolutionType string) (*DriveSourceInfo, error) {
	// 1. Get ParsedMediaSource
	source, err := s.repo.GetParsedMediaSource(ctx, sourceID, userID)
	if err != nil {
		return nil, err
	}

	// 2. Get Drive Client
	_, client, err := s.driveService.GetDriveClient(ctx, source.DriveID, userID)
	if err != nil {
		return nil, err
	}

	// 3. Fetch Preview Info
	previewInfo, err := client.FetchVideoPreviewInfo(source.FileID)
	if err != nil {
		return nil, err
	}

	if len(previewInfo.Sources) == 0 {
		return nil, fmt.Errorf("该源暂时不可播放，请切换其他源或等待一会重试")
	}

	// 4. Logic for recommendation
	var recommendResolution drive_client.VideoSource

	if len(previewInfo.Sources) == 1 {
		recommendResolution = previewInfo.Sources[0]
	} else {
		// Find match by type
		found := false
		for _, r := range previewInfo.Sources {
			if r.Type == resolutionType {
				recommendResolution = r
				found = true
				break
			}
		}
		if !found {
			// Find match not including "pdsapi"
			for _, r := range previewInfo.Sources {
				if !strings.Contains(r.URL, "pdsapi") {
					recommendResolution = r
					found = true
					break
				}
			}
		}
		if !found {
			recommendResolution = previewInfo.Sources[0]
		}
	}

	if recommendResolution.URL == "" {
		for _, r := range previewInfo.Sources {
			if r.URL != "" {
				recommendResolution = r
				break
			}
		}
	}

	// Check referer error
	if strings.Contains(recommendResolution.URL, "x-oss-additional-headers=referer") {
		return nil, fmt.Errorf("视频文件无法播放，请修改 refresh_token")
	}

	// 5. Construct Result
	res := &DriveSourceInfo{
		ID:            sourceID,
		URL:           recommendResolution.URL,
		ThumbnailPath: previewInfo.ThumbURL,
		Type:          recommendResolution.Type,
		Width:         recommendResolution.Width,
		Height:        recommendResolution.Height,
		Invalid:       0,
		Other:         make([]DriveSourceResolution, 0),
		Subtitles:     make([]DriveSourceSubtitle, 0),
	}

	for _, src := range previewInfo.Sources {
		if src.URL == "" {
			continue
		}
		res.Other = append(res.Other, DriveSourceResolution{
			Cur:     recommendResolution.Type == src.Type,
			URL:     src.URL,
			Type:    src.Type,
			Width:   src.Width,
			Height:  src.Height,
			Invalid: src.Invalid,
		})
	}

	for _, sub := range previewInfo.Subtitles {
		res.Subtitles = append(res.Subtitles, DriveSourceSubtitle{
			Type:     1, // MediaInnerFile
			ID:       sub.ID,
			Name:     sub.Name,
			URL:      sub.URL,
			Language: []string{sub.Language}, // Simplified mapping
		})
	}

	return res, nil
}

func (s *wechatService) GetSourcePreview(ctx context.Context, source_id, user_id string) (*drive_client.PreviewInfo, error) {
	source, err := s.repo.GetParsedMediaSource(ctx, source_id, user_id)
	if err != nil {
		return nil, err
	}

	_, client, err := s.driveService.GetDriveClient(ctx, source.DriveID, user_id)
	if err != nil {
		return nil, err
	}

	return client.Preview(source.FileID)
}
