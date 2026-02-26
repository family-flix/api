package repository

import (
	"context"

	"github.com/family-flix/api/internal/model"
	"gorm.io/gorm"
)

type WechatRepository interface {
	// Auth
	GetAdminUser(ctx context.Context) (*model.User, error)
	GetMemberByEmail(ctx context.Context, email string) (*model.Member, error)
	GetAuthByEmail(ctx context.Context, email string) (*model.MemberAuthentication, error)
	CreateAuth(ctx context.Context, auth *model.MemberAuthentication) error
	UpdateAuth(ctx context.Context, auth *model.MemberAuthentication) error
	GetInvitationCode(ctx context.Context, code string) (*model.InvitationCode, error)
	UpdateInvitationCode(ctx context.Context, code *model.InvitationCode) error
	CreateAuthQRCode(ctx context.Context, code *model.AuthQRCode) error
	GetAuthQRCode(ctx context.Context, id string) (*model.AuthQRCode, error)
	UpdateAuthQRCode(ctx context.Context, code *model.AuthQRCode) error
	CreateMemberToken(ctx context.Context, token *model.MemberToken) error
	GetMemberToken(ctx context.Context, memberID string) (*model.MemberToken, error)
	GetAuthByMemberID(ctx context.Context, memberID string) (*model.MemberAuthentication, error)

	// Member
	GetMember(ctx context.Context, id string) (*model.Member, error)
	UpdateMember(ctx context.Context, member *model.Member) error
	CreateMemberWithAuth(ctx context.Context, member *model.Member, auth *model.MemberAuthentication, token *model.MemberToken, code *model.InvitationCode) error
	ListInvitationCodes(ctx context.Context, inviterID string) ([]model.InvitationCode, error)
	CreateInvitationCode(ctx context.Context, code *model.InvitationCode) error

	// Media
	GetMedia(ctx context.Context, id, userID string) (*model.Media, error)
	ListMedia(ctx context.Context, userID string, filter WechatMediaFilter) ([]model.Media, int64, error)
	GetMediaSource(ctx context.Context, id, userID string) (*model.MediaSource, error)
	ListMediaSources(ctx context.Context, mediaID string, nextMarker string, pageSize int) ([]model.MediaSource, error)
	ListTVLives(ctx context.Context, userID string) ([]model.TVLive, error)
	ListCollections(ctx context.Context, userID string) ([]model.CollectionV2, error)

	// Notification & Report & Diary
	ListNotifications(ctx context.Context, memberID string, status, typeVal *int, nextMarker string, pageSize int) ([]model.MemberNotification, int64, error)
	UpdateNotification(ctx context.Context, notification *model.MemberNotification) error
	UpdateNotificationsStatus(ctx context.Context, memberID string, status int) error
	GetNotification(ctx context.Context, id, memberID string) (*model.MemberNotification, error)
	CreateReport(ctx context.Context, report *model.ReportV2) error
	ListReports(ctx context.Context, memberID string, status, typeVal *int, nextMarker string, pageSize int) ([]model.ReportV2, error)
	GetReport(ctx context.Context, id, memberID string) (*model.ReportV2, error)
	UpdateReport(ctx context.Context, report *model.ReportV2) error
	ListDiaries(ctx context.Context, memberID string, nextMarker string, pageSize int) ([]model.MemberDiary, error)
}

type WechatMediaFilter struct {
	Type       *int
	Name       string
	NextMarker string
	PageSize   int
}

type wechatRepository struct {
	db *gorm.DB
}

func NewWechatRepository(db *gorm.DB) WechatRepository {
	return &wechatRepository{db: db}
}

func (r *wechatRepository) GetAdminUser(ctx context.Context) (*model.User, error) {
	var user model.User
	err := r.db.WithContext(ctx).First(&user).Error
	return &user, err
}

func (r *wechatRepository) GetMemberByEmail(ctx context.Context, email string) (*model.Member, error) {
	var auth model.MemberAuthentication
	if err := r.db.WithContext(ctx).Where("provider = 'credential' AND provider_id = ?", email).First(&auth).Error; err != nil {
		return nil, err
	}
	var m model.Member
	if err := r.db.WithContext(ctx).Where("id = ? AND `delete` = 0", auth.MemberID).First(&m).Error; err != nil {
		return nil, err
	}
	return &m, nil
}

func (r *wechatRepository) GetAuthByEmail(ctx context.Context, email string) (*model.MemberAuthentication, error) {
	var auth model.MemberAuthentication
	err := r.db.WithContext(ctx).Where("provider = 'credential' AND provider_id = ?", email).First(&auth).Error
	return &auth, err
}

func (r *wechatRepository) CreateAuth(ctx context.Context, auth *model.MemberAuthentication) error {
	return r.db.WithContext(ctx).Create(auth).Error
}

func (r *wechatRepository) UpdateAuth(ctx context.Context, auth *model.MemberAuthentication) error {
	return r.db.WithContext(ctx).Save(auth).Error
}

