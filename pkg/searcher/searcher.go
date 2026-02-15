package searcher

import (
	"fmt"

	"github.com/family-flix/api/pkg/types"
)

type MediaSearcher struct {
	Store         types.DataStore
	ProfileClient types.MediaProfileClient
	UserID        string
	OnPrint       func(msg string)
}

func NewMediaSearcher(store types.DataStore, client types.MediaProfileClient, userID string) *MediaSearcher {
	return &MediaSearcher{
		Store:         store,
		ProfileClient: client,
		UserID:        userID,
		OnPrint:       func(msg string) {},
	}
}

func (s *MediaSearcher) Run() error {
	// 1. Search for TVs without profile
	// In real impl, we would use a cursor/pagination
	// Here simplified

	// Mock logic: Find ParsedTVs where ProfileID is null
	// tvs, _ := s.Store.ParsedTV().FindPending(s.UserID)

	// Since FindPending is not in interface yet, I will skip or comment
	s.OnPrint("Starting Media Searcher...")

	// 2. Search for Movies without profile

	return nil
}

func (s *MediaSearcher) SearchTV(tv *types.ParsedTV) error {
	if tv == nil {
		return fmt.Errorf("tv is nil")
	}
	s.OnPrint(fmt.Sprintf("Searching profile for TV: %s", tv.Name))

	results, err := s.ProfileClient.SearchTV(tv.Name)
	if err != nil {
		return err
	}

	if len(results) > 0 {
		bestMatch := results[0]
		s.OnPrint(fmt.Sprintf("Found match: %s", bestMatch.Name))
		// Update TV with profile ID
		// tv.ProfileID = bestMatch.ID
		// s.Store.ParsedTV().Update(tv.ID, *tv)
	} else {
		s.OnPrint("No match found")
	}

	return nil
}

func (s *MediaSearcher) SearchMovie(movie *types.ParsedMovie) error {
	if movie == nil {
		return fmt.Errorf("movie is nil")
	}
	s.OnPrint(fmt.Sprintf("Searching profile for Movie: %s (%s)", movie.Name, movie.Year))

	results, err := s.ProfileClient.SearchMovie(movie.Name, movie.Year)
	if err != nil {
		return err
	}

	if len(results) > 0 {
		bestMatch := results[0]
		s.OnPrint(fmt.Sprintf("Found match: %s", bestMatch.Name))
		// Update Movie with profile ID
		// movie.ProfileID = bestMatch.ID
		// s.Store.ParsedMovie().Update(movie.ID, *movie)
	} else {
		s.OnPrint("No match found")
	}

	return nil
}
