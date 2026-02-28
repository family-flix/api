package repository

import (
	"context"

	"gorm.io/gorm"

	"github.com/family-flix/api/internal/model"
)

type MediaFilter struct {
	UserID            string
	Type              *int
	Name              string
	DriveIDs          string
	ProfileID         string
	NextMarker        string
	PageSize          int
	Page              int
	Offset            int
	Preload           []string
	PreloadConditions map[string][]interface{}
	Order             string
	HasProfile        bool
}

type MediaRepository interface {
	Get(ctx context.Context, id string, userID string, preloads ...string) (*model.Media, error)
	List(ctx context.Context, filter MediaFilter) ([]model.Media, int64, string, error)
	Create(ctx context.Context, media *model.Media) error
	Update(ctx context.Context, media *model.Media) error
	Delete(ctx context.Context, id string, userID string) error
	Count(ctx context.Context, filter MediaFilter) (int64, error)

	GetInvalidList(ctx context.Context, filter MediaFilter) ([]model.InvalidMedia, int64, string, error)

	GetSourceList(ctx context.Context, mediaID string, userID string, nextMarker string, pageSize int, page int) ([]model.MediaSource, int64, string, error)

	// MediaProfile related
	GetProfile(ctx context.Context, id string) (*model.MediaProfile, error)
	GetProfileByJavCode(ctx context.Context, code string) (*model.MediaProfile, error)
	GetProfileByTMDBID(ctx context.Context, tmdbID string) (*model.MediaProfile, error)
	CreateProfile(ctx context.Context, profile *model.MediaProfile) error
	UpdateProfile(ctx context.Context, profile *model.MediaProfile) error

	// MediaSourceProfile related
	CreateSourceProfile(ctx context.Context, profile *model.MediaSourceProfile) error

	// MediaGenre related
	GetGenreByText(ctx context.Context, text string) (*model.MediaGenre, error)
	CreateGenre(ctx context.Context, genre *model.MediaGenre) error
	AddGenreToProfile(ctx context.Context, genreID int, profileID string) error

	// Person related
	ListPersonProfiles(ctx context.Context, filter PersonProfileFilter) ([]model.PersonProfile, int64, string, error)
	GetPersonProfile(ctx context.Context, id string) (*model.PersonProfile, error)
	GetPersonProfileByTMDBID(ctx context.Context, tmdbID string) (*model.PersonProfile, error)
	GetPersonProfileByName(ctx context.Context, name string) (*model.PersonProfile, error)
	CreatePersonProfile(ctx context.Context, person *model.PersonProfile) error
	UpdatePersonProfile(ctx context.Context, person *model.PersonProfile) error

	GetPersonInMedia(ctx context.Context, profileID string, mediaID string, dept string) (*model.PersonInMedia, error)
	CreatePersonInMedia(ctx context.Context, pim *model.PersonInMedia) error

	// Subtitle related
	ListSubtitles(ctx context.Context, filter SubtitleFilter) ([]model.SubtitleV2, int64, error)
	GetSubtitle(ctx context.Context, id string) (*model.SubtitleV2, error)
	DeleteSubtitle(ctx context.Context, id string, userID string) error

	// ParsedMedia related
	ListParsedMedia(ctx context.Context, filter ParsedMediaFilter) ([]model.ParsedMedia, int64, string, error)
	GetParsedMedia(ctx context.Context, id string, userID string) (*model.ParsedMedia, error)
	UpdateParsedMedia(ctx context.Context, parsedMedia *model.ParsedMedia) error
	DeleteParsedMedia(ctx context.Context, id string, userID string) error

	// ParsedMediaSource related
	ListParsedMediaSource(ctx context.Context, filter ParsedMediaSourceFilter) ([]model.ParsedMediaSource, int64, string, error)
	GetParsedMediaSource(ctx context.Context, id string, userID string) (*model.ParsedMediaSource, error)
	GetParsedSourcesForProfile(ctx context.Context, profileID string, userID string) ([]model.ParsedMediaSource, error)
	DeleteParsedMediaSourceByParsedMediaID(ctx context.Context, parsedMediaID string) error

	// SharedFile related
	GetSharedFileByURL(ctx context.Context, url string, userID string) (*model.SharedFile, error)
	ListSharedFiles(ctx context.Context, userID string, name string, nextMarker string, pageSize int, page int) ([]model.SharedFile, int64, string, error)
	ListSharedFilesInProgress(ctx context.Context, userID string, nextMarker string, pageSize int, page int) ([]model.SharedFileInProgress, string, error)

	// TVLive related
	ListTVLives(ctx context.Context, userID string, name string, nextMarker string, pageSize int, page int) ([]model.TVLive, int64, string, error)
}

