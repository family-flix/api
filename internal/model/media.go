package model


type Media struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	Type int    `gorm:"default:1" json:"type"`
	Text string `gorm:"type:text" json:"text"`

	ProfileID string        `gorm:"size:36" json:"profile_id"`
	Profile   *MediaProfile `gorm:"foreignKey:ProfileID" json:"profile,omitempty"`
	UserID    string        `gorm:"index;size:36" json:"user_id"`

	MediaSources      []MediaSource      `gorm:"foreignKey:MediaID" json:"media_sources,omitempty"`
	ResourceSyncTasks []ResourceSyncTask `gorm:"foreignKey:MediaID" json:"resource_sync_tasks,omitempty"`
}

func (Media) TableName() string {
	return "Media"
}

type MediaSource struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	Type int    `gorm:"default:1" json:"type"`
	Text string `gorm:"type:text" json:"text"`

	MediaID   string              `gorm:"index;size:36" json:"media_id"`
	Media     *Media              `gorm:"foreignKey:MediaID" json:"media,omitempty"`
	ProfileID string              `gorm:"size:36" json:"profile_id"`
	Profile   *MediaSourceProfile `gorm:"foreignKey:ProfileID" json:"profile,omitempty"`
	UserID    string              `gorm:"index;size:36" json:"user_id"`

	Files     []ParsedMediaSource `gorm:"foreignKey:MediaSourceID" json:"files,omitempty"`
	Subtitles []SubtitleV2        `gorm:"foreignKey:MediaSourceID" json:"subtitles,omitempty"`
}

func (MediaSource) TableName() string {
	return "MediaSource"
}

type MediaSeriesProfile struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	Type            int     `gorm:"default:1" json:"type"`
	Name            string  `json:"name"`
	OriginalName    *string `json:"original_name"`
	Alias           *string `json:"alias"`
	Overview        *string `gorm:"type:text" json:"overview"`
	PosterPath      *string `json:"poster_path"`
	BackdropPath    *string `json:"backdrop_path"`
	AirDate         *string `json:"air_date"`
	TMDBID          *string `gorm:"uniqueIndex" json:"tmdb_id"`

	MediaProfiles []MediaProfile `gorm:"foreignKey:SeriesID" json:"media_profiles,omitempty"`
}

func (MediaSeriesProfile) TableName() string {
	return "MediaSeriesProfile"
}

type MediaProfile struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	Type         int     `gorm:"default:1" json:"type"`
	Name         string  `json:"name"`
	OriginalName *string `json:"original_name"`
	Alias        *string `json:"alias"`
	Overview     *string `gorm:"type:text" json:"overview"`
	PosterPath   *string `json:"poster_path"`
	BackdropPath *string `json:"backdrop_path"`
	AirDate      *string `json:"air_date"`
	Order        int     `json:"order"`
	SourceCount  int     `json:"source_count"`
	VoteAverage  float64 `gorm:"default:0" json:"vote_average"`
	InProduction int     `gorm:"default:0" json:"in_production"`
	Tips         *string `gorm:"type:text" json:"tips"`
	TMDBID       *string `gorm:"uniqueIndex" json:"tmdb_id"`
	DoubanID     *string `gorm:"uniqueIndex" json:"douban_id"`
	IMDBID       *string `gorm:"uniqueIndex" json:"imdb_id"`

	SeriesID *string             `gorm:"size:36" json:"series_id"`
	Series   *MediaSeriesProfile `gorm:"foreignKey:SeriesID" json:"series,omitempty"`

	SourceProfiles  []MediaSourceProfile `gorm:"foreignKey:MediaProfileID" json:"source_profiles,omitempty"`
	Genres          []MediaGenre         `gorm:"many2many:media_profile_genres" json:"genres,omitempty"`
	OriginCountries []MediaCountry       `gorm:"many2many:media_profile_countries" json:"origin_country,omitempty"`
	Persons         []PersonInMedia      `gorm:"foreignKey:MediaID" json:"persons,omitempty"`
}

func (MediaProfile) TableName() string {
	return "MediaProfile"
}

type MediaSourceProfile struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	Type         int     `gorm:"default:1" json:"type"`
	Name         string  `json:"name"`
	OriginalName *string `json:"original_name"`
	Overview     *string `gorm:"type:text" json:"overview"`
	AirDate      *string `json:"air_date"`
	StillPath    *string `json:"still_path"`
	Order        int     `json:"order"`
	Runtime      *int    `json:"runtime"`
	TMDBID       *string `gorm:"uniqueIndex" json:"tmdb_id"`
	DoubanID     *string `gorm:"uniqueIndex" json:"douban_id"`

	MediaProfileID string `gorm:"index;size:36" json:"media_profile_id"`
}

func (MediaSourceProfile) TableName() string {
	return "MediaSourceProfile"
}

type MediaGenre struct {
	ID   int    `gorm:"primaryKey" json:"id"`
	Text string `json:"text"`
}

func (MediaGenre) TableName() string {
	return "MediaGenre"
}

type MediaCountry struct {
	ID   string `gorm:"primaryKey" json:"id"`
	Text string `json:"text"`
}

func (MediaCountry) TableName() string {
	return "MediaCountry"
}
