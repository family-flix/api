package handler

import (
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"

	"github.com/family-flix/api/internal/service"
)

type ReportHandler struct {
	BaseHandler
	reportService service.ReportService
}

func NewReportHandler(reportService service.ReportService, db *gorm.DB, baseDir, cacheDir, ffmpegBin string) *ReportHandler {
	return &ReportHandler{
		BaseHandler: BaseHandler{
			db:        db,
			baseDir:   baseDir,
			cacheDir:  cacheDir,
			ffmpegBin: ffmpegBin,
		},
		reportService: reportService,
	}
}

func (h *ReportHandler) List(ec echo.Context) error {
	c := h.NewContext(ec)
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Type       *int   `json:"type"`
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
		Page       int    `json:"page"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}

	reports, total, err := h.reportService.ListReports(u.ID, body.Type, body.NextMarker, body.PageSize, body.Page)
	if err != nil {
		return fail(c, 500, err.Error())
	}

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

func (h *ReportHandler) Reply(ec echo.Context) error {
	c := h.NewContext(ec)
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
	if err := h.reportService.ReplyReport(body.ID, body.Content, body.MediaID, u.ID); err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "", nil)
}
