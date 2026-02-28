package handler

import (
	"fmt"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"

	"github.com/family-flix/api/internal/model"
	"github.com/family-flix/api/internal/service"
)

type AdminUserHandler struct {
	BaseHandler
	userService   service.UserService
	memberService service.MemberService
}

func NewAdminUserHandler(userService service.UserService, memberService service.MemberService, db *gorm.DB, baseDir, cacheDir, ffmpegBin string) *AdminUserHandler {
	return &AdminUserHandler{
		BaseHandler: BaseHandler{
			db:        db,
			baseDir:   baseDir,
			cacheDir:  cacheDir,
			ffmpegBin: ffmpegBin,
		},
		userService:   userService,
		memberService: memberService,
	}
}

func (h *AdminUserHandler) auth(c Context) (*model.User, error) {
	token := c.Header("Authorization")
	if token == "" {
		return nil, fmt.Errorf("缺少 token")
	}
	return h.userService.GetProfile(c.Context(), token)
}

func (h *AdminUserHandler) Login(ec echo.Context) error {
	c := h.NewContext(ec)
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.Bind(&body); err != nil {
		return fail(c, 400, "参数错误")
	}
	u, token, err := h.userService.Login(c.Context(), body.Email, body.Password)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	return ok(c, "", R{"id": u.ID, "token": token})
}

func (h *AdminUserHandler) Register(ec echo.Context) error {
	c := h.NewContext(ec)
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.Bind(&body); err != nil {
		return fail(c, 400, "参数错误")
	}
	id, token, err := h.userService.Register(c.Context(), body.Email, body.Password)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	return ok(c, "注册成功", R{"id": id, "token": token})
}

func (h *AdminUserHandler) Logout(ec echo.Context) error {
	c := h.NewContext(ec)
	return ok(c, "", nil)
}

func (h *AdminUserHandler) Profile(ec echo.Context) error {
	c := h.NewContext(ec)
	u, err := h.auth(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	// Return full user object as before?
	// The original code did: c.DB().First(&record, "id = ?", u.ID)
	// u from auth IS the user record (from service.GetProfile -> repo.Get).
	return ok(c, "", u)
}

func (h *AdminUserHandler) Validate(ec echo.Context) error {
	c := h.NewContext(ec)
	var body struct {
		Token string `json:"token"`
	}
	if err := c.Bind(&body); err != nil {
		return fail(c, 400, "参数错误")
	}
	u, err := h.userService.ValidateToken(c.Context(), body.Token)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	return ok(c, "校验通过", R{"id": u.ID})
}

func (h *AdminUserHandler) Existing(ec echo.Context) error {
	c := h.NewContext(ec)
	// Original code checked count of users.
	// But userService.Existing(email) checks specific email.
	// The handler `AdminUserExisting` returned `{"existing": count > 0}`.
	// So it checks if ANY admin exists (to determine if we need to show register or login page).

	initialized, err := h.userService.IsInitialized(c.Context())
	if err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "获取成功", R{"existing": initialized})
}

func (h *AdminUserHandler) MemberList(ec echo.Context) error {
	c := h.NewContext(ec)
	u, err := h.auth(c)
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

	members, total, nextMarker, err := h.memberService.List(c.Context(), u.ID, body.Name, body.NextMarker, body.PageSize, body.Page)
	if err != nil {
		return fail(c, 500, err.Error())
	}

	list := make([]R, 0, len(members))
	for _, m := range members {
		tokens := make([]R, 0, len(m.Tokens))
		for _, t := range m.Tokens {
			tokens = append(tokens, R{"id": t.ID, "token": t.Token})
		}
		list = append(list, R{
			"id":     m.ID,
			"remark": m.Remark,
			"email":  m.Email,
			"tokens": tokens,
		})
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func (h *AdminUserHandler) MemberAdd(ec echo.Context) error {
	c := h.NewContext(ec)
	u, err := h.auth(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Remark string `json:"remark"`
	}
	if err := c.Bind(&body); err != nil {
		return fail(c, 400, "参数错误")
	}
	if body.Remark == "" {
		return fail(c, 400, "缺少成员备注")
	}

	memberID, tokenID, tokenValue, err := h.memberService.Create(c.Context(), u.ID, body.Remark)
	if err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "添加成员成功", R{"id": memberID, "token": R{"id": tokenID, "code": tokenValue}})
}

func (h *AdminUserHandler) MemberProfile(ec echo.Context) error {
	c := h.NewContext(ec)
	u, err := h.auth(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		MemberID string `json:"member_id"`
	}
	if err := c.Bind(&body); err != nil || body.MemberID == "" {
		return fail(c, 400, "缺少成员 id")
	}

	m, err := h.memberService.Get(c.Context(), body.MemberID, u.ID)
	if err != nil {
		return fail(c, 404, "没有匹配的成员")
	}
	return ok(c, "", R{"id": m.ID, "remark": m.Remark})
}

func (h *AdminUserHandler) MemberDelete(ec echo.Context) error {
	c := h.NewContext(ec)
	u, err := h.auth(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ID string `json:"id"`
	}
	if err := c.Bind(&body); err != nil || body.ID == "" {
		return fail(c, 400, "缺少成员 id")
	}

	if err := h.memberService.Delete(c.Context(), u.ID, body.ID); err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "删除成员成功", nil)
}

