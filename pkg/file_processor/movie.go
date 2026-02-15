package file_processor

import (
	"fmt"

	"github.com/family-flix/api/pkg/types"
	"github.com/family-flix/api/pkg/walker"
)

type MovieFileProcessor struct {
	Movie      walker.SearchedMovie
	UserID     string
	DriveID    string
	Store      types.DataStore
	OnPrint    func(msg string)
	OnAddMovie func(movie types.ParsedMovie)
}

func NewMovieFileProcessor(
	movie walker.SearchedMovie,
	userID string,
	driveID string,
	store types.DataStore,
) *MovieFileProcessor {
	return &MovieFileProcessor{
		Movie:      movie,
		UserID:     userID,
		DriveID:    driveID,
		Store:      store,
		OnPrint:    func(msg string) {},
		OnAddMovie: func(movie types.ParsedMovie) {},
	}
}

func (p *MovieFileProcessor) Run() error {
	data := p.Movie
	store := p.Store
	userID := p.UserID

	// Check if media source exists
	existingSource, err := store.ParsedMediaSource().FindFirst(types.ParsedMediaSourceQuery{
		FileID: data.FileID,
		UserID: userID,
	})
	if err != nil {
		return err
	}

	if existingSource == nil {
		// New movie
		p.OnPrint(fmt.Sprintf("New movie found: %s", data.FileName))

		// 1. Find or Create Movie
		movie, err := p.findOrCreateMovie(data.Name, data.OriginalName, data.Year)
		if err != nil {
			return err
		}

		// 2. Create Media Source
		err = p.createMediaSource(movie.ID, data)
		if err != nil {
			return err
		}

		p.OnAddMovie(*movie)
	} else {
		p.OnPrint(fmt.Sprintf("Existing movie: %s", data.FileName))
	}

	return nil
}

func (p *MovieFileProcessor) findOrCreateMovie(name, originalName, year string) (*types.ParsedMovie, error) {
	movie, err := p.Store.ParsedMovie().FindFirst(types.ParsedMovieQuery{
		Name:   name,
		UserID: p.UserID,
		Year:   year,
	})
	if err != nil {
		return nil, err
	}
	if movie != nil {
		return movie, nil
	}

	newMovie := types.ParsedMovie{
		UserID:       p.UserID,
		Name:         name,
		OriginalName: originalName,
		Year:         year,
	}
	return p.Store.ParsedMovie().Create(newMovie)
}

func (p *MovieFileProcessor) createMediaSource(parsedID string, data walker.SearchedMovie) error {
	source := types.ParsedMediaSource{
		UserID:      p.UserID,
		DriveID:     p.DriveID,
		FileID:      data.FileID,
		FileName:    data.FileName,
		ParentPaths: data.ParentPaths,
		Size:        data.Size,
		MD5:         data.MD5,
		ParsedID:    parsedID,
		Type:        2, // Movie
	}
	_, err := p.Store.ParsedMediaSource().Create(source)
	return err
}
