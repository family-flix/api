package repository

import (
	"context"

	"gorm.io/gorm"

	"github.com/family-flix/api/internal/model"
)

type MemberFilter struct {
	UserID     string
	Name       string
	NextMarker string
	PageSize   int
	Page       int
}

type MemberRepository interface {
	List(ctx context.Context, filter MemberFilter) ([]model.Member, int64, string, error)
	Get(ctx context.Context, id string, userID string) (*model.Member, error)
	GetByRemark(ctx context.Context, remark string, userID string) (*model.Member, error)
	Create(ctx context.Context, member *model.Member, setting *model.MemberSetting) error
	Update(ctx context.Context, member *model.Member) error
	Delete(ctx context.Context, id string, userID string) error
	CreateToken(ctx context.Context, token *model.MemberToken) error
	GetTokens(ctx context.Context, memberID string) ([]model.MemberToken, error)
	ListByInviter(ctx context.Context, inviterID string) ([]model.Member, error)

	// History related
	GetHistories(ctx context.Context, memberID string, nextMarker string, pageSize int) ([]model.PlayHistoryV2, int64, string, error)
}

type memberRepository struct {
	db *gorm.DB
}

func NewMemberRepository(db *gorm.DB) MemberRepository {
	return &memberRepository{db: db}
}

func (r *memberRepository) List(ctx context.Context, filter MemberFilter) ([]model.Member, int64, string, error) {
	db := r.db.WithContext(ctx).Model(&model.Member{}).Where("user_id = ? AND `delete` = 0", filter.UserID)
	if filter.Name != "" {
		db = db.Where("remark LIKE ?", "%"+filter.Name+"%")
	}

	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, "", err
	}

	if filter.Page > 0 {
		db = db.Offset((filter.Page - 1) * filter.PageSize)
	} else if filter.NextMarker != "" {
		db = db.Where("id < ?", filter.NextMarker)
	}

	var members []model.Member
	if err := db.Preload("Tokens").Order("created DESC").Limit(filter.PageSize).Find(&members).Error; err != nil {
		return nil, 0, "", err
	}

	var nextMarker string
	if len(members) > 0 {
		nextMarker = members[len(members)-1].ID
	}

	return members, total, nextMarker, nil
}

func (r *memberRepository) Get(ctx context.Context, id string, userID string) (*model.Member, error) {
	var m model.Member
	if err := r.db.WithContext(ctx).Where("id = ? AND user_id = ?", id, userID).First(&m).Error; err != nil {
		return nil, err
	}
	return &m, nil
}

func (r *memberRepository) GetByRemark(ctx context.Context, remark string, userID string) (*model.Member, error) {
	var m model.Member
	// "inviter_id = ''" logic from handler
	if err := r.db.WithContext(ctx).Where("remark = ? AND inviter_id = '' AND user_id = ?", remark, userID).First(&m).Error; err != nil {
		return nil, err
	}
	return &m, nil
}

func (r *memberRepository) Create(ctx context.Context, member *model.Member, setting *model.MemberSetting) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(member).Error; err != nil {
			return err
		}
		if setting != nil {
			if err := tx.Create(setting).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *memberRepository) Update(ctx context.Context, member *model.Member) error {
	return r.db.WithContext(ctx).Save(member).Error
}

func (r *memberRepository) Delete(ctx context.Context, id string, userID string) error {
	// Soft delete
	return r.db.WithContext(ctx).Model(&model.Member{}).Where("id = ? AND user_id = ?", id, userID).Update("delete", 1).Error
}

func (r *memberRepository) CreateToken(ctx context.Context, token *model.MemberToken) error {
	return r.db.WithContext(ctx).Create(token).Error
}

func (r *memberRepository) GetTokens(ctx context.Context, memberID string) ([]model.MemberToken, error) {
	var tokens []model.MemberToken
	if err := r.db.WithContext(ctx).Where("member_id = ?", memberID).Find(&tokens).Error; err != nil {
		return nil, err
	}
	return tokens, nil
}

func (r *memberRepository) ListByInviter(ctx context.Context, inviterID string) ([]model.Member, error) {
	var members []model.Member
	if err := r.db.WithContext(ctx).Where("inviter_id = ? AND `delete` = 0", inviterID).Preload("Tokens").Find(&members).Error; err != nil {
		return nil, err
	}
	return members, nil
}

func (r *memberRepository) GetHistories(ctx context.Context, memberID string, nextMarker string, pageSize int) ([]model.PlayHistoryV2, int64, string, error) {
	db := r.db.WithContext(ctx).Model(&model.PlayHistoryV2{}).Where("member_id = ?", memberID)

	var total int64 // Not really used in handler but good to have
	// db.Count(&total) // Optional optimization: skip count if not needed

	if nextMarker != "" {
		db = db.Where("id < ?", nextMarker)
	}

	var histories []model.PlayHistoryV2
	if err := db.Preload("Media.Profile").Preload("MediaSource.Profile").
		Order("updated DESC").Limit(pageSize).Find(&histories).Error; err != nil {
		return nil, 0, "", err
	}

	var nextMarkerOut string
	if len(histories) > 0 {
		nextMarkerOut = histories[len(histories)-1].ID
	}

	return histories, total, nextMarkerOut, nil
}
