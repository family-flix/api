package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"sort"
	"strconv"

	"github.com/family-flix/api/internal/model"
	"github.com/family-flix/api/internal/repository"
	"github.com/family-flix/api/pkg/media_profile/javbus"
	"github.com/family-flix/api/pkg/media_profile/tmdb"
)

type MediaService interface {
	// Media related
	ListMedia(ctx context.Context, filter repository.MediaFilter) ([]model.Media, int64, string, error)
	GetMedia(ctx context.Context, id string, userID string) (*model.Media, error)
	DeleteMedia(ctx context.Context, id string, userID string) error
	ListInvalidMedia(ctx context.Context, filter repository.MediaFilter) ([]model.InvalidMedia, int64, string, error)

	// Media Profile related
	RefreshMediaProfile(ctx context.Context, mediaID string, userID string) (string, error)
	SetMediaProfile(ctx context.Context, mediaID string, tmdbID string, mediaType int, userID string) (string, error)

	// Media Source related
	ListMediaSources(ctx context.Context, mediaID string, userID string, nextMarker string, pageSize int) ([]model.MediaSource, int64, string, error)

	// Season/Movie/AV specialized lists
	ListSeasons(ctx context.Context, name string, nextMarker string, pageSize int, userID string) ([]model.Media, int64, string, error)
	GetSeasonProfile(ctx context.Context, seasonID string, userID string) (*model.Media, error)
	GetSeasonPartial(ctx context.Context, mediaID string, userID string) (*model.Media, error)
	ListMovies(ctx context.Context, name string, nextMarker string, pageSize int, userID string) ([]model.Media, int64, string, error)
	GetMovieProfile(ctx context.Context, movieID string, userID string) (*model.Media, error)
	ListAVs(ctx context.Context, name string, page int, pageSize int, nextMarker string, userID string) ([]model.Media, int64, string, error)
	GetAVProfile(ctx context.Context, avID string, userID string) (*model.Media, error)

	// Artist/Person
	ListArtists(ctx context.Context, name string, nextMarker string, pageSize int) ([]model.PersonProfile, int64, string, error)

	// Subtitle
	ListSubtitles(ctx context.Context, filter repository.SubtitleFilter) ([]model.SubtitleV2, int64, error)
	DeleteSubtitle(ctx context.Context, id string, userID string) error

	// Parsed Media
	ListParsedMedia(ctx context.Context, filter repository.ParsedMediaFilter) ([]model.ParsedMedia, int64, string, error)
	DeleteParsedMedia(ctx context.Context, id string, userID string) error
	SetParsedMediaProfile(ctx context.Context, parsedMediaID string, mediaProfileID string, mediaProfile *ParsedMediaProfilePayload, userID string) (string, error)
	SetParsedMediaProfileAfterCreate(ctx context.Context, parsedMediaID string, tmdbID string, mediaType int, userID string) (string, error)
	SetParsedMediaProfileByFileID(ctx context.Context, fileID string, tmdbID string, mediaType int, userID string) (string, error)

	// Parsed Media Source
	ListParsedMediaSources(ctx context.Context, filter repository.ParsedMediaSourceFilter) ([]model.ParsedMediaSource, int64, string, error)
	GetParsedSourcesForProfile(ctx context.Context, profileID string, userID string) ([]model.ParsedMediaSource, error)

	// SharedFile
	ListSharedFiles(ctx context.Context, userID string, name string, nextMarker string, pageSize int) ([]model.SharedFile, int64, string, error)
	GetSharedFileByURL(ctx context.Context, url string, userID string) (*model.SharedFile, error)
	ListSharedFilesInProgress(ctx context.Context, userID string, nextMarker string, pageSize int) ([]model.SharedFileInProgress, string, error)

	// TVLive
	ListTVLives(ctx context.Context, userID string, name string, nextMarker string, pageSize int) ([]model.TVLive, int64, string, error)
}

type ParsedMediaProfilePayload struct {
	ID   string `json:"id"`
	Type string `json:"type"`
	Name string `json:"name"`
}

type mediaService struct {
	repo repository.MediaRepository
}

