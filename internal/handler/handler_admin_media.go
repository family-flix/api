package handler

import (
	"encoding/json"
	"fmt"
	"sort"
	"strconv"
	"strings"

	"github.com/family-flix/api/internal/domain/member"
	"github.com/family-flix/api/internal/model"
	"github.com/family-flix/api/pkg/media_profile/javbus"
	"github.com/family-flix/api/pkg/media_profile/tmdb"
	"github.com/family-flix/api/pkg/types"
	"gorm.io/gorm"
)

func AdminMediaTransfer(c Context) error {
	// TODO: requires drive client for file transfer
	return fail(c, 501, "未实现")
}

func AdminMediaArchiveList(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Name       string `json:"name"`
		Type       *int   `json:"type"`
		DriveIDs   string `json:"drive_ids"`
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}
	db := c.DB().Where("\"Media\".user_id = ?", u.ID)
	if body.Name != "" {
		db = db.Joins("JOIN \"MediaProfile\" ON \"MediaProfile\".id = \"Media\".profile_id").
			Where("\"MediaProfile\".name LIKE ? OR \"MediaProfile\".original_name LIKE ?", "%"+body.Name+"%", "%"+body.Name+"%")
	}
	if body.Type != nil {
		db = db.Where("\"Media\".type = ?", *body.Type)
	}
	var total int64
	db.Model(&model.Media{}).Count(&total)
	if body.NextMarker != "" {
		db = db.Where("\"Media\".id < ?", body.NextMarker)
	}
	var medias []model.Media
	db.Preload("Profile").Preload("MediaSources.Profile").Preload("MediaSources.Files.Drive").
		Order("\"Media\".created DESC").Limit(body.PageSize).Find(&medias)
	list := make([]R, 0, len(medias))
	var nextMarker string
	for _, m := range medias {
		item := R{"id": m.ID, "type": m.Type}
		if m.Profile != nil {
			item["name"] = m.Profile.Name
			item["poster_path"] = m.Profile.PosterPath
			item["air_date"] = m.Profile.AirDate
			item["episode_count"] = m.Profile.SourceCount
			item["cur_episode_count"] = len(m.MediaSources)
		}
		sources := make([]R, 0)
		for _, s := range m.MediaSources {
			src := R{"id": s.ID}
			if s.Profile != nil {
				src["name"] = s.Profile.Name
				src["order"] = s.Profile.Order
			}
			files := make([]R, 0)
			for _, f := range s.Files {
				fi := R{"id": f.ID, "file_id": f.FileID, "file_name": f.FileName, "parent_paths": f.ParentPaths, "size": f.Size}
				if f.Drive != nil {
					fi["drive"] = R{"id": f.Drive.ID, "name": f.Drive.Name}
				}
				files = append(files, fi)
			}
			src["files"] = files
			sources = append(sources, src)
		}
		item["sources"] = sources
		list = append(list, item)
		nextMarker = m.ID
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func AdminMediaArchivePartial(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		MediaID string `json:"media_id"`
	}
	if err := c.Bind(&body); err != nil || body.MediaID == "" {
		return fail(c, 400, "缺少 media_id")
	}
	var m model.Media
	if err := c.DB().Preload("Profile").Preload("MediaSources.Profile").Preload("MediaSources.Files.Drive").
		Where("id = ? AND user_id = ?", body.MediaID, u.ID).First(&m).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	item := R{"id": m.ID, "type": m.Type}
	if m.Profile != nil {
		item["name"] = m.Profile.Name
		item["poster_path"] = m.Profile.PosterPath
		item["air_date"] = m.Profile.AirDate
		item["episode_count"] = m.Profile.SourceCount
		item["cur_episode_count"] = len(m.MediaSources)
	}
	sources := make([]R, 0)
	for _, s := range m.MediaSources {
		src := R{"id": s.ID}
		if s.Profile != nil {
			src["name"] = s.Profile.Name
			src["order"] = s.Profile.Order
		}
		files := make([]R, 0)
		for _, f := range s.Files {
			fi := R{"id": f.ID, "file_id": f.FileID, "file_name": f.FileName, "parent_paths": f.ParentPaths, "size": f.Size}
			if f.Drive != nil {
				fi["drive"] = R{"id": f.Drive.ID, "name": f.Drive.Name}
			}
			files = append(files, fi)
		}
		src["files"] = files
		sources = append(sources, src)
	}
	item["sources"] = sources
	return ok(c, "", item)
}

func AdminMediaToResourceDrive(c Context) error {
	// TODO: requires drive client for file move
	return fail(c, 501, "未实现")
}

func AdminMediaRefreshProfile(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		MediaID string `json:"media_id"`
	}
	if err := c.Bind(&body); err != nil || body.MediaID == "" {
		return fail(c, 400, "缺少 media_id")
	}
	var m model.Media
	if err := c.DB().Preload("Profile").Where("id = ? AND user_id = ?", body.MediaID, u.ID).First(&m).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}

	if m.Type == 3 {
		code := m.Text
		if code == "" && m.Profile != nil && m.Profile.JavCode != nil {
			code = *m.Profile.JavCode
		}
		if code == "" {
			return fail(c, 400, "缺少 jav_code")
		}

		jc := javbus.NewJavBusClient("")
		detail, err := jc.GetMovieDetail(code)
		if err != nil {
			return fail(c, 500, err.Error())
		}

		var p model.MediaProfile
		if err := c.DB().Where("jav_code = ?", code).First(&p).Error; err != nil {
			tips, _ := json.Marshal(R{"director": detail.Director, "studio": detail.Studio, "label": detail.Label, "length": detail.Length})
			tipsStr := string(tips)
			p = model.MediaProfile{
				ID:           rid(),
				Type:         3,
				Name:         detail.Title,
				PosterPath:   &detail.Cover,
				BackdropPath: &detail.Backdrop,
				AirDate:      &detail.ReleaseDate,
				JavCode:      &code,
				Tips:         &tipsStr,
			}
			if err := c.DB().Create(&p).Error; err != nil {
				return fail(c, 500, err.Error())
			}
			sp := model.MediaSourceProfile{
				ID:             rid(),
				Type:           3,
				Name:           code,
				MediaProfileID: p.ID,
			}
			c.DB().Create(&sp)
		} else {
			tips, _ := json.Marshal(R{"director": detail.Director, "studio": detail.Studio, "label": detail.Label, "length": detail.Length})
			tipsStr := string(tips)
			c.DB().Model(&p).Updates(map[string]interface{}{
				"name":          detail.Title,
				"poster_path":   detail.Cover,
				"backdrop_path": detail.Backdrop,
				"air_date":      detail.ReleaseDate,
				"tips":          tipsStr,
			})
		}

		// Update genres
		for _, g := range detail.Genres {
			var genre model.MediaGenre
			if err := c.DB().Where("text = ?", g).First(&genre).Error; err != nil {
				genre = model.MediaGenre{Text: g}
				c.DB().Create(&genre)
			}
			c.DB().Exec(`INSERT OR IGNORE INTO "_MediaGenreToMediaProfile" ("A","B") VALUES (?,?)`, genre.ID, p.ID)
		}

		// Update persons
		if detail.Director != "" {
			savePerson(c.DB(), p.ID, detail.Director, nil, "Directing", 0, nil)
		}
		for i, actor := range detail.Actors {
			var avatar *string
			if actor.Avatar != "" {
				avatar = &actor.Avatar
			}
			savePerson(c.DB(), p.ID, actor.Name, nil, "Acting", i, avatar)
		}

		// Link Media to Profile
		if m.ProfileID != p.ID {
			c.DB().Model(&m).Updates(map[string]interface{}{
				"profile_id": p.ID,
				"text":       code,
			})
		} else {
			c.DB().Model(&m).Update("text", code)
		}

		return ok(c, "刷新成功", R{"id": p.ID})
	}

	return fail(c, 501, "未实现")
}

func AdminMediaInvalid(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Type       *int   `json:"type"`
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}
	db := c.DB().Where("user_id = ?", u.ID)
	if body.Type != nil {
		db = db.Where("type = ?", *body.Type)
	}
	var total int64
	db.Model(&model.InvalidMedia{}).Count(&total)
	if body.NextMarker != "" {
		db = db.Where("id < ?", body.NextMarker)
	}
	var invalids []model.InvalidMedia
	db.Preload("Media.Profile").Order("created DESC").Limit(body.PageSize).Find(&invalids)
	list := make([]R, 0, len(invalids))
	var nextMarker string
	for _, inv := range invalids {
		item := R{"id": inv.ID, "type": inv.Type}
		tips := make([]string, 0)
		json.Unmarshal([]byte(inv.Profile), &tips)
		if tips == nil {
			tips = []string{}
		}
		item["tips"] = tips
		if inv.Media != nil {
			media := R{"id": inv.Media.ID, "type": inv.Media.Type}
			if inv.Media.Profile != nil {
				media["name"] = inv.Media.Profile.Name
				media["poster_path"] = inv.Media.Profile.PosterPath
				media["air_date"] = inv.Media.Profile.AirDate
			}
			item["media"] = media
		}
		list = append(list, item)
		nextMarker = inv.ID
	}
	return ok(c, "", R{"list": list, "total": total, "next_marker": nextMarker})
}

