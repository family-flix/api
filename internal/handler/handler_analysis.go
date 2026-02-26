package handler

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/family-flix/api/internal/model"
	"github.com/family-flix/api/pkg/drive_client/localdrive"
	"github.com/family-flix/api/pkg/folder"
	"github.com/family-flix/api/pkg/media_profile/javbus"
	"github.com/family-flix/api/pkg/media_profile/tmdb"
	"github.com/family-flix/api/pkg/types"
	"github.com/family-flix/api/pkg/walker"
	"gorm.io/gorm"
)

func CommonAnalysis(c Context) error {
	// TODO: requires drive client for analysis
	return fail(c, 501, "未实现")
}

func AdminAnalysis(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		DriveID string `json:"drive_id"`
	}
	if err := c.Bind(&body); err != nil {
		return fail(c, 400, "参数错误")
	}
	if body.DriveID == "" {
		return fail(c, 400, "缺少云盘 id")
	}
	var d model.Drive
	if err := c.DB().Where("id = ? AND user_id = ?", body.DriveID, u.ID).First(&d).Error; err != nil {
		return fail(c, 404, "没有匹配的云盘")
	}
	if d.RootFolderID == nil || *d.RootFolderID == "" {
		return fail(c, 400, "请先设置索引目录")
	}
	// Check if there's already a running analysis task for this drive
	var existingTask model.AsyncTask
	if err := c.DB().Where("unique_id = ? AND user_id = ? AND status = 1", d.ID, u.ID).First(&existingTask).Error; err == nil {
		return fail(c, 400, "该云盘正在索引中")
	}
	// Create Output with log file path
	taskID := rid()
	desc := fmt.Sprintf("索引云盘「%s」", d.Name)
	outputID := rid()
	logFile := filepath.Join(c.BaseDir(), "logs", taskID+".log")
	output := model.Output{
		ID:       outputID,
		Filepath: &logFile,
		UserID:   u.ID,
	}
	if err := c.DB().Create(&output).Error; err != nil {
		return fail(c, 500, "创建输出记录失败")
	}
	// Create AsyncTask
	task := model.AsyncTask{
		ID:       taskID,
		UniqueID: d.ID,
		Type:     1, // DriveAnalysis
		Desc:     &desc,
		Status:   1, // Running
		OutputID: outputID,
		UserID:   u.ID,
	}
	if err := c.DB().Create(&task).Error; err != nil {
		return fail(c, 500, "创建任务失败")
	}
	// Run analysis in background
	db := c.DB()
	go func() {
		runDriveAnalysis(db, &d, u.ID, taskID, logFile, nil)
	}()
	return ok(c, "开始索引任务", R{"job_id": taskID})
}

type analysisTarget struct {
	FileID string
	Name   string
	Type   int
}