func NewMediaService(repo repository.MediaRepository) MediaService {
	return &mediaService{repo: repo}
}

func (s *mediaService) ListMedia(ctx context.Context, filter repository.MediaFilter) ([]model.Media, int64, string, error) {
	// Add default preloads if not specified
	if len(filter.Preload) == 0 {
		filter.Preload = []string{"Profile", "MediaSources.Profile", "MediaSources.Files.Drive"}
	}
	return s.repo.List(ctx, filter)
}

func (s *mediaService) GetMedia(ctx context.Context, id string, userID string) (*model.Media, error) {
	return s.repo.Get(ctx, id, userID, "Profile", "MediaSources.Profile", "MediaSources.Files.Drive")
}

func (s *mediaService) DeleteMedia(ctx context.Context, id string, userID string) error {
	return s.repo.Delete(ctx, id, userID)
}

func (s *mediaService) ListInvalidMedia(ctx context.Context, filter repository.MediaFilter) ([]model.InvalidMedia, int64, string, error) {
	return s.repo.GetInvalidList(ctx, filter)
}

func (s *mediaService) RefreshMediaProfile(ctx context.Context, mediaID string, userID string) (string, error) {
	m, err := s.repo.Get(ctx, mediaID, userID, "Profile")
	if err != nil {
		return "", err
	}

	if m.Type == 3 {
		code := m.Text
		if code == "" && m.Profile != nil && m.Profile.JavCode != nil {
			code = *m.Profile.JavCode
		}
		if code == "" {
			return "", fmt.Errorf("缺少 jav_code")
		}

		jc := javbus.NewJavBusClient("")
		detail, err := jc.GetMovieDetail(code)
		if err != nil {
			return "", err
		}

		var p *model.MediaProfile
		p, err = s.repo.GetProfileByJavCode(ctx, code)
		if err != nil { // Not found, create
			tips, _ := json.Marshal(map[string]interface{}{"director": detail.Director, "studio": detail.Studio, "label": detail.Label, "length": detail.Length})
			tipsStr := string(tips)
			p = &model.MediaProfile{
				ID:           rid(),
				Type:         3,
				Name:         detail.Title,
				PosterPath:   &detail.Cover,
				BackdropPath: &detail.Backdrop,
				AirDate:      &detail.ReleaseDate,
				JavCode:      &code,
				Tips:         &tipsStr,
			}
			if err := s.repo.CreateProfile(ctx, p); err != nil {
				return "", err
			}
			sp := &model.MediaSourceProfile{
				ID:             rid(),
				Type:           3,
				Name:           code,
				MediaProfileID: p.ID,
			}
			s.repo.CreateSourceProfile(ctx, sp)
		} else { // Found, update
			tips, _ := json.Marshal(map[string]interface{}{"director": detail.Director, "studio": detail.Studio, "label": detail.Label, "length": detail.Length})
			tipsStr := string(tips)
			p.Name = detail.Title
			p.PosterPath = &detail.Cover
			p.BackdropPath = &detail.Backdrop
			p.AirDate = &detail.ReleaseDate
			p.Tips = &tipsStr
			s.repo.UpdateProfile(ctx, p)
		}

		// Update genres
		for _, g := range detail.Genres {
			genre, err := s.repo.GetGenreByText(ctx, g)
			if err != nil {
				genre = &model.MediaGenre{Text: g}
				s.repo.CreateGenre(ctx, genre)
			}
			s.repo.AddGenreToProfile(ctx, genre.ID, p.ID)
		}

		// Update persons
		if detail.Director != "" {
			s.savePerson(ctx, p.ID, detail.Director, nil, "Directing", 0, nil)
		}
		for i, actor := range detail.Actors {
			var avatar *string
			if actor.Avatar != "" {
				avatar = &actor.Avatar
			}
			s.savePerson(ctx, p.ID, actor.Name, nil, "Acting", i, avatar)
		}

		// Link Media to Profile
		if m.ProfileID != p.ID {
			m.ProfileID = p.ID
			m.Text = code
			s.repo.Update(ctx, m)
		} else {
			m.Text = code
			s.repo.Update(ctx, m)
		}

		return p.ID, nil
	}
	return "", fmt.Errorf("unsupported media type for refresh: %d", m.Type)
}