func AdminMediaDelete(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		MediaID string `json:"media_id"`
	}
	if err := c.Bind(&body); err != nil || body.MediaID == "" {
		return fail(c, 400, "缺少 media_id")
	}
	var m model.Media
	if err := c.DB().Where("id = ? AND user_id = ?", body.MediaID, u.ID).First(&m).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	c.DB().Delete(&m)
	return ok(c, "删除成功", nil)
}

func AdminMediaSetProfile(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		MediaID string `json:"media_id"`
		TMDBID  string `json:"tmdb_id"`
		Type    int    `json:"type"`
	}
	if err := c.Bind(&body); err != nil || body.MediaID == "" || body.TMDBID == "" {
		return fail(c, 400, "参数错误")
	}
	var m model.Media
	if err := c.DB().Where("id = ? AND user_id = ?", body.MediaID, u.ID).First(&m).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	client := tmdb.NewClient()
	tmdbID, _ := strconv.Atoi(body.TMDBID)
	if body.Type == 2 {
		detail, err := client.FetchMovieProfile(tmdbID)
		if err != nil {
			return fail(c, 500, err.Error())
		}
		var p model.MediaProfile
		if err := c.DB().Where("tmdb_id = ?", body.TMDBID).First(&p).Error; err != nil {
			p = model.MediaProfile{
				ID:           rid(),
				Type:         2,
				Name:         detail.Name,
				OriginalName: &detail.OriginalName,
				Overview:     &detail.Overview,
				PosterPath:   &detail.PosterPath,
				BackdropPath: &detail.BackdropPath,
				AirDate:      &detail.AirDate,
				TMDBID:       &body.TMDBID,
			}
			c.DB().Create(&p)
		}
		c.DB().Model(&m).Update("profile_id", p.ID)
		return ok(c, "设置成功", R{"id": p.ID})
	}
	detail, err := client.FetchTVProfile(tmdbID)
	if err != nil {
		return fail(c, 500, err.Error())
	}
	var p model.MediaProfile
	if err := c.DB().Where("tmdb_id = ?", body.TMDBID).First(&p).Error; err != nil {
		p = model.MediaProfile{
			ID:           rid(),
			Type:         1,
			Name:         detail.Name,
			OriginalName: &detail.OriginalName,
			Overview:     &detail.Overview,
			PosterPath:   &detail.PosterPath,
			BackdropPath: &detail.BackdropPath,
			AirDate:      &detail.FirstAirDate,
			TMDBID:       &body.TMDBID,
		}
		c.DB().Create(&p)
	}
	c.DB().Model(&m).Update("profile_id", p.ID)
	return ok(c, "设置成功", R{"id": p.ID})
}

func AdminMediaSourceList(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		MediaID    string `json:"media_id"`
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}
	db := c.DB().Where("user_id = ?", u.ID)
	if body.MediaID != "" {
		db = db.Where("media_id = ?", body.MediaID)
	}
	var total int64
	db.Model(&model.MediaSource{}).Count(&total)
	if body.NextMarker != "" {
		db = db.Where("id < ?", body.NextMarker)
	}
	var sources []model.MediaSource
	db.Preload("Profile").Preload("Files.Drive").Order("created DESC").Limit(body.PageSize).Find(&sources)
	list := make([]R, 0, len(sources))
	var nextMarker string
	for _, s := range sources {
		item := R{"id": s.ID, "media_id": s.MediaID}
		if s.Profile != nil {
			item["name"] = s.Profile.Name
			item["order"] = s.Profile.Order
		}
		files := make([]R, 0)
		for _, f := range s.Files {
			fi := R{"id": f.ID, "file_id": f.FileID, "file_name": f.FileName, "parent_paths": f.ParentPaths, "size": f.Size}
			if f.Drive != nil {
				fi["drive"] = R{"id": f.Drive.ID, "name": f.Drive.Name}
			}
			files = append(files, fi)
		}
		item["files"] = files
		list = append(list, item)
		nextMarker = s.ID
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func AdminSeasonList(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Name       string `json:"name"`
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}
	db := c.DB().Where("user_id = ? AND type = 1", u.ID)
	if body.Name != "" {
		profileIDs := []string{}
		c.DB().Model(&model.MediaProfile{}).Where(
			"name LIKE ? OR original_name LIKE ? OR alias LIKE ?",
			"%"+body.Name+"%", "%"+body.Name+"%", "%"+body.Name+"%",
		).Pluck("id", &profileIDs)
		db = db.Where("profile_id IN ?", profileIDs)
	}
	var total int64
	db.Model(&model.Media{}).Count(&total)
	if body.NextMarker != "" {
		db = db.Where("id < ?", body.NextMarker)
	}
	var medias []model.Media
	db.Preload("Profile").Preload("Profile.Genres").Preload("Profile.OriginCountries").Preload("MediaSources").
		Preload("ResourceSyncTasks", "invalid = 0 AND status = 1").
		Limit(body.PageSize).Find(&medias)
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
	list := make([]R, 0, len(medias))
	var nextMarker string
	for _, m := range medias {
		item := R{"id": m.ID, "cur_episode_count": len(m.MediaSources)}
		if m.Profile != nil {
			item["name"] = m.Profile.Name
			item["original_name"] = m.Profile.OriginalName
			item["overview"] = m.Profile.Overview
			item["air_date"] = m.Profile.AirDate
			item["poster_path"] = m.Profile.PosterPath
			item["vote_average"] = m.Profile.VoteAverage
			item["episode_count"] = m.Profile.SourceCount
			genres := make([]R, 0)
			for _, g := range m.Profile.Genres {
				genres = append(genres, R{"value": g.ID, "label": g.Text})
			}
			item["genres"] = genres
			countries := make([]string, 0)
			for _, c := range m.Profile.OriginCountries {
				countries = append(countries, c.ID)
			}
			item["origin_country"] = countries
			externalIDs := make([]R, 0)
			if m.Profile.JavCode != nil && *m.Profile.JavCode != "" {
				externalIDs = append(externalIDs, R{"name": "jav", "value": *m.Profile.JavCode})
			}
			if m.Profile.TMDBID != nil && *m.Profile.TMDBID != "" {
				externalIDs = append(externalIDs, R{"name": "tmdb", "value": *m.Profile.TMDBID})
			}
			if m.Profile.DoubanID != nil && *m.Profile.DoubanID != "" {
				externalIDs = append(externalIDs, R{"name": "douban", "value": *m.Profile.DoubanID})
			}
			if m.Profile.IMDBID != nil && *m.Profile.IMDBID != "" {
				externalIDs = append(externalIDs, R{"name": "imdb", "value": *m.Profile.IMDBID})
			}
			item["external_ids"] = externalIDs
			tips := make([]string, 0)
			if len(m.MediaSources) == 0 {
				tips = append(tips, "关联的剧集数为 0")
			}
			if m.Profile.InProduction == 0 && len(m.MediaSources) != m.Profile.SourceCount {
				tips = append(tips, fmt.Sprintf("已完结但集数不完整，总集数 %d，当前集数 %d", m.Profile.SourceCount, len(m.MediaSources)))
			}
			if m.Profile.InProduction == 1 && len(m.MediaSources) != m.Profile.SourceCount && len(m.ResourceSyncTasks) == 0 {
				tips = append(tips, "未完结但缺少同步任务")
			}
			item["tips"] = tips
		} else {
			item["tips"] = []string{}
		}
		list = append(list, item)
		nextMarker = m.ID
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func AdminSeasonProfile(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		SeasonID string `json:"season_id"`
	}
	if err := c.Bind(&body); err != nil || body.SeasonID == "" {
		return fail(c, 400, "缺少 season_id")
	}
	var m model.Media
	if err := c.DB().Preload("Profile.Series").Preload("Profile.Genres").Preload("Profile.OriginCountries").
		Preload("MediaSources.Profile").Preload("MediaSources.Files.Drive").
		Where("id = ? AND user_id = ? AND type = 1", body.SeasonID, u.ID).First(&m).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	item := R{"id": m.ID, "profile_id": m.ProfileID}
	if m.Profile != nil {
		item["name"] = m.Profile.Name
		item["overview"] = m.Profile.Overview
		item["poster_path"] = m.Profile.PosterPath
		item["backdrop_path"] = m.Profile.BackdropPath
		item["air_date"] = m.Profile.AirDate
		genres := make([]string, 0)
		for _, g := range m.Profile.Genres {
			genres = append(genres, g.Text)
		}
		item["genres"] = genres
		countries := make([]string, 0)
		for _, c := range m.Profile.OriginCountries {
			countries = append(countries, c.Text)
		}
		item["origin_country"] = countries
		if m.Profile.Series != nil && m.Profile.SeriesID != nil {
			var siblings []model.MediaProfile
			c.DB().Where("series_id = ? AND id != ?", *m.Profile.SeriesID, m.ProfileID).Order("\"order\" ASC").Find(&siblings)
			series := make([]R, 0)
			for _, s := range siblings {
				series = append(series, R{"id": s.ID, "name": s.Name, "poster_path": s.PosterPath, "air_date": s.AirDate, "order": s.Order})
			}
			item["series"] = series
		}
	}
	episodes := make([]R, 0)
	for _, s := range m.MediaSources {
		ep := R{"id": s.ID}
		if s.Profile != nil {
			ep["name"] = s.Profile.Name
			ep["overview"] = s.Profile.Overview
			ep["episode_number"] = s.Profile.Order
			ep["air_date"] = s.Profile.AirDate
			ep["runtime"] = s.Profile.Runtime
		}
		files := make([]R, 0)
		for _, f := range s.Files {
			fi := R{"id": f.ID, "file_id": f.FileID, "file_name": f.FileName, "parent_paths": f.ParentPaths, "size": f.Size, "created": f.Created}
			if f.Drive != nil {
				fi["drive"] = R{"id": f.Drive.ID, "name": f.Drive.Name}
			}
			files = append(files, fi)
		}
		ep["sources"] = files
		episodes = append(episodes, ep)
	}
	item["episodes"] = episodes
	return ok(c, "", item)
}

func AdminSeasonPartial(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		MediaID string `json:"media_id"`
	}
	if err := c.Bind(&body); err != nil || body.MediaID == "" {
		return fail(c, 400, "缺少 media_id")
	}
	var m model.Media
	if err := c.DB().Preload("Profile.Genres").Preload("Profile.OriginCountries").Preload("MediaSources").Preload("ResourceSyncTasks").
		Where("id = ? AND user_id = ?", body.MediaID, u.ID).First(&m).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	item := R{"id": m.ID, "cur_episode_count": len(m.MediaSources)}
	if m.Profile != nil {
		item["name"] = m.Profile.Name
		item["original_name"] = m.Profile.OriginalName
		item["overview"] = m.Profile.Overview
		item["air_date"] = m.Profile.AirDate
		item["poster_path"] = m.Profile.PosterPath
		item["vote_average"] = m.Profile.VoteAverage
		item["episode_count"] = m.Profile.SourceCount
		genres := make([]string, 0)
		for _, g := range m.Profile.Genres {
			genres = append(genres, g.Text)
		}
		item["genres"] = genres
		countries := make([]string, 0)
		for _, c := range m.Profile.OriginCountries {
			countries = append(countries, c.Text)
		}
		item["origin_country"] = countries
	}
	return ok(c, "", item)
}

