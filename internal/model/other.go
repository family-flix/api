package model


type TVLive struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	Name      string  `json:"name"`
	URL       string  `json:"url"`
	Detail    *string `gorm:"type:text" json:"detail"`
	Logo      *string `json:"logo"`
	GroupName *string `json:"group_name"`
	Order     int     `gorm:"default:9999" json:"order"`
	Hidden    int     `gorm:"default:0" json:"hidden"`

	UserID string `gorm:"index;size:36" json:"user_id"`
	User   *User  `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (TVLive) TableName() string {
	return "TVLive"
}

type TVProfileQuick struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`
	Name    string    `gorm:"uniqueIndex" json:"name"`

	TVProfileID string     `gorm:"size:36" json:"tv_profile_id"`
	TVProfile   *TVProfile `gorm:"foreignKey:TVProfileID" json:"tv_profile,omitempty"`
}

func (TVProfileQuick) TableName() string {
	return "TVProfileQuick"
}

type InvitationCode struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	Text      string     `json:"text"`
	Used      int        `gorm:"default:0" json:"used"`
	UsedAt    *LocalTime `json:"used_at"`
	ExpiredAt *LocalTime `json:"expired_at"`

	InviterID string  `gorm:"index;size:36" json:"inviter_id"`
	Inviter   *Member `gorm:"foreignKey:InviterID" json:"inviter,omitempty"`
	InviteeID *string `gorm:"uniqueIndex;size:36" json:"invitee_id"`
	Invitee   *Member `gorm:"foreignKey:InviteeID" json:"invitee,omitempty"`
}

func (InvitationCode) TableName() string {
	return "InvitationCode"
}

type AuthCode struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	Step    int       `json:"step"`
	Expires LocalTime `json:"expires"`
	Text    *string   `json:"text"`

	MemberID *string `gorm:"size:36" json:"member_id"`
	Member   *Member `gorm:"foreignKey:MemberID" json:"member,omitempty"`
	UserID   string  `gorm:"index;size:36" json:"user_id"`
	User     *User   `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (AuthCode) TableName() string {
	return "AuthCode"
}

type AuthQRCode struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	Step    int       `json:"step"`
	Expires LocalTime `json:"expires"`
	Text    *string   `json:"text"`

	MemberID *string `gorm:"size:36" json:"member_id"`
	Member   *Member `gorm:"foreignKey:MemberID" json:"member,omitempty"`
	UserID   string  `gorm:"index;size:36" json:"user_id"`
	User     *User   `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (AuthQRCode) TableName() string {
	return "AuthQRCode"
}

type Log struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	Title string `json:"title"`
}

func (Log) TableName() string {
	return "Log"
}
