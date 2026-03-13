package handler

import (
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"

	"github.com/family-flix/api/internal/service"
)

type ToolHandler struct {
	BaseHandler
	toolService service.ToolService
}

func NewToolHandler(toolService service.ToolService, db *gorm.DB, baseDir, cacheDir, ffmpegBin string) *ToolHandler {
	return &ToolHandler{
		BaseHandler: BaseHandler{
			db:        db,
			baseDir:   baseDir,
			cacheDir:  cacheDir,
			ffmpegBin: ffmpegBin,
		},
		toolService: toolService,
	}
}

func (h *ToolHandler) Parse(ec echo.Context) error {
	c := h.NewContext(ec)
	// TODO: requires drive client for file analysis
	return fail(c, 501, "未实现")
}

func (h *ToolHandler) ShortLink(ec echo.Context) error {
	c := h.NewContext(ec)
	// TODO: requires short link service
	return fail(c, 501, "未实现")
}

func (h *ToolHandler) SharedFileCheckSameName(ec echo.Context) error {
	c := h.NewContext(ec)
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

	existing, found, err := h.toolService.CheckSharedFile(body.URL, u.ID)
	if err != nil {
		// Log error if needed, but for now just assume not found or db error
		// Original code checked `err == nil` for success, implying any error means not found
	}

	if found {
		return ok(c, "", R{"existing": true, "id": existing.ID})
	}
	return ok(c, "", R{"existing": false})
}

func (h *ToolHandler) SharedFileSearch(ec echo.Context) error {
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
	querySize := pageSize
	if body.Page <= 0 {
		querySize = pageSize + 1
	}

	files, total, err := h.toolService.SearchSharedFiles(u.ID, body.Name, body.NextMarker, querySize, body.Page)
	if err != nil {
		return fail(c, 500, err.Error())
	}

	var nextMarker string
	if body.Page > 0 {
		if int64(body.Page)*int64(pageSize) < total && len(files) > 0 {
			nextMarker = files[len(files)-1].ID
		}
	} else if len(files) > pageSize {
		nextMarker = files[pageSize-1].ID
		files = files[:pageSize]
	}

	list := make([]R, 0, len(files))
	for _, f := range files {
		list = append(list, R{"id": f.ID, "title": f.Title, "url": f.URL, "created": f.Created})
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func (h *ToolHandler) SharedFileSaveList(ec echo.Context) error {
	c := h.NewContext(ec)
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
		Page       int    `json:"page"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}
	pageSize := body.PageSize
	querySize := pageSize
	if body.Page <= 0 {
		querySize = pageSize + 1
	}

	files, err := h.toolService.ListSharedFileSaveInProgress(u.ID, body.NextMarker, querySize, body.Page)
	if err != nil {
		return fail(c, 500, err.Error())
	}

	var nextMarker string
	if body.Page <= 0 && len(files) > pageSize {
		nextMarker = files[pageSize-1].ID
		files = files[:pageSize]
	}

	list := make([]R, 0, len(files))
	for _, f := range files {
		item := R{"id": f.ID, "url": f.URL, "name": f.Name, "file_id": f.FileID, "created": f.Created}
		if f.Drive != nil {
			item["drive"] = R{"id": f.Drive.ID, "name": f.Drive.Name}
		}
		list = append(list, item)
	}
	return ok(c, "", R{"list": list, "next_marker": nextMarker})
}
