package user

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/mail"
	"regexp"
	"strings"
	"time"

	"golang.org/x/crypto/pbkdf2"
	"gorm.io/gorm"

	"github.com/family-flix/api/internal/model"
	"github.com/golang-jwt/jwt/v5"
)

const secret = "FLIX"

// UserSettings maps the JSON stored in Settings.Detail.
type UserSettings struct {
	QiniuAccessToken      string         `json:"qiniu_access_token,omitempty"`
	QiniuSecretToken      string         `json:"qiniu_secret_token,omitempty"`
	QiniuScope            string         `json:"qiniu_scope,omitempty"`
	TMDBToken             string         `json:"tmdb_token,omitempty"`
	TMDBHostname          string         `json:"tmdb_hostname,omitempty"`
	ThirdDouban           *ThirdDouban   `json:"third_douban,omitempty"`
	PushDeerToken         string         `json:"push_deer_token,omitempty"`
	TelegramToken         string         `json:"telegram_token,omitempty"`
	WxpushToken           string         `json:"wxpush_token,omitempty"`
	ExtraFilenameRules    string         `json:"extra_filename_rules,omitempty"`
	IgnoreFilesWhenSync   string         `json:"ignore_files_when_sync,omitempty"`
	MaxSizeWhenSync       *int64         `json:"max_size_when_sync,omitempty"`
	CanRegister           bool           `json:"can_register,omitempty"`
	NoNeedInvitationCode  bool           `json:"no_need_invitation_code,omitempty"`
}

type ThirdDouban struct {
	Hostname string `json:"hostname"`
	Token    string `json:"token"`
}

// FilenameRule represents a custom filename replacement rule.
type FilenameRule struct {
	Replace [2]string
}

// User is the domain object for an admin user.
type User struct {
	ID       string
	Token    string
	Settings UserSettings
	DB       *gorm.DB
}

// New creates a User from a JWT token (authentication).
func New(token string, db *gorm.DB) (*User, error) {
	if token == "" {
		return nil, fmt.Errorf("缺少 token")
	}
	id, err := parseToken(token)
	if err != nil {
		return nil, fmt.Errorf("无效的 token")
	}
	var u model.User
	if err := db.First(&u, "id = ?", id).Error; err != nil {
		return nil, fmt.Errorf("无效的 token")
	}
	settings := loadSettings(db, id)
	return &User{ID: id, Token: token, Settings: settings, DB: db}, nil
}

// GetByPassword authenticates a user by email and password.
func GetByPassword(email, password string, db *gorm.DB) (*User, error) {
	if err := validateCredentials(email, password); err != nil {
		return nil, err
	}
	var cred model.Credential
	if err := db.Where("email = ?", email).First(&cred).Error; err != nil {
		return nil, fmt.Errorf("该邮箱不存在")
	}
	if !comparePassword(cred.Password, cred.Salt, password) {
		return nil, fmt.Errorf("密码错误")
	}
	settings := loadSettings(db, cred.UserID)
	token, err := EncodeToken(cred.UserID)
	if err != nil {
		return nil, err
	}
	return &User{ID: cred.UserID, Token: token, Settings: settings, DB: db}, nil
}

// Get loads a user by ID.
func Get(id string, db *gorm.DB) (*User, error) {
	var u model.User
	if err := db.First(&u, "id = ?", id).Error; err != nil {
		return nil, fmt.Errorf("不存在")
	}
	settings := loadSettings(db, id)
	return &User{ID: id, Settings: settings, DB: db}, nil
}

// ExistingResult is the return value of Existing.
type ExistingResult struct {
	ID       string  `json:"id"`
	Email    string  `json:"email"`
	Avatar   *string `json:"avatar"`
	Nickname *string `json:"nickname"`
}

// Existing checks if a user with the given email exists.
func Existing(email string, db *gorm.DB) (*ExistingResult, error) {
	var cred model.Credential
	if err := db.Where("email = ?", email).First(&cred).Error; err != nil {
		return nil, fmt.Errorf("不存在")
	}
	var profile model.Profile
	db.Where("user_id = ?", cred.UserID).First(&profile)
	return &ExistingResult{
		ID:       cred.UserID,
		Email:    cred.Email,
		Avatar:   profile.Avatar,
		Nickname: profile.Nickname,
	}, nil
}

// CreateResult is the return value of Create.
type CreateResult struct {
	ID    string `json:"id"`
	Token string `json:"token"`
}

