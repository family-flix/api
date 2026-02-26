package handler

import (
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"

	"github.com/family-flix/api/internal/service"
)

type SettingsHandler struct {
	BaseHandler
	settingsService service.SettingsService
}

func NewSettingsHandler(settingsService service.SettingsService, db *gorm.DB, baseDir, cacheDir, ffmpegBin string) *SettingsHandler {
	return &SettingsHandler{
		BaseHandler: BaseHandler{
			db:        db,
			baseDir:   baseDir,
			cacheDir:  cacheDir,
			ffmpegBin: ffmpegBin,
		},
		settingsService: settingsService,
	}
}

func (h *SettingsHandler) Profile(ec echo.Context) error {
	c := h.NewContext(ec)
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	settings, err := h.settingsService.GetSettings(u.ID)
	if err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "", settings)
}

func (h *SettingsHandler) Update(ec echo.Context) error {
	c := h.NewContext(ec)
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body map[string]interface{}
	if err := c.Bind(&body); err != nil {
		return fail(c, 400, "参数错误")
	}
	if err := h.settingsService.UpdateSettings(u.ID, body); err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "更新成功", nil)
}
