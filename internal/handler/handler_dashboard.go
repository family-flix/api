package handler

import (
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"

	"github.com/family-flix/api/internal/service"
)

type DashboardHandler struct {
	BaseHandler
	dashboardService service.DashboardService
}

func NewDashboardHandler(dashboardService service.DashboardService, db *gorm.DB, baseDir, cacheDir, ffmpegBin string) *DashboardHandler {
	return &DashboardHandler{
		BaseHandler: BaseHandler{
			db:        db,
			baseDir:   baseDir,
			cacheDir:  cacheDir,
			ffmpegBin: ffmpegBin,
		},
		dashboardService: dashboardService,
	}
}

func (h *DashboardHandler) Dashboard(ec echo.Context) error {
	c := h.NewContext(ec)
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	data, err := h.dashboardService.GetDashboard(u.ID)
	if err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "", data)
}

func (h *DashboardHandler) Refresh(ec echo.Context) error {
	c := h.NewContext(ec)
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	if err := h.dashboardService.RefreshDashboard(u.ID); err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "更新成功", nil)
}

func (h *DashboardHandler) AddedMedia(ec echo.Context) error {
	c := h.NewContext(ec)
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

	sources, nextMarker, err := h.dashboardService.ListAddedMedia(u.ID, body.StartTime, body.EndTime, body.NextMarker, body.PageSize)
	if err != nil {
		return fail(c, 500, err.Error())
	}

	list := make([]R, 0)
	for _, s := range sources {
		item := R{"id": s.Media.ID, "type": s.Media.Type, "created": s.Created.Unix()}
		if s.Media.Profile != nil {
			item["name"] = s.Media.Profile.Name
			item["poster_path"] = s.Media.Profile.PosterPath
			item["air_date"] = s.Media.Profile.AirDate
		}
		list = append(list, item)
	}

	return ok(c, "", R{"list": list, "next_marker": nextMarker})
}