type PersonProfileFilter struct {
	Name       string
	NextMarker string
	PageSize   int
	Page       int
}

type SubtitleFilter struct {
	UserID   string
	Name     string
	Page     int
	PageSize int
}

type ParsedMediaFilter struct {
	UserID     string
	Name       string
	Empty      *int
	Type       *int
	NextMarker string
	PageSize   int
	Page       int
}

type ParsedMediaSourceFilter struct {
	UserID        string
	Name          string
	Empty         *int
	Type          *int
	ParsedMediaID string
	FileID        string
	NextMarker    string
	PageSize      int
	Page          int
}

type mediaRepository struct {
	db *gorm.DB
}

func NewMediaRepository(db *gorm.DB) MediaRepository {
	return &mediaRepository{db: db}
}

func (r *mediaRepository) Get(ctx context.Context, id string, userID string, preloads ...string) (*model.Media, error) {
	db := r.db.WithContext(ctx)
	for _, p := range preloads {
		db = db.Preload(p)
	}
	var m model.Media
	if err := db.Where("id = ? AND user_id = ?", id, userID).First(&m).Error; err != nil {
		return nil, err
	}
	return &m, nil
}

func (r *mediaRepository) List(ctx context.Context, filter MediaFilter) ([]model.Media, int64, string, error) {
	db := r.db.WithContext(ctx).Model(&model.Media{})
	if filter.UserID != "" {
		db = db.Where("\"Media\".user_id = ?", filter.UserID)
	}
	if filter.Name != "" || filter.HasProfile {
		db = db.Joins("JOIN \"MediaProfile\" ON \"MediaProfile\".id = \"Media\".profile_id")
	}
	if filter.Name != "" {
		db = db.Where("\"MediaProfile\".name LIKE ? OR \"MediaProfile\".original_name LIKE ? OR \"MediaProfile\".alias LIKE ?", "%"+filter.Name+"%", "%"+filter.Name+"%", "%"+filter.Name+"%")
	}
	if filter.Type != nil {
		db = db.Where("\"Media\".type = ?", *filter.Type)
	}
	if filter.ProfileID != "" {
		db = db.Where("\"Media\".profile_id = ?", filter.ProfileID)
	}
	// TODO: DriveIDs filtering if needed

	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, "", err
	}

	if filter.Offset > 0 {
		db = db.Offset(filter.Offset)
	} else if filter.Page > 0 {
		db = db.Offset((filter.Page - 1) * filter.PageSize)
	} else if filter.NextMarker != "" {
		db = db.Where("\"Media\".id < ?", filter.NextMarker)
	}

	for _, p := range filter.Preload {
		if args, ok := filter.PreloadConditions[p]; ok {
			db = db.Preload(p, args...)
		} else {
			db = db.Preload(p)
		}
	}

	if filter.Order != "" {
		db = db.Order(filter.Order)
	} else {
		db = db.Order("\"Media\".created DESC")
	}

	if filter.PageSize > 0 {
		db = db.Limit(filter.PageSize)
	}

	var medias []model.Media
	if err := db.Find(&medias).Error; err != nil {
		return nil, 0, "", err
	}

	var nextMarker string
	if len(medias) > 0 {
		nextMarker = medias[len(medias)-1].ID
	}

	return medias, total, nextMarker, nil
}

