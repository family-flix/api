package handler

import (
	"encoding/json"
	"fmt"
	"github.com/family-flix/api/internal/domain/member"
	"github.com/family-flix/api/internal/model"
	"os"
	"strings"
	"time"
)

func AdminParse(c Context) error {
	// TODO: requires drive client for file analysis
	return fail(c, 501, "未实现")
}

func AdminResourceFiles(c Context) error {
	// TODO: requires drive client for file listing
	return fail(c, 501, "未实现")
}

func AdminResourceTransfer(c Context) error {
	// TODO: requires drive client for file transfer
	return fail(c, 501, "未实现")
}

func AdminTaskList(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Status     *int   `json:"status"`
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}
	db := c.DB().Where("user_id = ?", u.ID)
	if body.Status != nil {
		db = db.Where("status = ?", *body.Status)
	}
	var total int64
	c.DB().Where("user_id = ?", u.ID).Model(&model.AsyncTask{}).Count(&total)
	if body.NextMarker != "" {
		db = db.Where("id < ?", body.NextMarker)
	}
	var tasks []model.AsyncTask
	db.Order("created DESC").Limit(body.PageSize).Find(&tasks)
	list := make([]R, 0, len(tasks))
	var nextMarker string
	for _, t := range tasks {
		list = append(list, R{
			"id":        t.ID,
			"desc":      t.Desc,
			"status":    t.Status,
			"type":      t.Type,
			"error":     t.Error,
			"percent":   t.Percent,
			"output_id": t.OutputID,
			"created":   t.Created,
			"updated":   t.Updated,
		})
		nextMarker = t.ID
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func AdminTaskStatus(c Context) error {
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
	var t model.AsyncTask
	if err := c.DB().Where("id = ? AND user_id = ?", body.ID, u.ID).First(&t).Error; err != nil {
		return fail(c, 404, "没有匹配的任务")
	}
	return ok(c, "", R{
		"status":    t.Status,
		"desc":      t.Desc,
		"percent":   t.Percent,
		"error":     t.Error,
		"output_id": t.OutputID,
		"created":   t.Created,
		"updated":   t.Updated,
	})
}

func AdminTaskPause(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ID    string `json:"id"`
		Force string `json:"force"`
	}
	if err := c.Bind(&body); err != nil || body.ID == "" {
		return fail(c, 400, "缺少 id")
	}
	var t model.AsyncTask
	if err := c.DB().Where("id = ? AND user_id = ?", body.ID, u.ID).First(&t).Error; err != nil {
		return fail(c, 404, "没有匹配的任务")
	}
	c.DB().Model(&t).Update("need_stop", 1)
	return ok(c, "已标记暂停", nil)
}

func AdminTaskProfile(c Context) error {
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
	var t model.AsyncTask
	if err := c.DB().Preload("Output").Where("id = ? AND user_id = ?", body.ID, u.ID).First(&t).Error; err != nil {
		return fail(c, 404, "没有匹配的任务")
	}
	var lines []string
	if t.Output != nil && t.Output.Filepath != nil {
		if data, err := os.ReadFile(*t.Output.Filepath); err == nil {
			for _, line := range strings.Split(string(data), "\n") {
				if line != "" {
					lines = append(lines, line)
				}
			}
		}
	}
	return ok(c, "", R{
		"status":  t.Status,
		"desc":    t.Desc,
		"percent": t.Percent,
		"error":   t.Error,
		"lines":   lines,
		"created": t.Created,
		"updated": t.Updated,
	})
}

func AdminClearThumbnails(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	c.DB().Model(&model.PlayHistoryV2{}).Where("member_id IN (SELECT id FROM \"Member\" WHERE user_id = ?)", u.ID).Update("thumbnail_path", nil)
	return ok(c, "清除成功", nil)
}

func AdminSyncTaskComplete(c Context) error {
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
	var t model.ResourceSyncTask
	if err := c.DB().Where("id = ? AND user_id = ?", body.ID, u.ID).First(&t).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	c.DB().Model(&t).Updates(map[string]interface{}{"status": 3, "updated": time.Now()})
	return ok(c, "更新成功", nil)
}

func AdminSyncTaskRun(c Context) error {
	// TODO: requires drive client for file sync
	return fail(c, 501, "未实现")
}

