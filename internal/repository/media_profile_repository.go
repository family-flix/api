package repository

import (
	"context"

	"github.com/family-flix/api/internal/model"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type MediaProfileRepository interface {
	List(ctx context.Context, name string, typeVal *int, nextMarker string, pageSize int, page int) ([]model.MediaProfile, int64, string, error)
	GetByID(ctx context.Context, id string) (*model.MediaProfile, error)
	Create(ctx context.Context, profile *model.MediaProfile) error
	Update(ctx context.Context, profile *model.MediaProfile) error
	Delete(ctx context.Context, id string) error
	GetByTMDBID(ctx context.Context, tmdbID string) (*model.MediaProfile, error)
	GetByJavCode(ctx context.Context, javCode string) (*model.MediaProfile, error)
	CreateSourceProfile(ctx context.Context, sp *model.MediaSourceProfile) error
	CreateGenre(ctx context.Context, genre *model.MediaGenre) error
	FindGenreByText(ctx context.Context, text string) (*model.MediaGenre, error)
	AddGenreToProfile(ctx context.Context, genreID string, profileID string) error
	SavePerson(ctx context.Context, mediaID string, name string, tmdbID *string, dept string, order int, profilePath *string) error
	GetSeriesByTMDBID(ctx context.Context, tmdbID string) (*model.MediaSeriesProfile, error)
	CreateSeries(ctx context.Context, series *model.MediaSeriesProfile) error
	GetSourceProfilesByMediaProfileID(ctx context.Context, mediaProfileID string) ([]model.MediaSourceProfile, error)
	BatchUpdateSourceProfiles(ctx context.Context, profiles []model.MediaSourceProfile) error
	UpdateFields(ctx context.Context, id string, updates map[string]interface{}) error
	GetSeriesProfileByID(ctx context.Context, id string) (*model.MediaSeriesProfile, error)
}

type mediaProfileRepository struct {
	db *gorm.DB
}

func NewMediaProfileRepository(db *gorm.DB) MediaProfileRepository {
	return &mediaProfileRepository{db: db}
}

func rid() string {
	return uuid.NewString()
}

func (r *mediaProfileRepository) List(ctx context.Context, name string, typeVal *int, nextMarker string, pageSize int, page int) ([]model.MediaProfile, int64, string, error) {
	db := r.db.WithContext(ctx)
	if name != "" {
		db = db.Where("name LIKE ? OR original_name LIKE ?", "%"+name+"%", "%"+name+"%")
	}
	if typeVal != nil {
		db = db.Where("type = ?", *typeVal)
	}
	var total int64
	db.Model(&model.MediaProfile{}).Count(&total)
	if page > 0 {
		db = db.Offset((page - 1) * pageSize)
	} else if nextMarker != "" {
		db = db.Where("id < ?", nextMarker)
	}
	var profiles []model.MediaProfile
	if err := db.Preload("Genres").Preload("OriginCountries").Preload("Persons").Preload("Persons.Profile").Order("created DESC").Limit(pageSize).Find(&profiles).Error; err != nil {
		return nil, 0, "", err
	}
	var next string
	if len(profiles) > 0 {
		next = profiles[len(profiles)-1].ID
	}
	return profiles, total, next, nil
}

func (r *mediaProfileRepository) GetByID(ctx context.Context, id string) (*model.MediaProfile, error) {
	var p model.MediaProfile
	if err := r.db.WithContext(ctx).Preload("Genres").Preload("OriginCountries").Preload("Series").Preload("SourceProfiles", func(db *gorm.DB) *gorm.DB {
		return db.Order("\"order\" ASC")
	}).Preload("Persons").Preload("Persons.Profile").
		Where("id = ?", id).First(&p).Error; err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *mediaProfileRepository) Create(ctx context.Context, profile *model.MediaProfile) error {
	return r.db.WithContext(ctx).Create(profile).Error
}

func (r *mediaProfileRepository) Update(ctx context.Context, profile *model.MediaProfile) error {
	return r.db.WithContext(ctx).Save(profile).Error
}

func (r *mediaProfileRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&model.MediaProfile{}).Error
}

func (r *mediaProfileRepository) GetByTMDBID(ctx context.Context, tmdbID string) (*model.MediaProfile, error) {
	var p model.MediaProfile
	if err := r.db.WithContext(ctx).Where("tmdb_id = ?", tmdbID).First(&p).Error; err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *mediaProfileRepository) GetByJavCode(ctx context.Context, javCode string) (*model.MediaProfile, error) {
	var p model.MediaProfile
	if err := r.db.WithContext(ctx).Where("jav_code = ?", javCode).First(&p).Error; err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *mediaProfileRepository) CreateSourceProfile(ctx context.Context, sp *model.MediaSourceProfile) error {
	return r.db.WithContext(ctx).Create(sp).Error
}