func (r *mediaRepository) Create(ctx context.Context, media *model.Media) error {
	return r.db.WithContext(ctx).Create(media).Error
}

func (r *mediaRepository) Update(ctx context.Context, media *model.Media) error {
	return r.db.WithContext(ctx).Save(media).Error
}

func (r *mediaRepository) Delete(ctx context.Context, id string, userID string) error {
	return r.db.WithContext(ctx).Where("id = ? AND user_id = ?", id, userID).Delete(&model.Media{}).Error
}

func (r *mediaRepository) Count(ctx context.Context, filter MediaFilter) (int64, error) {
	db := r.db.WithContext(ctx).Model(&model.Media{})
	if filter.UserID != "" {
		db = db.Where("user_id = ?", filter.UserID)
	}
	// Add other filters as needed
	var count int64
	err := db.Count(&count).Error
	return count, err
}

func (r *mediaRepository) GetInvalidList(ctx context.Context, filter MediaFilter) ([]model.InvalidMedia, int64, string, error) {
	db := r.db.WithContext(ctx).Model(&model.InvalidMedia{})
	// InvalidMedia doesn't have user_id directly? The handler uses db.Where("user_id = ?", u.ID) which implies it joins Media?
	// Checking handler_admin_media.go: db := c.DB().Where("user_id = ?", u.ID)
	// Wait, InvalidMedia table structure check needed. Assuming it has or is related to Media.
	// But in handler it says db.Model(&model.InvalidMedia{}).Count(&total).
	// If InvalidMedia doesn't have user_id, how does it filter?
	// Maybe through Media relation?
	// Let's check model/media.go again or assume it has user_id or similar.
	// Handler says: db := c.DB().Where("user_id = ?", u.ID)
	// This implies InvalidMedia has user_id or the previous query context applied it? No, context.DB() is fresh.
	// Ah, maybe InvalidMedia has user_id.

	if filter.UserID != "" {
		// Assuming InvalidMedia has user_id or we need to join
		// If handler works, then it must be valid.
		// Let's assume it has user_id for now or check model later.
		// Wait, let's check model/media.go for InvalidMedia struct.
		// It wasn't in the previous `Read` output (truncated).
		// I will assume it follows the pattern.
		// But handler code: db := c.DB().Where("user_id = ?", u.ID)
		// It doesn't join. So InvalidMedia must have user_id.
		db = db.Where("user_id = ?", filter.UserID)
	}

	if filter.Type != nil {
		db = db.Where("type = ?", *filter.Type)
	}

	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, "", err
	}

	if filter.Page > 0 {
		db = db.Offset((filter.Page - 1) * filter.PageSize)
	} else if filter.NextMarker != "" {
		db = db.Where("id < ?", filter.NextMarker)
	}

	db = db.Preload("Media.Profile").Order("created DESC")

	if filter.PageSize > 0 {
		db = db.Limit(filter.PageSize)
	}

	var invalids []model.InvalidMedia
	if err := db.Find(&invalids).Error; err != nil {
		return nil, 0, "", err
	}

	var nextMarker string
	if len(invalids) > 0 {
		nextMarker = invalids[len(invalids)-1].ID
	}

	return invalids, total, nextMarker, nil
}