func runDriveAnalysis(db *gorm.DB, d *model.Drive, userID, taskID, logFile string, targetFiles []analysisTarget) {
	os.MkdirAll(filepath.Dir(logFile), 0755)
	f, err := os.OpenFile(logFile, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		db.Model(&model.AsyncTask{}).Where("id = ?", taskID).Updates(map[string]interface{}{"status": 3, "error": err.Error()})
		return
	}
	defer f.Close()
	writeOutput := func(content string) {
		fmt.Fprintf(f, "[%s] %s\n", time.Now().Format("2006-01-02 15:04:05"), content)
	}
	finishTask := func(taskErr error) {
		updates := map[string]interface{}{"status": 3, "percent": 100.0}
		if taskErr != nil {
			errMsg := taskErr.Error()
			updates["error"] = errMsg
		}
		db.Model(&model.AsyncTask{}).Where("id = ?", taskID).Updates(updates)
	}

	client := localdrive.NewLocalDriveClient()
	rootFolder := folder.NewFolder(*d.RootFolderID, client, nil, nil)
	if _, err := rootFolder.Profile(); err != nil {
		writeOutput(fmt.Sprintf("获取根目录信息失败: %s", err.Error()))
		finishTask(err)
		return
	}

	w := walker.NewFolderWalker()
	walker.SetLogOutput(f)
	w.Logger = walker.Logger
	episodeCount := 0
	movieCount := 0

	w.OnFile = func(f folder.File) error {
		// Update file record in DB
		var existing model.File
		err := db.Where("file_id = ? AND user_id = ? AND drive_id = ?", f.ID, userID, d.ID).First(&existing).Error
		if err != nil {
			// Create new file record
			fileType := 3 // file
			if f.Type == types.FileTypeFolder {
				fileType = 1 // folder
			}
			db.Create(&model.File{
				ID:           rid(),
				FileID:       f.ID,
				Name:         f.Name,
				ParentFileID: f.ParentFileID,
				ParentPaths:  f.GetParentPaths(),
				Type:         fileType,
				Size:         float64(f.Size),
				DriveID:      d.ID,
				UserID:       userID,
			})
		}
		// Delete tmp file if exists
		db.Where("file_id = ? AND user_id = ? AND drive_id = ?", f.ID, userID, d.ID).Delete(&model.TmpFile{})
		return nil
	}

	w.OnEpisode = func(ep walker.SearchedEpisode) error {
		episodeCount++
		writeOutput(fmt.Sprintf("解析文件 %s => 剧集 name=%s original_name=%s %s %s", ep.Episode.FileName, ep.TV.Name, ep.TV.OriginalName, ep.Season.SeasonText, ep.Episode.EpisodeText))
		var existing model.ParsedMediaSource
		if err := db.Where("file_id = ? AND user_id = ?", ep.Episode.FileID, userID).First(&existing).Error; err == nil {
			writeOutput(fmt.Sprintf("  跳过（已存在）"))
			return nil
		}
		db.Create(&model.ParsedMediaSource{
			ID:           rid(),
			FileID:       ep.Episode.FileID,
			FileName:     ep.Episode.FileName,
			ParentPaths:  ep.Episode.ParentPaths,
			Name:         ep.TV.Name,
			OriginalName: strPtr(ep.TV.OriginalName),
			SeasonText:   strPtr(ep.Season.SeasonText),
			EpisodeText:  strPtr(ep.Episode.EpisodeText),
			Size:         float64(ep.Episode.Size),
			CauseJobID:   &taskID,
			Type:         1, // episode
			DriveID:      d.ID,
			UserID:       userID,
		})
		writeOutput(fmt.Sprintf("  新增"))
		return nil
	}

	w.OnMovie = func(m walker.SearchedMovie) error {
		movieCount++
		writeOutput(fmt.Sprintf("解析文件 %s => 电影 name=%s original_name=%s year=%s", m.FileName, m.Name, m.OriginalName, m.Year))
		var existing model.ParsedMediaSource
		if err := db.Where("file_id = ? AND user_id = ?", m.FileID, userID).First(&existing).Error; err == nil {
			writeOutput(fmt.Sprintf("  跳过（已存在）"))
			return nil
		}
		db.Create(&model.ParsedMediaSource{
			ID:           rid(),
			FileID:       m.FileID,
			FileName:     m.FileName,
			ParentPaths:  m.ParentPaths,
			Name:         m.Name,
			OriginalName: strPtr(m.OriginalName),
			Size:         float64(m.Size),
			CauseJobID:   &taskID,
			Type:         2, // movie
			DriveID:      d.ID,
			UserID:       userID,
		})
		writeOutput(fmt.Sprintf("  新增"))
		return nil
	}

	javCount := 0
	javClient := javbus.NewJavBusClient("")
	w.OnJAV = func(j walker.SearchedJAV) error {
		javCount++
		writeOutput(fmt.Sprintf("解析文件 %s => AV code=%s", j.FileName, j.Code))
		var existing model.ParsedMediaSource
		if err := db.Where("file_id = ? AND user_id = ?", j.FileID, userID).First(&existing).Error; err == nil {
			writeOutput(fmt.Sprintf("  跳过（已存在）"))
			return nil
		}
		// 查找或创建 MediaProfile + MediaSourceProfile
		var profile model.MediaProfile
		javScraped := false
		if err := db.Where("jav_code = ?", j.Code).Preload("SourceProfiles").First(&profile).Error; err != nil {
			detail, err := javClient.GetMovieDetail(j.Code)
			if err != nil {
				writeOutput(fmt.Sprintf("  JavBus 获取失败: %s", err.Error()))
			} else {
				writeOutput(fmt.Sprintf("  获取到 JavBus 详情: %s", detail.Title))
				javScraped = true
				code := j.Code
				profile = model.MediaProfile{
					ID:           rid(),
					Type:         3,
					Name:         detail.Title,
					OriginalName: &detail.Title,
					PosterPath:   &detail.Cover,
					BackdropPath: &detail.Backdrop,
					AirDate:      &detail.ReleaseDate,
					JavCode:      &code,
				}
				db.Create(&profile)

				// Save Director
				if detail.Director != "" {
					savePerson(db, profile.ID, detail.Director, nil, "Directing", 0, nil)
				}
				// Save Actors
				for i, actor := range detail.Actors {
					var avatar *string
					if actor.Avatar != "" {
						avatar = &actor.Avatar
					}
					savePerson(db, profile.ID, actor.Name, nil, "Acting", i, avatar)
				}

				sp := model.MediaSourceProfile{
					ID:             rid(),
					Type:           3,
					Name:           j.Code,
					MediaProfileID: profile.ID,
				}
				db.Create(&sp)
				profile.SourceProfiles = []model.MediaSourceProfile{sp}
			}
		} else {
			javScraped = true
		}
		var ms model.MediaSource
		if javScraped {
			// 查找或创建 Media
			var media model.Media
			if err := db.Where("profile_id = ? AND user_id = ?", profile.ID, userID).First(&media).Error; err != nil {
				media = model.Media{
					ID:        rid(),
					Type:      3,
					Text:      j.Code,
					ProfileID: profile.ID,
					UserID:    userID,
				}
				db.Create(&media)
			}
			// 查找或创建 MediaSource
			spID := ""
			if len(profile.SourceProfiles) > 0 {
				spID = profile.SourceProfiles[0].ID
			}
			if spID != "" {
				if err := db.Where("profile_id = ? AND user_id = ?", spID, userID).First(&ms).Error; err != nil {
					ms = model.MediaSource{
						ID:        rid(),
						Type:      3,
						Text:      j.Code,
						MediaID:   media.ID,
						ProfileID: spID,
						UserID:    userID,
					}
					db.Create(&ms)
				}
			}
		}
		// 查找或创建 ParsedMedia
		var pm model.ParsedMedia
		if javScraped {
			if err := db.Where("media_profile_id = ? AND user_id = ?", profile.ID, userID).First(&pm).Error; err != nil {
				pm = model.ParsedMedia{
					ID:             rid(),
					Type:           3,
					Name:           j.Code,
					MediaProfileID: &profile.ID,
					DriveID:        d.ID,
					UserID:         userID,
				}
				db.Create(&pm)
			}
		} else {
			if err := db.Where("name = ? AND type = 3 AND user_id = ? AND media_profile_id IS NULL", j.Code, userID).First(&pm).Error; err != nil {
				pm = model.ParsedMedia{
					ID:      rid(),
					Type:    3,
					Name:    j.Code,
					DriveID: d.ID,
					UserID:  userID,
				}
				db.Create(&pm)
			}
		}
		// 创建 ParsedMediaSource
		psID := rid()
		db.Create(&model.ParsedMediaSource{
			ID:            psID,
			FileID:        j.FileID,
			FileName:      j.FileName,
			ParentPaths:   j.ParentPaths,
			Name:          j.Code,
			Size:          float64(j.Size),
			CauseJobID:    &taskID,
			Type:          3,
			ParsedMediaID: &pm.ID,
			DriveID:       d.ID,
			UserID:        userID,
		})
		if ms.ID != "" {
			db.Model(&model.ParsedMediaSource{}).Where("id = ?", psID).Update("media_source_id", ms.ID)
		}
		writeOutput(fmt.Sprintf("  新增"))
		return nil
	}

	w.OnWarning = func(warning walker.SearchedWarning) {
		writeOutput(fmt.Sprintf("警告 %s: %s (%s)", warning.Name, warning.Message, warning.ParentPaths))
	}

	writeOutput(fmt.Sprintf("开始索引云盘「%s」", d.Name))
	if len(targetFiles) == 0 {
		// Full drive analysis
		if err := w.Run(rootFolder, nil); err != nil {
			writeOutput(fmt.Sprintf("索引出错: %s", err.Error()))
			finishTask(err)
			return
		}
	} else {
		// Targeted file/folder analysis
		writeOutput(fmt.Sprintf("共 %d 个目标文件", len(targetFiles)))
		for _, tf := range targetFiles {
			f := folder.NewFolder(tf.FileID, client, nil, nil)
			if _, err := f.Profile(); err != nil {
				writeOutput(fmt.Sprintf("获取文件信息失败 %s: %s", tf.Name, err.Error()))
				continue
			}
			if err := w.Run(f, nil); err != nil {
				writeOutput(fmt.Sprintf("索引文件出错 %s: %s", tf.Name, err.Error()))
			}
		}
	}

	writeOutput(fmt.Sprintf("索引完成，共找到 %d 个剧集，%d 个电影，%d 个 AV", episodeCount, movieCount, javCount))

	// Search phase: match parsed media sources to TMDB profiles
	writeOutput("开始搜索影视剧信息")
	searchParsedMediaSources(db, d, userID, taskID, writeOutput)

	// Update drive latest_analysis time
	db.Model(&model.Drive{}).Where("id = ?", d.ID).Update("latest_analysis", time.Now())
	finishTask(nil)
}

