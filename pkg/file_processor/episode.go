package file_processor

import (
	"fmt"

	"github.com/family-flix/api/pkg/types"
	"github.com/family-flix/api/pkg/walker"
)

type EpisodeFileProcessor struct {
	Episode walker.SearchedEpisode
	UserID  string
	DriveID string
	Store   types.DataStore
	OnPrint func(msg string)
	OnAddTV func(tv types.ParsedTV)
	OnAddEp func(ep types.ParsedEpisode)
}

func NewEpisodeFileProcessor(
	episode walker.SearchedEpisode,
	userID string,
	driveID string,
	store types.DataStore,
) *EpisodeFileProcessor {
	return &EpisodeFileProcessor{
		Episode: episode,
		UserID:  userID,
		DriveID: driveID,
		Store:   store,
		OnPrint: func(msg string) {},
		OnAddTV: func(tv types.ParsedTV) {},
		OnAddEp: func(ep types.ParsedEpisode) {},
	}
}

func (p *EpisodeFileProcessor) Run() error {
	data := p.Episode
	store := p.Store
	userID := p.UserID
	// driveID := p.DriveID // Unused

	// Check if media source exists
	existingSource, err := store.ParsedMediaSource().FindFirst(types.ParsedMediaSourceQuery{
		FileID: data.Episode.FileID,
		UserID: userID,
	})
	if err != nil {
		return err
	}

	if existingSource == nil {
		// New episode
		p.OnPrint(fmt.Sprintf("New episode found: %s", data.Episode.FileName))

		// 1. Find or Create TV
		tv, err := p.findOrCreateTV(data.TV.Name, data.TV.OriginalName)
		if err != nil {
			return err
		}

		// 2. Find or Create Season
		season, err := p.findOrCreateSeason(tv.ID, data.Season.SeasonText)
		if err != nil {
			return err
		}

		// 3. Create Episode
		ep, err := p.createEpisode(tv.ID, season.ID, data.Episode)
		if err != nil {
			return err
		}

		// 4. Create Media Source
		err = p.createMediaSource(ep.ID, data.Episode)
		if err != nil {
			return err
		}

		p.OnAddEp(*ep)
	} else {
		// Existing source, maybe update?
		// Check for changes (simplified)
		p.OnPrint(fmt.Sprintf("Existing episode: %s", data.Episode.FileName))
	}

	return nil
}

func (p *EpisodeFileProcessor) findOrCreateTV(name, originalName string) (*types.ParsedTV, error) {
	// Find
	tv, err := p.Store.ParsedTV().FindFirst(types.ParsedTVQuery{
		Name:   name,
		UserID: p.UserID,
	})
	if err != nil {
		return nil, err
	}
	if tv != nil {
		return tv, nil
	}

	// Create
	newTV := types.ParsedTV{
		UserID:       p.UserID,
		Name:         name,
		OriginalName: originalName,
	}
	created, err := p.Store.ParsedTV().Create(newTV)
	if err != nil {
		return nil, err
	}
	p.OnAddTV(*created)
	return created, nil
}

func (p *EpisodeFileProcessor) findOrCreateSeason(tvID, seasonText string) (*types.ParsedSeason, error) {
	season, err := p.Store.ParsedSeason().FindFirst(types.ParsedSeasonQuery{
		ParsedTVID: tvID,
		SeasonText: seasonText,
		UserID:     p.UserID,
	})
	if err != nil {
		return nil, err
	}
	if season != nil {
		return season, nil
	}

	newSeason := types.ParsedSeason{
		UserID:     p.UserID,
		ParsedTVID: tvID,
		SeasonText: seasonText,
	}
	return p.Store.ParsedSeason().Create(newSeason)
}

func (p *EpisodeFileProcessor) createEpisode(tvID, seasonID string, epData struct {
	FileID       string
	FileName     string
	ParentPaths  string
	ParentIDs    string
	ParentFileID string
	SeasonText   string
	EpisodeText  string
	Year         string
	Size         int64
	MD5          string
}) (*types.ParsedEpisode, error) {
	newEp := types.ParsedEpisode{
		UserID:         p.UserID,
		ParsedTVID:     tvID,
		ParsedSeasonID: seasonID,
		EpisodeText:    epData.EpisodeText,
	}
	return p.Store.ParsedEpisode().Create(newEp)
}

func (p *EpisodeFileProcessor) createMediaSource(parsedID string, epData struct {
	FileID       string
	FileName     string
	ParentPaths  string
	ParentIDs    string
	ParentFileID string
	SeasonText   string
	EpisodeText  string
	Year         string
	Size         int64
	MD5          string
}) error {
	source := types.ParsedMediaSource{
		UserID:      p.UserID,
		DriveID:     p.DriveID,
		FileID:      epData.FileID,
		FileName:    epData.FileName,
		ParentPaths: epData.ParentPaths,
		Size:        epData.Size,
		MD5:         epData.MD5,
		ParsedID:    parsedID,
		Type:        1, // TV
	}
	_, err := p.Store.ParsedMediaSource().Create(source)
	return err
}