func AdminMovieList(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Name       string `json:"name"`
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}
	db := c.DB().Where("\"Media\".user_id = ? AND \"Media\".type = 2", u.ID)
	if body.Name != "" {
		db = db.Joins("JOIN \"MediaProfile\" ON \"MediaProfile\".id = \"Media\".profile_id").
			Where("\"MediaProfile\".name LIKE ? OR \"MediaProfile\".original_name LIKE ?", "%"+body.Name+"%", "%"+body.Name+"%")
	}
	var total int64
	db.Model(&model.Media{}).Count(&total)
	if body.NextMarker != "" {
		db = db.Where("\"Media\".id < ?", body.NextMarker)
	}
	var medias []model.Media
	db.Preload("Profile.Genres").Preload("Profile.OriginCountries").Preload("MediaSources").
		Order("\"Media\".created DESC").Limit(body.PageSize).Find(&medias)
	list := make([]R, 0, len(medias))
	var nextMarker string
	for _, m := range medias {
		item := R{"id": m.ID}
		if m.Profile != nil {
			item["name"] = m.Profile.Name
			item["original_name"] = m.Profile.OriginalName
			item["overview"] = m.Profile.Overview
			item["air_date"] = m.Profile.AirDate
			item["poster_path"] = m.Profile.PosterPath
			item["vote_average"] = m.Profile.VoteAverage
			genres := make([]string, 0)
			for _, g := range m.Profile.Genres {
				genres = append(genres, g.Text)
			}
			item["genres"] = genres
			countries := make([]string, 0)
			for _, c := range m.Profile.OriginCountries {
				countries = append(countries, c.Text)
			}
			item["origin_country"] = countries
			externalIDs := make([]R, 0)
			if m.Profile.JavCode != nil && *m.Profile.JavCode != "" {
				externalIDs = append(externalIDs, R{"name": "jav", "value": *m.Profile.JavCode})
			}
			if m.Profile.TMDBID != nil && *m.Profile.TMDBID != "" {
				externalIDs = append(externalIDs, R{"name": "tmdb", "value": *m.Profile.TMDBID})
			}
			if m.Profile.DoubanID != nil && *m.Profile.DoubanID != "" {
				externalIDs = append(externalIDs, R{"name": "douban", "value": *m.Profile.DoubanID})
			}
			if m.Profile.IMDBID != nil && *m.Profile.IMDBID != "" {
				externalIDs = append(externalIDs, R{"name": "imdb", "value": *m.Profile.IMDBID})
			}
			item["external_ids"] = externalIDs
		}
		tips := make([]string, 0)
		if len(m.MediaSources) == 0 {
			tips = append(tips, "没有可播放的源")
		}
		item["tips"] = tips
		list = append(list, item)
		nextMarker = m.ID
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func AdminAVList(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Name       string `json:"name"`
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
		Page       int    `json:"page"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}
	db := c.DB().Where("\"Media\".user_id = ? AND \"Media\".type = 3", u.ID)
	if body.Name != "" {
		db = db.Joins("JOIN \"MediaProfile\" ON \"MediaProfile\".id = \"Media\".profile_id").
			Where("\"MediaProfile\".name LIKE ? OR \"MediaProfile\".original_name LIKE ?", "%"+body.Name+"%", "%"+body.Name+"%")
	}
	var total int64
	db.Model(&model.Media{}).Count(&total)
	if body.Page > 0 {
		db = db.Offset((body.Page - 1) * body.PageSize)
	} else if body.NextMarker != "" {
		db = db.Where("\"Media\".id < ?", body.NextMarker)
	}
	var medias []model.Media
	db.Preload("Profile").Preload("Profile.Persons.Profile").Preload("MediaSources.Files.Drive").
		Order("\"Media\".created DESC").Limit(body.PageSize).Find(&medias)
	list := make([]R, 0, len(medias))
	var nextMarker string
	for _, m := range medias {
		item := R{"id": m.ID}
		if m.Profile != nil {
			item["name"] = m.Profile.Name
			item["original_name"] = m.Profile.OriginalName
			item["overview"] = m.Profile.Overview
			item["air_date"] = m.Profile.AirDate
			item["poster_path"] = m.Profile.PosterPath
			item["jav_code"] = m.Profile.JavCode
			item["persons"] = m.Profile.Persons
			externalIDs := make([]R, 0)
			if m.Profile.JavCode != nil && *m.Profile.JavCode != "" {
				externalIDs = append(externalIDs, R{"name": "jav", "value": *m.Profile.JavCode})
			}
			if m.Profile.TMDBID != nil && *m.Profile.TMDBID != "" {
				externalIDs = append(externalIDs, R{"name": "tmdb", "value": *m.Profile.TMDBID})
			}
			if m.Profile.DoubanID != nil && *m.Profile.DoubanID != "" {
				externalIDs = append(externalIDs, R{"name": "douban", "value": *m.Profile.DoubanID})
			}
			if m.Profile.IMDBID != nil && *m.Profile.IMDBID != "" {
				externalIDs = append(externalIDs, R{"name": "imdb", "value": *m.Profile.IMDBID})
			}
			item["external_ids"] = externalIDs
		}
		tips := make([]string, 0)
		if len(m.MediaSources) == 0 {
			tips = append(tips, "没有可播放的源")
		}
		item["tips"] = tips

		sources := make([]R, 0)
		if len(m.MediaSources) > 0 {
			for _, s := range m.MediaSources {
				src := R{"id": s.ID}
				for _, f := range s.Files {
					src["file_id"] = f.FileID
					src["file_name"] = f.FileName
					src["parent_paths"] = f.ParentPaths
					src["size"] = f.Size
					if f.Drive != nil {
						src["drive"] = R{"id": f.Drive.ID, "name": f.Drive.Name}
					}
				}
				sources = append(sources, src)
			}
		} else if m.ProfileID != "" {
			var files []model.ParsedMediaSource
			c.DB().Preload("Drive").Joins("JOIN \"ParsedMedia\" ON \"ParsedMedia\".id = \"ParsedSource\".parsed_media_id").
				Where("\"ParsedMedia\".media_profile_id = ? AND \"ParsedSource\".user_id = ?", m.ProfileID, u.ID).Find(&files)
			for _, f := range files {
				src := R{"id": f.ID, "file_id": f.FileID, "file_name": f.FileName, "parent_paths": f.ParentPaths, "size": f.Size}
				if f.Drive != nil {
					src["drive"] = R{"id": f.Drive.ID, "name": f.Drive.Name}
				}
				sources = append(sources, src)
			}
		}
		item["sources"] = sources

		list = append(list, item)
		nextMarker = m.ID
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func AdminArtistList(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Name       string `json:"name"`
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}
	_ = u
	db := c.DB()
	if body.Name != "" {
		db = db.Where("name LIKE ?", "%"+body.Name+"%")
	}
	var total int64
	db.Model(&model.PersonProfile{}).Count(&total)
	if body.NextMarker != "" {
		db = db.Where("id < ?", body.NextMarker)
	}
	var persons []model.PersonProfile
	db.Order("created DESC").Limit(body.PageSize).Find(&persons)
	list := make([]R, 0, len(persons))
	var nextMarker string
	for _, p := range persons {
		item := R{"id": p.ID, "name": p.Name, "profile_path": p.ProfilePath, "birthday": p.Birthday}
		if p.KnownForDepartment != nil {
			item["known_for_department"] = *p.KnownForDepartment
		}
		list = append(list, item)
		nextMarker = p.ID
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func AdminMovieProfile(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		MediaID string `json:"media_id"`
	}
	if err := c.Bind(&body); err != nil || body.MediaID == "" {
		return fail(c, 400, "缺少 media_id")
	}
	var m model.Media
	if err := c.DB().Preload("Profile.Genres").Preload("Profile.OriginCountries").Preload("MediaSources.Profile").Preload("MediaSources.Files.Drive").
		Where("id = ? AND user_id = ? AND type = 2", body.MediaID, u.ID).First(&m).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	item := R{"id": m.ID, "profile_id": m.ProfileID}
	if m.Profile != nil {
		item["name"] = m.Profile.Name
		item["overview"] = m.Profile.Overview
		item["poster_path"] = m.Profile.PosterPath
		item["backdrop_path"] = m.Profile.BackdropPath
		item["air_date"] = m.Profile.AirDate
		genres := make([]string, 0)
		for _, g := range m.Profile.Genres {
			genres = append(genres, g.Text)
		}
		item["genres"] = genres
		countries := make([]string, 0)
		for _, c := range m.Profile.OriginCountries {
			countries = append(countries, c.Text)
		}
		item["origin_country"] = countries
	}
	sources := make([]R, 0)
	for _, s := range m.MediaSources {
		src := R{"id": s.ID}
		for _, f := range s.Files {
			src["file_id"] = f.FileID
			src["file_name"] = f.FileName
			src["parent_paths"] = f.ParentPaths
			src["size"] = f.Size
			if f.Drive != nil {
				src["drive"] = R{"id": f.Drive.ID, "name": f.Drive.Name}
			}
		}
		sources = append(sources, src)
	}
	item["sources"] = sources
	return ok(c, "", item)
}

func AdminAVProfile(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		MediaID string `json:"media_id"`
	}
	if err := c.Bind(&body); err != nil || body.MediaID == "" {
		return fail(c, 400, "缺少 media_id")
	}
	var m model.Media
	if err := c.DB().Preload("Profile.Genres").Preload("Profile.OriginCountries").Preload("MediaSources.Profile").Preload("MediaSources.Files.Drive").
		Where("id = ? AND user_id = ? AND type = 3", body.MediaID, u.ID).First(&m).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	item := R{"id": m.ID, "profile_id": m.ProfileID}
	if m.Profile != nil {
		item["name"] = m.Profile.Name
		item["overview"] = m.Profile.Overview
		item["poster_path"] = m.Profile.PosterPath
		item["backdrop_path"] = m.Profile.BackdropPath
		item["air_date"] = m.Profile.AirDate
		item["tmdb_id"] = m.Profile.TMDBID
		item["imdb_id"] = m.Profile.IMDBID
		item["douban_id"] = m.Profile.DoubanID
		item["jav_code"] = m.Profile.JavCode
		genres := make([]string, 0)
		for _, g := range m.Profile.Genres {
			genres = append(genres, g.Text)
		}
		item["genres"] = genres
		countries := make([]string, 0)
		for _, c := range m.Profile.OriginCountries {
			countries = append(countries, c.Text)
		}
		item["origin_country"] = countries
	}
	sources := make([]R, 0)
	if len(m.MediaSources) > 0 {
		for _, s := range m.MediaSources {
			src := R{"id": s.ID}
			for _, f := range s.Files {
				src["file_id"] = f.FileID
				src["file_name"] = f.FileName
				src["parent_paths"] = f.ParentPaths
				src["size"] = f.Size
				if f.Drive != nil {
					src["drive"] = R{"id": f.Drive.ID, "name": f.Drive.Name}
				}
			}
			sources = append(sources, src)
		}
	} else if m.ProfileID != "" {
		var files []model.ParsedMediaSource
		c.DB().Preload("Drive").Joins("JOIN \"ParsedMedia\" ON \"ParsedMedia\".id = \"ParsedSource\".parsed_media_id").
			Where("\"ParsedMedia\".media_profile_id = ? AND \"ParsedSource\".user_id = ?", m.ProfileID, u.ID).Find(&files)
		for _, f := range files {
			src := R{"id": f.ID, "file_id": f.FileID, "file_name": f.FileName, "parent_paths": f.ParentPaths, "size": f.Size}
			if f.Drive != nil {
				src["drive"] = R{"id": f.Drive.ID, "name": f.Drive.Name}
			}
			sources = append(sources, src)
		}
	}
	item["sources"] = sources
	return ok(c, "", item)
}

func AdminSubtitleList(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Name     string `json:"name"`
		Page     int    `json:"page"`
		PageSize int    `json:"page_size"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}
	if body.Page <= 0 {
		body.Page = 1
	}
	db := c.DB().Where("\"SubtitleV2\".user_id = ?", u.ID)
	if body.Name != "" {
		db = db.Where("\"SubtitleV2\".name LIKE ?", "%"+body.Name+"%")
	}
	var total int64
	db.Model(&model.SubtitleV2{}).Count(&total)
	var subtitles []model.SubtitleV2
	db.Preload("MediaSource.Profile").Preload("MediaSource.Media.Profile").
		Order("\"SubtitleV2\".created DESC").Offset((body.Page - 1) * body.PageSize).Limit(body.PageSize).Find(&subtitles)
	list := make([]R, 0, len(subtitles))
	for _, s := range subtitles {
		item := R{"id": s.ID, "language": s.Language, "type": s.Type, "unique_id": s.UniqueID, "name": s.Name}
		if s.MediaSource != nil && s.MediaSource.Media != nil && s.MediaSource.Media.Profile != nil {
			item["media_name"] = s.MediaSource.Media.Profile.Name
		}
		if s.MediaSource != nil && s.MediaSource.Profile != nil {
			item["source_name"] = s.MediaSource.Profile.Name
		}
		list = append(list, item)
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "page": body.Page, "no_more": (body.Page * body.PageSize) >= int(total)})
}

