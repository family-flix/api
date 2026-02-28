package handler

import (
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"

	"github.com/family-flix/api/internal/model"
	"github.com/family-flix/api/internal/service"
)

// SystemHandler
type SystemHandler struct {
	BaseHandler
	historyService service.HistoryService
}

func NewSystemHandler(historyService service.HistoryService, db *gorm.DB, baseDir, cacheDir, ffmpegBin string) *SystemHandler {
	return &SystemHandler{
		BaseHandler: BaseHandler{
			db:        db,
			baseDir:   baseDir,
			cacheDir:  cacheDir,
			ffmpegBin: ffmpegBin,
		},
		historyService: historyService,
	}
}

func (h *SystemHandler) ResourceFiles(ec echo.Context) error {
	c := h.NewContext(ec)
	// TODO: requires drive client for file listing
	return fail(c, 501, "未实现")
}

func (h *SystemHandler) ResourceTransfer(ec echo.Context) error {
	c := h.NewContext(ec)
	// TODO: requires drive client for file transfer
	return fail(c, 501, "未实现")
}

func (h *SystemHandler) PersonList(ec echo.Context) error {
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
	db := c.DB()
	if body.Name != "" {
		db = db.Where("name LIKE ?", "%"+body.Name+"%")
	}
	var total int64
	db.Model(&model.PersonProfile{}).Count(&total)

	if body.Page > 0 {
		db = db.Offset((body.Page - 1) * body.PageSize)
	} else if body.NextMarker != "" {
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

func (h *SystemHandler) ClearThumbnails(ec echo.Context) error {
	c := h.NewContext(ec)
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	if err := h.historyService.ClearThumbnails(c.Context(), u.ID); err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "清除成功", nil)
}