func parseSeasonNum(seasonText string) int {
	s := strings.TrimPrefix(strings.ToUpper(seasonText), "S")
	n, _ := strconv.Atoi(s)
	if n == 0 {
		n = 1
	}
	return n
}

func parseEpisodeNum(episodeText string) int {
	s := strings.TrimPrefix(strings.ToLower(episodeText), "e")
	re := regexp.MustCompile(`(\d+)`)
	m := re.FindString(s)
	n, _ := strconv.Atoi(m)
	return n
}

func searchParsedMediaSources(db *gorm.DB, d *model.Drive, userID, taskID string, writeOutput func(string)) {
	client := tmdb.NewClient()

	// Find all unmatched parsed sources from this job (episodes and movies only, JAV already handled)
	var sources []model.ParsedMediaSource
	db.Where("cause_job_id = ? AND user_id = ? AND media_source_id IS NULL AND type IN (1, 2)", taskID, userID).Find(&sources)
	if len(sources) == 0 {
		writeOutput("没有需要搜索的记录")
		return
	}
	writeOutput(fmt.Sprintf("共 %d 条待搜索记录", len(sources)))

	// Group episodes by name+season_text
	type groupKey struct {
		Name       string
		SeasonText string
	}
	episodeGroups := map[groupKey][]model.ParsedMediaSource{}
	var movieSources []model.ParsedMediaSource

	for _, s := range sources {
		if s.Type == 1 { // episode
			key := groupKey{Name: s.Name, SeasonText: ""}
			if s.SeasonText != nil {
				key.SeasonText = *s.SeasonText
			}
			episodeGroups[key] = append(episodeGroups[key], s)
		} else if s.Type == 2 { // movie
			movieSources = append(movieSources, s)
		}
	}

	// Process episode groups
	for key, eps := range episodeGroups {
		searchName := key.Name
		if eps[0].OriginalName != nil && *eps[0].OriginalName != "" {
			searchName = *eps[0].OriginalName
		}
		writeOutput(fmt.Sprintf("搜索剧集「%s」%s", key.Name, key.SeasonText))

		// Search TMDB
		result, err := client.SearchTV(searchName, 1)
		if err != nil || len(result.List) == 0 {
			if searchName != key.Name {
				result, err = client.SearchTV(key.Name, 1)
			}
			if err != nil || result == nil || len(result.List) == 0 {
				writeOutput(fmt.Sprintf("  未找到匹配"))
				continue
			}
		}
		tv := result.List[0]
		tmdbID := tv.ID
		writeOutput(fmt.Sprintf("  匹配到「%s」(TMDB:%s)", tv.Name, tmdbID))

		// Fetch TV detail for seasons
		tvIDInt, _ := strconv.Atoi(tmdbID)
		tvDetail, err := client.FetchTVProfile(tvIDInt)
		if err != nil {
			writeOutput(fmt.Sprintf("  获取详情失败: %s", err.Error()))
			continue
		}

		// Find matching season
		seasonNum := parseSeasonNum(key.SeasonText)
		var matchedSeason *types.TVProfileSeason
		for i := range tvDetail.Seasons {
			if tvDetail.Seasons[i].SeasonNumber == seasonNum {
				matchedSeason = &tvDetail.Seasons[i]
				break
			}
		}
		if matchedSeason == nil {
			writeOutput(fmt.Sprintf("  未找到匹配的季 S%02d", seasonNum))
			continue
		}

		// Find or create MediaSeriesProfile
		var series model.MediaSeriesProfile
		if err := db.Where("tmdb_id = ?", tmdbID).First(&series).Error; err != nil {
			series = model.MediaSeriesProfile{
				ID: rid(), Name: tvDetail.Name, OriginalName: &tvDetail.OriginalName,
				Overview: &tvDetail.Overview, PosterPath: &tvDetail.PosterPath,
				BackdropPath: &tvDetail.BackdropPath, AirDate: &tvDetail.FirstAirDate, TMDBID: &tmdbID,
			}
			db.Create(&series)
		}

		// Find or create MediaProfile (season)
		seasonTMDBID := fmt.Sprintf("%s/%d", tmdbID, seasonNum)
		var profile model.MediaProfile
		if err := db.Where("tmdb_id = ?", seasonTMDBID).Preload("SourceProfiles").First(&profile).Error; err != nil {
			// Fetch season detail for episodes
			seasonDetail, err := client.FetchSeasonProfile(tvIDInt, seasonNum)
			if err != nil {
				writeOutput(fmt.Sprintf("  获取季详情失败: %s", err.Error()))
				continue
			}
			inProd := 0
			if tvDetail.InProduction {
				inProd = 1
			}
			profile = model.MediaProfile{
				ID: rid(), Type: 1, Name: tvDetail.Name, OriginalName: &tvDetail.OriginalName,
				Overview: &tvDetail.Overview, PosterPath: &tvDetail.PosterPath, BackdropPath: &tvDetail.BackdropPath,
				AirDate: &matchedSeason.AirDate, Order: seasonNum, SourceCount: matchedSeason.EpisodeCount,
				VoteAverage: tvDetail.VoteAverage, InProduction: inProd, TMDBID: &seasonTMDBID,
				SeriesID: &series.ID,
			}
			db.Create(&profile)
			// Fetch and save persons
			persons, err := client.FetchPersonsOfSeason(tvIDInt, seasonNum)
			if err == nil {
				for _, p := range persons {
					tmdbIDStr := strconv.Itoa(p.ID)
					var pp *string
					if p.ProfilePath != "" {
						pp = &p.ProfilePath
					}
					savePerson(db, profile.ID, p.Name, &tmdbIDStr, p.KnownForDepartment, p.Order, pp)
				}
			} else {
				writeOutput(fmt.Sprintf("  获取演职员信息失败: %s", err.Error()))
			}
			// Create MediaSourceProfile for each episode
			for _, ep := range seasonDetail.Episodes {
				epTMDBID := fmt.Sprintf("%d", ep.ID)
				sp := model.MediaSourceProfile{
					ID: rid(), Type: 1, Name: ep.Name, Overview: &ep.Overview,
					AirDate: &ep.AirDate, Order: ep.EpisodeNumber, TMDBID: &epTMDBID,
					MediaProfileID: profile.ID,
				}
				if ep.Runtime > 0 {
					sp.Runtime = &ep.Runtime
				}
				db.Create(&sp)
				profile.SourceProfiles = append(profile.SourceProfiles, sp)
			}
		}

		// Find or create ParsedMedia
		var pm model.ParsedMedia
		if err := db.Where("media_profile_id = ? AND user_id = ?", profile.ID, userID).First(&pm).Error; err != nil {
			pm = model.ParsedMedia{
				ID: rid(), Type: 1, Name: key.Name, SeasonText: &key.SeasonText,
				MediaProfileID: &profile.ID, DriveID: d.ID, UserID: userID,
			}
			if eps[0].OriginalName != nil {
				pm.OriginalName = eps[0].OriginalName
			}
			db.Create(&pm)
		}

		// Find or create Media
		var media model.Media
		if err := db.Where("profile_id = ? AND user_id = ?", profile.ID, userID).First(&media).Error; err != nil {
			media = model.Media{
				ID: rid(), Type: 1, Text: tvDetail.Name, ProfileID: profile.ID, UserID: userID,
			}
			db.Create(&media)
		}

		// Match each episode to a MediaSourceProfile and create MediaSource
		for _, ps := range eps {
			epNum := 0
			if ps.EpisodeText != nil {
				epNum = parseEpisodeNum(*ps.EpisodeText)
			}
			var matchedSP *model.MediaSourceProfile
			for i := range profile.SourceProfiles {
				if profile.SourceProfiles[i].Order == epNum {
					matchedSP = &profile.SourceProfiles[i]
					break
				}
			}
			if matchedSP == nil {
				writeOutput(fmt.Sprintf("  %s 未匹配到集", ps.FileName))
				// Still link to ParsedMedia
				db.Model(&model.ParsedMediaSource{}).Where("id = ?", ps.ID).Update("parsed_media_id", pm.ID)
				continue
			}
			// Find or create MediaSource
			var ms model.MediaSource
			if err := db.Where("profile_id = ? AND user_id = ?", matchedSP.ID, userID).First(&ms).Error; err != nil {
				ms = model.MediaSource{
					ID: rid(), Type: 1, Text: matchedSP.Name, MediaID: media.ID,
					ProfileID: matchedSP.ID, UserID: userID,
				}
				db.Create(&ms)
			}
			db.Model(&model.ParsedMediaSource{}).Where("id = ?", ps.ID).Updates(map[string]interface{}{
				"parsed_media_id": pm.ID, "media_source_id": ms.ID,
			})
			writeOutput(fmt.Sprintf("  %s => E%02d 匹配成功", ps.FileName, epNum))
		}
	}

	// Process movies
	for _, ps := range movieSources {
		searchName := ps.Name
		if ps.OriginalName != nil && *ps.OriginalName != "" {
			searchName = *ps.OriginalName
		}
		writeOutput(fmt.Sprintf("搜索电影「%s」", ps.Name))

		result, err := client.SearchMovie(searchName, 1)
		if err != nil || len(result.List) == 0 {
			if searchName != ps.Name {
				result, err = client.SearchMovie(ps.Name, 1)
			}
			if err != nil || result == nil || len(result.List) == 0 {
				writeOutput(fmt.Sprintf("  未找到匹配"))
				continue
			}
		}
		movie := result.List[0]
		movieTMDBID := movie.ID
		writeOutput(fmt.Sprintf("  匹配到「%s」(TMDB:%s)", movie.Name, movieTMDBID))

		// Find or create MediaProfile
		var profile model.MediaProfile
		if err := db.Where("tmdb_id = ? AND type = 2", movieTMDBID).Preload("SourceProfiles").First(&profile).Error; err != nil {
			movieIDInt, _ := strconv.Atoi(movieTMDBID)
			detail, err := client.FetchMovieProfile(movieIDInt)
			if err != nil {
				writeOutput(fmt.Sprintf("  获取详情失败: %s", err.Error()))
				continue
			}
			profile = model.MediaProfile{
				ID: rid(), Type: 2, Name: detail.Name, OriginalName: &detail.OriginalName,
				Overview: &detail.Overview, PosterPath: &detail.PosterPath, BackdropPath: &detail.BackdropPath,
				AirDate: &detail.AirDate, VoteAverage: detail.VoteAverage, TMDBID: &movieTMDBID,
			}
			db.Create(&profile)
			// Fetch and save persons
			persons, err := client.FetchPersonsOfMovie(movieIDInt)
			if err == nil {
				for _, p := range persons {
					tmdbIDStr := strconv.Itoa(p.ID)
					var pp *string
					if p.ProfilePath != "" {
						pp = &p.ProfilePath
					}
					savePerson(db, profile.ID, p.Name, &tmdbIDStr, p.KnownForDepartment, p.Order, pp)
				}
			} else {
				writeOutput(fmt.Sprintf("  获取演职员信息失败: %s", err.Error()))
			}
			// Create one MediaSourceProfile for the movie
			sp := model.MediaSourceProfile{
				ID: rid(), Type: 2, Name: detail.Name, Order: 1, TMDBID: &movieTMDBID,
				MediaProfileID: profile.ID,
			}
			db.Create(&sp)
			profile.SourceProfiles = []model.MediaSourceProfile{sp}
		}

		// Find or create ParsedMedia
		var pm model.ParsedMedia
		if err := db.Where("media_profile_id = ? AND user_id = ?", profile.ID, userID).First(&pm).Error; err != nil {
			pm = model.ParsedMedia{
				ID: rid(), Type: 2, Name: ps.Name, MediaProfileID: &profile.ID,
				DriveID: d.ID, UserID: userID,
			}
			db.Create(&pm)
		}

		// Find or create Media
		var media model.Media
		if err := db.Where("profile_id = ? AND user_id = ?", profile.ID, userID).First(&media).Error; err != nil {
			media = model.Media{
				ID: rid(), Type: 2, Text: profile.Name, ProfileID: profile.ID, UserID: userID,
			}
			db.Create(&media)
		}

		// Find or create MediaSource
		spID := ""
		if len(profile.SourceProfiles) > 0 {
			spID = profile.SourceProfiles[0].ID
		}
		if spID != "" {
			var ms model.MediaSource
			if err := db.Where("profile_id = ? AND user_id = ?", spID, userID).First(&ms).Error; err != nil {
				ms = model.MediaSource{
					ID: rid(), Type: 2, Text: profile.Name, MediaID: media.ID,
					ProfileID: spID, UserID: userID,
				}
				db.Create(&ms)
			}
			db.Model(&model.ParsedMediaSource{}).Where("id = ?", ps.ID).Updates(map[string]interface{}{
				"parsed_media_id": pm.ID, "media_source_id": ms.ID,
			})
		} else {
			db.Model(&model.ParsedMediaSource{}).Where("id = ?", ps.ID).Update("parsed_media_id", pm.ID)
		}
		writeOutput(fmt.Sprintf("  新增"))
	}

	writeOutput("搜索影视剧信息完成")
}