func AdminSubtitleParse(c Context) error {
	// TODO: requires filename parser
	return fail(c, 501, "未实现")
}

func AdminSubtitleBatchCreate(c Context) error {
	// TODO: requires file upload handling
	return fail(c, 501, "未实现")
}

func AdminSubtitleDelete(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		SubtitleID string `json:"subtitle_id"`
	}
	if err := c.Bind(&body); err != nil || body.SubtitleID == "" {
		return fail(c, 400, "缺少 subtitle_id")
	}
	var s model.SubtitleV2
	if err := c.DB().Where("id = ? AND user_id = ?", body.SubtitleID, u.ID).First(&s).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	c.DB().Delete(&s)
	return ok(c, "删除成功", nil)
}

func AdminParsedMediaList(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Name       string `json:"name"`
		Empty      *int   `json:"empty"`
		Type       *int   `json:"type"`
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}
	db := c.DB().Where("\"ParsedMedia\".user_id = ?", u.ID)
	if body.Name != "" {
		db = db.Where("\"ParsedMedia\".name LIKE ? OR \"ParsedMedia\".original_name LIKE ?", "%"+body.Name+"%", "%"+body.Name+"%")
	}
	if body.Empty != nil && *body.Empty == 1 {
		db = db.Where("\"ParsedMedia\".media_profile_id IS NULL")
	}
	if body.Type != nil {
		db = db.Where("\"ParsedMedia\".type = ?", *body.Type)
	}
	var total int64
	db.Model(&model.ParsedMedia{}).Count(&total)
	if body.NextMarker != "" {
		db = db.Where("\"ParsedMedia\".id < ?", body.NextMarker)
	}
	var items []model.ParsedMedia
	db.Preload("MediaProfile").Preload("ParsedSources", func(tx *gorm.DB) *gorm.DB {
		return tx.Limit(5)
	}).Preload("ParsedSources.MediaSource.Profile").Preload("ParsedSources.Drive").
		Order("\"ParsedMedia\".created DESC").Limit(body.PageSize).Find(&items)
	list := make([]R, 0, len(items))
	var nextMarker string
	for _, pm := range items {
		item := R{
			"id":          pm.ID,
			"type":        pm.Type,
			"name":        pm.Name,
			"season_text": pm.SeasonText,
		}
		if pm.MediaProfile != nil {
			item["profile"] = R{"id": pm.MediaProfile.ID, "name": pm.MediaProfile.Name, "poster_path": pm.MediaProfile.PosterPath}
		}
		sources := make([]R, 0)
		for _, ps := range pm.ParsedSources {
			src := R{
				"id":           ps.ID,
				"name":         ps.Name,
				"season_text":  ps.SeasonText,
				"episode_text": ps.EpisodeText,
				"file_name":    ps.FileName,
				"parent_paths": ps.ParentPaths,
			}
			if ps.MediaSource != nil && ps.MediaSource.Profile != nil {
				src["profile"] = R{"id": ps.MediaSource.Profile.ID, "name": ps.MediaSource.Profile.Name}
			}
			if ps.Drive != nil {
				src["drive"] = R{"id": ps.Drive.ID, "name": ps.Drive.Name}
			}
			sources = append(sources, src)
		}
		item["sources"] = sources
		item["source_count"] = len(pm.ParsedSources)
		list = append(list, item)
		nextMarker = pm.ID
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func AdminParsedMediaSetProfile(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ParsedMediaID  string `json:"parsed_media_id"`
		MediaProfileID string `json:"media_profile_id"`
		MediaProfile   *struct {
			ID   string `json:"id"`
			Type string `json:"type"`
			Name string `json:"name"`
		} `json:"media_profile"`
	}
	if err := c.Bind(&body); err != nil || body.ParsedMediaID == "" {
		return fail(c, 400, "参数错误")
	}
	var pm model.ParsedMedia
	if err := c.DB().Where("id = ? AND user_id = ?", body.ParsedMediaID, u.ID).First(&pm).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	var p model.MediaProfile
	if body.MediaProfile != nil && body.MediaProfile.Type == "av" {
		code := body.MediaProfile.ID
		jc := javbus.NewJavBusClient("")
		detail, err := jc.GetMovieDetail(code)
		if err != nil {
			return fail(c, 500, err.Error())
		}
		if err := c.DB().Where("jav_code = ?", code).First(&p).Error; err != nil {
			p = model.MediaProfile{
				ID: rid(), Type: 3, Name: detail.Title, PosterPath: &detail.Cover,
				BackdropPath: &detail.Backdrop, AirDate: &detail.ReleaseDate, JavCode: &code,
			}
			c.DB().Create(&p)
		} else {
			c.DB().Model(&p).Updates(map[string]interface{}{
				"name": detail.Title, "poster_path": detail.Cover,
				"backdrop_path": detail.Backdrop, "air_date": detail.ReleaseDate,
			})
		}
	} else {
		profileID := body.MediaProfileID
		if body.MediaProfile != nil {
			profileID = body.MediaProfile.ID
		}
		if profileID == "" {
			return fail(c, 400, "参数错误")
		}
		if err := c.DB().Where("id = ?", profileID).First(&p).Error; err != nil {
			return fail(c, 404, "没有匹配的详情")
		}
	}
	c.DB().Model(&pm).Update("media_profile_id", p.ID)
	if body.MediaProfile != nil && body.MediaProfile.Type == "av" {
		var media model.Media
		if err := c.DB().Where("profile_id = ? AND user_id = ?", p.ID, u.ID).First(&media).Error; err != nil {
			media = model.Media{ID: rid(), Type: 3, Text: *p.JavCode, ProfileID: p.ID, UserID: u.ID}
			c.DB().Create(&media)
		}
	}
	return ok(c, "设置成功", nil)
}

