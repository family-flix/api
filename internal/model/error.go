package model


type InvalidMedia struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	Type    int    `gorm:"default:1" json:"type"`
	Profile string `gorm:"type:text" json:"profile"`

	MediaID string `gorm:"uniqueIndex;size:36" json:"media_id"`
	Media   *Media `gorm:"foreignKey:MediaID" json:"media,omitempty"`
	UserID  string `gorm:"index;size:36" json:"user_id"`
}

func (InvalidMedia) TableName() string {
	return "InvalidMedia"
}

type InvalidMediaSource struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	Type    int    `gorm:"default:1" json:"type"`
	Profile string `gorm:"type:text" json:"profile"`

	MediaSourceID string `gorm:"uniqueIndex;size:36" json:"media_source_id"`
	UserID        string `gorm:"index;size:36" json:"user_id"`
}

func (InvalidMediaSource) TableName() string {
	return "InvalidMediaSource"
}

type MediaErrorNeedProcess struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	UniqueID string `json:"unique_id"`
	Type     int    `gorm:"default:1" json:"type"`
	Profile  string `gorm:"type:text" json:"profile"`

	UserID string `gorm:"index;size:36" json:"user_id"`
}

func (MediaErrorNeedProcess) TableName() string {
	return "MediaErrorNeedProcess"
}

type Report struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	Type   int     `json:"type"`
	Data   string  `gorm:"type:text" json:"data"`
	Answer *string `gorm:"type:text" json:"answer"`

	TVID      *string `gorm:"size:36" json:"tv_id"`
	SeasonID  *string `gorm:"size:36" json:"season_id"`
	EpisodeID *string `gorm:"size:36" json:"episode_id"`
	MovieID   *string `gorm:"size:36" json:"movie_id"`
	MemberID  string  `gorm:"index;size:36" json:"member_id"`
	UserID    string  `gorm:"index;size:36" json:"user_id"`
}

func (Report) TableName() string {
	return "Report"
}

type ReportV2 struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	Type   int     `gorm:"default:1" json:"type"`
	Status int     `gorm:"default:1" json:"status"`
	Data   string  `gorm:"type:text" json:"data"`
	Answer *string `gorm:"type:text" json:"answer"`
	Hidden int     `gorm:"default:0" json:"hidden"`

	MediaID       *string      `gorm:"size:36" json:"media_id"`
	Media         *Media       `gorm:"foreignKey:MediaID" json:"media,omitempty"`
	MediaSourceID *string      `gorm:"size:36" json:"media_source_id"`
	MediaSource   *MediaSource `gorm:"foreignKey:MediaSourceID" json:"media_source,omitempty"`
	ReplyMediaID  *string      `gorm:"size:36" json:"reply_media_id"`
	MemberID      string       `gorm:"index;size:36" json:"member_id"`
	Member        *Member      `gorm:"foreignKey:MemberID" json:"member,omitempty"`
	UserID        string       `gorm:"index;size:36" json:"user_id"`
}

func (ReportV2) TableName() string {
	return "ReportV2"
}
