package handler

import (
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"

	"github.com/family-flix/api/internal/repository"
	"github.com/family-flix/api/internal/service"
)

type MemberHandler struct {
	BaseHandler
	historyService    service.HistoryService
	collectionService service.CollectionService
	memberService     service.MemberService
}

func NewMemberHandler(historyService service.HistoryService, collectionService service.CollectionService, memberService service.MemberService, db *gorm.DB, baseDir, cacheDir, ffmpegBin string) *MemberHandler {
	return &MemberHandler{
		BaseHandler: BaseHandler{
			db:        db,
			baseDir:   baseDir,
			cacheDir:  cacheDir,
			ffmpegBin: ffmpegBin,
		},
		historyService:    historyService,
		collectionService: collectionService,
		memberService:     memberService,
	}
}

func (h *MemberHandler) History(ec echo.Context) error {
	c := h.NewContext(ec)
	m, _, err := authMember(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		MediaID string `json:"media_id"`
	}
	if err := c.Bind(&body); err != nil || body.MediaID == "" {
		return fail(c, 400, "缺少 media_id")
	}

	history, err := h.historyService.GetHistory(c.DB().Statement.Context, m.ID, body.MediaID)
	if err != nil {
		return ok(c, "", nil)
	}

	return ok(c, "", R{"id": history.ID, "current_time": history.CurrentTime, "duration": history.Duration, "media_source_id": history.MediaSourceID, "thumbnail_path": history.ThumbnailPath, "updated": history.Updated})
}