func AdminParsedMediaSetProfileAfterCreate(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ParsedMediaID string `json:"parsed_media_id"`
		TMDBID        string `json:"tmdb_id"`
		Type          int    `json:"type"`
	}
	if err := c.Bind(&body); err != nil || body.ParsedMediaID == "" || body.TMDBID == "" {
		return fail(c, 400, "参数错误")
	}
	var pm model.ParsedMedia
	if err := c.DB().Where("id = ? AND user_id = ?", body.ParsedMediaID, u.ID).First(&pm).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	var p model.MediaProfile
	if body.Type == 3 {
		if err := c.DB().Where("jav_code = ?", body.TMDBID).First(&p).Error; err == nil {
			c.DB().Model(&pm).Update("media_profile_id", p.ID)
			return ok(c, "设置成功", R{"id": p.ID})
		}
		jc := javbus.NewJavBusClient("")
		detail, err := jc.GetMovieDetail(body.TMDBID)
		if err != nil {
			return fail(c, 500, err.Error())
		}
		code := detail.Code
		p = model.MediaProfile{
			ID: rid(), Type: 3, Name: detail.Title, PosterPath: &detail.Cover,
			BackdropPath: &detail.Backdrop, AirDate: &detail.ReleaseDate, JavCode: &code,
		}
	} else {
		if err := c.DB().Where("tmdb_id = ?", body.TMDBID).First(&p).Error; err == nil {
			c.DB().Model(&pm).Update("media_profile_id", p.ID)
			return ok(c, "设置成功", R{"id": p.ID})
		}
		client := tmdb.NewClient()
		tmdbID, _ := strconv.Atoi(body.TMDBID)
		if body.Type == 2 {
			detail, err := client.FetchMovieProfile(tmdbID)
			if err != nil {
				return fail(c, 500, err.Error())
			}
			p = model.MediaProfile{
				ID: rid(), Type: 2, Name: detail.Name, OriginalName: &detail.OriginalName,
				Overview: &detail.Overview, PosterPath: &detail.PosterPath, BackdropPath: &detail.BackdropPath,
				AirDate: &detail.AirDate, TMDBID: &body.TMDBID,
			}
		} else {
			detail, err := client.FetchTVProfile(tmdbID)
			if err != nil {
				return fail(c, 500, err.Error())
			}
			p = model.MediaProfile{
				ID: rid(), Type: 1, Name: detail.Name, OriginalName: &detail.OriginalName,
				Overview: &detail.Overview, PosterPath: &detail.PosterPath, BackdropPath: &detail.BackdropPath,
				AirDate: &detail.FirstAirDate, TMDBID: &body.TMDBID,
			}
		}
	}
	c.DB().Create(&p)
	c.DB().Model(&pm).Update("media_profile_id", p.ID)
	return ok(c, "设置成功", R{"id": p.ID})
}

func AdminParsedMediaSetProfileInFileId(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		FileID string `json:"file_id"`
		TMDBID string `json:"tmdb_id"`
		Type   int    `json:"type"`
	}
	if err := c.Bind(&body); err != nil || body.FileID == "" || body.TMDBID == "" {
		return fail(c, 400, "参数错误")
	}
	var ps model.ParsedMediaSource
	if err := c.DB().Where("file_id = ? AND user_id = ?", body.FileID, u.ID).First(&ps).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	if ps.ParsedMediaID == nil {
		return fail(c, 400, "没有关联的 parsed_media")
	}
	client := tmdb.NewClient()
	tmdbID, _ := strconv.Atoi(body.TMDBID)
	var p model.MediaProfile
	if err := c.DB().Where("tmdb_id = ?", body.TMDBID).First(&p).Error; err == nil {
		c.DB().Model(&model.ParsedMedia{}).Where("id = ?", *ps.ParsedMediaID).Update("media_profile_id", p.ID)
		return ok(c, "设置成功", R{"id": p.ID})
	}
	if body.Type == 2 {
		detail, err := client.FetchMovieProfile(tmdbID)
		if err != nil {
			return fail(c, 500, err.Error())
		}
		p = model.MediaProfile{
			ID: rid(), Type: 2, Name: detail.Name, OriginalName: &detail.OriginalName,
			Overview: &detail.Overview, PosterPath: &detail.PosterPath, BackdropPath: &detail.BackdropPath,
			AirDate: &detail.AirDate, TMDBID: &body.TMDBID,
		}
	} else {
		detail, err := client.FetchTVProfile(tmdbID)
		if err != nil {
			return fail(c, 500, err.Error())
		}
		p = model.MediaProfile{
			ID: rid(), Type: 1, Name: detail.Name, OriginalName: &detail.OriginalName,
			Overview: &detail.Overview, PosterPath: &detail.PosterPath, BackdropPath: &detail.BackdropPath,
			AirDate: &detail.FirstAirDate, TMDBID: &body.TMDBID,
		}
	}
	c.DB().Create(&p)
	c.DB().Model(&model.ParsedMedia{}).Where("id = ?", *ps.ParsedMediaID).Update("media_profile_id", p.ID)
	return ok(c, "设置成功", R{"id": p.ID})
}

func AdminParsedMediaDelete(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ID string `json:"id"`
	}
	if err := c.Bind(&body); err != nil || body.ID == "" {
		return fail(c, 400, "缺少 id")
	}
	var pm model.ParsedMedia
	if err := c.DB().Where("id = ? AND user_id = ?", body.ID, u.ID).First(&pm).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	c.DB().Where("parsed_media_id = ?", pm.ID).Delete(&model.ParsedMediaSource{})
	c.DB().Delete(&pm)
	return ok(c, "删除成功", nil)
}