// Create registers the first admin user. Only one admin is allowed.
func Create(email, password string, db *gorm.DB) (*CreateResult, error) {
	var count int64
	db.Model(&model.User{}).Count(&count)
	if count > 0 {
		var cred model.Credential
		db.First(&cred)
		return nil, fmt.Errorf("已经有管理员账号了，邮箱为 %s", cred.Email)
	}
	if err := validateCredentials(email, password); err != nil {
		return nil, err
	}
	var existingCred model.Credential
	if err := db.Where("email = ?", email).First(&existingCred).Error; err == nil {
		return nil, fmt.Errorf("该邮箱已注册")
	}

	hashed, salt := preparePassword(password)
	userID := rid()
	nickname := strings.Split(email, "@")[0]

	err := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&model.User{ID: userID}).Error; err != nil {
			return err
		}
		if err := tx.Create(&model.Credential{ID: rid(), Email: email, Password: hashed, Salt: salt, UserID: userID}).Error; err != nil {
			return err
		}
		if err := tx.Create(&model.Profile{ID: rid(), Nickname: &nickname, UserID: userID}).Error; err != nil {
			return err
		}
		detail := "{}"
		if err := tx.Create(&model.Settings{ID: rid(), Detail: &detail, UserID: userID}).Error; err != nil {
			return err
		}
		data := "{}"
		if err := tx.Create(&model.Statistics{ID: rid(), Data: data, UserID: userID}).Error; err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	token, err := EncodeToken(userID)
	if err != nil {
		return nil, err
	}
	return &CreateResult{ID: userID, Token: token}, nil
}

// ChangePassword changes the password for the given email.
func ChangePassword(email, password string, db *gorm.DB) (*CreateResult, error) {
	if err := validateCredentials(email, password); err != nil {
		return nil, err
	}
	var cred model.Credential
	if err := db.Where("email = ?", email).First(&cred).Error; err != nil {
		return nil, fmt.Errorf("该邮箱未注册")
	}
	hashed, salt := preparePassword(password)
	if err := db.Model(&cred).Updates(map[string]interface{}{"password": hashed, "salt": salt}).Error; err != nil {
		return nil, err
	}
	token, err := EncodeToken(cred.UserID)
	if err != nil {
		return nil, err
	}
	return &CreateResult{ID: cred.UserID, Token: token}, nil
}

// GetIgnoreFiles returns the list of ignore rules from settings.
func (u *User) GetIgnoreFiles() []string {
	if u.Settings.IgnoreFilesWhenSync == "" {
		return nil
	}
	var rules []string
	for _, r := range strings.Split(u.Settings.IgnoreFilesWhenSync, "\n\n") {
		if r != "" {
			rules = append(rules, r)
		}
	}
	return rules
}

// GetFilenameRules returns the custom filename replacement rules.
func (u *User) GetFilenameRules() []FilenameRule {
	if u.Settings.ExtraFilenameRules == "" {
		return nil
	}
	var rules []FilenameRule
	for _, block := range strings.Split(u.Settings.ExtraFilenameRules, "\n\n") {
		parts := strings.SplitN(block, "\n", 2)
		if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
			continue
		}
		if _, err := regexp.Compile(parts[0]); err != nil {
			continue
		}
		rules = append(rules, FilenameRule{Replace: [2]string{parts[0], parts[1]}})
	}
	return rules
}

// --- internal helpers ---

func EncodeToken(id string) (string, error) {
	claims := jwt.MapClaims{
		"id":  id,
		"iat": time.Now().Unix(),
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return t.SignedString([]byte(secret))
}

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

func loadSettings(db *gorm.DB, userID string) UserSettings {
	var s model.Settings
	if err := db.Where("user_id = ?", userID).First(&s).Error; err != nil || s.Detail == nil {
		return UserSettings{}
	}
	var settings UserSettings
	if err := json.Unmarshal([]byte(*s.Detail), &settings); err != nil {
		return UserSettings{}
	}
	// Validate third_douban
	if settings.ThirdDouban != nil && (settings.ThirdDouban.Hostname == "" || settings.ThirdDouban.Token == "") {
		settings.ThirdDouban = nil
	}
	return settings
}

func rid() string {
	b := make([]byte, 8)
	rand.Read(b)
	return hex.EncodeToString(b)[:15]
}
