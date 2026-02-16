package model

import "time"

type User struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created time.Time `gorm:"autoCreateTime" json:"created"`
	Updated time.Time `gorm:"autoUpdateTime" json:"updated"`
}

func (User) TableName() string {
	return "User"
}

type Credential struct {
	ID       string `gorm:"primaryKey;size:36" json:"id"`
	Password string `gorm:"size:255" json:"-"`
	Salt     string `gorm:"size:255" json:"-"`
	Verified bool   `gorm:"default:false" json:"verified"`
	Email    string `gorm:"uniqueIndex;size:255" json:"email"`
	UserID   string `gorm:"uniqueIndex;size:36" json:"user_id"`
	User     *User  `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (Credential) TableName() string {
	return "Credential"
}

type Profile struct {
	ID       string  `gorm:"primaryKey;size:36" json:"id"`
	Nickname *string `gorm:"size:255" json:"nickname"`
	Avatar   *string `gorm:"size:500" json:"avatar"`
	UserID   string  `gorm:"uniqueIndex;size:36" json:"user_id"`
	User     *User   `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (Profile) TableName() string {
	return "Profile"
}

type Settings struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created time.Time `gorm:"autoCreateTime" json:"created"`
	Updated time.Time `gorm:"autoUpdateTime" json:"updated"`
	Detail  *string   `gorm:"type:text" json:"detail"`
	UserID  string    `gorm:"uniqueIndex;size:36" json:"user_id"`
	User    *User     `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (Settings) TableName() string {
	return "Settings"
}

type Statistics struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created time.Time `gorm:"autoCreateTime" json:"created"`
	Updated time.Time `gorm:"autoUpdateTime" json:"updated"`
	Data    string    `gorm:"type:text;default:'{}'" json:"data"`
	UserID  string    `gorm:"uniqueIndex;size:36" json:"user_id"`
	User    *User     `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (Statistics) TableName() string {
	return "Statistics"
}

type Account struct {
	ID                string  `gorm:"primaryKey;size:36" json:"id"`
	Type              string  `gorm:"size:255" json:"type"`
	Provider          string  `gorm:"size:255" json:"provider"`
	ProviderAccountID string  `gorm:"size:255" json:"provider_account_id"`
	RefreshToken      *string `gorm:"type:text" json:"-"`
	AccessToken       *string `gorm:"type:text" json:"-"`
	ExpiresAt         *int    `json:"expires_at"`
	TokenType         *string `json:"token_type"`
	Scope             *string `json:"scope"`
	IDToken           *string `gorm:"type:text" json:"-"`
	SessionState      *string `json:"session_state"`
	UserID            string  `gorm:"index;size:36" json:"user_id"`
	User              *User   `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (Account) TableName() string {
	return "Account"
}

type Permission struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created time.Time `gorm:"autoCreateTime" json:"created"`
	Updated time.Time `gorm:"autoUpdateTime" json:"updated"`
	Desc    string    `gorm:"size:255" json:"desc"`
	Code    string    `gorm:"size:255" json:"code"`
	UserID  string    `gorm:"index;size:36" json:"user_id"`
	User    *User     `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (Permission) TableName() string {
	return "Permission"
}
