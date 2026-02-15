package types

// MediaProfileClient interface
type MediaProfileClient interface {
	SearchTV(query string) ([]TVProfile, error)
	SearchMovie(query string, year string) ([]MovieProfile, error)
	GetTVDetails(id string) (*TVProfile, error)
	GetMovieDetails(id string) (*MovieProfile, error)
}

type TVProfile struct {
	ID           string
	Name         string
	OriginalName string
	Poster       string
	Backdrop     string
	Overview     string
	FirstAirDate string
}

type MovieProfile struct {
	ID           string
	Name         string
	OriginalName string
	Poster       string
	Backdrop     string
	Overview     string
	ReleaseDate  string
}