func (h *MemberHandler) HistoryList(ec echo.Context) error {
	c := h.NewContext(ec)
	m, _, err := authMember(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
	}
	c.Bind(&body)

	histories, total, err := h.historyService.ListHistory(c.DB().Statement.Context, m.ID, body.PageSize, body.NextMarker)
	if err != nil {
		return fail(c, 500, err.Error())
	}

	list := make([]R, 0, len(histories))
	var nextMarker string
	for _, h := range histories {
		item := R{
			"id":             h.ID,
			"media_id":       h.MediaID,
			"current_time":   h.CurrentTime,
			"duration":       h.Duration,
			"thumbnail_path": h.ThumbnailPath,
			"updated":        h.Updated,
		}
		if h.Media != nil {
			item["type"] = h.Media.Type
			if h.Media.Profile != nil {
				item["name"] = h.Media.Profile.Name
				item["poster_path"] = h.Media.Profile.PosterPath
				item["air_date"] = h.Media.Profile.AirDate
				item["episode_count"] = h.Media.Profile.SourceCount
				item["cur_episode_count"] = len(h.Media.MediaSources)
			}
		}
		if h.MediaSource != nil && h.MediaSource.Profile != nil {
			item["cur_episode_number"] = h.MediaSource.Profile.Order
		}
		list = append(list, item)
		nextMarker = h.ID
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func (h *MemberHandler) HistoryUpdate(ec echo.Context) error {
	c := h.NewContext(ec)
	m, _, err := authMember(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		MediaID       string  `json:"media_id"`
		MediaSourceID string  `json:"media_source_id"`
		CurrentTime   float64 `json:"current_time"`
		Duration      float64 `json:"duration"`
		Thumbnail     string  `json:"thumbnail"`
	}
	if err := c.Bind(&body); err != nil || body.MediaID == "" || body.MediaSourceID == "" {
		return fail(c, 400, "参数错误")
	}

	req := service.HistoryUpdateRequest{
		MediaID:       body.MediaID,
		MediaSourceID: body.MediaSourceID,
		CurrentTime:   body.CurrentTime,
		Duration:      body.Duration,
		Thumbnail:     body.Thumbnail,
	}

	if err := h.historyService.UpdateHistory(c.DB().Statement.Context, m.ID, req); err != nil {
		return fail(c, 500, err.Error())
	}

	return ok(c, "操作成功", nil)
}

func (h *MemberHandler) Info(ec echo.Context) error {
	c := h.NewContext(ec)
	m, _, err := authMember(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	return ok(c, "", R{"id": m.ID, "remark": m.Remark, "email": m.Email, "avatar": m.Avatar, "name": m.Name})
}

func (h *MemberHandler) CollectionList(ec echo.Context) error {
	c := h.NewContext(ec)
	m, _, err := authMember(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Type       *int   `json:"type"`
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
	}
	c.Bind(&body)

	filter := repository.CollectionFilter{
		Type:       body.Type,
		NextMarker: body.NextMarker,
		PageSize:   body.PageSize,
	}

	collections, total, err := h.collectionService.ListCollection(c.DB().Statement.Context, m.UserID, filter)
	if err != nil {
		return fail(c, 500, err.Error())
	}

	list := make([]R, 0, len(collections))
	var nextMarker string
	for _, col := range collections {
		medias := make([]R, 0)
		for _, media := range col.Medias {
			mi := R{"id": media.ID, "type": media.Type}
			if media.Profile != nil {
				mi["name"] = media.Profile.Name
				mi["poster_path"] = media.Profile.PosterPath
				mi["air_date"] = media.Profile.AirDate
			}
			medias = append(medias, mi)
		}
		list = append(list, R{"id": col.ID, "type": col.Type, "title": col.Title, "desc": col.Desc, "medias": medias})
		nextMarker = col.ID
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func (h *MemberHandler) Validate(ec echo.Context) error {
	c := h.NewContext(ec)
	m, mt, err := authMember(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	return ok(c, "校验通过", R{"id": m.ID, "token": mt.Token})
}

func (h *MemberHandler) WechatCollectionList(ec echo.Context) error {
	c := h.NewContext(ec)
	m, _, err := authMember(c)
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

	typeVal := 1
	if body.Type != nil {
		typeVal = *body.Type
	}

	filter := repository.CollectionFilter{
		Type:       &typeVal,
		NextMarker: body.NextMarker,
		PageSize:   body.PageSize,
	}

	collections, total, err := h.collectionService.ListCollection(c.DB().Statement.Context, m.UserID, filter)
	if err != nil {
		return fail(c, 500, err.Error())
	}

	list := make([]R, 0, len(collections))
	var nextMarker string
	for _, col := range collections {
		medias := make([]R, 0)
		for _, media := range col.Medias {
			mi := R{"id": media.ID, "type": media.Type}
			if media.Profile != nil {
				mi["name"] = media.Profile.Name
				mi["poster_path"] = media.Profile.PosterPath
				mi["air_date"] = media.Profile.AirDate
			}
			medias = append(medias, mi)
		}
		list = append(list, R{"id": col.ID, "type": col.Type, "title": col.Title, "desc": col.Desc, "medias": medias})
		nextMarker = col.ID
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func (h *MemberHandler) V1UserFindFirst(ec echo.Context) error {
	c := h.NewContext(ec)
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	return ok(c, "", R{"id": u.ID})
}

func (h *MemberHandler) InviteeAdd(ec echo.Context) error {
	c := h.NewContext(ec)
	m, _, err := authMember(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Remark string `json:"remark"`
	}
	if err := c.Bind(&body); err != nil || body.Remark == "" {
		return fail(c, 400, "缺少备注")
	}

	memberID, tokenID, tokenValue, err := h.memberService.CreateInvitee(c.Context(), m.UserID, m.ID, body.Remark)
	if err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "添加成功", R{"id": memberID, "token": R{"id": tokenID, "code": tokenValue}})
}

func (h *MemberHandler) InviteeList(ec echo.Context) error {
	c := h.NewContext(ec)
	m, _, err := authMember(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}

	invitees, err := h.memberService.ListInvitees(c.Context(), m.ID)
	if err != nil {
		return fail(c, 500, err.Error())
	}

	list := make([]R, 0, len(invitees))
	for _, inv := range invitees {
		tokens := make([]R, 0)
		for _, t := range inv.Tokens {
			tokens = append(tokens, R{"id": t.ID, "token": t.Token})
		}
		list = append(list, R{"id": inv.ID, "remark": inv.Remark, "tokens": tokens})
	}
	return ok(c, "", R{"list": list})
}

func (h *MemberHandler) AccountMerge(ec echo.Context) error {
	c := h.NewContext(ec)
	return fail(c, 501, "未实现")
}
