package handler

import (
	"encoding/json"
	"github.com/family-flix/api/internal/domain/member"
	"github.com/family-flix/api/internal/domain/user"
	"github.com/family-flix/api/internal/model"
)

func AdminUserLogin(c Context) error {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.Bind(&body); err != nil {
		return fail(c, 400, "参数错误")
	}
	u, err := user.GetByPassword(body.Email, body.Password, c.DB())
	if err != nil {
		return fail(c, 900, err.Error())
	}
	return ok(c, "", R{"id": u.ID, "token": u.Token})
}

func AdminUserRegister(c Context) error {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.Bind(&body); err != nil {
		return fail(c, 400, "参数错误")
	}
	res, err := user.Create(body.Email, body.Password, c.DB())
	if err != nil {
		return fail(c, 900, err.Error())
	}
	return ok(c, "注册成功", res)
}

func AdminUserLogout(c Context) error {
	return ok(c, "", nil)
}

func AdminUserProfile(c Context) error {
	token := c.Header("Authorization")
	u, err := user.New(token, c.DB())
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var record model.User
	c.DB().First(&record, "id = ?", u.ID)
	return ok(c, "", record)
}

func AdminUserValidate(c Context) error {
	var body struct {
		Token string `json:"token"`
	}
	if err := c.Bind(&body); err != nil {
		return fail(c, 400, "参数错误")
	}
	u, err := user.New(body.Token, c.DB())
	if err != nil {
		return fail(c, 900, err.Error())
	}
	return ok(c, "校验通过", R{"id": u.ID})
}

func AdminUserExisting(c Context) error {
	var count int64
	c.DB().Model(&model.User{}).Count(&count)
	return ok(c, "获取成功", R{"existing": count > 0})
}

func AdminMemberList(c Context) error {
	token := c.Header("Authorization")
	u, err := user.New(token, c.DB())
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
	db := c.DB().Where("user_id = ? AND `delete` = 0", u.ID)
	if body.Name != "" {
		db = db.Where("remark LIKE ?", "%"+body.Name+"%")
	}
	var total int64
	db.Model(&model.Member{}).Count(&total)
	if body.NextMarker != "" {
		db = db.Where("id < ?", body.NextMarker)
	}
	var members []model.Member
	db.Preload("Tokens").Order("created DESC").Limit(body.PageSize).Find(&members)
	list := make([]R, 0, len(members))
	var nextMarker string
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
		nextMarker = m.ID
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func AdminMemberAdd(c Context) error {
	token := c.Header("Authorization")
	u, err := user.New(token, c.DB())
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
	var existing model.Member
	if err := c.DB().Where("remark = ? AND inviter_id = '' AND user_id = ?", body.Remark, u.ID).First(&existing).Error; err == nil {
		return fail(c, 400, "已存在相同备注的成员了")
	}
	memberID, tokenID, tokenValue, err := member.CreateWithoutAccount(body.Remark, u.ID, c.DB())
	if err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "添加成员成功", R{"id": memberID, "token": R{"id": tokenID, "code": tokenValue}})
}

func AdminMemberProfile(c Context) error {
	token := c.Header("Authorization")
	u, err := user.New(token, c.DB())
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		MemberID string `json:"member_id"`
	}
	if err := c.Bind(&body); err != nil || body.MemberID == "" {
		return fail(c, 400, "缺少成员 id")
	}
	var m model.Member
	if err := c.DB().Where("id = ? AND user_id = ?", body.MemberID, u.ID).First(&m).Error; err != nil {
		return fail(c, 404, "没有匹配的成员")
	}
	return ok(c, "", R{"id": m.ID, "remark": m.Remark})
}

func AdminMemberDelete(c Context) error {
	token := c.Header("Authorization")
	u, err := user.New(token, c.DB())
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ID string `json:"id"`
	}
	if err := c.Bind(&body); err != nil || body.ID == "" {
		return fail(c, 400, "缺少成员 id")
	}
	var m model.Member
	if err := c.DB().Where("id = ? AND user_id = ?", body.ID, u.ID).First(&m).Error; err != nil {
		return fail(c, 404, "没有匹配的成员")
	}
	c.DB().Model(&m).Update("delete", 1)
	return ok(c, "删除成员成功", nil)
}

func AdminMemberUpdatePermission(c Context) error {
	token := c.Header("Authorization")
	u, err := user.New(token, c.DB())
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
	var m model.Member
	if err := c.DB().Where("id = ? AND user_id = ?", body.MemberID, u.ID).First(&m).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	permJSON, _ := json.Marshal(body.Permissions)
	permStr := string(permJSON)
	c.DB().Model(&m).Update("permission", permStr)
	return ok(c, "更新成功", nil)
}

