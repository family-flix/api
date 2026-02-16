package model

import "time"

type InvalidMedia struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created time.Time `gorm:"autoCreateTime" json:"created"`
	Updated time.Time `gorm:"autoUpdateTime" json:"updated"`

	Type    int    `gorm:"default:1" json:"type"`
	Profile string `gorm:"type:text" json:"profile"`

	MediaID string `gorm:"uniqueIndex;size:36" json:"media_id"`
	Media   *Media `gorm:"foreignKey:MediaID" json:"media,omitempty"`
	UserID  string `gorm:"index;size:36" json:"user_id"`
	User    *User  `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (InvalidMedia) TableName() string {
	return "InvalidMedia"
}

type InvalidMediaSource struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created time.Time `gorm:"autoCreateTime" json:"created"`
	Updated time.Time `gorm:"autoUpdateTime" json:"updated"`

	Type    int    `gorm:"default:1" json:"type"`
	Profile string `gorm:"type:text" json:"profile"`

	MediaSourceID string       `gorm:"uniqueIndex;size:36" json:"media_source_id"`
	MediaSource   *MediaSource `gorm:"foreignKey:MediaSourceID" json:"media_source,omitempty"`
	UserID        string       `gorm:"index;size:36" json:"user_id"`
	User          *User        `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (InvalidMediaSource) TableName() string {
	return "InvalidMediaSource"
}

type MediaErrorNeedProcess struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created time.Time `gorm:"autoCreateTime" json:"created"`
	Updated time.Time `gorm:"autoUpdateTime" json:"updated"`

	UniqueID string `json:"unique_id"`
	Type     int    `gorm:"default:1" json:"type"`
	Profile  string `gorm:"type:text" json:"profile"`

	UserID string `gorm:"index;size:36" json:"user_id"`
	User   *User  `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (MediaErrorNeedProcess) TableName() string {
	return "MediaErrorNeedProcess"
}

type Report struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created time.Time `gorm:"autoCreateTime" json:"created"`
	Updated time.Time `gorm:"autoUpdateTime" json:"updated"`

	Type   int     `json:"type"`
	Data   string  `gorm:"type:text" json:"data"`
	Answer *string `gorm:"type:text" json:"answer"`

	TVID      *string  `gorm:"size:36" json:"tv_id"`
	TV        *TV      `gorm:"foreignKey:TVID" json:"tv,omitempty"`
	SeasonID  *string  `gorm:"size:36" json:"season_id"`
	Season    *Season  `gorm:"foreignKey:SeasonID" json:"season,omitempty"`
	EpisodeID *string  `gorm:"size:36" json:"episode_id"`
	Episode   *Episode `gorm:"foreignKey:EpisodeID" json:"episode,omitempty"`
	MovieID   *string  `gorm:"size:36" json:"movie_id"`
	Movie     *Movie   `gorm:"foreignKey:MovieID" json:"movie,omitempty"`
	MemberID  string   `gorm:"index;size:36" json:"member_id"`
	Member    *Member  `gorm:"foreignKey:MemberID" json:"member,omitempty"`
	UserID    string   `gorm:"index;size:36" json:"user_id"`
	User      *User    `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (Report) TableName() string {
	return "Report"
}

type ReportV2 struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created time.Time `gorm:"autoCreateTime" json:"created"`
	Updated time.Time `gorm:"autoUpdateTime" json:"updated"`

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
	ReplyMedia    *Media       `gorm:"foreignKey:ReplyMediaID" json:"reply_media,omitempty"`
	MemberID      string       `gorm:"index;size:36" json:"member_id"`
	Member        *Member      `gorm:"foreignKey:MemberID" json:"member,omitempty"`
	UserID        string       `gorm:"index;size:36" json:"user_id"`
	User          *User        `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (ReportV2) TableName() string {
	return "ReportV2"
}