func AdminParsedMediaSourceList(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Name          string `json:"name"`
		Empty         *int   `json:"empty"`
		Type          *int   `json:"type"`
		ParsedMediaID string `json:"parsed_media_id"`
		NextMarker    string `json:"next_marker"`
		PageSize      int    `json:"page_size"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}
	db := c.DB().Where("\"ParsedSource\".user_id = ?", u.ID)
	if body.Name != "" {
		db = db.Where("\"ParsedSource\".name LIKE ? OR \"ParsedSource\".file_name LIKE ?", "%"+body.Name+"%", "%"+body.Name+"%")
	}
	if body.Empty != nil && *body.Empty == 1 {
		db = db.Where("\"ParsedSource\".media_source_id IS NULL")
	}
	if body.Type != nil {
		db = db.Where("\"ParsedSource\".type = ?", *body.Type)
	}
	if body.ParsedMediaID != "" {
		db = db.Where("\"ParsedSource\".parsed_media_id = ?", body.ParsedMediaID)
	}
	var total int64
	db.Model(&model.ParsedMediaSource{}).Count(&total)
	if body.NextMarker != "" {
		db = db.Where("\"ParsedSource\".id < ?", body.NextMarker)
	}
	var items []model.ParsedMediaSource
	db.Preload("ParsedMedia.MediaProfile").Preload("Drive").
		Order("\"ParsedSource\".created DESC").Limit(body.PageSize).Find(&items)
	list := make([]R, 0, len(items))
	var nextMarker string
	for _, ps := range items {
		item := R{
			"id":           ps.ID,
			"type":         ps.Type,
			"name":         ps.Name,
			"season_text":  ps.SeasonText,
			"episode_text": ps.EpisodeText,
			"file_name":    ps.FileName,
			"parent_paths": ps.ParentPaths,
		}
		if ps.ParsedMedia != nil && ps.ParsedMedia.MediaProfile != nil {
			item["profile"] = R{"id": ps.ParsedMedia.MediaProfile.ID, "name": ps.ParsedMedia.MediaProfile.Name}
		}
		if ps.Drive != nil {
			item["drive"] = R{"id": ps.Drive.ID, "name": ps.Drive.Name}
		}
		list = append(list, item)
		nextMarker = ps.ID
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func AdminParsedMediaSourceSetProfile(c Context) error {
	// TODO: requires TMDB client for profile resolution
	return fail(c, 501, "未实现")
}

func AdminParsedMediaSourceDelete(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ParsedMediaSourceID string `json:"parsed_media_source_id"`
	}
	if err := c.Bind(&body); err != nil || body.ParsedMediaSourceID == "" {
		return fail(c, 400, "缺少 parsed_media_source_id")
	}
	var ps model.ParsedMediaSource
	if err := c.DB().Where("id = ? AND user_id = ?", body.ParsedMediaSourceID, u.ID).First(&ps).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	c.DB().Delete(&ps)
	return ok(c, "删除成功", nil)
}

func AdminParsedMediaSourcePreview(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ParsedMediaSourceID string `json:"parsed_media_source_id"`
	}
	if err := c.Bind(&body); err != nil || body.ParsedMediaSourceID == "" {
		return fail(c, 400, "缺少 parsed_media_source_id")
	}
	var ps model.ParsedMediaSource
	if err := c.DB().Where("id = ? AND user_id = ?", body.ParsedMediaSourceID, u.ID).First(&ps).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	_, client, err := getDriveClient(c, ps.DriveID, u.ID)
	if err != nil {
		return fail(c, 500, err.Error())
	}
	info, err := client.Preview(ps.FileID)
	if err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "", info)
}

func AdminCollectionList(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Type       *int   `json:"type"`
		Name       string `json:"name"`
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}
	db := c.DB().Where("user_id = ?", u.ID)
	if body.Type != nil {
		db = db.Where("type = ?", *body.Type)
	}
	if body.Name != "" {
		db = db.Where("title LIKE ?", "%"+body.Name+"%")
	}
	var total int64
	db.Model(&model.CollectionV2{}).Count(&total)
	if body.NextMarker != "" {
		db = db.Where("id < ?", body.NextMarker)
	}
	var collections []model.CollectionV2
	db.Preload("Medias.Profile").Order("sort DESC, created DESC").Limit(body.PageSize).Find(&collections)
	list := make([]R, 0, len(collections))
	var nextMarker string
	for _, col := range collections {
		medias := make([]R, 0)
		for _, m := range col.Medias {
			mi := R{"id": m.ID, "type": m.Type}
			if m.Profile != nil {
				mi["name"] = m.Profile.Name
				mi["poster_path"] = m.Profile.PosterPath
				mi["air_date"] = m.Profile.AirDate
			}
			medias = append(medias, mi)
		}
		list = append(list, R{"id": col.ID, "title": col.Title, "desc": col.Desc, "medias": medias})
		nextMarker = col.ID
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func AdminCollectionCreate(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Title string `json:"title"`
		Desc  string `json:"desc"`
		Sort  int    `json:"sort"`
	}
	if err := c.Bind(&body); err != nil || body.Title == "" {
		return fail(c, 400, "缺少标题")
	}
	desc := body.Desc
	col := model.CollectionV2{ID: member.Rid(), Title: body.Title, Desc: &desc, Sort: body.Sort, Type: 1, UserID: u.ID}
	if err := c.DB().Create(&col).Error; err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "创建成功", nil)
}

func AdminCollectionEdit(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ID    string  `json:"id"`
		Title *string `json:"title"`
		Desc  *string `json:"desc"`
		Sort  *int    `json:"sort"`
	}
	if err := c.Bind(&body); err != nil || body.ID == "" {
		return fail(c, 400, "缺少 id")
	}
	var col model.CollectionV2
	if err := c.DB().Where("id = ? AND user_id = ?", body.ID, u.ID).First(&col).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	updates := map[string]interface{}{}
	if body.Title != nil {
		updates["title"] = *body.Title
	}
	if body.Desc != nil {
		updates["desc"] = *body.Desc
	}
	if body.Sort != nil {
		updates["sort"] = *body.Sort
	}
	if len(updates) > 0 {
		c.DB().Model(&col).Updates(updates)
	}
	return ok(c, "更新成功", nil)
}

func AdminCollectionDelete(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ID string `json:"id"`
	}
	if err := c.Bind(&body); err != nil || body.ID == "" {
		return fail(c, 400, "缺少 id")
	}
	var col model.CollectionV2
	if err := c.DB().Where("id = ? AND user_id = ?", body.ID, u.ID).First(&col).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	c.DB().Delete(&col)
	return ok(c, "删除成功", nil)
}

func AdminCollectionProfile(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ID string `json:"id"`
	}
	if err := c.Bind(&body); err != nil || body.ID == "" {
		return fail(c, 400, "缺少 id")
	}
	var col model.CollectionV2
	if err := c.DB().Preload("Medias.Profile").Where("id = ? AND user_id = ?", body.ID, u.ID).First(&col).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	medias := make([]R, 0)
	for _, m := range col.Medias {
		mi := R{"id": m.ID, "type": m.Type}
		if m.Profile != nil {
			mi["name"] = m.Profile.Name
			mi["poster_path"] = m.Profile.PosterPath
		}
		medias = append(medias, mi)
	}
	return ok(c, "", R{"id": col.ID, "title": col.Title, "desc": col.Desc, "sort": col.Sort, "type": col.Type, "medias": medias})
}

func AdminCollectionRefreshMediaRank(c Context) error {
	// TODO: requires external ranking data source
	return fail(c, 501, "未实现")
}

func AdminParsedMediaMatchProfile(c Context) error {
	// TODO: requires TMDB client
	return fail(c, 501, "未实现")
}

func MediaProfileList(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Name       string `json:"name"`
		Type       *int   `json:"type"`
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
		Page       int    `json:"page"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}
	_ = u
	db := c.DB()
	if body.Name != "" {
		db = db.Where("name LIKE ? OR original_name LIKE ?", "%"+body.Name+"%", "%"+body.Name+"%")
	}
	if body.Type != nil {
		db = db.Where("type = ?", *body.Type)
	}
	var total int64
	db.Model(&model.MediaProfile{}).Count(&total)
	if body.Page > 0 {
		db = db.Offset((body.Page - 1) * body.PageSize)
	} else if body.NextMarker != "" {
		db = db.Where("id < ?", body.NextMarker)
	}
	var profiles []model.MediaProfile
	db.Preload("Genres").Preload("OriginCountries").Preload("Persons").Preload("Persons.Profile").Order("created DESC").Limit(body.PageSize).Find(&profiles)
	list := make([]R, 0, len(profiles))
	var nextMarker string
	for _, p := range profiles {
		genres := make([]string, 0)
		for _, g := range p.Genres {
			genres = append(genres, g.Text)
		}
		countries := make([]string, 0)
		for _, co := range p.OriginCountries {
			countries = append(countries, co.Text)
		}
		persons := make([]R, 0)
		for _, pe := range p.Persons {
			pr := R{"id": pe.ID, "name": pe.Name, "order": pe.Order}
			if pe.Profile != nil {
				pr["profile_path"] = pe.Profile.ProfilePath
			}
			persons = append(persons, pr)
		}
		externalIDs := make([]R, 0)
		if p.JavCode != nil && *p.JavCode != "" {
			externalIDs = append(externalIDs, R{"name": "jav", "value": *p.JavCode})
		}
		if p.TMDBID != nil && *p.TMDBID != "" {
			externalIDs = append(externalIDs, R{"name": "tmdb", "value": *p.TMDBID})
		}
		if p.DoubanID != nil && *p.DoubanID != "" {
			externalIDs = append(externalIDs, R{"name": "douban", "value": *p.DoubanID})
		}
		if p.IMDBID != nil && *p.IMDBID != "" {
			externalIDs = append(externalIDs, R{"name": "imdb", "value": *p.IMDBID})
		}
		list = append(list, R{
			"id":             p.ID,
			"type":           p.Type,
			"name":           p.Name,
			"original_name":  p.OriginalName,
			"poster_path":    p.PosterPath,
			"air_date":       p.AirDate,
			"vote_average":   p.VoteAverage,
			"source_count":   p.SourceCount,
			"genres":         genres,
			"origin_country": countries,
			"persons":        persons,
			"external_ids":   externalIDs,
		})
		nextMarker = p.ID
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func MediaProfileSearch(c Context) error {
	return MediaProfileSearchTmdb(c)
}

func MediaProfilePartial(c Context) error {
	_, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ID string `json:"id"`
	}
	if err := c.Bind(&body); err != nil || body.ID == "" {
		return fail(c, 400, "缺少 id")
	}
	var p model.MediaProfile
	if err := c.DB().Preload("Genres").Preload("OriginCountries").Where("id = ?", body.ID).First(&p).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	genres := make([]string, 0)
	for _, g := range p.Genres {
		genres = append(genres, g.Text)
	}
	countries := make([]string, 0)
	for _, co := range p.OriginCountries {
		countries = append(countries, co.Text)
	}
	externalIDs := make([]R, 0)
	if p.JavCode != nil && *p.JavCode != "" {
		externalIDs = append(externalIDs, R{"name": "jav", "value": *p.JavCode})
	}
	if p.TMDBID != nil && *p.TMDBID != "" {
		externalIDs = append(externalIDs, R{"name": "tmdb", "value": *p.TMDBID})
	}
	if p.DoubanID != nil && *p.DoubanID != "" {
		externalIDs = append(externalIDs, R{"name": "douban", "value": *p.DoubanID})
	}
	if p.IMDBID != nil && *p.IMDBID != "" {
		externalIDs = append(externalIDs, R{"name": "imdb", "value": *p.IMDBID})
	}
	return ok(c, "", R{
		"id": p.ID, "type": p.Type, "name": p.Name, "original_name": p.OriginalName,
		"poster_path": p.PosterPath, "air_date": p.AirDate, "vote_average": p.VoteAverage,
		"source_count": p.SourceCount, "genres": genres, "origin_country": countries,
		"overview": p.Overview, "backdrop_path": p.BackdropPath,
		"external_ids": externalIDs,
	})
}

