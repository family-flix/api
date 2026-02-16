package model

import "time"

type TV struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created time.Time `gorm:"autoCreateTime" json:"created"`
	Updated time.Time `gorm:"autoUpdateTime" json:"updated"`

	Hidden *int `gorm:"default:0" json:"hidden"`

	ProfileID string     `gorm:"size:36" json:"profile_id"`
	Profile   *TVProfile `gorm:"foreignKey:ProfileID" json:"profile,omitempty"`
	UserID    string     `gorm:"index;size:36" json:"user_id"`
	User      *User      `gorm:"foreignKey:UserID" json:"user,omitempty"`

	Seasons       []Season      `gorm:"foreignKey:TVID" json:"seasons,omitempty"`
	Episodes      []Episode     `gorm:"foreignKey:TVID" json:"episodes,omitempty"`
	PlayHistories []PlayHistory `gorm:"foreignKey:TVID" json:"play_histories,omitempty"`
	ParsedTVs     []ParsedTV    `gorm:"foreignKey:TVID" json:"parsed_tvs,omitempty"`
	Reports       []Report      `gorm:"foreignKey:TVID" json:"reports,omitempty"`
	Collections   []Collection  `gorm:"foreignKey:TVID" json:"collections,omitempty"`
}

func (TV) TableName() string {
	return "TV"
}

type TVProfile struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created time.Time `gorm:"autoCreateTime" json:"created"`
	Updated time.Time `gorm:"autoUpdateTime" json:"updated"`

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

	TVs       []TV             `gorm:"foreignKey:ProfileID" json:"tvs,omitempty"`
	Snapshots []TVProfileQuick `gorm:"foreignKey:TVProfileID" json:"snapshots,omitempty"`
}

func (TVProfile) TableName() string {
	return "TVProfile"
}

type Season struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created time.Time `gorm:"autoCreateTime" json:"created"`
	Updated time.Time `gorm:"autoUpdateTime" json:"updated"`

	SeasonText   string  `json:"season_text"`
	SeasonNumber int     `json:"season_number"`
	Tip          *string `json:"tip"`

	ProfileID string         `gorm:"size:36" json:"profile_id"`
	Profile   *SeasonProfile `gorm:"foreignKey:ProfileID" json:"profile,omitempty"`
	TVID      string         `gorm:"index;size:36" json:"tv_id"`
	TV        *TV            `gorm:"foreignKey:TVID" json:"tv,omitempty"`
	UserID    string         `gorm:"index;size:36" json:"user_id"`
	User      *User          `gorm:"foreignKey:UserID" json:"user,omitempty"`

	ParsedSeasons  []ParsedSeason    `gorm:"foreignKey:SeasonID" json:"parsed_seasons,omitempty"`
	ParsedEpisodes []ParsedEpisode   `gorm:"foreignKey:SeasonID" json:"parsed_episodes,omitempty"`
	PlayHistories  []PlayHistory     `gorm:"foreignKey:SeasonID" json:"play_histories,omitempty"`
	Episodes       []Episode         `gorm:"foreignKey:SeasonID" json:"episodes,omitempty"`
	Reports        []Report          `gorm:"foreignKey:SeasonID" json:"reports,omitempty"`
	SyncTasks      []BindForParsedTV `gorm:"foreignKey:SeasonID" json:"sync_tasks,omitempty"`
	Collections    []Collection      `gorm:"foreignKey:SeasonID" json:"collections,omitempty"`
	SharedMedias   []SharedMedia     `gorm:"foreignKey:SeasonID" json:"shared_medias,omitempty"`
}

func (Season) TableName() string {
	return "Season"
}

type SeasonProfile struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created time.Time `gorm:"autoCreateTime" json:"created"`
	Updated time.Time `gorm:"autoUpdateTime" json:"updated"`

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

	Seasons []Season `gorm:"foreignKey:ProfileID" json:"seasons,omitempty"`
}

func (SeasonProfile) TableName() string {
	return "SeasonProfile"
}

type Episode struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created time.Time `gorm:"autoCreateTime" json:"created"`
	Updated time.Time `gorm:"autoUpdateTime" json:"updated"`

	EpisodeText   string  `json:"episode_text"`
	SeasonText    string  `json:"season_text"`
	EpisodeNumber int     `json:"episode_number"`
	Tip           *string `json:"tip"`

	ProfileID string          `gorm:"size:36" json:"profile_id"`
	Profile   *EpisodeProfile `gorm:"foreignKey:ProfileID" json:"profile,omitempty"`
	TVID      string          `gorm:"index;size:36" json:"tv_id"`
	TV        *TV             `gorm:"foreignKey:TVID" json:"tv,omitempty"`
	SeasonID  string          `gorm:"index;size:36" json:"season_id"`
	Season    *Season         `gorm:"foreignKey:SeasonID" json:"season,omitempty"`
	UserID    string          `gorm:"index;size:36" json:"user_id"`
	User      *User           `gorm:"foreignKey:UserID" json:"user,omitempty"`

	ParsedEpisodes []ParsedEpisode `gorm:"foreignKey:EpisodeID" json:"parsed_episodes,omitempty"`
	PlayHistories  []PlayHistory   `gorm:"foreignKey:EpisodeID" json:"play_histories,omitempty"`
	Reports        []Report        `gorm:"foreignKey:EpisodeID" json:"reports,omitempty"`
	Subtitles      []Subtitle      `gorm:"foreignKey:EpisodeID" json:"subtitles,omitempty"`
}

func (Episode) TableName() string {
	return "Episode"
}

type EpisodeProfile struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created time.Time `gorm:"autoCreateTime" json:"created"`
	Updated time.Time `gorm:"autoUpdateTime" json:"updated"`

	UniqueID      string  `gorm:"uniqueIndex" json:"unique_id"`
	Source        *int    `gorm:"default:0" json:"source"`
	Sources       *string `gorm:"type:text;default:''" json:"sources"`
	Name          *string `json:"name"`
	Overview      *string `gorm:"type:text" json:"overview"`
	AirDate       *string `json:"air_date"`
	Runtime       *int    `gorm:"default:0" json:"runtime"`
	EpisodeNumber *int    `json:"episode_number"`
	SeasonNumber  *int    `json:"season_number"`

	Episodes []Episode `gorm:"foreignKey:ProfileID" json:"episodes,omitempty"`
}

func (EpisodeProfile) TableName() string {
	return "EpisodeProfile"
}
