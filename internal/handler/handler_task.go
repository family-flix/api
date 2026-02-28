package handler

import (
	"os"
	"strings"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"

	"github.com/family-flix/api/internal/service"
)

type TaskHandler struct {
	BaseHandler
	taskService service.TaskService
}

func NewTaskHandler(taskService service.TaskService, db *gorm.DB, baseDir, cacheDir, ffmpegBin string) *TaskHandler {
	return &TaskHandler{
		BaseHandler: BaseHandler{
			db:        db,
			baseDir:   baseDir,
			cacheDir:  cacheDir,
			ffmpegBin: ffmpegBin,
		},
		taskService: taskService,
	}
}

func (h *TaskHandler) List(ec echo.Context) error {
	c := h.NewContext(ec)
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Status     *int   `json:"status"`
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
		Page       int    `json:"page"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}

	tasks, total, err := h.taskService.ListTasks(u.ID, body.Status, body.NextMarker, body.PageSize, body.Page)
	if err != nil {
		return fail(c, 500, err.Error())
	}

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

func (h *TaskHandler) Status(ec echo.Context) error {
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
	t, err := h.taskService.GetTask(body.ID, u.ID)
	if err != nil {
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

func (h *TaskHandler) Pause(ec echo.Context) error {
	c := h.NewContext(ec)
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
	if err := h.taskService.PauseTask(body.ID, u.ID); err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "已标记暂停", nil)
}

func (h *TaskHandler) Profile(ec echo.Context) error {
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
	t, err := h.taskService.GetTask(body.ID, u.ID)
	if err != nil {
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