func (s *mediaService) SetMediaProfile(ctx context.Context, mediaID string, tmdbID string, mediaType int, userID string) (string, error) {
	m, err := s.repo.Get(ctx, mediaID, userID)
	if err != nil {
		return "", err
	}

	client := tmdb.NewClient()
	tmdbIDInt, _ := strconv.Atoi(tmdbID)

	var p *model.MediaProfile
	p, err = s.repo.GetProfileByTMDBID(ctx, tmdbID)

	if err != nil {
		// Profile not found, fetch from TMDB
		if mediaType == 2 {
			detail, err := client.FetchMovieProfile(tmdbIDInt)
			if err != nil {
				return "", err
			}
			p = &model.MediaProfile{
				ID:           rid(),
				Type:         2,
				Name:         detail.Name,
				OriginalName: &detail.OriginalName,
				Overview:     &detail.Overview,
				PosterPath:   &detail.PosterPath,
				BackdropPath: &detail.BackdropPath,
				AirDate:      &detail.AirDate,
				TMDBID:       &tmdbID,
			}
			s.repo.CreateProfile(ctx, p)
		} else {
			detail, err := client.FetchTVProfile(tmdbIDInt)
			if err != nil {
				return "", err
			}
			p = &model.MediaProfile{
				ID:           rid(),
				Type:         1,
				Name:         detail.Name,
				OriginalName: &detail.OriginalName,
				Overview:     &detail.Overview,
				PosterPath:   &detail.PosterPath,
				BackdropPath: &detail.BackdropPath,
				AirDate:      &detail.FirstAirDate,
				TMDBID:       &tmdbID,
			}
			s.repo.CreateProfile(ctx, p)
		}
	}

	m.ProfileID = p.ID
	if err := s.repo.Update(ctx, m); err != nil {
		return "", err
	}
	return p.ID, nil
}

func (s *mediaService) ListMediaSources(ctx context.Context, mediaID string, userID string, nextMarker string, pageSize int) ([]model.MediaSource, int64, string, error) {
	return s.repo.GetSourceList(ctx, mediaID, userID, nextMarker, pageSize)
}

func (s *mediaService) ListSeasons(ctx context.Context, name string, nextMarker string, pageSize int, userID string) ([]model.Media, int64, string, error) {
	// Complex logic from handler: if name is present, find profile IDs first.
	// But my repo.List supports name filtering via join.
	filter := repository.MediaFilter{
		UserID:     userID,
		Name:       name,
		NextMarker: nextMarker,
		PageSize:   pageSize,
		Preload:    []string{"Profile", "Profile.Genres", "Profile.OriginCountries", "MediaSources", "ResourceSyncTasks"},
		PreloadConditions: map[string][]interface{}{
			"ResourceSyncTasks": {"invalid = 0 AND status = 1"},
		},
	}
	t := 1
	filter.Type = &t

	medias, total, next, err := s.repo.List(ctx, filter)
	if err != nil {
		return nil, 0, "", err
	}

	// Sort by profile air_date DESC
	sort.Slice(medias, func(i, j int) bool {
		ai, aj := "", ""
		if medias[i].Profile != nil && medias[i].Profile.AirDate != nil {
			ai = *medias[i].Profile.AirDate
		}
		if medias[j].Profile != nil && medias[j].Profile.AirDate != nil {
			aj = *medias[j].Profile.AirDate
		}
		return ai > aj
	})

	return medias, total, next, nil
}

func (s *mediaService) GetSeasonProfile(ctx context.Context, seasonID string, userID string) (*model.Media, error) {
	return s.repo.Get(ctx, seasonID, userID,
		"Profile.Series", "Profile.Genres", "Profile.OriginCountries",
		"MediaSources.Profile", "MediaSources.Files.Drive")
}

func (s *mediaService) GetSeasonPartial(ctx context.Context, mediaID string, userID string) (*model.Media, error) {
	return s.repo.Get(ctx, mediaID, userID, "Profile.Genres", "Profile.OriginCountries", "MediaSources", "ResourceSyncTasks")
}

