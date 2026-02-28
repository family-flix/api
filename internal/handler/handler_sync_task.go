package handler

import (
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"

	"github.com/family-flix/api/internal/domain/member"
	"github.com/family-flix/api/internal/model"
	"github.com/family-flix/api/internal/service"
)

type SyncTaskHandler struct {
	BaseHandler
	syncTaskService service.SyncTaskService
}

func NewSyncTaskHandler(syncTaskService service.SyncTaskService, db *gorm.DB, baseDir, cacheDir, ffmpegBin string) *SyncTaskHandler {
	return &SyncTaskHandler{
		BaseHandler: BaseHandler{
			db:        db,
			baseDir:   baseDir,
			cacheDir:  cacheDir,
			ffmpegBin: ffmpegBin,
		},
		syncTaskService: syncTaskService,
	}
}

func (h *SyncTaskHandler) List(ec echo.Context) error {
	c := h.NewContext(ec)
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
		Page       int    `json:"page"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}

	tasks, total, err := h.syncTaskService.ListSyncTasks(u.ID, body.Name, body.Status, body.Invalid, body.NextMarker, body.PageSize, body.Page)
	if err != nil {
		return fail(c, 500, err.Error())
	}

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

func (h *SyncTaskHandler) Create(ec echo.Context) error {
	c := h.NewContext(ec)
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
	if err := h.syncTaskService.CreateSyncTask(&t); err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "新增同步任务成功", nil)
}

func (h *SyncTaskHandler) Delete(ec echo.Context) error {
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
	if err := h.syncTaskService.DeleteSyncTask(body.ID, u.ID); err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "删除成功", nil)
}

func (h *SyncTaskHandler) Complete(ec echo.Context) error {
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
	if err := h.syncTaskService.CompleteSyncTask(body.ID, u.ID); err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "更新成功", nil)
}

func (h *SyncTaskHandler) Update(ec echo.Context) error {
	c := h.NewContext(ec)
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
	if err := h.syncTaskService.UpdateSyncTaskMedia(body.ID, body.SeasonID, u.ID); err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "更新成功", nil)
}

func (h *SyncTaskHandler) Partial(ec echo.Context) error {
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
	t, err := h.syncTaskService.GetSyncTask(body.ID, u.ID)
	if err != nil {
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

func (h *SyncTaskHandler) Override(ec echo.Context) error {
	c := h.NewContext(ec)
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

	updates := map[string]interface{}{
		"url":     body.URL,
		"pwd":     body.PWD,
		"file_id": body.ResourceFileID,
		"name":    body.ResourceFileName,
	}

	if err := h.syncTaskService.OverrideSyncTask(body.ID, u.ID, updates); err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "更新成功", nil)
}

func (h *SyncTaskHandler) Run(ec echo.Context) error {
	c := h.NewContext(ec)
	return fail(c, 501, "未实现")
}

func (h *SyncTaskHandler) TransferHistory(ec echo.Context) error {
	c := h.NewContext(ec)
	return fail(c, 501, "未实现")
}

func (h *SyncTaskHandler) SearchHistory(ec echo.Context) error {
	c := h.NewContext(ec)
	return fail(c, 501, "未实现")
}
