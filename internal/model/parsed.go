package model


type ParsedTV struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	Name         *string `json:"name"`
	OriginalName *string `json:"original_name"`
	FileID       *string `json:"file_id"`
	FileName     *string `json:"file_name"`
	CanSearch    *int    `gorm:"default:1" json:"can_search"`
	Source       *int    `gorm:"default:0" json:"source"`
	UniqueID     *string `json:"unique_id"`

	TVID    *string `gorm:"size:36" json:"tv_id"`
	TV      *TV     `gorm:"foreignKey:TVID" json:"tv,omitempty"`
	DriveID string  `gorm:"index;size:36" json:"drive_id"`
	Drive   *Drive  `gorm:"foreignKey:DriveID" json:"drive,omitempty"`
	UserID  string  `gorm:"index;size:36" json:"user_id"`
	User    *User   `gorm:"foreignKey:UserID" json:"user,omitempty"`

	ParsedEpisodes []ParsedEpisode `gorm:"foreignKey:ParsedTVID" json:"parsed_episodes,omitempty"`
	ParsedSeasons  []ParsedSeason  `gorm:"foreignKey:ParsedTVID" json:"parsed_seasons,omitempty"`
}

func (ParsedTV) TableName() string {
	return "ParsedTV"
}

type ParsedSeason struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	SeasonNumber string  `json:"season_number"`
	FileID       *string `json:"file_id"`
	FileName     *string `json:"file_name"`
	CanSearch    *int    `gorm:"default:1" json:"can_search"`

	SeasonID   *string   `gorm:"size:36" json:"season_id"`
	Season     *Season   `gorm:"foreignKey:SeasonID" json:"season,omitempty"`
	ParsedTVID string    `gorm:"index;size:36" json:"parsed_tv_id"`
	ParsedTV   *ParsedTV `gorm:"foreignKey:ParsedTVID" json:"parsed_tv,omitempty"`
	DriveID    string    `gorm:"index;size:36" json:"drive_id"`
	Drive      *Drive    `gorm:"foreignKey:DriveID" json:"drive,omitempty"`
	UserID     string    `gorm:"index;size:36" json:"user_id"`
	User       *User     `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (ParsedSeason) TableName() string {
	return "ParsedSeason"
}

type ParsedEpisode struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	EpisodeNumber string   `json:"episode_number"`
	SeasonNumber  string   `json:"season_number"`
	Name          string   `json:"name"`
	FileID        string   `json:"file_id"`
	FileName      string   `json:"file_name"`
	ParentFileID  string   `json:"parent_file_id"`
	ParentPaths   string   `json:"parent_paths"`
	Type          int      `json:"type"`
	Size          *float64 `gorm:"default:0" json:"size"`
	MD5           *string  `json:"md5"`
	CanSearch     *int     `gorm:"default:1" json:"can_search"`

	SeasonID   *string   `gorm:"size:36" json:"season_id"`
	Season     *Season   `gorm:"foreignKey:SeasonID" json:"season,omitempty"`
	EpisodeID  *string   `gorm:"size:36" json:"episode_id"`
	Episode    *Episode  `gorm:"foreignKey:EpisodeID" json:"episode,omitempty"`
	ParsedTVID string    `gorm:"index;size:36" json:"parsed_tv_id"`
	ParsedTV   *ParsedTV `gorm:"foreignKey:ParsedTVID" json:"parsed_tv,omitempty"`
	DriveID    string    `gorm:"index;size:36" json:"drive_id"`
	Drive      *Drive    `gorm:"foreignKey:DriveID" json:"drive,omitempty"`
	UserID     string    `gorm:"index;size:36" json:"user_id"`
	User       *User     `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (ParsedEpisode) TableName() string {
	return "ParsedEpisode"
}

type ParsedMovie struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	Source       *int     `gorm:"default:0" json:"source"`
	UniqueID     *string  `json:"unique_id"`
	Name         string   `json:"name"`
	OriginalName *string  `json:"original_name"`
	FileID       string   `json:"file_id"`
	FileName     string   `json:"file_name"`
	ParentFileID string   `json:"parent_file_id"`
	ParentPaths  string   `json:"parent_paths"`
	Type         int      `json:"type"`
	Size         *float64 `gorm:"default:0" json:"size"`
	CanSearch    *int     `gorm:"default:1" json:"can_search"`

	MovieID *string `gorm:"size:36" json:"movie_id"`
	Movie   *Movie  `gorm:"foreignKey:MovieID" json:"movie,omitempty"`
	DriveID string  `gorm:"index;size:36" json:"drive_id"`
	Drive   *Drive  `gorm:"foreignKey:DriveID" json:"drive,omitempty"`
	UserID  string  `gorm:"index;size:36" json:"user_id"`
	User    *User   `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (ParsedMovie) TableName() string {
	return "ParsedMovie"
}

type ParsedMedia struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	Type         int     `gorm:"default:1" json:"type"`
	Name         string  `json:"name"`
	OriginalName *string `json:"original_name"`
	AirYear      *string `json:"air_year"`
	SeasonText   *string `json:"season_text"`
	CanSearch    int     `gorm:"default:1" json:"can_search"`

	MediaProfileID *string       `gorm:"size:36" json:"media_profile_id"`
	MediaProfile   *MediaProfile `gorm:"foreignKey:MediaProfileID" json:"media_profile,omitempty"`
	DriveID        string        `gorm:"index;size:36" json:"drive_id"`
	Drive          *Drive        `gorm:"foreignKey:DriveID" json:"drive,omitempty"`
	UserID         string        `gorm:"index;size:36" json:"user_id"`
	User           *User         `gorm:"foreignKey:UserID" json:"user,omitempty"`

	ParsedSources []ParsedMediaSource `gorm:"foreignKey:ParsedMediaID" json:"parsed_sources,omitempty"`
}

func (ParsedMedia) TableName() string {
	return "ParsedMedia"
}

type ParsedMediaSource struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	Type         int     `gorm:"default:1" json:"type"`
	Name         string  `json:"name"`
	OriginalName *string `json:"original_name"`
	EpisodeText  *string `json:"episode_text"`
	SeasonText   *string `json:"season_text"`
	FileID       string  `gorm:"uniqueIndex" json:"file_id"`
	FileName     string  `json:"file_name"`
	ParentFileID string  `json:"parent_file_id"`
	ParentPaths  string  `json:"parent_paths"`
	Size         float64 `gorm:"default:0" json:"size"`
	MD5          *string `json:"md5"`
	CanSearch    int     `gorm:"default:1" json:"can_search"`
	CauseJobID   *string `json:"cause_job_id"`

	ParsedMediaID *string      `gorm:"size:36" json:"parsed_media_id"`
	ParsedMedia   *ParsedMedia `gorm:"foreignKey:ParsedMediaID" json:"parsed_media,omitempty"`
	MediaSourceID *string      `gorm:"size:36" json:"media_source_id"`
	MediaSource   *MediaSource `gorm:"foreignKey:MediaSourceID" json:"media_source,omitempty"`
	DriveID       string       `gorm:"index;size:36" json:"drive_id"`
	Drive         *Drive       `gorm:"foreignKey:DriveID" json:"drive,omitempty"`
	UserID        string       `gorm:"index;size:36" json:"user_id"`
	User          *User        `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (ParsedMediaSource) TableName() string {
	return "ParsedSource"
}