func (r *wechatRepository) GetInvitationCode(ctx context.Context, code string) (*model.InvitationCode, error) {
	var ic model.InvitationCode
	err := r.db.WithContext(ctx).Where("text = ?", code).First(&ic).Error
	return &ic, err
}

func (r *wechatRepository) UpdateInvitationCode(ctx context.Context, code *model.InvitationCode) error {
	return r.db.WithContext(ctx).Save(code).Error
}

func (r *wechatRepository) CreateAuthQRCode(ctx context.Context, code *model.AuthQRCode) error {
	return r.db.WithContext(ctx).Create(code).Error
}

func (r *wechatRepository) GetAuthQRCode(ctx context.Context, id string) (*model.AuthQRCode, error) {
	var code model.AuthQRCode
	err := r.db.WithContext(ctx).Preload("Member").Where("id = ?", id).First(&code).Error
	return &code, err
}

func (r *wechatRepository) UpdateAuthQRCode(ctx context.Context, code *model.AuthQRCode) error {
	return r.db.WithContext(ctx).Save(code).Error
}

func (r *wechatRepository) CreateMemberToken(ctx context.Context, token *model.MemberToken) error {
	return r.db.WithContext(ctx).Create(token).Error
}

func (r *wechatRepository) GetMemberToken(ctx context.Context, memberID string) (*model.MemberToken, error) {
	var mt model.MemberToken
	err := r.db.WithContext(ctx).Where("member_id = ?", memberID).First(&mt).Error
	return &mt, err
}

func (r *wechatRepository) GetAuthByMemberID(ctx context.Context, memberID string) (*model.MemberAuthentication, error) {
	var auth model.MemberAuthentication
	err := r.db.WithContext(ctx).Where("member_id = ? AND provider = 'credential'", memberID).First(&auth).Error
	return &auth, err
}

func (r *wechatRepository) GetMember(ctx context.Context, id string) (*model.Member, error) {
	var m model.Member
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&m).Error
	return &m, err
}

func (r *wechatRepository) UpdateMember(ctx context.Context, member *model.Member) error {
	return r.db.WithContext(ctx).Save(member).Error
}

func (r *wechatRepository) CreateMemberWithAuth(ctx context.Context, member *model.Member, auth *model.MemberAuthentication, token *model.MemberToken, code *model.InvitationCode) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.WithContext(ctx).Create(member).Error; err != nil {
			return err
		}
		if err := tx.WithContext(ctx).Create(auth).Error; err != nil {
			return err
		}
		if err := tx.WithContext(ctx).Create(token).Error; err != nil {
			return err
		}
		// Create default settings
		settings := model.MemberSetting{
			MemberID: member.ID,
			Data:     "{\"language\":\"zh-CN\"}", // JSON string as per schema
		}
		if err := tx.WithContext(ctx).Create(&settings).Error; err != nil {
			return err
		}

		if code != nil {
			code.Used = 1
			code.InviteeID = &member.ID
			if err := tx.WithContext(ctx).Save(code).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *wechatRepository) ListInvitationCodes(ctx context.Context, inviterID string) ([]model.InvitationCode, error) {
	var codes []model.InvitationCode
	err := r.db.WithContext(ctx).Where("inviter_id = ?", inviterID).Order("created DESC").Find(&codes).Error
	return codes, err
}

func (r *wechatRepository) CreateInvitationCode(ctx context.Context, code *model.InvitationCode) error {
	return r.db.WithContext(ctx).Create(code).Error
}

func (r *wechatRepository) GetMedia(ctx context.Context, id, userID string) (*model.Media, error) {
	var media model.Media
	err := r.db.WithContext(ctx).Preload("Profile.Genres").Preload("Profile.OriginCountries").Preload("Profile.Persons.Profile").Preload("MediaSources").
		Where("id = ? AND user_id = ?", id, userID).First(&media).Error
	return &media, err
}

func (r *wechatRepository) ListMedia(ctx context.Context, userID string, filter WechatMediaFilter) ([]model.Media, int64, error) {
	db := r.db.WithContext(ctx).
		Joins("JOIN \"MediaProfile\" ON \"MediaProfile\".id = \"Media\".profile_id").
		Where("\"Media\".user_id = ?", userID)
	if filter.Type != nil {
		db = db.Where("\"Media\".type = ?", *filter.Type)
	}
	if filter.Name != "" {
		db = db.Where("\"MediaProfile\".name LIKE ? OR \"MediaProfile\".original_name LIKE ?", "%"+filter.Name+"%", "%"+filter.Name+"%")
	}
	var total int64
	db.Model(&model.Media{}).Count(&total)
	if filter.NextMarker != "" {
		db = db.Where("\"Media\".id < ?", filter.NextMarker)
	}
	var medias []model.Media
	err := db.Preload("Profile.Genres").Preload("Profile.OriginCountries").Preload("MediaSources").
		Order("\"MediaProfile\".air_date DESC, \"Media\".created DESC").Limit(filter.PageSize).Find(&medias).Error
	return medias, total, err
}