func MediaProfileProfile(c Context) error {
	_, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ID string `json:"id"`
	}
	if err := c.Bind(&body); err != nil || body.ID == "" {
		return fail(c, 400, "缺少 id")
	}
	var p model.MediaProfile
	if err := c.DB().Preload("Genres").Preload("OriginCountries").Preload("Series").Preload("SourceProfiles").Preload("Persons").Preload("Persons.Profile").
		Where("id = ?", body.ID).First(&p).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	genres := make([]string, 0)
	for _, g := range p.Genres {
		genres = append(genres, g.Text)
	}
	countries := make([]string, 0)
	for _, co := range p.OriginCountries {
		countries = append(countries, co.Text)
	}
	episodes := make([]R, 0)
	for _, sp := range p.SourceProfiles {
		episodes = append(episodes, R{"id": sp.ID, "name": sp.Name, "order": sp.Order, "air_date": sp.AirDate, "runtime": sp.Runtime})
	}
	persons := make([]R, 0)
	for _, pe := range p.Persons {
		pr := R{"id": pe.ID, "name": pe.Name, "order": pe.Order}
		if pe.Profile != nil {
			pr["profile_path"] = pe.Profile.ProfilePath
		}
		persons = append(persons, pr)
	}
	item := R{
		"id": p.ID, "type": p.Type, "name": p.Name, "original_name": p.OriginalName,
		"poster_path": p.PosterPath, "backdrop_path": p.BackdropPath, "air_date": p.AirDate,
		"vote_average": p.VoteAverage, "source_count": p.SourceCount, "overview": p.Overview,
		"genres": genres, "origin_country": countries, "episodes": episodes, "persons": persons,
		"tmdb_id": p.TMDBID, "imdb_id": p.IMDBID, "douban_id": p.DoubanID, "jav_code": p.JavCode,
	}
	if p.Tips != nil {
		var tips R
		if json.Unmarshal([]byte(*p.Tips), &tips) == nil {
			item["tips"] = tips
		}
	}
	if p.Series != nil {
		item["series"] = R{"id": p.Series.ID, "name": p.Series.Name}
	}
	return ok(c, "", item)
}

func MediaProfileSeriesProfile(c Context) error {
	_, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ID string `json:"id"`
	}
	if err := c.Bind(&body); err != nil || body.ID == "" {
		return fail(c, 400, "缺少 id")
	}
	var s model.MediaSeriesProfile
	if err := c.DB().Preload("MediaProfiles").Where("id = ?", body.ID).First(&s).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	seasons := make([]R, 0)
	for _, p := range s.MediaProfiles {
		seasons = append(seasons, R{"id": p.ID, "name": p.Name, "poster_path": p.PosterPath, "air_date": p.AirDate, "order": p.Order})
	}
	return ok(c, "", R{"id": s.ID, "name": s.Name, "poster_path": s.PosterPath, "seasons": seasons})
}

func MediaProfileSetName(c Context) error {
	_, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	}
	if err := c.Bind(&body); err != nil || body.ID == "" || body.Name == "" {
		return fail(c, 400, "参数错误")
	}
	var p model.MediaProfile
	if err := c.DB().Where("id = ?", body.ID).First(&p).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	c.DB().Model(&p).Update("name", body.Name)
	return ok(c, "更新成功", nil)
}

func MediaProfileRefresh(c Context) error {
	_, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ID string `json:"id"`
	}
	if err := c.Bind(&body); err != nil || body.ID == "" {
		return fail(c, 400, "缺少 id")
	}
	var p model.MediaProfile
	if err := c.DB().Where("id = ?", body.ID).First(&p).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	if p.Type == 3 {
		if p.JavCode == nil {
			return fail(c, 400, "没有关联的 JavCode")
		}
		jc := javbus.NewJavBusClient("")
		detail, err := jc.GetMovieDetail(*p.JavCode)
		if err != nil {
			return fail(c, 500, err.Error())
		}
		tips, _ := json.Marshal(R{"director": detail.Director, "studio": detail.Studio, "label": detail.Label, "length": detail.Length})
		tipsStr := string(tips)
		c.DB().Model(&p).Updates(map[string]interface{}{
			"name": detail.Title, "poster_path": detail.Cover, "backdrop_path": detail.Backdrop, "air_date": detail.ReleaseDate, "tips": tipsStr,
		})
		// genres
		for _, g := range detail.Genres {
			var genre model.MediaGenre
			if err := c.DB().Where("text = ?", g).First(&genre).Error; err != nil {
				genre = model.MediaGenre{Text: g}
				c.DB().Create(&genre)
			}
			c.DB().Exec(`INSERT OR IGNORE INTO "_MediaGenreToMediaProfile" ("A","B") VALUES (?,?)`, genre.ID, p.ID)
		}
		// actors
		if detail.Director != "" {
			savePerson(c.DB(), p.ID, detail.Director, nil, "Directing", 0, nil)
		}
		for i, actor := range detail.Actors {
			var avatar *string
			if actor.Avatar != "" {
				avatar = &actor.Avatar
			}
			savePerson(c.DB(), p.ID, actor.Name, nil, "Acting", i, avatar)
		}
	} else {
		if p.TMDBID == nil {
			return fail(c, 400, "没有关联的 TMDB ID")
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
				return fail(c, 500, err.Error())
			}
			c.DB().Model(&p).Updates(map[string]interface{}{
				"name": detail.Name, "original_name": detail.OriginalName,
				"overview": detail.Overview, "poster_path": detail.PosterPath,
				"backdrop_path": detail.BackdropPath, "air_date": detail.AirDate,
			})
			// Fetch and save persons
			persons, err := client.FetchPersonsOfMovie(tmdbID)
			if err == nil {
				for _, pItem := range persons {
					tmdbIDStr := strconv.Itoa(pItem.ID)
					var pp *string
					if pItem.ProfilePath != "" {
						pp = &pItem.ProfilePath
					}
					savePerson(c.DB(), p.ID, pItem.Name, &tmdbIDStr, pItem.KnownForDepartment, pItem.Order, pp)
				}
			}
		} else {
			// For TV Season (Type=1), we fetch show info to update season? This seems questionable but keeping existing logic.
			// Ideally we should use FetchSeasonProfile if it's a season.
			// Existing logic uses FetchTVProfile(tmdbID) which updates Season with Show info.
			detail, err := client.FetchTVProfile(tmdbID)
			if err != nil {
				return fail(c, 500, err.Error())
			}
			c.DB().Model(&p).Updates(map[string]interface{}{
				"name": detail.Name, "original_name": detail.OriginalName,
				"overview": detail.Overview, "poster_path": detail.PosterPath,
				"backdrop_path": detail.BackdropPath, "air_date": detail.FirstAirDate,
			})
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
					savePerson(c.DB(), p.ID, pItem.Name, &tmdbIDStr, pItem.KnownForDepartment, pItem.Order, pp)
				}
			}
		}
	}
	return ok(c, "刷新成功", nil)
}

