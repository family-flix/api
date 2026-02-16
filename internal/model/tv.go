package model


type TV struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	Hidden *int `gorm:"default:0" json:"hidden"`

	ProfileID string `gorm:"size:36" json:"profile_id"`
	UserID    string `gorm:"index;size:36" json:"user_id"`
}

func (TV) TableName() string {
	return "TV"
}

type TVProfile struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	UniqueID         string   `gorm:"uniqueIndex" json:"unique_id"`
	Source           *int     `gorm:"default:0" json:"source"`
	Sources          *string  `gorm:"type:text;default:''" json:"sources"`
	Alias            *string  `json:"alias"`
	Name             *string  `json:"name"`
	OriginalName     *string  `json:"original_name"`
	Overview         *string  `gorm:"type:text" json:"overview"`
	PosterPath       *string  `json:"poster_path"`
	BackdropPath     *string  `json:"backdrop_path"`
	FirstAirDate     *string  `json:"first_air_date"`
	OriginalLanguage *string  `json:"original_language"`
	OriginCountry    *string  `gorm:"default:''" json:"origin_country"`
	Genres           *string  `gorm:"default:''" json:"genres"`
	Popularity       *float64 `gorm:"default:0" json:"popularity"`
	VoteAverage      *float64 `gorm:"default:0" json:"vote_average"`
	VoteCount        *float64 `gorm:"default:0" json:"vote_count"`
	EpisodeCount     *int     `gorm:"default:0" json:"episode_count"`
	SeasonCount      *int     `gorm:"default:0" json:"season_count"`
	Status           *string  `json:"status"`
	InProduction     *int     `gorm:"default:0" json:"in_production"`
}

func (TVProfile) TableName() string {
	return "TVProfile"
}

type Season struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	SeasonText   string  `json:"season_text"`
	SeasonNumber int     `json:"season_number"`
	Tip          *string `json:"tip"`

	ProfileID string `gorm:"size:36" json:"profile_id"`
	TVID      string `gorm:"index;size:36" json:"tv_id"`
	UserID    string `gorm:"index;size:36" json:"user_id"`
}

func (Season) TableName() string {
	return "Season"
}

type SeasonProfile struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	UniqueID     string   `gorm:"uniqueIndex" json:"unique_id"`
	Source       *int     `gorm:"default:0" json:"source"`
	Sources      *string  `gorm:"type:text;default:''" json:"sources"`
	Name         *string  `json:"name"`
	Overview     *string  `gorm:"type:text" json:"overview"`
	PosterPath   *string  `json:"poster_path"`
	SeasonNumber *int     `json:"season_number"`
	AirDate      *string  `json:"air_date"`
	EpisodeCount *int     `gorm:"default:0" json:"episode_count"`
	VoteAverage  *float64 `gorm:"default:0" json:"vote_average"`
}

func (SeasonProfile) TableName() string {
	return "SeasonProfile"
}

type Episode struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	EpisodeText   string  `json:"episode_text"`
	SeasonText    string  `json:"season_text"`
	EpisodeNumber int     `json:"episode_number"`
	Tip           *string `json:"tip"`

	ProfileID string `gorm:"size:36" json:"profile_id"`
	TVID      string `gorm:"index;size:36" json:"tv_id"`
	SeasonID  string `gorm:"index;size:36" json:"season_id"`
	UserID    string `gorm:"index;size:36" json:"user_id"`
}

func (Episode) TableName() string {
	return "Episode"
}

type EpisodeProfile struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	UniqueID      string  `gorm:"uniqueIndex" json:"unique_id"`
	Source        *int    `gorm:"default:0" json:"source"`
	Sources       *string `gorm:"type:text;default:''" json:"sources"`
	Name          *string `json:"name"`
	Overview      *string `gorm:"type:text" json:"overview"`
	AirDate       *string `json:"air_date"`
	Runtime       *int    `gorm:"default:0" json:"runtime"`
	EpisodeNumber *int    `json:"episode_number"`
	SeasonNumber  *int    `json:"season_number"`
}

func (EpisodeProfile) TableName() string {
	return "EpisodeProfile"
}