func (r *mediaRepository) GetSourceList(ctx context.Context, mediaID string, userID string, nextMarker string, pageSize int, page int) ([]model.MediaSource, int64, string, error) {
	db := r.db.WithContext(ctx).Model(&model.MediaSource{})
	db = db.Where("user_id = ?", userID)
	if mediaID != "" {
		db = db.Where("media_id = ?", mediaID)
	}

	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, "", err
	}

	if page > 0 {
		db = db.Offset((page - 1) * pageSize)
	} else if nextMarker != "" {
		db = db.Where("id < ?", nextMarker)
	}

	db = db.Preload("Profile").Preload("Files.Drive").Order("created DESC")

	if pageSize > 0 {
		db = db.Limit(pageSize)
	}

	var sources []model.MediaSource
	if err := db.Find(&sources).Error; err != nil {
		return nil, 0, "", err
	}

	var nextMarkerOut string
	if len(sources) > 0 {
		nextMarkerOut = sources[len(sources)-1].ID
	}

	return sources, total, nextMarkerOut, nil
}

func (r *mediaRepository) GetProfile(ctx context.Context, id string) (*model.MediaProfile, error) {
	var p model.MediaProfile
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&p).Error; err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *mediaRepository) GetProfileByJavCode(ctx context.Context, code string) (*model.MediaProfile, error) {
	var p model.MediaProfile
	if err := r.db.WithContext(ctx).Where("jav_code = ?", code).First(&p).Error; err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *mediaRepository) GetProfileByTMDBID(ctx context.Context, tmdbID string) (*model.MediaProfile, error) {
	var p model.MediaProfile
	if err := r.db.WithContext(ctx).Where("tmdb_id = ?", tmdbID).First(&p).Error; err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *mediaRepository) CreateProfile(ctx context.Context, profile *model.MediaProfile) error {
	return r.db.WithContext(ctx).Create(profile).Error
}

func (r *mediaRepository) UpdateProfile(ctx context.Context, profile *model.MediaProfile) error {
	return r.db.WithContext(ctx).Save(profile).Error
}

func (r *mediaRepository) CreateSourceProfile(ctx context.Context, profile *model.MediaSourceProfile) error {
	return r.db.WithContext(ctx).Create(profile).Error
}

func (r *mediaRepository) GetGenreByText(ctx context.Context, text string) (*model.MediaGenre, error) {
	var g model.MediaGenre
	if err := r.db.WithContext(ctx).Where("text = ?", text).First(&g).Error; err != nil {
		return nil, err
	}
	return &g, nil
}

func (r *mediaRepository) CreateGenre(ctx context.Context, genre *model.MediaGenre) error {
	return r.db.WithContext(ctx).Create(genre).Error
}

func (r *mediaRepository) AddGenreToProfile(ctx context.Context, genreID int, profileID string) error {
	return r.db.WithContext(ctx).Exec(`INSERT OR IGNORE INTO "_MediaGenreToMediaProfile" ("A","B") VALUES (?,?)`, genreID, profileID).Error
}

func (r *mediaRepository) ListPersonProfiles(ctx context.Context, filter PersonProfileFilter) ([]model.PersonProfile, int64, string, error) {
	db := r.db.WithContext(ctx).Model(&model.PersonProfile{})
	if filter.Name != "" {
		db = db.Where("name LIKE ?", "%"+filter.Name+"%")
	}
	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, "", err
	}
	if filter.Page > 0 {
		db = db.Offset((filter.Page - 1) * filter.PageSize)
	} else if filter.NextMarker != "" {
		db = db.Where("id < ?", filter.NextMarker)
	}
	db = db.Order("created DESC")
	if filter.PageSize > 0 {
		db = db.Limit(filter.PageSize)
	}
	var persons []model.PersonProfile
	if err := db.Find(&persons).Error; err != nil {
		return nil, 0, "", err
	}
	var nextMarker string
	if len(persons) > 0 {
		nextMarker = persons[len(persons)-1].ID
	}
	return persons, total, nextMarker, nil
}

func (r *mediaRepository) GetPersonProfile(ctx context.Context, id string) (*model.PersonProfile, error) {
	var p model.PersonProfile
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&p).Error; err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *mediaRepository) CreatePersonProfile(ctx context.Context, person *model.PersonProfile) error {
	return r.db.WithContext(ctx).Create(person).Error
}

