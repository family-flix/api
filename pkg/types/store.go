package types

import "time"

// DataStore interface for database operations
type DataStore interface {
	ParsedMediaSource() ParsedMediaSourceRepository
	ParsedTV() ParsedTVRepository
	ParsedSeason() ParsedSeasonRepository
	ParsedEpisode() ParsedEpisodeRepository
	ParsedMovie() ParsedMovieRepository
}

type ParsedMediaSourceRepository interface {
	FindFirst(query ParsedMediaSourceQuery) (*ParsedMediaSource, error)
	Create(data ParsedMediaSource) (*ParsedMediaSource, error)
	Update(id string, data ParsedMediaSource) (*ParsedMediaSource, error)
}

type ParsedTVRepository interface {
	FindFirst(query ParsedTVQuery) (*ParsedTV, error)
	Create(data ParsedTV) (*ParsedTV, error)
	Update(id string, data ParsedTV) (*ParsedTV, error)
}

type ParsedSeasonRepository interface {
	FindFirst(query ParsedSeasonQuery) (*ParsedSeason, error)
	Create(data ParsedSeason) (*ParsedSeason, error)
	Update(id string, data ParsedSeason) (*ParsedSeason, error)
}

type ParsedEpisodeRepository interface {
	FindFirst(query ParsedEpisodeQuery) (*ParsedEpisode, error)
	Create(data ParsedEpisode) (*ParsedEpisode, error)
	Update(id string, data ParsedEpisode) (*ParsedEpisode, error)
}

type ParsedMovieRepository interface {
	FindFirst(query ParsedMovieQuery) (*ParsedMovie, error)
	Create(data ParsedMovie) (*ParsedMovie, error)
	Update(id string, data ParsedMovie) (*ParsedMovie, error)
}

// Structs for DB models

type ParsedMediaSource struct {
	ID           string
	UserID       string
	DriveID      string
	FileID       string
	FileName     string
	ParentPaths  string
	ParentFileID string
	Type         int // 1: TV, 2: Movie? Need constants
	Size         int64
	MD5          string
	ParsedID     string // ID of ParsedTV/Movie/Episode?
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type ParsedTV struct {
	ID           string
	UserID       string
	Name         string
	OriginalName string
	// ... other fields
}

type ParsedSeason struct {
	ID           string
	UserID       string
	ParsedTVID   string
	SeasonText   string
	SeasonNumber int
	// ...
}

type ParsedEpisode struct {
	ID             string
	UserID         string
	ParsedTVID     string
	ParsedSeasonID string
	EpisodeText    string
	EpisodeNumber  int
	// ...
}

type ParsedMovie struct {
	ID           string
	UserID       string
	Name         string
	OriginalName string
	Year         string
	// ...
}

// Query structs (simplified)
type ParsedMediaSourceQuery struct {
	FileID string
	UserID string
}

type ParsedTVQuery struct {
	Name   string
	UserID string
}

type ParsedSeasonQuery struct {
	ParsedTVID string
	SeasonText string
	UserID     string
}

type ParsedEpisodeQuery struct {
	ParsedSeasonID string
	EpisodeText    string
	UserID         string
}

type ParsedMovieQuery struct {
	Name   string
	UserID string
	Year   string
}
