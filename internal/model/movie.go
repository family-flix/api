package model


type Movie struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	Tip *string `json:"tip"`

	ProfileID string        `gorm:"size:36" json:"profile_id"`
	Profile   *MovieProfile `gorm:"foreignKey:ProfileID" json:"profile,omitempty"`
	UserID    string        `gorm:"index;size:36" json:"user_id"`
	User      *User         `gorm:"foreignKey:UserID" json:"user,omitempty"`

	PlayHistories []PlayHistory `gorm:"foreignKey:MovieID" json:"play_histories,omitempty"`
	ParsedMovies  []ParsedMovie `gorm:"foreignKey:MovieID" json:"parsed_movies,omitempty"`
	Reports       []Report      `gorm:"foreignKey:MovieID" json:"reports,omitempty"`
	Subtitles     []Subtitle    `gorm:"foreignKey:MovieID" json:"subtitles,omitempty"`
	Collections   []Collection  `gorm:"foreignKey:MovieID" json:"collections,omitempty"`
	SharedMedias  []SharedMedia `gorm:"foreignKey:MovieID" json:"shared_medias,omitempty"`
}

func (Movie) TableName() string {
	return "Movie"
}

type MovieProfile struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	UniqueID         string   `gorm:"uniqueIndex" json:"unique_id"`
	Source           *int     `gorm:"default:0" json:"source"`
	Sources          *string  `gorm:"type:text;default:''" json:"sources"`
	Name             *string  `json:"name"`
	OriginalName     *string  `json:"original_name"`
	Alias            *string  `json:"alias"`
	Overview         *string  `gorm:"type:text" json:"overview"`
	PosterPath       *string  `json:"poster_path"`
	BackdropPath     *string  `json:"backdrop_path"`
	AirDate          *string  `json:"air_date"`
	OriginalLanguage *string  `json:"original_language"`
	Popularity       *float64 `gorm:"default:0" json:"popularity"`
	VoteAverage      *float64 `gorm:"default:0" json:"vote_average"`
	VoteCount        *float64 `gorm:"default:0" json:"vote_count"`
	OriginCountry    *string  `gorm:"default:''" json:"origin_country"`
	Genres           *string  `gorm:"default:''" json:"genres"`
	Runtime          *int     `gorm:"default:0" json:"runtime"`

	Movies []Movie `gorm:"foreignKey:ProfileID" json:"movies,omitempty"`
}

func (MovieProfile) TableName() string {
	return "MovieProfile"
}
