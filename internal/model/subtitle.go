package model


type Subtitle struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	Type     int    `gorm:"default:1" json:"type"`
	FileID   string `json:"file_id"`
	Name     string `json:"name"`
	Language string `json:"language"`

	MovieID   *string  `gorm:"size:36" json:"movie_id"`
	Movie     *Movie   `gorm:"foreignKey:MovieID" json:"movie,omitempty"`
	EpisodeID *string  `gorm:"size:36" json:"episode_id"`
	Episode   *Episode `gorm:"foreignKey:EpisodeID" json:"episode,omitempty"`
	DriveID   string   `gorm:"index;size:36" json:"drive_id"`
	Drive     *Drive   `gorm:"foreignKey:DriveID" json:"drive,omitempty"`
	UserID    string   `gorm:"index;size:36" json:"user_id"`
	User      *User    `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (Subtitle) TableName() string {
	return "Subtitle"
}

type SubtitleV2 struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	Type     int    `gorm:"default:1" json:"type"`
	UniqueID string `json:"unique_id"`
	Name     string `json:"name"`
	Language string `json:"language"`

	MediaSourceID *string      `gorm:"size:36" json:"media_source_id"`
	MediaSource   *MediaSource `gorm:"foreignKey:MediaSourceID" json:"media_source,omitempty"`
	UserID        string       `gorm:"index;size:36" json:"user_id"`
	User          *User        `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (SubtitleV2) TableName() string {
	return "SubtitleV2"
}