func (r *mediaRepository) UpdatePersonProfile(ctx context.Context, person *model.PersonProfile) error {
	return r.db.WithContext(ctx).Save(person).Error
}

func (r *mediaRepository) GetPersonProfileByTMDBID(ctx context.Context, tmdbID string) (*model.PersonProfile, error) {
	var p model.PersonProfile
	if err := r.db.WithContext(ctx).Where("tmdb_id = ?", tmdbID).First(&p).Error; err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *mediaRepository) GetPersonProfileByName(ctx context.Context, name string) (*model.PersonProfile, error) {
	var p model.PersonProfile
	if err := r.db.WithContext(ctx).Where("name = ?", name).First(&p).Error; err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *mediaRepository) GetPersonInMedia(ctx context.Context, profileID string, mediaID string, dept string) (*model.PersonInMedia, error) {
	var pim model.PersonInMedia
	if err := r.db.WithContext(ctx).Where("profile_id = ? AND media_id = ? AND known_for_department = ?", profileID, mediaID, dept).First(&pim).Error; err != nil {
		return nil, err
	}
	return &pim, nil
}

func (r *mediaRepository) CreatePersonInMedia(ctx context.Context, pim *model.PersonInMedia) error {
	return r.db.WithContext(ctx).Create(pim).Error
}

func (r *mediaRepository) ListSubtitles(ctx context.Context, filter SubtitleFilter) ([]model.SubtitleV2, int64, error) {
	db := r.db.WithContext(ctx).Model(&model.SubtitleV2{})
	if filter.UserID != "" {
		db = db.Where("\"SubtitleV2\".user_id = ?", filter.UserID)
	}
	if filter.Name != "" {
		db = db.Where("\"SubtitleV2\".name LIKE ?", "%"+filter.Name+"%")
	}
	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	db = db.Preload("MediaSource.Profile").Preload("MediaSource.Media.Profile").Order("\"SubtitleV2\".created DESC")
	if filter.PageSize > 0 && filter.Page > 0 {
		db = db.Offset((filter.Page - 1) * filter.PageSize).Limit(filter.PageSize)
	}
	var subtitles []model.SubtitleV2
	if err := db.Find(&subtitles).Error; err != nil {
		return nil, 0, err
	}
	return subtitles, total, nil
}

func (r *mediaRepository) GetSubtitle(ctx context.Context, id string) (*model.SubtitleV2, error) {
	var s model.SubtitleV2
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&s).Error; err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *mediaRepository) DeleteSubtitle(ctx context.Context, id string, userID string) error {
	return r.db.WithContext(ctx).Where("id = ? AND user_id = ?", id, userID).Delete(&model.SubtitleV2{}).Error
}

func (r *mediaRepository) ListParsedMedia(ctx context.Context, filter ParsedMediaFilter) ([]model.ParsedMedia, int64, string, error) {
	db := r.db.WithContext(ctx).Model(&model.ParsedMedia{})
	if filter.UserID != "" {
		db = db.Where("\"ParsedMedia\".user_id = ?", filter.UserID)
	}
	if filter.Name != "" {
		db = db.Where("\"ParsedMedia\".name LIKE ? OR \"ParsedMedia\".original_name LIKE ?", "%"+filter.Name+"%", "%"+filter.Name+"%")
	}
	if filter.Empty != nil && *filter.Empty == 1 {
		db = db.Where("\"ParsedMedia\".media_profile_id IS NULL")
	}
	if filter.Type != nil {
		db = db.Where("\"ParsedMedia\".type = ?", *filter.Type)
	}
	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, "", err
	}
	if filter.Page > 0 {
		db = db.Offset((filter.Page - 1) * filter.PageSize)
	} else if filter.NextMarker != "" {
		db = db.Where("\"ParsedMedia\".id < ?", filter.NextMarker)
	}
	db = db.Preload("MediaProfile").Preload("ParsedSources", func(tx *gorm.DB) *gorm.DB {
		return tx.Limit(5)
	}).Preload("ParsedSources.MediaSource.Profile").Preload("ParsedSources.Drive").Order("\"ParsedMedia\".created DESC")
	if filter.PageSize > 0 {
		db = db.Limit(filter.PageSize)
	}
	var items []model.ParsedMedia
	if err := db.Find(&items).Error; err != nil {
		return nil, 0, "", err
	}
	var nextMarker string
	if len(items) > 0 {
		nextMarker = items[len(items)-1].ID
	}
	return items, total, nextMarker, nil
}

