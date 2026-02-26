package service

import (
	"context"
	"encoding/json"
	"errors"
	"strconv"
	"strings"

	"github.com/family-flix/api/internal/model"
	"github.com/family-flix/api/internal/repository"
	"github.com/family-flix/api/pkg/media_profile/javbus"
	"github.com/family-flix/api/pkg/media_profile/tmdb"
	"github.com/family-flix/api/pkg/types"
	"gorm.io/gorm"
)

type MediaProfileService interface {
	List(ctx context.Context, name string, typeVal *int, nextMarker string, pageSize int, page int) ([]model.MediaProfile, int64, string, error)
	GetProfile(ctx context.Context, id string) (*model.MediaProfile, error)
	UpdateName(ctx context.Context, id string, name string) error
	Delete(ctx context.Context, id string) error

	SearchTmdb(ctx context.Context, keyword string, typeVal int, page int) (interface{}, error)
	SearchJavbus(ctx context.Context, keyword string, page int) (*tmdb.MovieSearchResult, error)

	Refresh(ctx context.Context, id string) error
	InitSeries(ctx context.Context, id string) (*model.MediaSeriesProfile, error)
	InitSeason(ctx context.Context, id string, seasonNumber int) error
	UpdateFields(ctx context.Context, id string, updates map[string]interface{}) error
	GetSeriesProfile(ctx context.Context, id string) (*model.MediaSeriesProfile, error)
}

type mediaProfileService struct {
	repo repository.MediaProfileRepository
}

func NewMediaProfileService(repo repository.MediaProfileRepository) MediaProfileService {
	return &mediaProfileService{repo: repo}
}

func (s *mediaProfileService) List(ctx context.Context, name string, typeVal *int, nextMarker string, pageSize int, page int) ([]model.MediaProfile, int64, string, error) {
	return s.repo.List(ctx, name, typeVal, nextMarker, pageSize, page)
}

func (s *mediaProfileService) GetProfile(ctx context.Context, id string) (*model.MediaProfile, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *mediaProfileService) UpdateName(ctx context.Context, id string, name string) error {
	p, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	p.Name = name
	return s.repo.Update(ctx, p)
}

func (s *mediaProfileService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

func (s *mediaProfileService) SearchTmdb(ctx context.Context, keyword string, typeVal int, page int) (interface{}, error) {
	client := tmdb.NewClient()
	if typeVal == 2 {
		return client.SearchMovie(keyword, page)
	}
	return client.SearchTV(keyword, page)
}

func (s *mediaProfileService) SearchJavbus(ctx context.Context, keyword string, page int) (*tmdb.MovieSearchResult, error) {
	client := javbus.NewJavBusClient("")
	resp, err := client.Search(keyword, page)
	if err != nil {
		return nil, err
	}

	list := make([]types.MovieProfile, 0)
	if len(resp.Data) > 0 {
		for _, m := range resp.Data {
			// Save if not exists
			code := m.Code
			_, err := s.repo.GetByJavCode(ctx, code)
			if err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					profile := &model.MediaProfile{
						ID:         rid(),
						Type:       3,
						Name:       m.Title,
						PosterPath: &m.Cover,
						JavCode:    &code,
					}
					if err := s.repo.Create(ctx, profile); err == nil {
						sp := &model.MediaSourceProfile{
							ID:             rid(),
							Type:           3,
							Name:           m.Code,
							MediaProfileID: profile.ID,
						}
						s.repo.CreateSourceProfile(ctx, sp)
					}
				}
			}
			list = append(list, types.MovieProfile{
				ID:         m.Code,
				Name:       m.Title,
				PosterPath: m.Cover,
				AirDate:    m.AirDate,
				Type:       "av",
				Source:     "javbus",
			})
		}
	}

	return &tmdb.MovieSearchResult{
		Total: len(list),
		Page:  page,
		List:  list,
	}, nil
}