func AdminAnalysisFiles(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		DriveID string `json:"drive_id"`
		Files   []struct {
			FileID string `json:"file_id"`
			Name   string `json:"name"`
			Type   int    `json:"type"`
		} `json:"files"`
	}
	if err := c.Bind(&body); err != nil {
		return fail(c, 400, "参数错误")
	}
	if body.DriveID == "" {
		return fail(c, 400, "缺少云盘 id")
	}
	if len(body.Files) == 0 {
		return fail(c, 400, "请指定要索引的文件")
	}
	var d model.Drive
	if err := c.DB().Where("id = ? AND user_id = ?", body.DriveID, u.ID).First(&d).Error; err != nil {
		return fail(c, 404, "没有匹配的云盘")
	}
	if d.RootFolderID == nil || *d.RootFolderID == "" {
		return fail(c, 400, "请先设置索引目录")
	}
	outputID := rid()
	taskID := rid()
	logFile := filepath.Join(c.BaseDir(), "logs", taskID+".log")
	c.DB().Create(&model.Output{ID: outputID, Filepath: &logFile, UserID: u.ID})
	descSuffix := " 部分文件"
	if len(body.Files) == 1 {
		descSuffix = body.Files[0].Name
	}
	desc := fmt.Sprintf("索引云盘「%s」%s", d.Name, descSuffix)
	c.DB().Create(&model.AsyncTask{ID: taskID, UniqueID: d.ID, Type: 1, Desc: &desc, Status: 1, OutputID: outputID, UserID: u.ID})
	targets := make([]analysisTarget, 0, len(body.Files))
	for _, f := range body.Files {
		targets = append(targets, analysisTarget{FileID: f.FileID, Name: f.Name, Type: f.Type})
	}
	db := c.DB()
	go func() {
		runDriveAnalysis(db, &d, u.ID, taskID, logFile, targets)
	}()
	return ok(c, "开始索引任务", R{"job_id": taskID})
}