func (r *wechatRepository) GetMediaSource(ctx context.Context, id, userID string) (*model.MediaSource, error) {
	var ms model.MediaSource
	err := r.db.WithContext(ctx).Preload("Files").Where("id = ? AND user_id = ?", id, userID).First(&ms).Error
	return &ms, err
}

func (r *wechatRepository) ListMediaSources(ctx context.Context, mediaID string, nextMarker string, pageSize int) ([]model.MediaSource, error) {
	db := r.db.WithContext(ctx).Where("media_id = ?", mediaID)
	if nextMarker != "" {
		db = db.Where("id < ?", nextMarker)
	}
	var sources []model.MediaSource
	err := db.Preload("Profile").Preload("Files").Preload("Subtitles").
		Order("created ASC").Limit(pageSize).Find(&sources).Error
	return sources, err
}

func (r *wechatRepository) ListTVLives(ctx context.Context, userID string) ([]model.TVLive, error) {
	var lives []model.TVLive
	err := r.db.WithContext(ctx).Where("user_id = ? AND hidden = 0", userID).Order("\"order\" ASC").Find(&lives).Error
	return lives, err
}

func (r *wechatRepository) ListCollections(ctx context.Context, userID string) ([]model.CollectionV2, error) {
	var collections []model.CollectionV2
	err := r.db.WithContext(ctx).Where("user_id = ? AND type IN (3, 4)", userID).Order("sort DESC, created DESC").Find(&collections).Error
	return collections, err
}

func (r *wechatRepository) ListNotifications(ctx context.Context, memberID string, status, typeVal *int, nextMarker string, pageSize int) ([]model.MemberNotification, int64, error) {
	db := r.db.WithContext(ctx).Where("member_id = ? AND is_delete = 0", memberID)
	if status != nil {
		db = db.Where("status = ?", *status)
	}
	if typeVal != nil {
		db = db.Where("type = ?", *typeVal)
	}
	var total int64
	db.Model(&model.MemberNotification{}).Count(&total)
	if nextMarker != "" {
		db = db.Where("id < ?", nextMarker)
	}
	var notifications []model.MemberNotification
	err := db.Order("created DESC").Limit(pageSize).Find(&notifications).Error
	return notifications, total, err
}

func (r *wechatRepository) UpdateNotification(ctx context.Context, notification *model.MemberNotification) error {
	return r.db.WithContext(ctx).Save(notification).Error
}

func (r *wechatRepository) UpdateNotificationsStatus(ctx context.Context, memberID string, status int) error {
	return r.db.WithContext(ctx).Model(&model.MemberNotification{}).Where("member_id = ?", memberID).Update("status", status).Error
}

func (r *wechatRepository) GetNotification(ctx context.Context, id, memberID string) (*model.MemberNotification, error) {
	var n model.MemberNotification
	err := r.db.WithContext(ctx).Where("id = ? AND member_id = ?", id, memberID).First(&n).Error
	return &n, err
}

func (r *wechatRepository) CreateReport(ctx context.Context, report *model.ReportV2) error {
	return r.db.WithContext(ctx).Create(report).Error
}

func (r *wechatRepository) ListReports(ctx context.Context, memberID string, status, typeVal *int, nextMarker string, pageSize int) ([]model.ReportV2, error) {
	db := r.db.WithContext(ctx).Where("member_id = ? AND hidden = 0", memberID)
	if status != nil {
		db = db.Where("status = ?", *status)
	}
	if typeVal != nil {
		db = db.Where("type = ?", *typeVal)
	}
	if nextMarker != "" {
		db = db.Where("id < ?", nextMarker)
	}
	var reports []model.ReportV2
	err := db.Preload("Media.Profile").Preload("MediaSource.Profile").
		Order("created DESC").Limit(pageSize).Find(&reports).Error
	return reports, err
}

func (r *wechatRepository) GetReport(ctx context.Context, id, memberID string) (*model.ReportV2, error) {
	var report model.ReportV2
	err := r.db.WithContext(ctx).Where("id = ? AND member_id = ?", id, memberID).First(&report).Error
	return &report, err
}

func (r *wechatRepository) UpdateReport(ctx context.Context, report *model.ReportV2) error {
	return r.db.WithContext(ctx).Save(report).Error
}

func (r *wechatRepository) ListDiaries(ctx context.Context, memberID string, nextMarker string, pageSize int) ([]model.MemberDiary, error) {
	db := r.db.WithContext(ctx).Where("member_id = ?", memberID)
	if nextMarker != "" {
		db = db.Where("id < ?", nextMarker)
	}
	var diaries []model.MemberDiary
	err := db.Preload("MediaSource.Media.Profile").Order("created DESC").Limit(pageSize).Find(&diaries).Error
	return diaries, err
}