func (s *mediaService) ListMovies(ctx context.Context, name string, nextMarker string, pageSize int, userID string) ([]model.Media, int64, string, error) {
	t := 2
	filter := repository.MediaFilter{
		UserID:     userID,
		Type:       &t,
		Name:       name,
		NextMarker: nextMarker,
		PageSize:   pageSize,
		Preload:    []string{"Profile.Genres", "Profile.OriginCountries", "MediaSources"},
	}
	return s.repo.List(ctx, filter)
}

func (s *mediaService) GetMovieProfile(ctx context.Context, movieID string, userID string) (*model.Media, error) {
	return s.repo.Get(ctx, movieID, userID, "Profile.Genres", "Profile.OriginCountries", "MediaSources.Profile", "MediaSources.Files.Drive")
}

func (s *mediaService) ListAVs(ctx context.Context, name string, page int, pageSize int, nextMarker string, userID string) ([]model.Media, int64, string, error) {
	t := 3
	offset := 0
	if page > 0 {
		offset = (page - 1) * pageSize
	}
	filter := repository.MediaFilter{
		UserID:     userID,
		Type:       &t,
		Name:       name,
		NextMarker: nextMarker,
		PageSize:   pageSize,
		Offset:     offset,
		Preload:    []string{"Profile", "Profile.Persons.Profile", "MediaSources.Files.Drive"},
	}
	return s.repo.List(ctx, filter)
}

func (s *mediaService) GetAVProfile(ctx context.Context, avID string, userID string) (*model.Media, error) {
	return s.repo.Get(ctx, avID, userID, "Profile.Genres", "Profile.OriginCountries", "MediaSources.Profile", "MediaSources.Files.Drive")
}

func (s *mediaService) GetParsedSourcesForProfile(ctx context.Context, profileID string, userID string) ([]model.ParsedMediaSource, error) {
	return s.repo.GetParsedSourcesForProfile(ctx, profileID, userID)
}

func (s *mediaService) ListArtists(ctx context.Context, name string, nextMarker string, pageSize int) ([]model.PersonProfile, int64, string, error) {
	filter := repository.PersonProfileFilter{
		Name:       name,
		NextMarker: nextMarker,
		PageSize:   pageSize,
	}
	return s.repo.ListPersonProfiles(ctx, filter)
}

func (s *mediaService) ListSubtitles(ctx context.Context, filter repository.SubtitleFilter) ([]model.SubtitleV2, int64, error) {
	return s.repo.ListSubtitles(ctx, filter)
}

func (s *mediaService) DeleteSubtitle(ctx context.Context, id string, userID string) error {
	return s.repo.DeleteSubtitle(ctx, id, userID)
}

func (s *mediaService) ListParsedMedia(ctx context.Context, filter repository.ParsedMediaFilter) ([]model.ParsedMedia, int64, string, error) {
	return s.repo.ListParsedMedia(ctx, filter)
}

func (s *mediaService) DeleteParsedMedia(ctx context.Context, id string, userID string) error {
	// Also delete parsed media sources associated with it?
	// Handler does: c.DB().Where("parsed_media_id = ?", pm.ID).Delete(&model.ParsedMediaSource{})
	pm, err := s.repo.GetParsedMedia(ctx, id, userID)
	if err != nil {
		return err
	}
	if err := s.repo.DeleteParsedMediaSourceByParsedMediaID(ctx, pm.ID); err != nil {
		return err
	}
	return s.repo.DeleteParsedMedia(ctx, id, userID)
}