func AdminAnalysisNewFiles(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		DriveID string `json:"drive_id"`
	}
	if err := c.Bind(&body); err != nil {
		return fail(c, 400, "参数错误")
	}
	if body.DriveID == "" {
		return fail(c, 400, "缺少云盘 id")
	}
	var d model.Drive
	if err := c.DB().Where("id = ? AND user_id = ?", body.DriveID, u.ID).First(&d).Error; err != nil {
		return fail(c, 404, "没有匹配的云盘")
	}
	if d.RootFolderID == nil || *d.RootFolderID == "" {
		return fail(c, 400, "请先设置索引目录")
	}
	var tmpFiles []model.TmpFile
	c.DB().Where("drive_id = ? AND user_id = ? AND file_id IS NOT NULL", body.DriveID, u.ID).Find(&tmpFiles)
	if len(tmpFiles) == 0 {
		return fail(c, 400, "没有找到可索引的新文件")
	}
	outputID := rid()
	taskID := rid()
	logFile := filepath.Join(c.BaseDir(), "logs", taskID+".log")
	c.DB().Create(&model.Output{ID: outputID, Filepath: &logFile, UserID: u.ID})
	desc := fmt.Sprintf("快速索引云盘「%s」", d.Name)
	c.DB().Create(&model.AsyncTask{ID: taskID, UniqueID: d.ID, Type: 1, Desc: &desc, Status: 1, OutputID: outputID, UserID: u.ID})
	targets := make([]analysisTarget, 0, len(tmpFiles))
	for _, f := range tmpFiles {
		if f.FileID != nil {
			targets = append(targets, analysisTarget{FileID: *f.FileID, Name: f.Name, Type: int(f.Type)})
		}
	}
	db := c.DB()
	go func() {
		runDriveAnalysis(db, &d, u.ID, taskID, logFile, targets)
	}()
	return ok(c, "开始索引", R{"job_id": taskID})
}

func savePerson(db *gorm.DB, mediaProfileID string, name string, tmdbID *string, dept string, order int, profilePath *string) {
	if name == "" {
		return
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
		db.Create(&person)
	}

	// Create PersonInMedia
	var pim model.PersonInMedia
	if err := db.Where("profile_id = ? AND media_id = ? AND known_for_department = ?", person.ID, mediaProfileID, dept).First(&pim).Error; err != nil {
		pim = model.PersonInMedia{
			ID:                 rid(),
			Name:               name,
			Order:              order,
			KnownForDepartment: &dept,
			ProfileID:          person.ID,
			MediaID:            mediaProfileID,
		}
		db.Create(&pim)
	}
}
