package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/mail"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/pbkdf2"

	"github.com/family-flix/api/internal/model"
	"github.com/family-flix/api/internal/repository"
)

const secret = "FLIX"

type UserService interface {
	Login(ctx context.Context, email, password string) (*model.User, string, error)
	Register(ctx context.Context, email, password string) (string, string, error)
	GetProfile(ctx context.Context, token string) (*model.User, error)
	ValidateToken(ctx context.Context, token string) (*model.User, error)
	IsInitialized(ctx context.Context) (bool, error)
	GetSettings(ctx context.Context, userID string) (*model.Settings, error)
	Existing(ctx context.Context, email string) (*ExistingResult, error)
	EncodeToken(id string) (string, error) // Exported for other services/handlers
	ListPermissions(ctx context.Context, userID string) ([]model.Permission, error)
	CreatePermission(ctx context.Context, userID, code, desc string) (string, error)
}

type ExistingResult struct {
	ID       string  `json:"id"`
	Email    string  `json:"email"`
	Avatar   *string `json:"avatar"`
	Nickname *string `json:"nickname"`
}

type userService struct {
	repo repository.UserRepository
}

func NewUserService(repo repository.UserRepository) UserService {
	return &userService{repo: repo}
}

func (s *userService) Login(ctx context.Context, email, password string) (*model.User, string, error) {
	if err := validateCredentials(email, password); err != nil {
		return nil, "", err
	}
	cred, err := s.repo.GetCredentialByEmail(ctx, email)
	if err != nil {
		return nil, "", fmt.Errorf("该邮箱不存在")
	}
	if !comparePassword(cred.Password, cred.Salt, password) {
		return nil, "", fmt.Errorf("密码错误")
	}
	token, err := s.EncodeToken(cred.UserID)
	if err != nil {
		return nil, "", err
	}
	user, err := s.repo.Get(ctx, cred.UserID)
	if err != nil {
		return nil, "", err
	}
	return user, token, nil
}

func (s *userService) Register(ctx context.Context, email, password string) (string, string, error) {
	count, err := s.repo.Count(ctx)
	if err != nil {
		return "", "", err
	}
	if count > 0 {
		return "", "", fmt.Errorf("已经有管理员账号了")
	}
	if err := validateCredentials(email, password); err != nil {
		return "", "", err
	}
	if _, err := s.repo.GetCredentialByEmail(ctx, email); err == nil {
		return "", "", fmt.Errorf("该邮箱已注册")
	}

	hashed, salt := preparePassword(password)
	userID := rid()
	nickname := strings.Split(email, "@")[0]

	user := &model.User{ID: userID}
	cred := &model.Credential{ID: rid(), Email: email, Password: hashed, Salt: salt, UserID: userID}

	profile := &model.Profile{ID: rid(), Nickname: &nickname, UserID: userID}

	detail := "{}"
	settings := &model.Settings{ID: rid(), Detail: &detail, UserID: userID}

	statsData := "{}"
	stats := &model.Statistics{ID: rid(), Data: statsData, UserID: userID}

	if err := s.repo.Create(ctx, user, cred, profile, settings, stats); err != nil {
		return "", "", err
	}

	token, err := s.EncodeToken(userID)
	if err != nil {
		return "", "", err
	}
	return userID, token, nil
}

func (s *userService) GetProfile(ctx context.Context, token string) (*model.User, error) {
	id, err := parseToken(token)
	if err != nil {
		return nil, fmt.Errorf("无效的 token")
	}
	return s.repo.Get(ctx, id)
}

func (s *userService) ValidateToken(ctx context.Context, token string) (*model.User, error) {
	return s.GetProfile(ctx, token)
}