func (s *mediaProfileService) Refresh(ctx context.Context, id string) error {
	p, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	if p.Type == 3 {
		if p.JavCode == nil {
			return errors.New("没有关联的 JavCode")
		}
		jc := javbus.NewJavBusClient("")
		detail, err := jc.GetMovieDetail(*p.JavCode)
		if err != nil {
			return err
		}
		tips, _ := json.Marshal(map[string]interface{}{"director": detail.Director, "studio": detail.Studio, "label": detail.Label, "length": detail.Length})
		tipsStr := string(tips)

		p.Name = detail.Title
		p.PosterPath = &detail.Cover
		p.BackdropPath = &detail.Backdrop
		p.AirDate = &detail.ReleaseDate
		p.Tips = &tipsStr

		if err := s.repo.Update(ctx, p); err != nil {
			return err
		}

		// genres
		for _, g := range detail.Genres {
			genre, err := s.repo.FindGenreByText(ctx, g)
			if err != nil {
				genre = &model.MediaGenre{Text: g}
				s.repo.CreateGenre(ctx, genre)
			}
			s.repo.AddGenreToProfile(ctx, strconv.Itoa(genre.ID), p.ID)
		}
		// actors
		if detail.Director != "" {
			s.repo.SavePerson(ctx, p.ID, detail.Director, nil, "Directing", 0, nil)
		}
		for i, actor := range detail.Actors {
			var avatar *string
			if actor.Avatar != "" {
				avatar = &actor.Avatar
			}
			s.repo.SavePerson(ctx, p.ID, actor.Name, nil, "Acting", i, avatar)
		}
	} else {
		if p.TMDBID == nil {
			return errors.New("没有关联的 TMDB ID")
		}
		client := tmdb.NewClient()
		var tmdbID int
		if p.Type == 1 && strings.Contains(*p.TMDBID, "/") {
			parts := strings.Split(*p.TMDBID, "/")
			tmdbID, _ = strconv.Atoi(parts[0])
		} else {
			tmdbID, _ = strconv.Atoi(*p.TMDBID)
		}

		if p.Type == 2 {
			detail, err := client.FetchMovieProfile(tmdbID)
			if err != nil {
				return err
			}
			p.Name = detail.Name
			p.OriginalName = &detail.OriginalName
			p.Overview = &detail.Overview
			p.PosterPath = &detail.PosterPath
			p.BackdropPath = &detail.BackdropPath
			p.AirDate = &detail.AirDate

			if err := s.repo.Update(ctx, p); err != nil {
				return err
			}
		} else if p.Type == 1 {
			// TV
			detail, err := client.FetchTVProfile(tmdbID)
			if err != nil {
				return err
			}
			p.Name = detail.Name
			p.OriginalName = &detail.OriginalName
			p.Overview = &detail.Overview
			p.PosterPath = &detail.PosterPath
			p.BackdropPath = &detail.BackdropPath
			p.AirDate = &detail.FirstAirDate

			if err := s.repo.Update(ctx, p); err != nil {
				return err
			}

			// Fetch and save persons for season
			seasonNum := p.Order
			persons, err := client.FetchPersonsOfSeason(tmdbID, seasonNum)
			if err == nil {
				for _, pItem := range persons {
					tmdbIDStr := strconv.Itoa(pItem.ID)
					var pp *string
					if pItem.ProfilePath != "" {
						pp = &pItem.ProfilePath
					}
					s.repo.SavePerson(ctx, p.ID, pItem.Name, &tmdbIDStr, pItem.KnownForDepartment, pItem.Order, pp)
				}
			}
		}
	}
	return nil
}

func (s *mediaProfileService) InitSeries(ctx context.Context, id string) (*model.MediaSeriesProfile, error) {
	p, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if p.TMDBID == nil {
		return nil, errors.New("没有关联的 TMDB ID")
	}
	if p.SeriesID != nil {
		// Return existing series
		// Need repo method to get series by ID, or just return basic info
		return &model.MediaSeriesProfile{ID: *p.SeriesID}, nil
	}
	client := tmdb.NewClient()
	tmdbID, _ := strconv.Atoi(*p.TMDBID)
	detail, err := client.FetchTVProfile(tmdbID)
	if err != nil {
		return nil, err
	}

	series, err := s.repo.GetSeriesByTMDBID(ctx, *p.TMDBID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			series = &model.MediaSeriesProfile{
				ID:           rid(),
				Name:         detail.Name,
				OriginalName: &detail.OriginalName,
				Overview:     &detail.Overview,
				PosterPath:   &detail.PosterPath,
				BackdropPath: &detail.BackdropPath,
				AirDate:      &detail.FirstAirDate,
				TMDBID:       p.TMDBID,
			}
			if err := s.repo.CreateSeries(ctx, series); err != nil {
				return nil, err
			}
		} else {
			return nil, err
		}
	}
	p.SeriesID = &series.ID
	if err := s.repo.Update(ctx, p); err != nil {
		return nil, err
	}
	return series, nil
}

func (s *mediaProfileService) InitSeason(ctx context.Context, id string, seasonNumber int) error {
	p, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if p.TMDBID == nil {
		return errors.New("没有关联的 TMDB ID")
	}

	// Check if source profiles exist
	existingProfiles, err := s.repo.GetSourceProfilesByMediaProfileID(ctx, id)
	if err != nil {
		return err
	}
	if len(existingProfiles) > 0 {
		return nil // Already initialized
	}

	tmdbID, _ := strconv.Atoi(*p.TMDBID)
	client := tmdb.NewClient()
	season, err := client.FetchSeasonProfile(tmdbID, seasonNumber)
	if err != nil {
		return err
	}

	for _, ep := range season.Episodes {
		sp := model.MediaSourceProfile{
			ID:             rid(),
			Type:           1, // Episode
			Name:           ep.Name,
			Overview:       &ep.Overview,
			AirDate:        &ep.AirDate,
			Order:          ep.EpisodeNumber,
			MediaProfileID: p.ID,
		}
		if err := s.repo.CreateSourceProfile(ctx, &sp); err != nil {
			return err
		}
	}

	// Update profile
	p.Name = season.Name
	p.Overview = &season.Overview
	p.PosterPath = &season.PosterPath
	p.AirDate = &season.AirDate

	return s.repo.Update(ctx, p)
}

func (s *mediaProfileService) UpdateFields(ctx context.Context, id string, updates map[string]interface{}) error {
	return s.repo.UpdateFields(ctx, id, updates)
}

func (s *mediaProfileService) GetSeriesProfile(ctx context.Context, id string) (*model.MediaSeriesProfile, error) {
	return s.repo.GetSeriesProfileByID(ctx, id)
}