func (r *mediaProfileRepository) CreateGenre(ctx context.Context, genre *model.MediaGenre) error {
	return r.db.WithContext(ctx).Create(genre).Error
}

func (r *mediaProfileRepository) FindGenreByText(ctx context.Context, text string) (*model.MediaGenre, error) {
	var genre model.MediaGenre
	if err := r.db.WithContext(ctx).Where("text = ?", text).First(&genre).Error; err != nil {
		return nil, err
	}
	return &genre, nil
}

func (r *mediaProfileRepository) AddGenreToProfile(ctx context.Context, genreID string, profileID string) error {
	return r.db.WithContext(ctx).Exec(`INSERT OR IGNORE INTO "_MediaGenreToMediaProfile" ("A","B") VALUES (?,?)`, genreID, profileID).Error
}

func (r *mediaProfileRepository) SavePerson(ctx context.Context, mediaID string, name string, tmdbID *string, dept string, order int, profilePath *string) error {
	db := r.db.WithContext(ctx)
	if name == "" {
		return nil
	}
	// Try to find by TMDB ID first
	var person model.PersonProfile
	found := false
	if tmdbID != nil {
		if err := db.Where("tmdb_id = ?", *tmdbID).First(&person).Error; err == nil {
			found = true
		}
	}
	// Fallback to Name if not found
	if !found {
		if err := db.Where("name = ?", name).First(&person).Error; err == nil {
			found = true
			if tmdbID != nil && person.TMDBID == nil {
				person.TMDBID = tmdbID
				db.Save(&person)
			}
		}
	}

	if !found {
		person = model.PersonProfile{
			ID:                 rid(),
			Name:               name,
			TMDBID:             tmdbID,
			KnownForDepartment: &dept,
			ProfilePath:        profilePath,
		}
		if err := db.Create(&person).Error; err != nil {
			return err
		}
	}

	// Create PersonInMedia
	var pim model.PersonInMedia
	if err := db.Where("profile_id = ? AND media_id = ? AND known_for_department = ?", person.ID, mediaID, dept).First(&pim).Error; err != nil {
		pim = model.PersonInMedia{
			ID:                 rid(),
			Name:               name,
			Order:              order,
			KnownForDepartment: &dept,
			ProfileID:          person.ID,
			MediaID:            mediaID,
		}
		if err := db.Create(&pim).Error; err != nil {
			return err
		}
	}
	return nil
}

func (r *mediaProfileRepository) GetSeriesByTMDBID(ctx context.Context, tmdbID string) (*model.MediaSeriesProfile, error) {
	var series model.MediaSeriesProfile
	if err := r.db.WithContext(ctx).Where("tmdb_id = ?", tmdbID).First(&series).Error; err != nil {
		return nil, err
	}
	return &series, nil
}

func (r *mediaProfileRepository) CreateSeries(ctx context.Context, series *model.MediaSeriesProfile) error {
	return r.db.WithContext(ctx).Create(series).Error
}

func (r *mediaProfileRepository) GetSourceProfilesByMediaProfileID(ctx context.Context, mediaProfileID string) ([]model.MediaSourceProfile, error) {
	var profiles []model.MediaSourceProfile
	if err := r.db.WithContext(ctx).Where("media_profile_id = ?", mediaProfileID).Find(&profiles).Error; err != nil {
		return nil, err
	}
	return profiles, nil
}

func (r *mediaProfileRepository) BatchUpdateSourceProfiles(ctx context.Context, profiles []model.MediaSourceProfile) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, p := range profiles {
			if err := tx.Save(&p).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *mediaProfileRepository) UpdateFields(ctx context.Context, id string, updates map[string]interface{}) error {
	return r.db.WithContext(ctx).Model(&model.MediaProfile{}).Where("id = ?", id).Updates(updates).Error
}

func (r *mediaProfileRepository) GetSeriesProfileByID(ctx context.Context, id string) (*model.MediaSeriesProfile, error) {
	var s model.MediaSeriesProfile
	if err := r.db.WithContext(ctx).Preload("MediaProfiles").Where("id = ?", id).First(&s).Error; err != nil {
		return nil, err
	}
	return &s, nil
}