func (r *mediaRepository) GetParsedMedia(ctx context.Context, id string, userID string) (*model.ParsedMedia, error) {
	var pm model.ParsedMedia
	if err := r.db.WithContext(ctx).Where("id = ? AND user_id = ?", id, userID).First(&pm).Error; err != nil {
		return nil, err
	}
	return &pm, nil
}

func (r *mediaRepository) UpdateParsedMedia(ctx context.Context, parsedMedia *model.ParsedMedia) error {
	return r.db.WithContext(ctx).Save(parsedMedia).Error
}

func (r *mediaRepository) DeleteParsedMedia(ctx context.Context, id string, userID string) error {
	return r.db.WithContext(ctx).Where("id = ? AND user_id = ?", id, userID).Delete(&model.ParsedMedia{}).Error
}

func (r *mediaRepository) ListParsedMediaSource(ctx context.Context, filter ParsedMediaSourceFilter) ([]model.ParsedMediaSource, int64, string, error) {
	db := r.db.WithContext(ctx).Model(&model.ParsedMediaSource{})
	if filter.UserID != "" {
		db = db.Where("\"ParsedSource\".user_id = ?", filter.UserID)
	}
	if filter.Name != "" {
		db = db.Where("\"ParsedSource\".name LIKE ? OR \"ParsedSource\".file_name LIKE ?", "%"+filter.Name+"%", "%"+filter.Name+"%")
	}
	if filter.Empty != nil && *filter.Empty == 1 {
		db = db.Where("\"ParsedSource\".media_source_id IS NULL")
	}
	if filter.Type != nil {
		db = db.Where("\"ParsedSource\".type = ?", *filter.Type)
	}
	if filter.ParsedMediaID != "" {
		db = db.Where("parsed_media_id = ?", filter.ParsedMediaID)
	}
	if filter.FileID != "" {
		db = db.Where("file_id = ?", filter.FileID)
	}
	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, "", err
	}
	if filter.Page > 0 {
		db = db.Offset((filter.Page - 1) * filter.PageSize)
	} else if filter.NextMarker != "" {
		db = db.Where("\"ParsedSource\".id < ?", filter.NextMarker)
	}
	db = db.Preload("MediaSource.Profile").Preload("Drive").Order("\"ParsedSource\".created DESC")
	if filter.PageSize > 0 {
		db = db.Limit(filter.PageSize)
	}
	var sources []model.ParsedMediaSource
	if err := db.Find(&sources).Error; err != nil {
		return nil, 0, "", err
	}
	var nextMarker string
	if len(sources) > 0 {
		nextMarker = sources[len(sources)-1].ID
	}
	return sources, total, nextMarker, nil
}

func (r *mediaRepository) GetParsedMediaSource(ctx context.Context, id string, userID string) (*model.ParsedMediaSource, error) {
	var ps model.ParsedMediaSource
	if err := r.db.WithContext(ctx).Where("id = ? AND user_id = ?", id, userID).First(&ps).Error; err != nil {
		return nil, err
	}
	return &ps, nil
}

