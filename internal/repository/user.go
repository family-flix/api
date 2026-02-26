package repository

import (
	"context"

	"gorm.io/gorm"

	"github.com/family-flix/api/internal/model"
)

type UserRepository interface {
	Get(ctx context.Context, id string) (*model.User, error)
	GetCredentialByEmail(ctx context.Context, email string) (*model.Credential, error)
	GetCredentialByUserID(ctx context.Context, userID string) (*model.Credential, error)
	GetProfileByUserID(ctx context.Context, userID string) (*model.Profile, error)
	Create(ctx context.Context, user *model.User, cred *model.Credential, profile *model.Profile, settings *model.Settings, stats *model.Statistics) error
	Count(ctx context.Context) (int64, error)
	GetSettings(ctx context.Context, userID string) (*model.Settings, error)

	// Permission
	ListPermissions(ctx context.Context, userID string) ([]model.Permission, error)
	GetPermissionByCode(ctx context.Context, userID, code string) (*model.Permission, error)
	CreatePermission(ctx context.Context, permission *model.Permission) error
}

type userRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) Get(ctx context.Context, id string) (*model.User, error) {
	var user model.User
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) GetCredentialByEmail(ctx context.Context, email string) (*model.Credential, error) {
	var cred model.Credential
	if err := r.db.WithContext(ctx).Where("email = ?", email).First(&cred).Error; err != nil {
		return nil, err
	}
	return &cred, nil
}

func (r *userRepository) GetCredentialByUserID(ctx context.Context, userID string) (*model.Credential, error) {
	var cred model.Credential
	if err := r.db.WithContext(ctx).Where("user_id = ?", userID).First(&cred).Error; err != nil {
		return nil, err
	}
	return &cred, nil
}

func (r *userRepository) GetProfileByUserID(ctx context.Context, userID string) (*model.Profile, error) {
	var profile model.Profile
	if err := r.db.WithContext(ctx).Where("user_id = ?", userID).First(&profile).Error; err != nil {
		return nil, err
	}
	return &profile, nil
}

func (r *userRepository) Create(ctx context.Context, user *model.User, cred *model.Credential, profile *model.Profile, settings *model.Settings, stats *model.Statistics) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(user).Error; err != nil {
			return err
		}
		if cred != nil {
			if err := tx.Create(cred).Error; err != nil {
				return err
			}
		}
		if profile != nil {
			if err := tx.Create(profile).Error; err != nil {
				return err
			}
		}
		if settings != nil {
			if err := tx.Create(settings).Error; err != nil {
				return err
			}
		}
		if stats != nil {
			if err := tx.Create(stats).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *userRepository) Count(ctx context.Context) (int64, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&model.User{}).Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

func (r *userRepository) GetSettings(ctx context.Context, userID string) (*model.Settings, error) {
	var s model.Settings
	if err := r.db.WithContext(ctx).Where("user_id = ?", userID).First(&s).Error; err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *userRepository) ListPermissions(ctx context.Context, userID string) ([]model.Permission, error) {
	var permissions []model.Permission
	if err := r.db.WithContext(ctx).Where("user_id = ?", userID).Order("created DESC").Find(&permissions).Error; err != nil {
		return nil, err
	}
	return permissions, nil
}

func (r *userRepository) GetPermissionByCode(ctx context.Context, userID, code string) (*model.Permission, error) {
	var p model.Permission
	if err := r.db.WithContext(ctx).Where("user_id = ? AND code = ?", userID, code).First(&p).Error; err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *userRepository) CreatePermission(ctx context.Context, permission *model.Permission) error {
	return r.db.WithContext(ctx).Create(permission).Error
}