func MediaProfileInitSeries(c Context) error {
	_, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ID string `json:"id"`
	}
	if err := c.Bind(&body); err != nil || body.ID == "" {
		return fail(c, 400, "缺少 id")
	}
	var p model.MediaProfile
	if err := c.DB().Where("id = ?", body.ID).First(&p).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	if p.TMDBID == nil {
		return fail(c, 400, "没有关联的 TMDB ID")
	}
	if p.SeriesID != nil {
		return ok(c, "已存在", R{"series_id": *p.SeriesID})
	}
	client := tmdb.NewClient()
	tmdbID, _ := strconv.Atoi(*p.TMDBID)
	detail, err := client.FetchTVProfile(tmdbID)
	if err != nil {
		return fail(c, 500, err.Error())
	}
	// Check if series already exists by TMDB ID
	var series model.MediaSeriesProfile
	if err := c.DB().Where("tmdb_id = ?", *p.TMDBID).First(&series).Error; err != nil {
		series = model.MediaSeriesProfile{
			ID:           rid(),
			Name:         detail.Name,
			OriginalName: &detail.OriginalName,
			Overview:     &detail.Overview,
			PosterPath:   &detail.PosterPath,
			BackdropPath: &detail.BackdropPath,
			AirDate:      &detail.FirstAirDate,
			TMDBID:       p.TMDBID,
		}
		c.DB().Create(&series)
	}
	c.DB().Model(&p).Update("series_id", series.ID)
	return ok(c, "初始化成功", R{"series_id": series.ID})
}

func MediaProfileInitSeason(c Context) error {
	_, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ID           string `json:"id"`
		SeasonNumber int    `json:"season_number"`
	}
	if err := c.Bind(&body); err != nil || body.ID == "" {
		return fail(c, 400, "缺少 id")
	}
	var p model.MediaProfile
	if err := c.DB().Where("id = ?", body.ID).First(&p).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	if p.TMDBID == nil {
		return fail(c, 400, "没有关联的 TMDB ID")
	}
	client := tmdb.NewClient()
	tmdbID, _ := strconv.Atoi(*p.TMDBID)
	season, err := client.FetchSeasonProfile(tmdbID, body.SeasonNumber)
	if err != nil {
		return fail(c, 500, err.Error())
	}
	for _, ep := range season.Episodes {
		epTMDBID := strconv.Itoa(ep.ID)
		var existing model.MediaSourceProfile
		if c.DB().Where("tmdb_id = ?", epTMDBID).First(&existing).Error == nil {
			continue
		}
		sp := model.MediaSourceProfile{
			ID:             rid(),
			Name:           ep.Name,
			Overview:       &ep.Overview,
			AirDate:        &ep.AirDate,
			StillPath:      &ep.StillPath,
			Order:          ep.EpisodeNumber,
			TMDBID:         &epTMDBID,
			MediaProfileID: p.ID,
		}
		if ep.Runtime > 0 {
			sp.Runtime = &ep.Runtime
		}
		c.DB().Create(&sp)
	}
	c.DB().Model(&p).Update("source_count", len(season.Episodes))
	return ok(c, "初始化成功", R{"episode_count": len(season.Episodes)})
}

func MediaProfileEdit(c Context) error {
	_, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ID           string  `json:"id"`
		Name         *string `json:"name"`
		OriginalName *string `json:"original_name"`
		Overview     *string `json:"overview"`
		PosterPath   *string `json:"poster_path"`
		AirDate      *string `json:"air_date"`
	}
	if err := c.Bind(&body); err != nil || body.ID == "" {
		return fail(c, 400, "缺少 id")
	}
	var p model.MediaProfile
	if err := c.DB().Where("id = ?", body.ID).First(&p).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	updates := map[string]interface{}{}
	if body.Name != nil {
		updates["name"] = *body.Name
	}
	if body.OriginalName != nil {
		updates["original_name"] = *body.OriginalName
	}
	if body.Overview != nil {
		updates["overview"] = *body.Overview
	}
	if body.PosterPath != nil {
		updates["poster_path"] = *body.PosterPath
	}
	if body.AirDate != nil {
		updates["air_date"] = *body.AirDate
	}
	if len(updates) > 0 {
		c.DB().Model(&p).Updates(updates)
	}
	return ok(c, "更新成功", nil)
}

func MediaProfileDelete(c Context) error {
	_, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ID string `json:"id"`
	}
	if err := c.Bind(&body); err != nil || body.ID == "" {
		return fail(c, 400, "缺少 id")
	}
	var p model.MediaProfile
	if err := c.DB().Where("id = ?", body.ID).First(&p).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	c.DB().Delete(&p)
	return ok(c, "删除成功", nil)
}

func MediaProfileSearchTmdb(c Context) error {
	_, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Keyword string `json:"keyword"`
		Page    int    `json:"page"`
		Type    int    `json:"type"`
	}
	if err := c.Bind(&body); err != nil {
		return fail(c, 400, err.Error())
	}
	if body.Keyword == "" {
		return fail(c, 400, "缺少 keyword")
	}
	client := tmdb.NewClient()
	if body.Type == 2 {
		result, err := client.SearchMovie(body.Keyword, body.Page)
		if err != nil {
			return fail(c, 500, err.Error())
		}
		return ok(c, "", R{"list": result.List, "total": result.Total, "page": result.Page})
	}
	result, err := client.SearchTV(body.Keyword, body.Page)
	if err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "", R{"list": result.List, "total": result.Total, "page": result.Page})
}

func MediaProfileSearchJavbus(c Context) error {
	_, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Keyword string `json:"keyword"`
		Page    int    `json:"page"`
	}
	if err := c.Bind(&body); err != nil {
		return fail(c, 400, err.Error())
	}
	if body.Keyword == "" {
		return fail(c, 400, "缺少 keyword")
	}
	if body.Page < 1 {
		body.Page = 1
	}
	list := make([]types.MovieProfile, 0)
	client := javbus.NewJavBusClient("")
	resp, err := client.Search(body.Keyword, body.Page)
	if err != nil {
		return fail(c, 500, "搜索失败: "+err.Error())
	}
	if len(resp.Data) == 0 {
		return ok(c, "", R{"list": list, "total": 0, "page": body.Page})
	}
	for _, m := range resp.Data {
		// 如果数据库中不存在，就保存该记录
		var profile model.MediaProfile
		code := m.Code
		if err := c.DB().Where("jav_code = ?", code).First(&profile).Error; err != nil {
			profile = model.MediaProfile{
				ID:         rid(),
				Type:       3,
				Name:       m.Title,
				PosterPath: &m.Cover,
				JavCode:    &code,
			}
			c.DB().Create(&profile)
			sp := model.MediaSourceProfile{
				ID:             rid(),
				Type:           3,
				Name:           m.Code,
				MediaProfileID: profile.ID,
			}
			c.DB().Create(&sp)
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
	total := len(list)
	return ok(c, "", R{"list": list, "total": total, "page": body.Page})
}

func AdminSharedFileCheckSameName(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		URL string `json:"url"`
	}
	if err := c.Bind(&body); err != nil || body.URL == "" {
		return fail(c, 400, "缺少 url")
	}
	var existing model.SharedFile
	if err := c.DB().Where("url = ? AND user_id = ?", body.URL, u.ID).First(&existing).Error; err == nil {
		return ok(c, "", R{"existing": true, "id": existing.ID})
	}
	return ok(c, "", R{"existing": false})
}

func AdminSharedFileSearch(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Name       string `json:"name"`
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}
	db := c.DB().Where("user_id = ?", u.ID)
	if body.Name != "" {
		db = db.Where("title LIKE ? OR url LIKE ?", "%"+body.Name+"%", "%"+body.Name+"%")
	}
	var total int64
	db.Model(&model.SharedFile{}).Count(&total)
	if body.NextMarker != "" {
		db = db.Where("id < ?", body.NextMarker)
	}
	var files []model.SharedFile
	db.Order("created DESC").Limit(body.PageSize).Find(&files)
	list := make([]R, 0, len(files))
	var nextMarker string
	for _, f := range files {
		list = append(list, R{"id": f.ID, "title": f.Title, "url": f.URL, "created": f.Created})
		nextMarker = f.ID
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func AdminSharedFileSaveList(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}
	db := c.DB().Where("user_id = ?", u.ID)
	if body.NextMarker != "" {
		db = db.Where("id < ?", body.NextMarker)
	}
	var files []model.SharedFileInProgress
	db.Preload("Drive").Order("created DESC").Limit(body.PageSize).Find(&files)
	list := make([]R, 0, len(files))
	var nextMarker string
	for _, f := range files {
		item := R{"id": f.ID, "url": f.URL, "name": f.Name, "file_id": f.FileID, "created": f.Created}
		if f.Drive != nil {
			item["drive"] = R{"id": f.Drive.ID, "name": f.Drive.Name}
		}
		list = append(list, item)
		nextMarker = f.ID
	}
	return ok(c, "", R{"list": list, "next_marker": nextMarker})
}

func AdminTvList(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Name       string `json:"name"`
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}
	db := c.DB().Where("user_id = ? AND hidden = 0", u.ID)
	if body.Name != "" {
		db = db.Where("name LIKE ?", "%"+body.Name+"%")
	}
	var total int64
	db.Model(&model.TVLive{}).Count(&total)
	if body.NextMarker != "" {
		db = db.Where("id < ?", body.NextMarker)
	}
	var lives []model.TVLive
	db.Order("\"order\" ASC").Limit(body.PageSize).Find(&lives)
	list := make([]R, 0, len(lives))
	var nextMarker string
	for _, l := range lives {
		list = append(list, R{"id": l.ID, "name": l.Name, "url": l.URL, "logo": l.Logo, "group_name": l.GroupName, "order": l.Order})
		nextMarker = l.ID
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}