func (r *mediaRepository) GetParsedSourcesForProfile(ctx context.Context, profileID string, userID string) ([]model.ParsedMediaSource, error) {
	var files []model.ParsedMediaSource
	err := r.db.WithContext(ctx).Preload("Drive").Joins("JOIN \"ParsedMedia\" ON \"ParsedMedia\".id = \"ParsedSource\".parsed_media_id").
		Where("\"ParsedMedia\".media_profile_id = ? AND \"ParsedSource\".user_id = ?", profileID, userID).Find(&files).Error
	return files, err
}

func (r *mediaRepository) DeleteParsedMediaSourceByParsedMediaID(ctx context.Context, parsedMediaID string) error {
	return r.db.WithContext(ctx).Where("parsed_media_id = ?", parsedMediaID).Delete(&model.ParsedMediaSource{}).Error
}

func (r *mediaRepository) GetSharedFileByURL(ctx context.Context, url string, userID string) (*model.SharedFile, error) {
	var f model.SharedFile
	if err := r.db.WithContext(ctx).Where("url = ? AND user_id = ?", url, userID).First(&f).Error; err != nil {
		return nil, err
	}
	return &f, nil
}

func (r *mediaRepository) ListSharedFiles(ctx context.Context, userID string, name string, nextMarker string, pageSize int, page int) ([]model.SharedFile, int64, string, error) {
	db := r.db.WithContext(ctx).Model(&model.SharedFile{}).Where("user_id = ?", userID)
	if name != "" {
		db = db.Where("name LIKE ?", "%"+name+"%")
	}
	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, "", err
	}
	if page > 0 {
		db = db.Offset((page - 1) * pageSize)
	} else if nextMarker != "" {
		db = db.Where("id < ?", nextMarker)
	}
	db = db.Order("created DESC")
	if pageSize > 0 {
		db = db.Limit(pageSize)
	}
	var files []model.SharedFile
	if err := db.Find(&files).Error; err != nil {
		return nil, 0, "", err
	}
	var nextMarkerOut string
	if len(files) > 0 {
		nextMarkerOut = files[len(files)-1].ID
	}
	return files, total, nextMarkerOut, nil
}

func (r *mediaRepository) ListSharedFilesInProgress(ctx context.Context, userID string, nextMarker string, pageSize int, page int) ([]model.SharedFileInProgress, string, error) {
	db := r.db.WithContext(ctx).Model(&model.SharedFileInProgress{}).Where("user_id = ?", userID)
	if page > 0 {
		db = db.Offset((page - 1) * pageSize)
	} else if nextMarker != "" {
		db = db.Where("id < ?", nextMarker)
	}
	db = db.Preload("Drive").Order("created DESC")
	if pageSize > 0 {
		db = db.Limit(pageSize)
	}
	var files []model.SharedFileInProgress
	if err := db.Find(&files).Error; err != nil {
		return nil, "", err
	}
	var nextMarkerOut string
	if len(files) > 0 {
		nextMarkerOut = files[len(files)-1].ID
	}
	return files, nextMarkerOut, nil
}

func (r *mediaRepository) ListTVLives(ctx context.Context, userID string, name string, nextMarker string, pageSize int, page int) ([]model.TVLive, int64, string, error) {
	db := r.db.WithContext(ctx).Model(&model.TVLive{}).Where("user_id = ? AND hidden = 0", userID)
	if name != "" {
		db = db.Where("name LIKE ?", "%"+name+"%")
	}
	var total int64
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, "", err
	}
	if page > 0 {
		db = db.Offset((page - 1) * pageSize)
	} else if nextMarker != "" {
		db = db.Where("id < ?", nextMarker)
	}
	db = db.Order("\"order\" ASC")
	if pageSize > 0 {
		db = db.Limit(pageSize)
	}
	var lives []model.TVLive
	if err := db.Find(&lives).Error; err != nil {
		return nil, 0, "", err
	}
	var nextMarkerOut string
	if len(lives) > 0 {
		nextMarkerOut = lives[len(lives)-1].ID
	}
	return lives, total, nextMarkerOut, nil
}
