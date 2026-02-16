package model


type Member struct {
	ID         string    `gorm:"primaryKey;size:36" json:"id"`
	Created    LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated    LocalTime `gorm:"autoUpdateTime" json:"updated"`
	Email      *string   `json:"email"`
	Name       *string   `json:"name"`
	Avatar     *string   `json:"avatar"`
	Remark     string    `json:"remark"`
	Permission *string   `gorm:"type:text" json:"permission"`
	Disabled   int       `gorm:"default:0" json:"disabled"`
	Delete     int       `gorm:"default:0" json:"delete"`

	InviterID    *string `gorm:"size:36" json:"inviter_id"`
	FromInviteID *string `gorm:"size:36" json:"from_invite_id"`
	UserID       string  `gorm:"index;size:36" json:"user_id"`

	Tokens []MemberToken `gorm:"foreignKey:MemberID" json:"tokens,omitempty"`
}

func (Member) TableName() string {
	return "Member"
}

type MemberInvite struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	Content    *string `json:"content"`
	ExpiredAt  string  `json:"expired_at"`
	CountLimit *int    `json:"count_limit"`
	Disabled   int     `gorm:"default:0" json:"disabled"`

	MemberID string `gorm:"index;size:36" json:"member_id"`
}

func (MemberInvite) TableName() string {
	return "MemberInvite"
}

type MemberAuthentication struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	Provider     string  `json:"provider"`
	ProviderID   string  `json:"provider_id"`
	ProviderArg1 *string `json:"provider_arg1"`
	ProviderArg2 *string `json:"provider_arg2"`

	MemberID string `gorm:"index;size:36" json:"member_id"`
}

func (MemberAuthentication) TableName() string {
	return "MemberAuthentication"
}

type MemberToken struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	Token     string   `json:"token"`
	Used      *float64 `gorm:"default:0" json:"used"`
	ExpiredAt *string  `json:"expired_at"`
	Invalid   int      `gorm:"default:0" json:"invalid"`

	MemberID string `gorm:"index;size:36" json:"member_id"`
}

func (MemberToken) TableName() string {
	return "MemberToken"
}

type MemberFavorite struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	Type int `json:"type"`

	MediaID  string `gorm:"index;size:36" json:"media_id"`
	MemberID string `gorm:"index;size:36" json:"member_id"`
}

func (MemberFavorite) TableName() string {
	return "MemberFavorite"
}

type MemberDiary struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	Day     string  `json:"day"`
	Content *string `gorm:"type:text" json:"content"`
	Profile *string `gorm:"type:text" json:"profile"`

	MediaSourceID string       `gorm:"index;size:36" json:"media_source_id"`
	MediaSource   *MediaSource `gorm:"foreignKey:MediaSourceID" json:"media_source,omitempty"`
	MemberID      string       `gorm:"index;size:36" json:"member_id"`
}

func (MemberDiary) TableName() string {
	return "MemberDiary"
}

type MemberSetting struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	Data string `gorm:"type:text" json:"data"`

	MemberID string `gorm:"uniqueIndex;size:36" json:"member_id"`
}

func (MemberSetting) TableName() string {
	return "MemberSetting"
}

type MemberNotification struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	UniqueID string  `json:"unique_id"`
	Content  *string `gorm:"type:text" json:"content"`
	Type     int     `gorm:"default:1" json:"type"`
	Status   int     `gorm:"default:1" json:"status"`
	IsDelete int     `gorm:"default:0" json:"is_delete"`

	MemberID string `gorm:"index;size:36" json:"member_id"`
}

func (MemberNotification) TableName() string {
	return "MemberNotification"
}