func (h *AdminUserHandler) MemberUpdatePermission(ec echo.Context) error {
	c := h.NewContext(ec)
	u, err := h.auth(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		MemberID    string   `json:"member_id"`
		Permissions []string `json:"permissions"`
	}
	if err := c.Bind(&body); err != nil {
		return fail(c, 400, "参数错误")
	}
	if body.MemberID == "" {
		return fail(c, 400, "缺少成员 id")
	}
	if body.Permissions == nil {
		return fail(c, 400, "缺少权限信息")
	}

	if err := h.memberService.UpdatePermissions(c.Context(), u.ID, body.MemberID, body.Permissions); err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "更新成功", nil)
}

func (h *AdminUserHandler) MemberAddToken(ec echo.Context) error {
	c := h.NewContext(ec)
	u, err := h.auth(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ID string `json:"id"`
	}
	if err := c.Bind(&body); err != nil || body.ID == "" {
		return fail(c, 400, "缺少成员 id")
	}

	tokenID, tokenValue, err := h.memberService.AddToken(c.Context(), u.ID, body.ID)
	if err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "", R{"id": tokenID, "token": tokenValue})
}

func (h *AdminUserHandler) MemberHistories(ec echo.Context) error {
	c := h.NewContext(ec)
	u, err := h.auth(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		MemberID   string `json:"member_id"`
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}

	// Check ownership
	if _, err := h.memberService.Get(c.Context(), body.MemberID, u.ID); err != nil {
		return fail(c, 404, "没有匹配的成员")
	}

	histories, _, nextMarker, err := h.memberService.GetHistories(c.Context(), body.MemberID, body.NextMarker, body.PageSize)
	if err != nil {
		return fail(c, 500, err.Error())
	}

	list := make([]R, 0, len(histories))
	for _, h := range histories {
		item := R{
			"id":           h.ID,
			"current_time": h.CurrentTime,
			"duration":     h.Duration,
			"updated":      h.Updated,
		}
		if h.Media != nil && h.Media.Profile != nil {
			item["name"] = h.Media.Profile.Name
			item["poster_path"] = h.Media.Profile.PosterPath
			item["type"] = h.Media.Profile.Type
		}
		if h.MediaSource != nil && h.MediaSource.Profile != nil {
			item["source"] = h.MediaSource.Profile.Name
		}
		list = append(list, item)
	}
	return ok(c, "", R{"list": list, "next_marker": nextMarker})
}

func (h *AdminUserHandler) PermissionList(ec echo.Context) error {
	c := h.NewContext(ec)
	u, err := h.auth(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}

	permissions, err := h.userService.ListPermissions(c.Context(), u.ID)
	if err != nil {
		return fail(c, 500, err.Error())
	}

	list := make([]R, 0, len(permissions))
	for _, p := range permissions {
		list = append(list, R{"id": p.ID, "code": p.Code, "desc": p.Desc})
	}
	return ok(c, "", R{"list": list})
}

func (h *AdminUserHandler) PermissionAdd(ec echo.Context) error {
	c := h.NewContext(ec)
	u, err := h.auth(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Code string `json:"code"`
		Desc string `json:"desc"`
	}
	if err := c.Bind(&body); err != nil || body.Code == "" || body.Desc == "" {
		return fail(c, 400, "参数错误")
	}

	id, err := h.userService.CreatePermission(c.Context(), u.ID, body.Code, body.Desc)
	if err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "添加成功", R{"id": id})
}