func AdminMemberAddToken(c Context) error {
	token := c.Header("Authorization")
	u, err := user.New(token, c.DB())
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ID string `json:"id"`
	}
	if err := c.Bind(&body); err != nil || body.ID == "" {
		return fail(c, 400, "缺少成员 id")
	}
	var m model.Member
	if err := c.DB().Where("id = ? AND user_id = ?", body.ID, u.ID).First(&m).Error; err != nil {
		return fail(c, 404, "没有匹配的成员记录")
	}
	tokenValue, err := user.EncodeToken(body.ID)
	if err != nil {
		return fail(c, 500, err.Error())
	}
	rec := model.MemberToken{ID: member.Rid(), Token: tokenValue, MemberID: body.ID}
	if err := c.DB().Create(&rec).Error; err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "", R{"id": rec.ID, "token": tokenValue})
}

func AdminMemberHistories(c Context) error {
	token := c.Header("Authorization")
	u, err := user.New(token, c.DB())
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
	// Verify member belongs to user
	var m model.Member
	if err := c.DB().Where("id = ? AND user_id = ?", body.MemberID, u.ID).First(&m).Error; err != nil {
		return fail(c, 404, "没有匹配的成员")
	}
	db := c.DB().Where("member_id = ?", body.MemberID)
	if body.NextMarker != "" {
		db = db.Where("id < ?", body.NextMarker)
	}
	var histories []model.PlayHistoryV2
	db.Preload("Media.Profile").Preload("MediaSource.Profile").
		Order("updated DESC").Limit(body.PageSize).Find(&histories)
	list := make([]R, 0, len(histories))
	var nextMarker string
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
		nextMarker = h.ID
	}
	return ok(c, "", R{"list": list, "next_marker": nextMarker})
}

func InviteeAdd(c Context) error {
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
	memberID, tokenID, tokenValue, err := member.CreateWithoutAccount(body.Remark, m.UserID, c.DB())
	if err != nil {
		return fail(c, 500, err.Error())
	}
	// Set inviter
	c.DB().Model(&model.Member{}).Where("id = ?", memberID).Update("inviter_id", m.ID)
	return ok(c, "添加成功", R{"id": memberID, "token": R{"id": tokenID, "code": tokenValue}})
}

func InviteeList(c Context) error {
	m, _, err := authMember(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var invitees []model.Member
	c.DB().Where("inviter_id = ? AND `delete` = 0", m.ID).Preload("Tokens").Find(&invitees)
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

func AccountMerge(c Context) error {
	// TODO: complex account merging logic
	return fail(c, 501, "未实现")
}

func AdminPermissionList(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var permissions []model.Permission
	c.DB().Where("user_id = ?", u.ID).Order("created DESC").Find(&permissions)
	list := make([]R, 0, len(permissions))
	for _, p := range permissions {
		list = append(list, R{"id": p.ID, "code": p.Code, "desc": p.Desc})
	}
	return ok(c, "", R{"list": list})
}

func AdminPermissionAdd(c Context) error {
	u, err := authAdmin(c)
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
	var existing model.Permission
	if err := c.DB().Where("code = ? AND user_id = ?", body.Code, u.ID).First(&existing).Error; err == nil {
		return fail(c, 400, "已存在相同 code 的权限")
	}
	p := model.Permission{ID: member.Rid(), Code: body.Code, Desc: body.Desc, UserID: u.ID}
	if err := c.DB().Create(&p).Error; err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "添加成功", R{"id": p.ID})
}

func AdminMemberTokenAdd(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		MemberID string `json:"member_id"`
	}
	if err := c.Bind(&body); err != nil || body.MemberID == "" {
		return fail(c, 400, "缺少 member_id")
	}
	var m model.Member
	if err := c.DB().Where("id = ? AND user_id = ?", body.MemberID, u.ID).First(&m).Error; err != nil {
		return fail(c, 404, "没有匹配的成员")
	}
	tokenValue, err := user.EncodeToken(body.MemberID)
	if err != nil {
		return fail(c, 500, err.Error())
	}
	rec := model.MemberToken{ID: member.Rid(), Token: tokenValue, MemberID: body.MemberID}
	if err := c.DB().Create(&rec).Error; err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "", R{"id": rec.ID, "token": tokenValue})
}