func (s *mediaService) SetParsedMediaProfile(ctx context.Context, parsedMediaID string, mediaProfileID string, mediaProfile *ParsedMediaProfilePayload, userID string) (string, error) {
	pm, err := s.repo.GetParsedMedia(ctx, parsedMediaID, userID)
	if err != nil {
		return "", err
	}

	var pID string

	if mediaProfile != nil && mediaProfile.Type == "av" {
		code := mediaProfile.ID
		jc := javbus.NewJavBusClient("")
		detail, err := jc.GetMovieDetail(code)
		if err != nil {
			return "", err
		}

		p, err := s.repo.GetProfileByJavCode(ctx, code)
		if err != nil {
			// Create
			p = &model.MediaProfile{
				ID:           rid(),
				Type:         3,
				Name:         detail.Title,
				PosterPath:   &detail.Cover,
				BackdropPath: &detail.Backdrop,
				AirDate:      &detail.ReleaseDate,
				JavCode:      &code,
			}
			s.repo.CreateProfile(ctx, p)
		} else {
			// Update
			p.Name = detail.Title
			p.PosterPath = &detail.Cover
			p.BackdropPath = &detail.Backdrop
			p.AirDate = &detail.ReleaseDate
			s.repo.UpdateProfile(ctx, p)
		}
		pID = p.ID

		// Create Media if not exists (specific logic from handler)
		// handler: if err := c.DB().Where("profile_id = ? AND user_id = ?", p.ID, u.ID).First(&media).Error; err != nil

		medias, _, _, _ := s.repo.List(ctx, repository.MediaFilter{UserID: userID, ProfileID: p.ID})
		if len(medias) == 0 {
			media := &model.Media{ID: rid(), Type: 3, Text: *p.JavCode, ProfileID: p.ID, UserID: userID}
			s.repo.Create(ctx, media)
		}

	} else {
		profileID := mediaProfileID
		if mediaProfile != nil {
			profileID = mediaProfile.ID
		}
		if profileID == "" {
			return "", fmt.Errorf("参数错误")
		}
		p, err := s.repo.GetProfile(ctx, profileID)
		if err != nil {
			return "", fmt.Errorf("没有匹配的详情")
		}
		pID = p.ID
	}

	pm.MediaProfileID = &pID
	if err := s.repo.UpdateParsedMedia(ctx, pm); err != nil {
		return "", err
	}

	return pID, nil
}

func (s *mediaService) SetParsedMediaProfileAfterCreate(ctx context.Context, parsedMediaID string, tmdbID string, mediaType int, userID string) (string, error) {
	pm, err := s.repo.GetParsedMedia(ctx, parsedMediaID, userID)
	if err != nil {
		return "", err
	}

	var p *model.MediaProfile
	if mediaType == 3 {
		p, err = s.repo.GetProfileByJavCode(ctx, tmdbID)
		if err == nil {
			// Found
			pm.MediaProfileID = &p.ID
			s.repo.UpdateParsedMedia(ctx, pm)
			return p.ID, nil
		}
		// Not found, fetch
		jc := javbus.NewJavBusClient("")
		detail, err := jc.GetMovieDetail(tmdbID)
		if err != nil {
			return "", err
		}
		code := detail.Code
		p = &model.MediaProfile{
			ID: rid(), Type: 3, Name: detail.Title, PosterPath: &detail.Cover,
			BackdropPath: &detail.Backdrop, AirDate: &detail.ReleaseDate, JavCode: &code,
		}
	} else {
		p, err = s.repo.GetProfileByTMDBID(ctx, tmdbID)
		if err == nil {
			pm.MediaProfileID = &p.ID
			s.repo.UpdateParsedMedia(ctx, pm)
			return p.ID, nil
		}
		client := tmdb.NewClient()
		tmdbIDInt, _ := strconv.Atoi(tmdbID)
		if mediaType == 2 {
			detail, err := client.FetchMovieProfile(tmdbIDInt)
			if err != nil {
				return "", err
			}
			p = &model.MediaProfile{
				ID: rid(), Type: 2, Name: detail.Name, OriginalName: &detail.OriginalName,
				Overview: &detail.Overview, PosterPath: &detail.PosterPath, BackdropPath: &detail.BackdropPath,
				AirDate: &detail.AirDate, TMDBID: &tmdbID,
			}
		} else {
			detail, err := client.FetchTVProfile(tmdbIDInt)
			if err != nil {
				return "", err
			}
			p = &model.MediaProfile{
				ID: rid(), Type: 1, Name: detail.Name, OriginalName: &detail.OriginalName,
				Overview: &detail.Overview, PosterPath: &detail.PosterPath, BackdropPath: &detail.BackdropPath,
				AirDate: &detail.FirstAirDate, TMDBID: &tmdbID,
			}
		}
	}

	if err := s.repo.CreateProfile(ctx, p); err != nil {
		return "", err
	}

	pm.MediaProfileID = &p.ID
	s.repo.UpdateParsedMedia(ctx, pm)
	return p.ID, nil
}

