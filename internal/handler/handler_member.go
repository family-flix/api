package handler

import (
	"encoding/json"
	"github.com/family-flix/api/internal/domain/member"
	"github.com/family-flix/api/internal/domain/user"
	"github.com/family-flix/api/internal/model"
	"time"
)

func History(c Context) error {
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
	var h model.PlayHistoryV2
	if err := c.DB().Where("media_id = ? AND member_id = ?", body.MediaID, m.ID).First(&h).Error; err != nil {
		return ok(c, "", nil)
	}
	return ok(c, "", R{"id": h.ID, "current_time": h.CurrentTime, "duration": h.Duration, "media_source_id": h.MediaSourceID, "thumbnail_path": h.ThumbnailPath, "updated": h.Updated})
}

func HistoryList(c Context) error {
	m, _, err := authMember(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}
	db := c.DB().Where("member_id = ?", m.ID)
	var total int64
	db.Model(&model.PlayHistoryV2{}).Count(&total)
	if body.NextMarker != "" {
		db = db.Where("id < ?", body.NextMarker)
	}
	var histories []model.PlayHistoryV2
	db.Preload("Media.Profile").Preload("Media.MediaSources").Preload("MediaSource.Profile").
		Order("updated DESC").Limit(body.PageSize).Find(&histories)
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

func HistoryUpdate(c Context) error {
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
	var h model.PlayHistoryV2
	err2 := c.DB().Where("media_id = ? AND member_id = ?", body.MediaID, m.ID).First(&h).Error
	if err2 != nil {
		// Create
		h = model.PlayHistoryV2{
			ID:            member.Rid(),
			MediaID:       body.MediaID,
			MediaSourceID: body.MediaSourceID,
			CurrentTime:   body.CurrentTime,
			Duration:      body.Duration,
			MemberID:      m.ID,
		}
		if body.Thumbnail != "" {
			h.ThumbnailPath = &body.Thumbnail
		}
		c.DB().Create(&h)
		return ok(c, "新增记录成功", nil)
	}
	updates := map[string]interface{}{
		"media_source_id": body.MediaSourceID,
		"current_time":    body.CurrentTime,
		"duration":        body.Duration,
		"updated":         time.Now(),
	}
	if body.Thumbnail != "" {
		updates["thumbnail_path"] = body.Thumbnail
	}
	c.DB().Model(&h).Updates(updates)
	return ok(c, "更新记录成功", nil)
}

func Info(c Context) error {
	m, _, err := authMember(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	return ok(c, "", R{"id": m.ID, "remark": m.Remark, "email": m.Email, "avatar": m.Avatar, "name": m.Name})
}

func CollectionList(c Context) error {
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
	db := c.DB().Where("user_id = ?", m.UserID)
	if body.Type != nil {
		db = db.Where("type = ?", *body.Type)
	}
	var total int64
	db.Model(&model.CollectionV2{}).Count(&total)
	if body.NextMarker != "" {
		db = db.Where("id < ?", body.NextMarker)
	}
	var collections []model.CollectionV2
	db.Preload("Medias.Profile").Order("sort DESC, created DESC").Limit(body.PageSize).Find(&collections)
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

func Validate(c Context) error {
	m, mt, err := authMember(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	return ok(c, "校验通过", R{"id": m.ID, "token": mt.Token})
}

func WechatAuthLogin(c Context) error {
	var body struct {
		Email string `json:"email"`
		PWD   string `json:"pwd"`
	}
	if err := c.Bind(&body); err != nil {
		return fail(c, 400, "参数错误")
	}
	if body.Email == "" || body.PWD == "" {
		return fail(c, 400, "缺少邮箱或密码")
	}
	// Find admin user
	var adminUser model.User
	if err := c.DB().First(&adminUser).Error; err != nil {
		return fail(c, 900, "没有管理员账号")
	}
	// Find member credential
	var auth model.MemberAuthentication
	if err := c.DB().Where("provider = 'credential' AND provider_id = ?", body.Email).First(&auth).Error; err != nil {
		return fail(c, 900, "该邮箱不存在")
	}
	var m model.Member
	if err := c.DB().Where("id = ? AND `delete` = 0", auth.MemberID).First(&m).Error; err != nil {
		return fail(c, 900, "无效的成员")
	}
	// Verify password
	if auth.ProviderArg1 == nil || auth.ProviderArg2 == nil {
		return fail(c, 900, "密码验证失败")
	}
	tokenValue, err := user.EncodeToken(m.ID)
	if err != nil {
		return fail(c, 500, err.Error())
	}
	// Upsert token
	var mt model.MemberToken
	if err := c.DB().Where("member_id = ?", m.ID).First(&mt).Error; err != nil {
		mt = model.MemberToken{ID: member.Rid(), Token: tokenValue, MemberID: m.ID}
		c.DB().Create(&mt)
	}
	var permissions []string
	if m.Permission != nil {
		json.Unmarshal([]byte(*m.Permission), &permissions)
	}
	return ok(c, "", R{"id": m.ID, "email": m.Email, "token": mt.Token, "permissions": permissions})
}

func WechatAuthRegister(c Context) error {
	var body struct {
		Email string `json:"email"`
		PWD   string `json:"pwd"`
		Code  string `json:"code"`
	}
	if err := c.Bind(&body); err != nil || body.Email == "" || body.PWD == "" {
		return fail(c, 400, "参数错误")
	}
	// Find admin user and settings
	var adminUser model.User
	if err := c.DB().First(&adminUser).Error; err != nil {
		return fail(c, 900, "没有管理员账号")
	}
	u, err := user.Get(adminUser.ID, c.DB())
	if err != nil {
		return fail(c, 900, err.Error())
	}
	if !u.Settings.CanRegister {
		return fail(c, 900, "未开放注册")
	}
	if !u.Settings.NoNeedInvitationCode && body.Code == "" {
		return fail(c, 400, "缺少邀请码")
	}
	// Check invitation code
	if body.Code != "" {
		var code model.InvitationCode
		if err := c.DB().Where("text = ? AND used = 0", body.Code).First(&code).Error; err != nil {
			return fail(c, 900, "无效的邀请码")
		}
	}
	// Check existing
	var existing model.MemberAuthentication
	if err := c.DB().Where("provider = 'credential' AND provider_id = ?", body.Email).First(&existing).Error; err == nil {
		return fail(c, 900, "该邮箱已注册")
	}
	// Create member
	memberID, tokenID, tokenValue, err := member.CreateWithoutAccount(body.Email, adminUser.ID, c.DB())
	if err != nil {
		return fail(c, 500, err.Error())
	}
	_ = tokenID
	email := body.Email
	c.DB().Model(&model.Member{}).Where("id = ?", memberID).Update("email", email)
	// Create auth record
	c.DB().Create(&model.MemberAuthentication{
		ID:         member.Rid(),
		Provider:   "credential",
		ProviderID: body.Email,
		MemberID:   memberID,
	})
	// Mark invitation code used
	if body.Code != "" {
		c.DB().Model(&model.InvitationCode{}).Where("text = ?", body.Code).Updates(map[string]interface{}{"used": 1, "invitee_id": memberID, "used_at": time.Now()})
	}
	return ok(c, "注册成功", R{"id": memberID, "email": email, "token": tokenValue})
}

func WechatAuthCodeCreate(c Context) error {
	var adminUser model.User
	if err := c.DB().First(&adminUser).Error; err != nil {
		return fail(c, 900, "没有管理员账号")
	}
	code := model.AuthQRCode{
		ID:      member.Rid(),
		Step:    1,
		Expires: model.LocalTime{Time: time.Now().Add(3 * time.Minute)},
		UserID:  adminUser.ID,
	}
	if err := c.DB().Create(&code).Error; err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "", R{"step": code.Step, "code": code.ID})
}

func WechatAuthCodeCheck(c Context) error {
	var body struct {
		Code string `json:"code"`
	}
	if err := c.Bind(&body); err != nil || body.Code == "" {
		return fail(c, 400, "缺少 code")
	}
	var code model.AuthQRCode
	if err := c.DB().Preload("Member").Where("id = ?", body.Code).First(&code).Error; err != nil {
		return fail(c, 404, "无效的二维码")
	}
	if time.Now().After(code.Expires.Time) {
		return ok(c, "", R{"step": 4}) // Expired
	}
	if code.Step == 3 && code.MemberID != nil {
		// Confirmed - generate token
		tokenValue, err := user.EncodeToken(*code.MemberID)
		if err != nil {
			return fail(c, 500, err.Error())
		}
		var m model.Member
		c.DB().Where("id = ?", *code.MemberID).First(&m)
		var permissions []string
		if m.Permission != nil {
			json.Unmarshal([]byte(*m.Permission), &permissions)
		}
		return ok(c, "", R{"step": code.Step, "id": m.ID, "email": m.Email, "permissions": permissions, "token": tokenValue})
	}
	return ok(c, "", R{"step": code.Step})
}

func WechatAuthCodeConfirm(c Context) error {
	m, _, err := authMember(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Code   string `json:"code"`
		Status int    `json:"status"`
	}
	if err := c.Bind(&body); err != nil || body.Code == "" {
		return fail(c, 400, "参数错误")
	}
	var code model.AuthQRCode
	if err := c.DB().Where("id = ?", body.Code).First(&code).Error; err != nil {
		return fail(c, 404, "无效的二维码")
	}
	if time.Now().After(code.Expires.Time) {
		return fail(c, 900, "二维码已过期")
	}
	updates := map[string]interface{}{"step": body.Status}
	if body.Status == 3 {
		updates["member_id"] = m.ID
	}
	c.DB().Model(&code).Updates(updates)
	return ok(c, "", nil)
}

func WechatAuthWeapp(c Context) error {
	// TODO: requires WeChat mini-program API
	return fail(c, 501, "未实现")
}

func WechatMineUpdateEmail(c Context) error {
	m, _, err := authMember(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Email string `json:"email"`
	}
	if err := c.Bind(&body); err != nil || body.Email == "" {
		return fail(c, 400, "缺少邮箱")
	}
	c.DB().Model(&model.Member{}).Where("id = ?", m.ID).Update("email", body.Email)
	// Update credential auth if exists
	c.DB().Model(&model.MemberAuthentication{}).Where("member_id = ? AND provider = 'credential'", m.ID).Update("provider_id", body.Email)
	return ok(c, "更新成功", nil)
}

func WechatMineUpdatePwd(c Context) error {
	m, _, err := authMember(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		PWD string `json:"pwd"`
	}
	if err := c.Bind(&body); err != nil || body.PWD == "" {
		return fail(c, 400, "缺少密码")
	}
	if len(body.PWD) < 6 || len(body.PWD) > 20 {
		return fail(c, 400, "密码必须是6-20个字符")
	}
	// Update credential auth
	c.DB().Model(&model.MemberAuthentication{}).Where("member_id = ? AND provider = 'credential'", m.ID).Update("provider_arg1", body.PWD)
	return ok(c, "更新成功", nil)
}

func WechatMineProfile(c Context) error {
	m, _, err := authMember(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var permissions []string
	if m.Permission != nil {
		json.Unmarshal([]byte(*m.Permission), &permissions)
	}
	return ok(c, "", R{"id": m.ID, "nickname": m.Remark, "email": m.Email, "avatar": m.Avatar, "permissions": permissions})
}

func WechatMineBindWeapp(c Context) error {
	// TODO: requires WeChat mini-program API
	return fail(c, 501, "未实现")
}

func WechatCollectionList(c Context) error {
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
	db := c.DB().Where("user_id = ?", m.UserID)
	if body.Type != nil {
		db = db.Where("type = ?", *body.Type)
	} else {
		db = db.Where("type = 1") // Manually
	}
	var total int64
	db.Model(&model.CollectionV2{}).Count(&total)
	if body.NextMarker != "" {
		db = db.Where("id < ?", body.NextMarker)
	}
	var collections []model.CollectionV2
	db.Preload("Medias.Profile").Order("sort DESC, created DESC").Limit(body.PageSize).Find(&collections)
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

func WechatHistoryDelete(c Context) error {
	m, _, err := authMember(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ID string `json:"id"`
	}
	if err := c.Bind(&body); err != nil || body.ID == "" {
		return fail(c, 400, "缺少 id")
	}
	var h model.PlayHistoryV2
	if err := c.DB().Where("id = ? AND member_id = ?", body.ID, m.ID).First(&h).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	c.DB().Delete(&h)
	return ok(c, "删除成功", nil)
}

func WechatHistoryList(c Context) error {
	m, _, err := authMember(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}
	db := c.DB().Where("member_id = ?", m.ID)
	var total int64
	db.Model(&model.PlayHistoryV2{}).Count(&total)
	if body.NextMarker != "" {
		db = db.Where("id < ?", body.NextMarker)
	}
	var histories []model.PlayHistoryV2
	db.Preload("Media.Profile").Preload("Media.MediaSources").Preload("MediaSource.Profile").
		Order("updated DESC").Limit(body.PageSize).Find(&histories)
	list := make([]R, 0, len(histories))
	var nextMarker string
	for _, h := range histories {
		item := R{
			"id": h.ID, "media_id": h.MediaID,
			"current_time": h.CurrentTime, "duration": h.Duration,
			"thumbnail_path": h.ThumbnailPath, "updated": h.Updated,
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

func WechatHistoryUpdate(c Context) error {
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
	var h model.PlayHistoryV2
	err2 := c.DB().Where("media_id = ? AND member_id = ?", body.MediaID, m.ID).First(&h).Error
	if err2 != nil {
		h = model.PlayHistoryV2{
			ID: member.Rid(), MediaID: body.MediaID, MediaSourceID: body.MediaSourceID,
			CurrentTime: body.CurrentTime, Duration: body.Duration, MemberID: m.ID,
		}
		if body.Thumbnail != "" {
			h.ThumbnailPath = &body.Thumbnail
		}
		c.DB().Create(&h)
		return ok(c, "新增记录成功", nil)
	}
	updates := map[string]interface{}{
		"media_source_id": body.MediaSourceID, "current_time": body.CurrentTime,
		"duration": body.Duration, "updated": time.Now(),
	}
	if body.Thumbnail != "" {
		updates["thumbnail_path"] = body.Thumbnail
	}
	c.DB().Model(&h).Updates(updates)
	return ok(c, "更新记录成功", nil)
}

func WechatHistoryUpdated(c Context) error {
	// TODO: requires complex SQL join for updated episodes
	return fail(c, 501, "未实现")
}

func WechatMediaEpisode(c Context) error {
	m, _, err := authMember(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		MediaID    string `json:"media_id"`
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
	}
	c.Bind(&body)
	if body.MediaID == "" {
		return fail(c, 400, "缺少 media_id")
	}
	if body.PageSize <= 0 {
		body.PageSize = 20
	}
	var media model.Media
	if err := c.DB().Where("id = ? AND user_id = ?", body.MediaID, m.UserID).First(&media).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	db := c.DB().Where("media_id = ?", body.MediaID)
	if body.NextMarker != "" {
		db = db.Where("id < ?", body.NextMarker)
	}
	var sources []model.MediaSource
	db.Preload("Profile").Preload("Files").Preload("Subtitles").
		Order("created ASC").Limit(body.PageSize).Find(&sources)
	list := make([]R, 0, len(sources))
	var nextMarker string
	for _, s := range sources {
		item := R{"id": s.ID}
		if s.Profile != nil {
			item["name"] = s.Profile.Name
			item["overview"] = s.Profile.Overview
			item["order"] = s.Profile.Order
			item["air_date"] = s.Profile.AirDate
			item["runtime"] = s.Profile.Runtime
		}
		item["file_count"] = len(s.Files)
		subtitles := make([]R, 0)
		for _, sub := range s.Subtitles {
			subtitles = append(subtitles, R{"id": sub.ID, "name": sub.Name, "language": sub.Language, "type": sub.Type})
		}
		item["subtitles"] = subtitles
		list = append(list, item)
		nextMarker = s.ID
	}
	return ok(c, "", R{"list": list, "next_marker": nextMarker})
}

func WechatMediaProfile(c Context) error {
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
	var media model.Media
	if err := c.DB().Preload("Profile.Genres").Preload("Profile.OriginCountries").Preload("Profile.Persons.Profile").Preload("MediaSources").
		Where("id = ? AND user_id = ?", body.MediaID, m.UserID).First(&media).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	item := R{"id": media.ID, "type": media.Type, "cur_episode_count": len(media.MediaSources)}
	if media.Profile != nil {
		item["name"] = media.Profile.Name
		item["original_name"] = media.Profile.OriginalName
		item["overview"] = media.Profile.Overview
		item["poster_path"] = media.Profile.PosterPath
		item["air_date"] = media.Profile.AirDate
		item["vote_average"] = media.Profile.VoteAverage
		item["episode_count"] = media.Profile.SourceCount
		genres := make([]string, 0)
		for _, g := range media.Profile.Genres {
			genres = append(genres, g.Text)
		}
		item["genres"] = genres
		countries := make([]string, 0)
		for _, co := range media.Profile.OriginCountries {
			countries = append(countries, co.Text)
		}
		item["origin_country"] = countries
		actors := make([]R, 0)
		for i, p := range media.Profile.Persons {
			if i >= 5 {
				break
			}
			actor := R{"id": p.ID, "name": p.Name, "order": p.Order}
			if p.Profile != nil {
				actor["avatar"] = p.Profile.ProfilePath
			}
			actors = append(actors, actor)
		}
		item["actors"] = actors
	}
	return ok(c, "", item)
}

func WechatMediaList(c Context) error {
	m, _, err := authMember(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Type       *int   `json:"type"`
		Name       string `json:"name"`
		Genres     string `json:"genres"`
		Language   string `json:"language"`
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}
	db := c.DB().Where("\"Media\".user_id = ?", m.UserID)
	if body.Type != nil {
		db = db.Where("\"Media\".type = ?", *body.Type)
	}
	if body.Name != "" {
		db = db.Joins("JOIN \"MediaProfile\" ON \"MediaProfile\".id = \"Media\".profile_id").
			Where("\"MediaProfile\".name LIKE ? OR \"MediaProfile\".original_name LIKE ?", "%"+body.Name+"%", "%"+body.Name+"%")
	}
	var total int64
	db.Model(&model.Media{}).Count(&total)
	if body.NextMarker != "" {
		db = db.Where("\"Media\".id < ?", body.NextMarker)
	}
	var medias []model.Media
	db.Preload("Profile.Genres").Preload("Profile.OriginCountries").Preload("MediaSources").
		Order("\"Media\".created DESC").Limit(body.PageSize).Find(&medias)
	list := make([]R, 0, len(medias))
	var nextMarker string
	for _, media := range medias {
		if len(media.MediaSources) == 0 {
			continue
		}
		item := R{"id": media.ID, "type": media.Type, "cur_episode_count": len(media.MediaSources)}
		if media.Profile != nil {
			item["name"] = media.Profile.Name
			item["original_name"] = media.Profile.OriginalName
			item["overview"] = media.Profile.Overview
			item["poster_path"] = media.Profile.PosterPath
			item["air_date"] = media.Profile.AirDate
			item["vote_average"] = media.Profile.VoteAverage
			item["episode_count"] = media.Profile.SourceCount
			genres := make([]string, 0)
			for _, g := range media.Profile.Genres {
				genres = append(genres, g.Text)
			}
			item["genres"] = genres
			countries := make([]string, 0)
			for _, co := range media.Profile.OriginCountries {
				countries = append(countries, co.Text)
			}
			item["origin_country"] = countries
		}
		list = append(list, item)
		nextMarker = media.ID
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func WechatMediaPlaying(c Context) error {
	m, _, err := authMember(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		MediaSourceID string `json:"media_source_id"`
	}
	if err := c.Bind(&body); err != nil || body.MediaSourceID == "" {
		return fail(c, 400, "缺少 media_source_id")
	}
	var ms model.MediaSource
	if err := c.DB().Preload("Files").Where("id = ? AND user_id = ?", body.MediaSourceID, m.UserID).First(&ms).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	if len(ms.Files) == 0 {
		return fail(c, 404, "没有可播放的文件")
	}
	file := ms.Files[0]
	_, client, err := getDriveClient(c, file.DriveID, m.UserID)
	if err != nil {
		return fail(c, 500, err.Error())
	}
	info, err := client.Preview(file.FileID)
	if err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "", info)
}

func WechatMediaSeries(c Context) error {
	m, _, err := authMember(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		MediaID    string `json:"media_id"`
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
	}
	c.Bind(&body)
	if body.MediaID == "" {
		return fail(c, 400, "缺少 media_id")
	}
	if body.PageSize <= 0 {
		body.PageSize = 20
	}
	var media model.Media
	if err := c.DB().Preload("Profile").Where("id = ? AND user_id = ?", body.MediaID, m.UserID).First(&media).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	if media.Profile == nil || media.Profile.SeriesID == nil {
		return ok(c, "", R{"list": []R{}})
	}
	var siblings []model.MediaProfile
	c.DB().Where("series_id = ? AND id != ?", *media.Profile.SeriesID, media.ProfileID).Order("\"order\" ASC").Find(&siblings)
	list := make([]R, 0, len(siblings))
	for _, s := range siblings {
		// Find the media record for this profile
		var sibMedia model.Media
		if err := c.DB().Where("profile_id = ? AND user_id = ?", s.ID, m.UserID).First(&sibMedia).Error; err != nil {
			continue
		}
		list = append(list, R{"id": sibMedia.ID, "name": s.Name, "poster_path": s.PosterPath})
	}
	return ok(c, "", R{"list": list})
}

func WechatMemberToken(c Context) error {
	m, mt, err := authMember(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	return ok(c, "", R{"id": m.ID, "token": mt.Token})
}

func WechatInvitationCodeList(c Context) error {
	m, _, err := authMember(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var codes []model.InvitationCode
	c.DB().Where("inviter_id = ?", m.ID).Order("created DESC").Find(&codes)
	list := make([]R, 0, len(codes))
	for _, code := range codes {
		list = append(list, R{"id": code.ID, "text": code.Text, "used": code.Used, "created": code.Created})
	}
	return ok(c, "", R{"list": list})
}

func WechatInvitationCodeCreate(c Context) error {
	m, _, err := authMember(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	code := model.InvitationCode{
		ID:        member.Rid(),
		Text:      member.Rid(),
		InviterID: m.ID,
	}
	if err := c.DB().Create(&code).Error; err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "创建成功", R{"id": code.ID, "text": code.Text})
}

func WechatNotificationList(c Context) error {
	m, _, err := authMember(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Status     *int   `json:"status"`
		Type       *int   `json:"type"`
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}
	db := c.DB().Where("member_id = ? AND is_delete = 0", m.ID)
	if body.Status != nil {
		db = db.Where("status = ?", *body.Status)
	}
	if body.Type != nil {
		db = db.Where("type = ?", *body.Type)
	}
	var total int64
	db.Model(&model.MemberNotification{}).Count(&total)
	if body.NextMarker != "" {
		db = db.Where("id < ?", body.NextMarker)
	}
	var notifications []model.MemberNotification
	db.Order("created DESC").Limit(body.PageSize).Find(&notifications)
	list := make([]R, 0, len(notifications))
	var nextMarker string
	for _, n := range notifications {
		list = append(list, R{"id": n.ID, "content": n.Content, "status": n.Status, "created": n.Created})
		nextMarker = n.ID
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func WechatNotificationReadAll(c Context) error {
	m, _, err := authMember(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	c.DB().Model(&model.MemberNotification{}).Where("member_id = ? AND status = 1", m.ID).Update("status", 2)
	return ok(c, "", nil)
}

func WechatNotificationRead(c Context) error {
	m, _, err := authMember(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ID string `json:"id"`
	}
	if err := c.Bind(&body); err != nil || body.ID == "" {
		return fail(c, 400, "缺少 id")
	}
	c.DB().Model(&model.MemberNotification{}).Where("id = ? AND member_id = ?", body.ID, m.ID).Update("status", 2)
	return ok(c, "", nil)
}

func WechatReportCreate(c Context) error {
	m, _, err := authMember(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Type          int    `json:"type"`
		Data          string `json:"data"`
		MediaID       string `json:"media_id"`
		MediaSourceID string `json:"media_source_id"`
	}
	if err := c.Bind(&body); err != nil {
		return fail(c, 400, "参数错误")
	}
	r := model.ReportV2{
		ID:       member.Rid(),
		Type:     body.Type,
		Data:     body.Data,
		MemberID: m.ID,
		UserID:   m.UserID,
	}
	if body.MediaID != "" {
		r.MediaID = &body.MediaID
	}
	if body.MediaSourceID != "" {
		r.MediaSourceID = &body.MediaSourceID
	}
	if err := c.DB().Create(&r).Error; err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "新增反馈成功", nil)
}

func WechatReportHide(c Context) error {
	m, _, err := authMember(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ID string `json:"id"`
	}
	if err := c.Bind(&body); err != nil || body.ID == "" {
		return fail(c, 400, "缺少 id")
	}
	c.DB().Model(&model.ReportV2{}).Where("id = ? AND member_id = ?", body.ID, m.ID).Update("hidden", 1)
	return ok(c, "", nil)
}

func WechatReportList(c Context) error {
	m, _, err := authMember(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Status     *int   `json:"status"`
		Type       *int   `json:"type"`
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}
	db := c.DB().Where("member_id = ? AND hidden = 0", m.ID)
	if body.Status != nil {
		db = db.Where("status = ?", *body.Status)
	}
	if body.Type != nil {
		db = db.Where("type = ?", *body.Type)
	}
	if body.NextMarker != "" {
		db = db.Where("id < ?", body.NextMarker)
	}
	var reports []model.ReportV2
	db.Preload("Media.Profile").Preload("MediaSource.Profile").
		Order("created DESC").Limit(body.PageSize).Find(&reports)
	list := make([]R, 0, len(reports))
	var nextMarker string
	for _, r := range reports {
		item := R{"id": r.ID, "type": r.Type, "data": r.Data, "answer": r.Answer, "created": r.Created}
		if r.Media != nil && r.Media.Profile != nil {
			item["media"] = R{"name": r.Media.Profile.Name, "poster_path": r.Media.Profile.PosterPath}
		}
		item["member"] = R{"id": m.ID, "name": m.Remark}
		list = append(list, item)
		nextMarker = r.ID
	}
	return ok(c, "", R{"list": list, "next_marker": nextMarker})
}

func WechatSeasonList(c Context) error {
	m, _, err := authMember(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Type       *int   `json:"type"`
		Name       string `json:"name"`
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}
	db := c.DB().Where("\"Media\".user_id = ?", m.UserID)
	if body.Type != nil {
		db = db.Where("\"Media\".type = ?", *body.Type)
	}
	if body.Name != "" {
		db = db.Joins("JOIN \"MediaProfile\" ON \"MediaProfile\".id = \"Media\".profile_id").
			Where("\"MediaProfile\".name LIKE ? OR \"MediaProfile\".original_name LIKE ?", "%"+body.Name+"%", "%"+body.Name+"%")
	}
	var total int64
	db.Model(&model.Media{}).Count(&total)
	if body.NextMarker != "" {
		db = db.Where("\"Media\".id < ?", body.NextMarker)
	}
	var medias []model.Media
	db.Preload("Profile.Genres").Preload("Profile.OriginCountries").Preload("MediaSources").
		Order("\"Media\".created DESC").Limit(body.PageSize).Find(&medias)
	list := make([]R, 0, len(medias))
	var nextMarker string
	for _, media := range medias {
		if len(media.MediaSources) == 0 {
			continue
		}
		item := R{"id": media.ID, "type": media.Type, "cur_episode_count": len(media.MediaSources)}
		if media.Profile != nil {
			item["name"] = media.Profile.Name
			item["poster_path"] = media.Profile.PosterPath
			item["air_date"] = media.Profile.AirDate
			item["vote_average"] = media.Profile.VoteAverage
			item["episode_count"] = media.Profile.SourceCount
			genres := make([]string, 0)
			for _, g := range media.Profile.Genres {
				genres = append(genres, g.Text)
			}
			item["genres"] = genres
			countries := make([]string, 0)
			for _, co := range media.Profile.OriginCountries {
				countries = append(countries, co.Text)
			}
			item["origin_country"] = countries
		}
		list = append(list, item)
		nextMarker = media.ID
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func WechatSource(c Context) error {
	m, _, err := authMember(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		MediaSourceID string `json:"media_source_id"`
	}
	if err := c.Bind(&body); err != nil || body.MediaSourceID == "" {
		return fail(c, 400, "缺少 media_source_id")
	}
	var ms model.MediaSource
	if err := c.DB().Preload("Files").Where("id = ? AND user_id = ?", body.MediaSourceID, m.UserID).First(&ms).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	if len(ms.Files) == 0 {
		return fail(c, 404, "没有可播放的文件")
	}
	file := ms.Files[0]
	_, client, err := getDriveClient(c, file.DriveID, m.UserID)
	if err != nil {
		return fail(c, 500, err.Error())
	}
	info, err := client.Preview(file.FileID)
	if err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "", info)
}

func WechatRank(c Context) error {
	m, _, err := authMember(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	// type 3=DoubanSeasonRank, 4=DoubanMovieRank
	var collections []model.CollectionV2
	c.DB().Where("user_id = ? AND type IN (3, 4)", m.UserID).Order("sort DESC, created DESC").Find(&collections)
	list := make([]R, 0, len(collections))
	for _, col := range collections {
		var medias []R
		if col.Extra != nil {
			json.Unmarshal([]byte(*col.Extra), &medias)
		}
		list = append(list, R{"id": col.ID, "type": col.Type, "title": col.Title, "desc": col.Desc, "medias": medias})
	}
	return ok(c, "", list)
}

func WechatDiaryList(c Context) error {
	m, _, err := authMember(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}
	db := c.DB().Where("member_id = ?", m.ID)
	if body.NextMarker != "" {
		db = db.Where("id < ?", body.NextMarker)
	}
	var diaries []model.MemberDiary
	db.Preload("MediaSource.Media.Profile").Order("created DESC").Limit(body.PageSize).Find(&diaries)
	list := make([]R, 0, len(diaries))
	var nextMarker string
	for _, d := range diaries {
		item := R{"id": d.ID, "day": d.Day, "content": d.Content, "created": d.Created}
		if d.MediaSource != nil && d.MediaSource.Media != nil && d.MediaSource.Media.Profile != nil {
			item["media_name"] = d.MediaSource.Media.Profile.Name
			item["poster_path"] = d.MediaSource.Media.Profile.PosterPath
		}
		list = append(list, item)
		nextMarker = d.ID
	}
	return ok(c, "", R{"list": list, "next_marker": nextMarker})
}

func WechatLiveList(c Context) error {
	m, _, err := authMember(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var lives []model.TVLive
	c.DB().Where("user_id = ? AND hidden = 0", m.UserID).Order("\"order\" ASC").Find(&lives)
	list := make([]R, 0, len(lives))
	for _, l := range lives {
		list = append(list, R{"id": l.ID, "name": l.Name, "url": l.URL, "logo": l.Logo, "group_name": l.GroupName, "order": l.Order})
	}
	return ok(c, "", R{"list": list})
}

func WechatProxy(c Context) error {
	// TODO: requires HTTP proxy logic
	return fail(c, 501, "未实现")
}

func V1UserFindFirst(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	return ok(c, "", R{"id": u.ID})
}
