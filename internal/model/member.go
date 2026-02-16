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

	InviterID    *string       `gorm:"size:36" json:"inviter_id"`
	Inviter      *Member       `gorm:"foreignKey:InviterID" json:"inviter,omitempty"`
	FromInviteID *string       `gorm:"size:36" json:"from_invite_id"`
	FromInvite   *MemberInvite `gorm:"foreignKey:FromInviteID" json:"from_invite,omitempty"`
	UserID       string        `gorm:"index;size:36" json:"user_id"`
	User         *User         `gorm:"foreignKey:UserID" json:"user,omitempty"`

	Setting          *MemberSetting         `gorm:"foreignKey:MemberID" json:"setting,omitempty"`
	Tokens           []MemberToken          `gorm:"foreignKey:MemberID" json:"tokens,omitempty"`
	Authentications  []MemberAuthentication `gorm:"foreignKey:MemberID" json:"authentications,omitempty"`
	Notifications    []MemberNotification   `gorm:"foreignKey:MemberID" json:"notifications,omitempty"`
	Invitees         []Member               `gorm:"foreignKey:InviterID" json:"invitees,omitempty"`
	InvitedMembers   []MemberInvite         `gorm:"foreignKey:MemberID" json:"invited_members,omitempty"`
	CreatedMedias    []SharedMedia          `gorm:"foreignKey:MemberFromID" json:"created_medias,omitempty"`
	CreatedMediasV2  []SharedMediaV2        `gorm:"foreignKey:MemberFromID" json:"created_medias_v2,omitempty"`
	ReceivedMedias   []SharedMedia          `gorm:"foreignKey:MemberTargetID" json:"received_medias,omitempty"`
	ReceivedMediasV2 []SharedMediaV2        `gorm:"foreignKey:MemberTargetID" json:"received_medias_v2,omitempty"`
	PlayHistories    []PlayHistory          `gorm:"foreignKey:MemberID" json:"play_histories,omitempty"`
	PlayHistoriesV2  []PlayHistoryV2        `gorm:"foreignKey:MemberID" json:"play_histories_v2,omitempty"`
	Reports          []Report               `gorm:"foreignKey:MemberID" json:"reports,omitempty"`
	ReportsV2        []ReportV2             `gorm:"foreignKey:MemberID" json:"reports_v2,omitempty"`
	Favorites        []MemberFavorite       `gorm:"foreignKey:MemberID" json:"favorites,omitempty"`
	Diaries          []MemberDiary          `gorm:"foreignKey:MemberID" json:"diaries,omitempty"`
	InvitationCodes  []InvitationCode       `gorm:"foreignKey:InviterID" json:"invitation_codes,omitempty"`
	FromCode         *InvitationCode        `gorm:"foreignKey:InviteeID" json:"from_code,omitempty"`
	AuthCodes        []AuthCode             `gorm:"foreignKey:MemberID" json:"auth_codes,omitempty"`
	AuthQRCodes      []AuthQRCode           `gorm:"foreignKey:MemberID" json:"auth_qrcodes,omitempty"`
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

	MemberID string  `gorm:"index;size:36" json:"member_id"`
	Member   *Member `gorm:"foreignKey:MemberID" json:"member,omitempty"`

	InvitedMembers []Member `gorm:"foreignKey:FromInviteID" json:"invited_members,omitempty"`
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

	MemberID string  `gorm:"index;size:36" json:"member_id"`
	Member   *Member `gorm:"foreignKey:MemberID" json:"member,omitempty"`
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

	MemberID string  `gorm:"index;size:36" json:"member_id"`
	Member   *Member `gorm:"foreignKey:MemberID" json:"member,omitempty"`
}

func (MemberToken) TableName() string {
	return "MemberToken"
}

type MemberFavorite struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	Type int `json:"type"`

	MediaID  string  `gorm:"index;size:36" json:"media_id"`
	Media    *Media  `gorm:"foreignKey:MediaID" json:"media,omitempty"`
	MemberID string  `gorm:"index;size:36" json:"member_id"`
	Member   *Member `gorm:"foreignKey:MemberID" json:"member,omitempty"`
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
	Member        *Member      `gorm:"foreignKey:MemberID" json:"member,omitempty"`
}

func (MemberDiary) TableName() string {
	return "MemberDiary"
}

type MemberSetting struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	Data string `gorm:"type:text" json:"data"`

	MemberID string  `gorm:"uniqueIndex;size:36" json:"member_id"`
	Member   *Member `gorm:"foreignKey:MemberID" json:"member,omitempty"`
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

	MemberID string  `gorm:"index;size:36" json:"member_id"`
	Member   *Member `gorm:"foreignKey:MemberID" json:"member,omitempty"`
}

func (MemberNotification) TableName() string {
	return "MemberNotification"
}
