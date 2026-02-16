package model


type PlayHistory struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	Duration    *float64 `gorm:"default:0" json:"duration"`
	CurrentTime *float64 `gorm:"default:0" json:"current_time"`
	Thumbnail   *string  `json:"thumbnail"`
	FileID      *string  `json:"file_id"`

	TVID      *string `gorm:"size:36" json:"tv_id"`
	SeasonID  *string `gorm:"size:36" json:"season_id"`
	EpisodeID *string `gorm:"size:36" json:"episode_id"`
	MovieID   *string `gorm:"size:36" json:"movie_id"`
	MemberID  string  `gorm:"index;size:36" json:"member_id"`
}

func (PlayHistory) TableName() string {
	return "PlayHistory"
}

type PlayHistoryV2 struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	Text          string  `json:"text"`
	Duration      float64 `gorm:"default:0" json:"duration"`
	CurrentTime   float64 `gorm:"default:0" json:"current_time"`
	ThumbnailPath *string `json:"thumbnail_path"`
	FileID        *string `json:"file_id"`

	MediaID       string       `gorm:"index;size:36" json:"media_id"`
	Media         *Media       `gorm:"foreignKey:MediaID" json:"media,omitempty"`
	MediaSourceID string       `gorm:"index;size:36" json:"media_source_id"`
	MediaSource   *MediaSource `gorm:"foreignKey:MediaSourceID" json:"media_source,omitempty"`
	MemberID      string       `gorm:"index;size:36" json:"member_id"`
	Member        *Member      `gorm:"foreignKey:MemberID" json:"member,omitempty"`
}

func (PlayHistoryV2) TableName() string {
	return "PlayHistoryV2"
}