func AdminSyncTaskUpdate(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ID       string `json:"id"`
		SeasonID string `json:"season_id"`
	}
	if err := c.Bind(&body); err != nil || body.ID == "" || body.SeasonID == "" {
		return fail(c, 400, "参数错误")
	}
	var t model.ResourceSyncTask
	if err := c.DB().Where("id = ? AND user_id = ?", body.ID, u.ID).First(&t).Error; err != nil {
		return fail(c, 404, "没有匹配的同步任务")
	}
	var m model.Media
	if err := c.DB().Where("id = ? AND user_id = ?", body.SeasonID, u.ID).First(&m).Error; err != nil {
		return fail(c, 404, "没有匹配的影视剧")
	}
	c.DB().Model(&t).Updates(map[string]interface{}{"media_id": m.ID, "status": 2})
	return ok(c, "更新成功", nil)
}

func AdminSyncTaskPartial(c Context) error {
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
	var t model.ResourceSyncTask
	if err := c.DB().Preload("Media.Profile").Preload("Drive").
		Where("id = ? AND user_id = ?", body.ID, u.ID).First(&t).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	item := R{
		"id":                      t.ID,
		"url":                     t.URL,
		"file_id":                 t.FileID,
		"name":                    t.Name,
		"file_id_link_resource":   t.FileIDLinkResource,
		"file_name_link_resource": t.FileNameLinkResource,
		"invalid":                 t.Invalid,
	}
	if t.Media != nil && t.Media.Profile != nil {
		item["season"] = R{
			"id":            t.Media.ID,
			"name":          t.Media.Profile.Name,
			"poster_path":   t.Media.Profile.PosterPath,
			"episode_count": t.Media.Profile.SourceCount,
		}
	}
	if t.Drive != nil {
		item["drive"] = R{"id": t.Drive.ID, "name": t.Drive.Name, "avatar": t.Drive.Avatar}
	}
	return ok(c, "", item)
}

func AdminSyncTaskList(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Name       string `json:"name"`
		Status     *int   `json:"status"`
		Invalid    *int   `json:"invalid"`
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}
	db := c.DB().Where("\"ResourceSyncTask\".user_id = ?", u.ID)
	if body.Name != "" {
		db = db.Where("\"ResourceSyncTask\".name LIKE ?", "%"+body.Name+"%")
	}
	if body.Status != nil {
		db = db.Where("\"ResourceSyncTask\".status = ?", *body.Status)
	}
	if body.Invalid != nil {
		db = db.Where("\"ResourceSyncTask\".invalid = ?", *body.Invalid)
	}
	var total int64
	db.Model(&model.ResourceSyncTask{}).Count(&total)
	if body.NextMarker != "" {
		db = db.Where("\"ResourceSyncTask\".id < ?", body.NextMarker)
	}
	var tasks []model.ResourceSyncTask
	db.Preload("Media.Profile").Preload("Drive").
		Order("\"ResourceSyncTask\".created DESC").Limit(body.PageSize).Find(&tasks)
	list := make([]R, 0, len(tasks))
	var nextMarker string
	for _, t := range tasks {
		item := R{
			"id":                      t.ID,
			"url":                     t.URL,
			"file_id":                 t.FileID,
			"name":                    t.Name,
			"file_id_link_resource":   t.FileIDLinkResource,
			"file_name_link_resource": t.FileNameLinkResource,
			"invalid":                 t.Invalid,
		}
		if t.Media != nil && t.Media.Profile != nil {
			item["season"] = R{
				"id":            t.Media.ID,
				"name":          t.Media.Profile.Name,
				"poster_path":   t.Media.Profile.PosterPath,
				"episode_count": t.Media.Profile.SourceCount,
			}
		}
		if t.Drive != nil {
			item["drive"] = R{"id": t.Drive.ID, "name": t.Drive.Name, "avatar": t.Drive.Avatar}
		}
		list = append(list, item)
		nextMarker = t.ID
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func AdminSyncTaskCreate(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		URL              string `json:"url"`
		PWD              string `json:"pwd"`
		ResourceFileID   string `json:"resource_file_id"`
		ResourceFileName string `json:"resource_file_name"`
		DriveFileID      string `json:"drive_file_id"`
		DriveFileName    string `json:"drive_file_name"`
		DriveID          string `json:"drive_id"`
	}
	if err := c.Bind(&body); err != nil || body.URL == "" {
		return fail(c, 400, "缺少 url")
	}
	var pwd *string
	if body.PWD != "" {
		pwd = &body.PWD
	}
	t := model.ResourceSyncTask{
		ID:                   member.Rid(),
		URL:                  body.URL,
		PWD:                  pwd,
		FileID:               body.ResourceFileID,
		Name:                 body.ResourceFileName,
		FileIDLinkResource:   body.DriveFileID,
		FileNameLinkResource: body.DriveFileName,
		DriveID:              body.DriveID,
		Status:               1,
		UserID:               u.ID,
	}
	if err := c.DB().Create(&t).Error; err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "新增同步任务成功", nil)
}