func (s *mediaService) SetParsedMediaProfileByFileID(ctx context.Context, fileID string, tmdbID string, mediaType int, userID string) (string, error) {
	sources, _, _, err := s.repo.ListParsedMediaSource(ctx, repository.ParsedMediaSourceFilter{
		FileID: fileID,
		UserID: userID,
	})
	if err != nil {
		return "", err
	}
	if len(sources) == 0 {
		return "", fmt.Errorf("ParsedMediaSource not found for file_id: %s", fileID)
	}
	pmSource := sources[0]
	if pmSource.ParsedMediaID == nil {
		return "", fmt.Errorf("ParsedMediaID is nil")
	}
	return s.SetParsedMediaProfileAfterCreate(ctx, *pmSource.ParsedMediaID, tmdbID, mediaType, userID)
}

func (s *mediaService) savePerson(ctx context.Context, mediaProfileID string, name string, tmdbID *string, dept string, order int, profilePath *string) error {
	if name == "" {
		return nil
	}
	// Try to find by TMDB ID first
	var person *model.PersonProfile
	var err error
	found := false
	if tmdbID != nil {
		person, err = s.repo.GetPersonProfileByTMDBID(ctx, *tmdbID)
		if err == nil {
			found = true
		}
	}
	// Fallback to Name if not found
	if !found {
		person, err = s.repo.GetPersonProfileByName(ctx, name)
		if err == nil {
			found = true
			if tmdbID != nil && person.TMDBID == nil {
				person.TMDBID = tmdbID
				s.repo.UpdatePersonProfile(ctx, person)
			}
		}
	}

	if !found {
		person = &model.PersonProfile{
			ID:                 rid(),
			Name:               name,
			TMDBID:             tmdbID,
			KnownForDepartment: &dept,
			ProfilePath:        profilePath,
		}
		if err := s.repo.CreatePersonProfile(ctx, person); err != nil {
			return err
		}
	}

	// Create PersonInMedia
	_, err = s.repo.GetPersonInMedia(ctx, person.ID, mediaProfileID, dept)
	if err != nil { // Not found
		pim := &model.PersonInMedia{
			ID:                 rid(),
			Name:               name,
			Order:              order,
			KnownForDepartment: &dept,
			ProfileID:          person.ID,
			MediaID:            mediaProfileID,
		}
		if err := s.repo.CreatePersonInMedia(ctx, pim); err != nil {
			return err
		}
	}
	return nil
}

func (s *mediaService) ListParsedMediaSources(ctx context.Context, filter repository.ParsedMediaSourceFilter) ([]model.ParsedMediaSource, int64, string, error) {
	return s.repo.ListParsedMediaSource(ctx, filter)
}

// Helper to generate ID
func rid() string {
	b := make([]byte, 8)
	rand.Read(b)
	return hex.EncodeToString(b)[:15]
}

func (s *mediaService) ListSharedFiles(ctx context.Context, userID string, name string, nextMarker string, pageSize int) ([]model.SharedFile, int64, string, error) {
	return s.repo.ListSharedFiles(ctx, userID, name, nextMarker, pageSize)
}

func (s *mediaService) GetSharedFileByURL(ctx context.Context, url string, userID string) (*model.SharedFile, error) {
	return s.repo.GetSharedFileByURL(ctx, url, userID)
}

func (s *mediaService) ListSharedFilesInProgress(ctx context.Context, userID string, nextMarker string, pageSize int) ([]model.SharedFileInProgress, string, error) {
	return s.repo.ListSharedFilesInProgress(ctx, userID, nextMarker, pageSize)
}

func (s *mediaService) ListTVLives(ctx context.Context, userID string, name string, nextMarker string, pageSize int) ([]model.TVLive, int64, string, error) {
	return s.repo.ListTVLives(ctx, userID, name, nextMarker, pageSize)
}
