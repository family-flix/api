package handler

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/labstack/echo/v4"

	"github.com/family-flix/api/internal/model"
	"github.com/family-flix/api/internal/repository"
	"github.com/family-flix/api/internal/service"
	"gorm.io/gorm"
)

type AdminMediaHandler struct {
	BaseHandler
	service service.MediaService
}

func NewAdminMediaHandler(service service.MediaService, db *gorm.DB, baseDir, cacheDir, ffmpegBin string) *AdminMediaHandler {
	return &AdminMediaHandler{
		BaseHandler: BaseHandler{
			db:        db,
			baseDir:   baseDir,
			cacheDir:  cacheDir,
			ffmpegBin: ffmpegBin,
		},
		service: service,
	}
}

func (h *AdminMediaHandler) Transfer(ec echo.Context) error {
	c := h.NewContext(ec)
	// TODO: requires drive client for file transfer
	return fail(c, 501, "未实现")
}

func (h *AdminMediaHandler) ArchiveList(ec echo.Context) error {
	c := h.NewContext(ec)
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
		Page       int    `json:"page"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}

	filter := repository.MediaFilter{
		UserID:     u.ID,
		Name:       body.Name,
		Type:       body.Type,
		DriveIDs:   body.DriveIDs,
		NextMarker: body.NextMarker,
		PageSize:   body.PageSize,
		Page:       body.Page,
	}

	medias, total, nextMarker, err := h.service.ListMedia(c.Context(), filter)
	if err != nil {
		return fail(c, 500, err.Error())
	}

	list := make([]R, 0, len(medias))
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
			for _, f := range s.Sources {
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
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func (h *AdminMediaHandler) ArchivePartial(ec echo.Context) error {
	c := h.NewContext(ec)
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

	m, err := h.service.GetMedia(c.Context(), body.MediaID, u.ID)
	if err != nil {
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
		for _, f := range s.Sources {
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

func (h *AdminMediaHandler) ToResourceDrive(ec echo.Context) error {
	c := h.NewContext(ec)
	// TODO: requires drive client for file move
	return fail(c, 501, "未实现")
}

func (h *AdminMediaHandler) RefreshProfile(ec echo.Context) error {
	c := h.NewContext(ec)
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

	id, err := h.service.RefreshMediaProfile(c.Context(), body.MediaID, u.ID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return fail(c, 404, "没有匹配的记录")
		}
		if strings.Contains(err.Error(), "unsupported media type") {
			return fail(c, 501, "未实现")
		}
		return fail(c, 500, err.Error())
	}

	return ok(c, "刷新成功", R{"id": id})
}

func (h *AdminMediaHandler) ListInvalidMedia(ec echo.Context) error {
	c := h.NewContext(ec)
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

	filter := repository.MediaFilter{
		UserID:     u.ID,
		Type:       body.Type,
		NextMarker: body.NextMarker,
		PageSize:   body.PageSize,
	}

	invalids, total, nextMarker, err := h.service.ListInvalidMedia(c.Context(), filter)
	if err != nil {
		return fail(c, 500, err.Error())
	}

	list := make([]R, 0, len(invalids))
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
	}
	return ok(c, "", R{"list": list, "total": total, "next_marker": nextMarker})
}

func (h *AdminMediaHandler) DeleteMedia(ec echo.Context) error {
	c := h.NewContext(ec)
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

	if err := h.service.DeleteMedia(c.Context(), body.MediaID, u.ID); err != nil {
		if strings.Contains(err.Error(), "not found") {
			return fail(c, 404, "没有匹配的记录")
		}
		return fail(c, 500, err.Error())
	}

	return ok(c, "删除成功", nil)
}

func (h *AdminMediaHandler) SetProfile(ec echo.Context) error {
	c := h.NewContext(ec)
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

	id, err := h.service.SetMediaProfile(c.Context(), body.MediaID, body.TMDBID, body.Type, u.ID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return fail(c, 404, "没有匹配的记录")
		}
		return fail(c, 500, err.Error())
	}

	return ok(c, "设置成功", R{"id": id})
}

func (h *AdminMediaHandler) ListMediaSource(ec echo.Context) error {
	c := h.NewContext(ec)
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		MediaID    string `json:"media_id"`
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
		Page       int    `json:"page"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}

	sources, total, nextMarker, err := h.service.ListMediaSources(c.Context(), body.MediaID, u.ID, body.NextMarker, body.PageSize, body.Page)
	if err != nil {
		return fail(c, 500, err.Error())
	}

	list := make([]R, 0, len(sources))
	for _, s := range sources {
		item := R{"id": s.ID, "media_id": s.MediaID}
		if s.Profile != nil {
			item["name"] = s.Profile.Name
			item["order"] = s.Profile.Order
		}
		files := make([]R, 0)
		for _, f := range s.Sources {
			fi := R{"id": f.ID, "file_id": f.FileID, "file_name": f.FileName, "parent_paths": f.ParentPaths, "size": f.Size}
			if f.Drive != nil {
				fi["drive"] = R{"id": f.Drive.ID, "name": f.Drive.Name}
			}
			files = append(files, fi)
		}
		item["files"] = files
		list = append(list, item)
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func (h *AdminMediaHandler) ListSeason(ec echo.Context) error {
	c := h.NewContext(ec)
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

	medias, total, nextMarker, err := h.service.ListSeasons(c.Context(), body.Name, body.NextMarker, body.PageSize, body.Page, u.ID)
	if err != nil {
		return fail(c, 500, err.Error())
	}

	list := make([]R, 0, len(medias))
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
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func (h *AdminMediaHandler) GetSeasonProfile(ec echo.Context) error {
	c := h.NewContext(ec)
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

	m, err := h.service.GetSeasonProfile(c.Context(), body.SeasonID, u.ID)
	if err != nil {
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
		for _, f := range s.Sources {
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

func (h *AdminMediaHandler) GetSeasonPartial(ec echo.Context) error {
	c := h.NewContext(ec)
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

	m, err := h.service.GetSeasonPartial(c.Context(), body.MediaID, u.ID)
	if err != nil {
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

func (h *AdminMediaHandler) ListMovie(ec echo.Context) error {
	c := h.NewContext(ec)
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

	medias, total, nextMarker, err := h.service.ListMovies(c.Context(), body.Name, body.NextMarker, body.PageSize, body.Page, u.ID)
	if err != nil {
		return fail(c, 500, err.Error())
	}

	list := make([]R, 0, len(medias))
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
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func (h *AdminMediaHandler) ListAV(ec echo.Context) error {
	c := h.NewContext(ec)
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

	medias, total, nextMarker, err := h.service.ListAVs(c.Context(), body.Name, body.Page, body.PageSize, body.NextMarker, u.ID)
	if err != nil {
		return fail(c, 500, err.Error())
	}

	list := make([]R, 0, len(medias))
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
				for _, f := range s.Sources {
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
			files, err := h.service.GetParsedSourcesForProfile(c.Context(), m.ProfileID, u.ID)
			if err == nil {
				for _, f := range files {
					src := R{"id": f.ID, "file_id": f.FileID, "file_name": f.FileName, "parent_paths": f.ParentPaths, "size": f.Size}
					if f.Drive != nil {
						src["drive"] = R{"id": f.Drive.ID, "name": f.Drive.Name}
					}
					sources = append(sources, src)
				}
			}
		}
		item["sources"] = sources

		list = append(list, item)
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func (h *AdminMediaHandler) ListArtist(ec echo.Context) error {
	c := h.NewContext(ec)
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
	_ = u

	persons, total, nextMarker, err := h.service.ListArtists(c.Context(), body.Name, body.NextMarker, body.PageSize, body.Page)
	if err != nil {
		return fail(c, 500, err.Error())
	}

	list := make([]R, 0, len(persons))
	for _, p := range persons {
		item := R{"id": p.ID, "name": p.Name, "profile_path": p.ProfilePath, "birthday": p.Birthday}
		if p.KnownForDepartment != nil {
			item["known_for_department"] = *p.KnownForDepartment
		}
		list = append(list, item)
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func (h *AdminMediaHandler) GetMovieProfile(ec echo.Context) error {
	c := h.NewContext(ec)
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

	m, err := h.service.GetMovieProfile(c.Context(), body.MediaID, u.ID)
	if err != nil {
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
		item["persons"] = m.Profile.Persons
	}
	sources := make([]R, 0)
	for _, s := range m.MediaSources {
		src := R{"id": s.ID}
		for _, f := range s.Sources {
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

func (h *AdminMediaHandler) GetAVProfile(ec echo.Context) error {
	c := h.NewContext(ec)
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

	m, err := h.service.GetAVProfile(c.Context(), body.MediaID, u.ID)
	if err != nil {
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
			for _, f := range s.Sources {
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
		files, err := h.service.GetParsedSourcesForProfile(c.Context(), m.ProfileID, u.ID)
		if err == nil {
			for _, f := range files {
				src := R{"id": f.ID, "file_id": f.FileID, "file_name": f.FileName, "parent_paths": f.ParentPaths, "size": f.Size}
				if f.Drive != nil {
					src["drive"] = R{"id": f.Drive.ID, "name": f.Drive.Name}
				}
				sources = append(sources, src)
			}
		}
	}
	item["sources"] = sources
	return ok(c, "", item)
}

func (h *AdminMediaHandler) ListSubtitle(ec echo.Context) error {
	c := h.NewContext(ec)
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

	filter := repository.SubtitleFilter{
		UserID:   u.ID,
		Name:     body.Name,
		Page:     body.Page,
		PageSize: body.PageSize,
	}

	subtitles, total, err := h.service.ListSubtitles(c.Context(), filter)
	if err != nil {
		return fail(c, 500, err.Error())
	}

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

func (h *AdminMediaHandler) AdminSubtitleParse(ec echo.Context) error {
	c := h.NewContext(ec)
	// TODO: requires filename parser
	return fail(c, 501, "未实现")
}

func (h *AdminMediaHandler) AdminSubtitleBatchCreate(ec echo.Context) error {
	c := h.NewContext(ec)
	// TODO: requires file upload handling
	return fail(c, 501, "未实现")
}

func (h *AdminMediaHandler) DeleteSubtitle(ec echo.Context) error {
	c := h.NewContext(ec)
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

	if err := h.service.DeleteSubtitle(c.Context(), body.SubtitleID, u.ID); err != nil {
		return fail(c, 404, "没有匹配的记录")
	}

	return ok(c, "删除成功", nil)
}

func (h *AdminMediaHandler) AdminParsedMediaList(ec echo.Context) error {
	c := h.NewContext(ec)
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
		Page       int    `json:"page"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}
	pageSize := body.PageSize
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

	if body.Page > 0 {
		db = db.Offset((body.Page - 1) * pageSize)
	} else if body.NextMarker != "" {
		db = db.Where("\"ParsedMedia\".id < ?", body.NextMarker)
	}
	var items []model.ParsedMedia
	db.Preload("MediaProfile").Preload("ParsedSources", func(tx *gorm.DB) *gorm.DB {
		return tx.Limit(5)
	}).Preload("ParsedSources.MediaSource.Profile").Preload("ParsedSources.Drive").
		Order("\"ParsedMedia\".created DESC").Limit(pageSize + 1).Find(&items)

	var nextMarker string
	if len(items) > pageSize {
		nextMarker = items[pageSize-1].ID
		items = items[:pageSize]
	}

	list := make([]R, 0, len(items))
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
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func (h *AdminMediaHandler) SetParsedMediaProfile(ec echo.Context) error {
	c := h.NewContext(ec)
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ParsedMediaID  string                             `json:"parsed_media_id"`
		MediaProfileID string                             `json:"media_profile_id"`
		MediaProfile   *service.ParsedMediaProfilePayload `json:"media_profile"`
	}
	if err := c.Bind(&body); err != nil || body.ParsedMediaID == "" {
		return fail(c, 400, "参数错误")
	}

	_, err = h.service.SetParsedMediaProfile(c.Context(), body.ParsedMediaID, body.MediaProfileID, body.MediaProfile, u.ID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") || strings.Contains(err.Error(), "没有匹配") {
			return fail(c, 404, err.Error())
		}
		return fail(c, 500, err.Error())
	}

	return ok(c, "设置成功", nil)
}

func (h *AdminMediaHandler) SetParsedMediaProfileAfterCreate(ec echo.Context) error {
	c := h.NewContext(ec)
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

	pID, err := h.service.SetParsedMediaProfileAfterCreate(c.Context(), body.ParsedMediaID, body.TMDBID, body.Type, u.ID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return fail(c, 404, "没有匹配的记录")
		}
		return fail(c, 500, err.Error())
	}

	return ok(c, "设置成功", R{"id": pID})
}

func (h *AdminMediaHandler) SetParsedMediaProfileByFileID(ec echo.Context) error {
	c := h.NewContext(ec)
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

	pID, err := h.service.SetParsedMediaProfileByFileID(c.Context(), body.FileID, body.TMDBID, body.Type, u.ID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return fail(c, 404, "没有匹配的记录")
		}
		return fail(c, 500, err.Error())
	}

	return ok(c, "设置成功", R{"id": pID})
}

func (h *AdminMediaHandler) AdminParsedMediaDelete(ec echo.Context) error {
	c := h.NewContext(ec)
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

func (h *AdminMediaHandler) AdminParsedMediaSourceList(ec echo.Context) error {
	c := h.NewContext(ec)
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
		Page          int    `json:"page"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}
	pageSize := body.PageSize
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

	if body.Page > 0 {
		db = db.Offset((body.Page - 1) * pageSize)
	} else if body.NextMarker != "" {
		db = db.Where("\"ParsedSource\".id < ?", body.NextMarker)
	}
	var items []model.ParsedMediaSource
	db.Preload("ParsedMedia.MediaProfile").Preload("Drive").
		Order("\"ParsedSource\".created DESC").Limit(pageSize + 1).Find(&items)

	var nextMarker string
	if len(items) > pageSize {
		nextMarker = items[pageSize-1].ID
		items = items[:pageSize]
	}

	list := make([]R, 0, len(items))
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
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func (h *AdminMediaHandler) AdminParsedMediaSourceSetProfile(ec echo.Context) error {
	c := h.NewContext(ec)
	// TODO: requires TMDB client for profile resolution
	return fail(c, 501, "未实现")
}

func (h *AdminMediaHandler) AdminParsedMediaSourceDelete(ec echo.Context) error {
	c := h.NewContext(ec)
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

func (h *AdminMediaHandler) AdminParsedMediaSourcePreview(ec echo.Context) error {
	c := h.NewContext(ec)
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

func (h *AdminMediaHandler) AdminParsedMediaMatchProfile(ec echo.Context) error {
	c := h.NewContext(ec)
	// TODO: requires TMDB client
	return fail(c, 501, "未实现")
}

func (h *AdminMediaHandler) AdminTvList(ec echo.Context) error {
	c := h.NewContext(ec)
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
	pageSize := body.PageSize
	db := c.DB().Where("user_id = ? AND hidden = 0", u.ID)
	if body.Name != "" {
		db = db.Where("name LIKE ?", "%"+body.Name+"%")
	}
	var total int64
	db.Model(&model.TVLive{}).Count(&total)

	if body.Page > 0 {
		db = db.Offset((body.Page - 1) * pageSize)
	} else if body.NextMarker != "" {
		db = db.Where("id < ?", body.NextMarker)
	}
	var lives []model.TVLive
	db.Order("\"order\" ASC").Limit(pageSize + 1).Find(&lives)

	var nextMarker string
	if len(lives) > pageSize {
		nextMarker = lives[pageSize-1].ID
		lives = lives[:pageSize]
	}

	list := make([]R, 0, len(lives))
	for _, l := range lives {
		list = append(list, R{"id": l.ID, "name": l.Name, "url": l.URL, "logo": l.Logo, "group_name": l.GroupName, "order": l.Order})
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}