func AdminSyncTaskDelete(c Context) error {
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
	var t model.ResourceSyncTask
	if err := c.DB().Where("id = ? AND user_id = ?", body.ID, u.ID).First(&t).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	c.DB().Delete(&t)
	return ok(c, "删除成功", nil)
}

func AdminSyncTaskOverride(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ID               string `json:"id"`
		URL              string `json:"url"`
		PWD              string `json:"pwd"`
		ResourceFileID   string `json:"resource_file_id"`
		ResourceFileName string `json:"resource_file_name"`
	}
	if err := c.Bind(&body); err != nil || body.ID == "" {
		return fail(c, 400, "缺少 id")
	}
	var t model.ResourceSyncTask
	if err := c.DB().Where("id = ? AND user_id = ?", body.ID, u.ID).First(&t).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	updates := map[string]interface{}{"invalid": 0}
	if body.URL != "" {
		updates["url"] = body.URL
	}
	if body.PWD != "" {
		updates["pwd"] = body.PWD
	}
	if body.ResourceFileID != "" {
		updates["file_id"] = body.ResourceFileID
	}
	if body.ResourceFileName != "" {
		updates["name"] = body.ResourceFileName
	}
	c.DB().Model(&t).Updates(updates)
	return ok(c, "更新成功", nil)
}

func AdminSyncTaskTransferHistory(c Context) error {
	// TODO: requires drive client
	return fail(c, 501, "未实现")
}

func AdminSyncTaskSearchHistory(c Context) error {
	// TODO: requires drive client
	return fail(c, 501, "未实现")
}

