package types

// MediaProfileClient interface
type MediaProfileClient interface {
	SearchTV(query string) ([]TVProfile, error)
	SearchMovie(query string, year string) ([]MovieProfile, error)
	GetTVDetails(id string) (*TVProfile, error)
	GetMovieDetails(id string) (*MovieProfile, error)
}

type Genre struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type TVProfileSeason struct {
	ID           int    `json:"id"`
	AirDate      string `json:"air_date"`
	EpisodeCount int    `json:"episode_count"`
	Name         string `json:"name"`
	Overview     string `json:"overview"`
	PosterPath   string `json:"poster_path"`
	SeasonNumber int    `json:"season_number"`
}

type TVProfile struct {
	ID               string            `json:"id"`
	Name             string            `json:"name"`
	OriginalName     string            `json:"original_name"`
	Overview         string            `json:"overview"`
	PosterPath       string            `json:"poster_path"`
	BackdropPath     string            `json:"backdrop_path"`
	FirstAirDate     string            `json:"first_air_date"`
	VoteAverage      float64           `json:"vote_average"`
	Popularity       float64           `json:"popularity"`
	NumberOfEpisodes int               `json:"number_of_episodes"`
	NumberOfSeasons  int               `json:"number_of_seasons"`
	InProduction     bool              `json:"in_production"`
	NextEpisodeToAir *string           `json:"next_episode_to_air"`
	Seasons          []TVProfileSeason `json:"seasons"`
	Genres           []Genre           `json:"genres"`
	OriginCountry    []string          `json:"origin_country"`
	Type             string            `json:"type"`
	Source           string            `json:"source"`
}

type MovieProfile struct {
	ID            string   `json:"id"`
	Name          string   `json:"name"`
	OriginalName  string   `json:"original_name"`
	Overview      string   `json:"overview"`
	PosterPath    string   `json:"poster_path"`
	BackdropPath  string   `json:"backdrop_path"`
	AirDate       string   `json:"air_date"`
	Status        string   `json:"status"`
	VoteAverage   float64  `json:"vote_average"`
	Popularity    float64  `json:"popularity"`
	Genres        []Genre  `json:"genres"`
	Runtime       *int     `json:"runtime"`
	OriginCountry []string `json:"origin_country"`
	Type          string   `json:"type"`
	Source        string   `json:"source"`
}