func (s *userService) IsInitialized(ctx context.Context) (bool, error) {
	count, err := s.repo.Count(ctx)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (s *userService) GetSettings(ctx context.Context, userID string) (*model.Settings, error) {
	return s.repo.GetSettings(ctx, userID)
}

func (s *userService) Existing(ctx context.Context, email string) (*ExistingResult, error) {
	cred, err := s.repo.GetCredentialByEmail(ctx, email)
	if err != nil {
		return nil, fmt.Errorf("不存在")
	}
	profile, err := s.repo.GetProfileByUserID(ctx, cred.UserID)
	if err != nil {
		// Should not happen if data consistency is maintained
		return nil, err
	}
	return &ExistingResult{
		ID:       cred.UserID,
		Email:    cred.Email,
		Avatar:   profile.Avatar,
		Nickname: profile.Nickname,
	}, nil
}

func (s *userService) EncodeToken(id string) (string, error) {
	claims := jwt.MapClaims{
		"id":  id,
		"iat": time.Now().Unix(),
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return t.SignedString([]byte(secret))
}

func (s *userService) ListPermissions(ctx context.Context, userID string) ([]model.Permission, error) {
	return s.repo.ListPermissions(ctx, userID)
}

func (s *userService) CreatePermission(ctx context.Context, userID, code, desc string) (string, error) {
	if _, err := s.repo.GetPermissionByCode(ctx, userID, code); err == nil {
		return "", fmt.Errorf("已存在相同 code 的权限")
	}
	id := rid()
	p := &model.Permission{
		ID:     id,
		UserID: userID,
		Code:   code,
		Desc:   desc,
	}
	if err := s.repo.CreatePermission(ctx, p); err != nil {
		return "", err
	}
	return id, nil
}

// Helpers

func parseToken(tokenStr string) (string, error) {
	t, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return []byte(secret), nil
	})
	if err != nil {
		return "", err
	}
	claims, ok := t.Claims.(jwt.MapClaims)
	if !ok || !t.Valid {
		return "", fmt.Errorf("invalid token")
	}
	id, ok := claims["id"].(string)
	if !ok || id == "" {
		return "", fmt.Errorf("token 不合法")
	}
	return id, nil
}

func validateCredentials(email, password string) error {
	if _, err := mail.ParseAddress(email); err != nil {
		return fmt.Errorf("邮箱格式错误")
	}
	if len(password) < 6 || len(password) > 20 {
		return fmt.Errorf("密码必须是6-20个字符")
	}
	return nil
}

func preparePassword(password string) (hashed string, salt string) {
	s := make([]byte, 64)
	rand.Read(s)
	salt = hex.EncodeToString(s)
	hashed = hashPassword(password, salt)
	return
}

func hashPassword(password, salt string) string {
	dk := pbkdf2.Key([]byte(password), []byte(salt), 1000, 64, sha256.New)
	return hex.EncodeToString(dk)
}

func comparePassword(stored, salt, input string) bool {
	return hashPassword(input, salt) == stored
}

// UserSettings struct matching the domain one, useful for JSON parsing
type UserSettings struct {
	QiniuAccessToken     string `json:"qiniu_access_token,omitempty"`
	QiniuSecretToken     string `json:"qiniu_secret_token,omitempty"`
	QiniuScope           string `json:"qiniu_scope,omitempty"`
	TMDBToken            string `json:"tmdb_token,omitempty"`
	TMDBHostname         string `json:"tmdb_hostname,omitempty"`
	PushDeerToken        string `json:"push_deer_token,omitempty"`
	TelegramToken        string `json:"telegram_token,omitempty"`
	WxpushToken          string `json:"wxpush_token,omitempty"`
	ExtraFilenameRules   string `json:"extra_filename_rules,omitempty"`
	IgnoreFilesWhenSync  string `json:"ignore_files_when_sync,omitempty"`
	MaxSizeWhenSync      *int64 `json:"max_size_when_sync,omitempty"`
	CanRegister          bool   `json:"can_register,omitempty"`
	NoNeedInvitationCode bool   `json:"no_need_invitation_code,omitempty"`
}

func ParseSettings(detail *string) UserSettings {
	var s UserSettings
	if detail != nil && *detail != "" {
		json.Unmarshal([]byte(*detail), &s)
	}
	return s
}