func AdminReportList(c Context) error {
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
	db := c.DB().Where("\"ReportV2\".user_id = ?", u.ID)
	if body.Type != nil {
		db = db.Where("\"ReportV2\".type = ?", *body.Type)
	}
	var total int64
	db.Model(&model.ReportV2{}).Count(&total)
	if body.NextMarker != "" {
		db = db.Where("\"ReportV2\".id < ?", body.NextMarker)
	}
	var reports []model.ReportV2
	db.Preload("Media.Profile").Preload("MediaSource.Profile").Preload("Member").
		Order("\"ReportV2\".created DESC").Limit(body.PageSize).Find(&reports)
	list := make([]R, 0, len(reports))
	var nextMarker string
	for _, r := range reports {
		item := R{"id": r.ID, "type": r.Type, "data": r.Data, "answer": r.Answer, "created": r.Created}
		if r.Media != nil && r.Media.Profile != nil {
			item["media"] = R{"name": r.Media.Profile.Name, "poster_path": r.Media.Profile.PosterPath}
		}
		if r.Member != nil {
			item["member"] = R{"id": r.Member.ID, "name": r.Member.Remark}
		}
		list = append(list, item)
		nextMarker = r.ID
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func AdminReportReply(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ID      string `json:"id"`
		Content string `json:"content"`
		MediaID string `json:"media_id"`
	}
	if err := c.Bind(&body); err != nil || body.ID == "" || body.Content == "" {
		return fail(c, 400, "参数错误")
	}
	var r model.ReportV2
	if err := c.DB().Where("id = ? AND user_id = ?", body.ID, u.ID).First(&r).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	updates := map[string]interface{}{"answer": body.Content}
	if body.MediaID != "" {
		updates["reply_media_id"] = body.MediaID
	}
	c.DB().Model(&r).Updates(updates)
	// Create notification for member
	contentJSON, _ := json.Marshal(R{"content": body.Content})
	contentStr := string(contentJSON)
	uniqueID := fmt.Sprintf("report_reply_%s", r.ID)
	var existing model.MemberNotification
	if c.DB().Where("unique_id = ?", uniqueID).First(&existing).Error != nil {
		c.DB().Create(&model.MemberNotification{
			ID:       member.Rid(),
			UniqueID: uniqueID,
			Content:  &contentStr,
			Type:     1,
			Status:   1,
			MemberID: r.MemberID,
		})
	}
	return ok(c, "", nil)
}

func AdminSettingsProfile(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	return ok(c, "", u.Settings)
}

func AdminSettingsUpdate(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body map[string]interface{}
	if err := c.Bind(&body); err != nil {
		return fail(c, 400, "参数错误")
	}
	// Merge with existing settings
	existing, _ := json.Marshal(u.Settings)
	var merged map[string]interface{}
	json.Unmarshal(existing, &merged)
	for k, v := range body {
		merged[k] = v
	}
	detail, _ := json.Marshal(merged)
	detailStr := string(detail)
	c.DB().Model(&model.Settings{}).Where("user_id = ?", u.ID).Update("detail", detailStr)
	return ok(c, "更新成功", nil)
}

func AdminPersonList(c Context) error {
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
		list = append(list, R{"id": p.ID, "name": p.Name, "profile_path": p.ProfilePath, "birthday": p.Birthday})
		nextMarker = p.ID
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func AdminShortLink(c Context) error {
	// TODO: requires short link service
	return fail(c, 501, "未实现")
}

func AdminDashboard(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var stats model.Statistics
	if err := c.DB().Where("user_id = ?", u.ID).First(&stats).Error; err != nil {
		return ok(c, "", R{})
	}
	var data map[string]interface{}
	json.Unmarshal([]byte(stats.Data), &data)
	return ok(c, "", data)
}

func AdminDashboardRefresh(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	// Recompute statistics
	var driveCount, movieCount, seasonCount, episodeCount, syncTaskCount, reportCount int64
	c.DB().Model(&model.Drive{}).Where("user_id = ?", u.ID).Count(&driveCount)
	c.DB().Model(&model.Media{}).Where("user_id = ? AND type = 2", u.ID).Count(&movieCount)
	c.DB().Model(&model.Media{}).Where("user_id = ? AND type = 1", u.ID).Count(&seasonCount)
	c.DB().Model(&model.MediaSource{}).Where("user_id = ?", u.ID).Count(&episodeCount)
	c.DB().Model(&model.ResourceSyncTask{}).Where("user_id = ?", u.ID).Count(&syncTaskCount)
	c.DB().Model(&model.ReportV2{}).Where("user_id = ?", u.ID).Count(&reportCount)
	var invalidMovieCount, invalidSeasonCount int64
	c.DB().Model(&model.InvalidMedia{}).Where("user_id = ? AND type = 2", u.ID).Count(&invalidMovieCount)
	c.DB().Model(&model.InvalidMedia{}).Where("user_id = ? AND type = 1", u.ID).Count(&invalidSeasonCount)
	var unknownCount int64
	c.DB().Model(&model.ParsedMedia{}).Where("user_id = ? AND media_profile_id IS NULL", u.ID).Count(&unknownCount)
	data := R{
		"drive_count":          driveCount,
		"movie_count":          movieCount,
		"season_count":         seasonCount,
		"episode_count":        episodeCount,
		"sync_task_count":      syncTaskCount,
		"report_count":         reportCount,
		"invalid_movie_count":  invalidMovieCount,
		"invalid_season_count": invalidSeasonCount,
		"unknown_media_count":  unknownCount,
		"updated_at":           time.Now(),
	}
	dataJSON, _ := json.Marshal(data)
	c.DB().Model(&model.Statistics{}).Where("user_id = ?", u.ID).Update("data", string(dataJSON))
	return ok(c, "更新成功", nil)
}

func AdminDashboardAddedMedia(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		StartTime  string `json:"start_time"`
		EndTime    string `json:"end_time"`
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}
	now := time.Now()
	startTime := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	endTime := startTime.Add(24 * time.Hour)
	if body.StartTime != "" {
		if t, err := time.Parse("2006-01-02", body.StartTime); err == nil {
			startTime = t
		}
	}
	if body.EndTime != "" {
		if t, err := time.Parse("2006-01-02", body.EndTime); err == nil {
			endTime = t
		}
	}
	db := c.DB().Where("\"MediaSource\".user_id = ? AND \"MediaSource\".created >= ? AND \"MediaSource\".created < ?", u.ID, startTime, endTime)
	if body.NextMarker != "" {
		db = db.Where("\"MediaSource\".id < ?", body.NextMarker)
	}
	var sources []model.MediaSource
	db.Preload("Media.Profile").Order("\"MediaSource\".created DESC").Limit(body.PageSize).Find(&sources)
	// Group by media
	seen := map[string]bool{}
	list := make([]R, 0)
	var nextMarker string
	for _, s := range sources {
		if s.Media == nil || seen[s.MediaID] {
			nextMarker = s.ID
			continue
		}
		seen[s.MediaID] = true
		item := R{"id": s.Media.ID, "type": s.Media.Type, "created": s.Created.Unix()}
		if s.Media.Profile != nil {
			item["name"] = s.Media.Profile.Name
			item["poster_path"] = s.Media.Profile.PosterPath
			item["air_date"] = s.Media.Profile.AirDate
		}
		list = append(list, item)
		nextMarker = s.ID
	}
	return ok(c, "", R{"list": list, "next_marker": nextMarker})
}
