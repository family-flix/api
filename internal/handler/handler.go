package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"gorm.io/gorm"

	"github.com/family-flix/api/internal/domain/member"
	"github.com/family-flix/api/internal/domain/user"
	"github.com/family-flix/api/internal/model"
)

// authAdmin extracts the Authorization header and returns the authenticated admin user.
func authAdmin(c Context) (*user.User, error) {
	return user.New(c.Header("Authorization"), c.DB())
}

// authMember extracts the Authorization header and returns the authenticated member.
func authMember(c Context) (*model.Member, *model.MemberToken, error) {
	token := c.Header("Authorization")
	if token == "" {
		return nil, nil, fmt.Errorf("缺少 token")
	}
	var mt model.MemberToken
	if err := c.DB().Where("token = ?", token).First(&mt).Error; err != nil {
		return nil, nil, fmt.Errorf("无效的 token")
	}
	var m model.Member
	if err := c.DB().Where("id = ? AND `delete` = 0", mt.MemberID).First(&m).Error; err != nil {
		return nil, nil, fmt.Errorf("无效的成员")
	}
	return &m, &mt, nil
}

type R map[string]interface{}

func ok(c Context, msg string, data interface{}) error {
	return c.JSON(http.StatusOK, R{"code": 0, "msg": msg, "data": data})
}

func fail(c Context, code int, msg string) error {
	return c.JSON(http.StatusOK, R{"code": code, "msg": msg, "data": nil})
}

func Ping(c Context) error {
	return ok(c, "ok", nil)
}

func Proxy(c Context) error {
	return nil
}

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

func AdminParse(c Context) error {
	// TODO: requires drive client for file analysis
	return fail(c, 501, "未实现")
}

func AdminDriveList(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Type       *int   `json:"type"`
		Name       string `json:"name"`
		Hidden     *int   `json:"hidden"`
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}
	db := c.DB().Where("user_id = ?", u.ID)
	if body.Type != nil {
		db = db.Where("type = ?", *body.Type)
	}
	if body.Name != "" {
		db = db.Where("name LIKE ?", "%"+body.Name+"%")
	}
	if body.Hidden != nil {
		db = db.Where("hidden = ?", *body.Hidden)
	}
	var total int64
	db.Model(&model.Drive{}).Count(&total)
	if body.NextMarker != "" {
		db = db.Where("id < ?", body.NextMarker)
	}
	var drives []model.Drive
	db.Order("created DESC").Limit(body.PageSize).Find(&drives)
	list := make([]R, 0, len(drives))
	var nextMarker string
	for _, d := range drives {
		item := R{
			"id":             d.ID,
			"name":           d.Name,
			"avatar":         d.Avatar,
			"type":           d.Type,
			"total_size":     d.TotalSize,
			"used_size":      d.UsedSize,
			"root_folder_id": d.RootFolderID,
		}
		list = append(list, item)
		nextMarker = d.ID
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func AdminDriveAdd(c Context) error {
	// TODO: requires drive client to validate credentials
	return fail(c, 501, "未实现")
}

func AdminDriveDelete(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		DriveID string `json:"drive_id"`
	}
	if err := c.Bind(&body); err != nil || body.DriveID == "" {
		return fail(c, 400, "缺少 drive_id")
	}
	var d model.Drive
	if err := c.DB().Where("id = ? AND user_id = ?", body.DriveID, u.ID).First(&d).Error; err != nil {
		return fail(c, 404, "没有匹配的云盘")
	}
	c.DB().Delete(&d)
	return ok(c, "删除成功", nil)
}

func AdminDriveProfile(c Context) error {
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
	var d model.Drive
	if err := c.DB().Where("id = ? AND user_id = ?", body.ID, u.ID).First(&d).Error; err != nil {
		return fail(c, 404, "没有匹配的云盘")
	}
	return ok(c, "", R{"id": d.ID, "name": d.Name, "used_size": d.UsedSize, "total_size": d.TotalSize})
}

func AdminDriveRefresh(c Context) error {
	// TODO: requires drive client to refresh profile from cloud provider
	return fail(c, 501, "未实现")
}

func AdminDriveSetToken(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ID           string `json:"id"`
		RefreshToken string `json:"refresh_token"`
	}
	if err := c.Bind(&body); err != nil || body.ID == "" || body.RefreshToken == "" {
		return fail(c, 400, "参数错误")
	}
	var d model.Drive
	if err := c.DB().Where("id = ? AND user_id = ?", body.ID, u.ID).First(&d).Error; err != nil {
		return fail(c, 404, "没有匹配的云盘")
	}
	var dt model.DriveToken
	if err := c.DB().Where("id = ?", d.DriveTokenID).First(&dt).Error; err != nil {
		return fail(c, 404, "没有匹配的 token 记录")
	}
	var tokenData map[string]interface{}
	json.Unmarshal([]byte(dt.Data), &tokenData)
	tokenData["refresh_token"] = body.RefreshToken
	newData, _ := json.Marshal(tokenData)
	c.DB().Model(&dt).Update("data", string(newData))
	return ok(c, "更新成功", nil)
}

func AdminDriveSetRootFolder(c Context) error {
	// TODO: requires drive client to validate folder exists
	return fail(c, 501, "未实现")
}

func AdminDriveExport(c Context) error {
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
	var d model.Drive
	if err := c.DB().Where("id = ? AND user_id = ?", body.ID, u.ID).First(&d).Error; err != nil {
		return fail(c, 404, "没有匹配的云盘")
	}
	var dt model.DriveToken
	if err := c.DB().Where("id = ?", d.DriveTokenID).First(&dt).Error; err != nil {
		return fail(c, 404, "没有匹配的 token")
	}
	var tokenData map[string]interface{}
	json.Unmarshal([]byte(dt.Data), &tokenData)
	var profileData map[string]interface{}
	json.Unmarshal([]byte(d.Profile), &profileData)
	result := R{
		"name":            d.Name,
		"avatar":          d.Avatar,
		"root_folder_id":  d.RootFolderID,
		"total_size":      d.TotalSize,
		"used_size":       d.UsedSize,
		"refresh_token":   tokenData["refresh_token"],
		"access_token":    tokenData["access_token"],
		"drive_id":        profileData["drive_id"],
		"device_id":       profileData["device_id"],
		"app_id":          profileData["app_id"],
	}
	return ok(c, "", result)
}

func AdminDriveCheckIn(c Context) error {
	// TODO: requires drive client for remote API call
	return fail(c, 501, "未实现")
}

func AdminDriveReceiveRewards(c Context) error {
	// TODO: requires drive client for remote API call
	return fail(c, 501, "未实现")
}

func AdminDriveUpdate(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ID             string  `json:"id"`
		Remark         *string `json:"remark"`
		Hidden         *int    `json:"hidden"`
		RootFolderID   *string `json:"root_folder_id"`
		RootFolderName *string `json:"root_folder_name"`
	}
	if err := c.Bind(&body); err != nil || body.ID == "" {
		return fail(c, 400, "缺少 id")
	}
	var d model.Drive
	if err := c.DB().Where("id = ? AND user_id = ?", body.ID, u.ID).First(&d).Error; err != nil {
		return fail(c, 404, "没有匹配的云盘")
	}
	updates := map[string]interface{}{}
	if body.Remark != nil {
		updates["remark"] = *body.Remark
	}
	if body.Hidden != nil {
		updates["hidden"] = *body.Hidden
	}
	if body.RootFolderID != nil {
		updates["root_folder_id"] = *body.RootFolderID
	}
	if body.RootFolderName != nil {
		updates["root_folder_name"] = *body.RootFolderName
	}
	if len(updates) == 0 {
		return fail(c, 400, "没有需要更新的字段")
	}
	c.DB().Model(&d).Updates(updates)
	return ok(c, "更新成功", nil)
}

func AdminResourceFiles(c Context) error {
	// TODO: requires drive client for file listing
	return fail(c, 501, "未实现")
}

func AdminResourceTransfer(c Context) error {
	// TODO: requires drive client for file transfer
	return fail(c, 501, "未实现")
}

func AdminTaskList(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Status     *int   `json:"status"`
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}
	db := c.DB().Where("user_id = ?", u.ID)
	if body.Status != nil {
		db = db.Where("status = ?", *body.Status)
	}
	var total int64
	db.Model(&model.AsyncTask{}).Count(&total)
	if body.NextMarker != "" {
		db = db.Where("id < ?", body.NextMarker)
	}
	var tasks []model.AsyncTask
	db.Order("created DESC").Limit(body.PageSize).Find(&tasks)
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

func AdminTaskStatus(c Context) error {
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
	var t model.AsyncTask
	if err := c.DB().Where("id = ? AND user_id = ?", body.ID, u.ID).First(&t).Error; err != nil {
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

func AdminTaskPause(c Context) error {
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
	var t model.AsyncTask
	if err := c.DB().Where("id = ? AND user_id = ?", body.ID, u.ID).First(&t).Error; err != nil {
		return fail(c, 404, "没有匹配的任务")
	}
	c.DB().Model(&t).Update("need_stop", 1)
	return ok(c, "已标记暂停", nil)
}

func AdminTaskProfile(c Context) error {
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
	var t model.AsyncTask
	if err := c.DB().Preload("Output.Lines").Where("id = ? AND user_id = ?", body.ID, u.ID).First(&t).Error; err != nil {
		return fail(c, 404, "没有匹配的任务")
	}
	var lines []R
	if t.Output != nil {
		for _, l := range t.Output.Lines {
			lines = append(lines, R{"id": l.ID, "content": l.Content, "created": l.Created})
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

func AdminMediaTransfer(c Context) error {
	// TODO: requires drive client for file transfer
	return fail(c, 501, "未实现")
}

func AdminMediaArchiveList(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Name       string `json:"name"`
		Type       *int   `json:"type"`
		DriveIDs   string `json:"drive_ids"`
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}
	db := c.DB().Where("\"Media\".user_id = ?", u.ID)
	if body.Name != "" {
		db = db.Joins("JOIN \"MediaProfile\" ON \"MediaProfile\".id = \"Media\".profile_id").
			Where("\"MediaProfile\".name LIKE ? OR \"MediaProfile\".original_name LIKE ?", "%"+body.Name+"%", "%"+body.Name+"%")
	}
	if body.Type != nil {
		db = db.Where("\"Media\".type = ?", *body.Type)
	}
	var total int64
	db.Model(&model.Media{}).Count(&total)
	if body.NextMarker != "" {
		db = db.Where("\"Media\".id < ?", body.NextMarker)
	}
	var medias []model.Media
	db.Preload("Profile").Preload("MediaSources.Profile").Preload("MediaSources.Files.Drive").
		Order("\"Media\".created DESC").Limit(body.PageSize).Find(&medias)
	list := make([]R, 0, len(medias))
	var nextMarker string
	for _, m := range medias {
		item := R{"id": m.ID, "type": m.Type}
		if m.Profile != nil {
			item["name"] = m.Profile.Name
			item["poster_path"] = m.Profile.PosterPath
			item["air_date"] = m.Profile.AirDate
			item["episode_count"] = m.Profile.SourceCount
			item["cur_episode_count"] = len(m.MediaSources)
		}
		sources := make([]R, 0)
		for _, s := range m.MediaSources {
			src := R{"id": s.ID}
			if s.Profile != nil {
				src["name"] = s.Profile.Name
				src["order"] = s.Profile.Order
			}
			files := make([]R, 0)
			for _, f := range s.Files {
				fi := R{"id": f.ID, "file_id": f.FileID, "file_name": f.FileName, "parent_paths": f.ParentPaths, "size": f.Size}
				if f.Drive != nil {
					fi["drive"] = R{"id": f.Drive.ID, "name": f.Drive.Name}
				}
				files = append(files, fi)
			}
			src["files"] = files
			sources = append(sources, src)
		}
		item["sources"] = sources
		list = append(list, item)
		nextMarker = m.ID
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func AdminMediaArchivePartial(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		MediaID string `json:"media_id"`
	}
	if err := c.Bind(&body); err != nil || body.MediaID == "" {
		return fail(c, 400, "缺少 media_id")
	}
	var m model.Media
	if err := c.DB().Preload("Profile").Preload("MediaSources.Profile").Preload("MediaSources.Files.Drive").
		Where("id = ? AND user_id = ?", body.MediaID, u.ID).First(&m).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	item := R{"id": m.ID, "type": m.Type}
	if m.Profile != nil {
		item["name"] = m.Profile.Name
		item["poster_path"] = m.Profile.PosterPath
		item["air_date"] = m.Profile.AirDate
		item["episode_count"] = m.Profile.SourceCount
		item["cur_episode_count"] = len(m.MediaSources)
	}
	sources := make([]R, 0)
	for _, s := range m.MediaSources {
		src := R{"id": s.ID}
		if s.Profile != nil {
			src["name"] = s.Profile.Name
			src["order"] = s.Profile.Order
		}
		files := make([]R, 0)
		for _, f := range s.Files {
			fi := R{"id": f.ID, "file_id": f.FileID, "file_name": f.FileName, "parent_paths": f.ParentPaths, "size": f.Size}
			if f.Drive != nil {
				fi["drive"] = R{"id": f.Drive.ID, "name": f.Drive.Name}
			}
			files = append(files, fi)
		}
		src["files"] = files
		sources = append(sources, src)
	}
	item["sources"] = sources
	return ok(c, "", item)
}

func AdminMediaToResourceDrive(c Context) error {
	// TODO: requires drive client for file move
	return fail(c, 501, "未实现")
}

func AdminMediaRefreshProfile(c Context) error {
	// TODO: requires TMDB client
	return fail(c, 501, "未实现")
}

func AdminMediaInvalid(c Context) error {
	u, err := authAdmin(c)
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
	db := c.DB().Where("user_id = ?", u.ID)
	if body.Type != nil {
		db = db.Where("type = ?", *body.Type)
	}
	var total int64
	db.Model(&model.InvalidMedia{}).Count(&total)
	if body.NextMarker != "" {
		db = db.Where("id < ?", body.NextMarker)
	}
	var invalids []model.InvalidMedia
	db.Preload("Media.Profile").Order("created DESC").Limit(body.PageSize).Find(&invalids)
	list := make([]R, 0, len(invalids))
	var nextMarker string
	for _, inv := range invalids {
		item := R{"id": inv.ID, "type": inv.Type}
		var tips []string
		json.Unmarshal([]byte(inv.Profile), &tips)
		item["tips"] = tips
		if inv.Media != nil {
			media := R{"id": inv.Media.ID, "type": inv.Media.Type}
			if inv.Media.Profile != nil {
				media["name"] = inv.Media.Profile.Name
				media["poster_path"] = inv.Media.Profile.PosterPath
				media["air_date"] = inv.Media.Profile.AirDate
			}
			item["media"] = media
		}
		list = append(list, item)
		nextMarker = inv.ID
	}
	return ok(c, "", R{"list": list, "total": total, "next_marker": nextMarker})
}

func AdminMediaDelete(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		MediaID string `json:"media_id"`
	}
	if err := c.Bind(&body); err != nil || body.MediaID == "" {
		return fail(c, 400, "缺少 media_id")
	}
	var m model.Media
	if err := c.DB().Where("id = ? AND user_id = ?", body.MediaID, u.ID).First(&m).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	c.DB().Delete(&m)
	return ok(c, "删除成功", nil)
}

func AdminMediaSetProfile(c Context) error {
	// TODO: requires TMDB client for profile resolution
	return fail(c, 501, "未实现")
}

func AdminMediaSourceList(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		MediaID    string `json:"media_id"`
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}
	db := c.DB().Where("user_id = ?", u.ID)
	if body.MediaID != "" {
		db = db.Where("media_id = ?", body.MediaID)
	}
	var total int64
	db.Model(&model.MediaSource{}).Count(&total)
	if body.NextMarker != "" {
		db = db.Where("id < ?", body.NextMarker)
	}
	var sources []model.MediaSource
	db.Preload("Profile").Preload("Files.Drive").Order("created DESC").Limit(body.PageSize).Find(&sources)
	list := make([]R, 0, len(sources))
	var nextMarker string
	for _, s := range sources {
		item := R{"id": s.ID, "media_id": s.MediaID}
		if s.Profile != nil {
			item["name"] = s.Profile.Name
			item["order"] = s.Profile.Order
		}
		files := make([]R, 0)
		for _, f := range s.Files {
			fi := R{"id": f.ID, "file_id": f.FileID, "file_name": f.FileName, "parent_paths": f.ParentPaths, "size": f.Size}
			if f.Drive != nil {
				fi["drive"] = R{"id": f.Drive.ID, "name": f.Drive.Name}
			}
			files = append(files, fi)
		}
		item["files"] = files
		list = append(list, item)
		nextMarker = s.ID
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func AdminSeasonList(c Context) error {
	u, err := authAdmin(c)
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
	db := c.DB().Where("\"Media\".user_id = ? AND \"Media\".type = 1", u.ID)
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
	db.Preload("Profile.Genres").Preload("Profile.OriginCountries").Preload("MediaSources").Preload("ResourceSyncTasks").
		Order("\"Media\".created DESC").Limit(body.PageSize).Find(&medias)
	list := make([]R, 0, len(medias))
	var nextMarker string
	for _, m := range medias {
		item := R{"id": m.ID, "cur_episode_count": len(m.MediaSources)}
		if m.Profile != nil {
			item["name"] = m.Profile.Name
			item["original_name"] = m.Profile.OriginalName
			item["overview"] = m.Profile.Overview
			item["air_date"] = m.Profile.AirDate
			item["poster_path"] = m.Profile.PosterPath
			item["vote_average"] = m.Profile.VoteAverage
			item["episode_count"] = m.Profile.SourceCount
			genres := make([]string, 0)
			for _, g := range m.Profile.Genres {
				genres = append(genres, g.Text)
			}
			item["genres"] = genres
			countries := make([]string, 0)
			for _, c := range m.Profile.OriginCountries {
				countries = append(countries, c.Text)
			}
			item["origin_country"] = countries
		}
		var tips []string
		if len(m.MediaSources) == 0 {
			tips = append(tips, "没有可播放的剧集")
		}
		if len(m.ResourceSyncTasks) == 0 {
			tips = append(tips, "没有同步任务")
		}
		item["tips"] = tips
		list = append(list, item)
		nextMarker = m.ID
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func AdminSeasonProfile(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		SeasonID string `json:"season_id"`
	}
	if err := c.Bind(&body); err != nil || body.SeasonID == "" {
		return fail(c, 400, "缺少 season_id")
	}
	var m model.Media
	if err := c.DB().Preload("Profile.Series").Preload("Profile.Genres").Preload("Profile.OriginCountries").
		Preload("MediaSources.Profile").Preload("MediaSources.Files.Drive").
		Where("id = ? AND user_id = ? AND type = 1", body.SeasonID, u.ID).First(&m).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	item := R{"id": m.ID, "profile_id": m.ProfileID}
	if m.Profile != nil {
		item["name"] = m.Profile.Name
		item["overview"] = m.Profile.Overview
		item["poster_path"] = m.Profile.PosterPath
		item["backdrop_path"] = m.Profile.BackdropPath
		item["air_date"] = m.Profile.AirDate
		genres := make([]string, 0)
		for _, g := range m.Profile.Genres {
			genres = append(genres, g.Text)
		}
		item["genres"] = genres
		countries := make([]string, 0)
		for _, c := range m.Profile.OriginCountries {
			countries = append(countries, c.Text)
		}
		item["origin_country"] = countries
		if m.Profile.Series != nil && m.Profile.SeriesID != nil {
			var siblings []model.MediaProfile
			c.DB().Where("series_id = ? AND id != ?", *m.Profile.SeriesID, m.ProfileID).Order("\"order\" ASC").Find(&siblings)
			series := make([]R, 0)
			for _, s := range siblings {
				series = append(series, R{"id": s.ID, "name": s.Name, "poster_path": s.PosterPath, "air_date": s.AirDate, "order": s.Order})
			}
			item["series"] = series
		}
	}
	episodes := make([]R, 0)
	for _, s := range m.MediaSources {
		ep := R{"id": s.ID}
		if s.Profile != nil {
			ep["name"] = s.Profile.Name
			ep["overview"] = s.Profile.Overview
			ep["episode_number"] = s.Profile.Order
			ep["air_date"] = s.Profile.AirDate
			ep["runtime"] = s.Profile.Runtime
		}
		files := make([]R, 0)
		for _, f := range s.Files {
			fi := R{"id": f.ID, "file_id": f.FileID, "file_name": f.FileName, "parent_paths": f.ParentPaths, "size": f.Size, "created": f.Created}
			if f.Drive != nil {
				fi["drive"] = R{"id": f.Drive.ID, "name": f.Drive.Name}
			}
			files = append(files, fi)
		}
		ep["sources"] = files
		episodes = append(episodes, ep)
	}
	item["episodes"] = episodes
	return ok(c, "", item)
}

func AdminSeasonPartial(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		MediaID string `json:"media_id"`
	}
	if err := c.Bind(&body); err != nil || body.MediaID == "" {
		return fail(c, 400, "缺少 media_id")
	}
	var m model.Media
	if err := c.DB().Preload("Profile.Genres").Preload("Profile.OriginCountries").Preload("MediaSources").Preload("ResourceSyncTasks").
		Where("id = ? AND user_id = ?", body.MediaID, u.ID).First(&m).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	item := R{"id": m.ID, "cur_episode_count": len(m.MediaSources)}
	if m.Profile != nil {
		item["name"] = m.Profile.Name
		item["original_name"] = m.Profile.OriginalName
		item["overview"] = m.Profile.Overview
		item["air_date"] = m.Profile.AirDate
		item["poster_path"] = m.Profile.PosterPath
		item["vote_average"] = m.Profile.VoteAverage
		item["episode_count"] = m.Profile.SourceCount
		genres := make([]string, 0)
		for _, g := range m.Profile.Genres {
			genres = append(genres, g.Text)
		}
		item["genres"] = genres
		countries := make([]string, 0)
		for _, c := range m.Profile.OriginCountries {
			countries = append(countries, c.Text)
		}
		item["origin_country"] = countries
	}
	return ok(c, "", item)
}

func AdminMovieList(c Context) error {
	u, err := authAdmin(c)
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
	db := c.DB().Where("\"Media\".user_id = ? AND \"Media\".type = 2", u.ID)
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
	for _, m := range medias {
		item := R{"id": m.ID}
		if m.Profile != nil {
			item["name"] = m.Profile.Name
			item["original_name"] = m.Profile.OriginalName
			item["overview"] = m.Profile.Overview
			item["air_date"] = m.Profile.AirDate
			item["poster_path"] = m.Profile.PosterPath
			item["vote_average"] = m.Profile.VoteAverage
			genres := make([]string, 0)
			for _, g := range m.Profile.Genres {
				genres = append(genres, g.Text)
			}
			item["genres"] = genres
			countries := make([]string, 0)
			for _, c := range m.Profile.OriginCountries {
				countries = append(countries, c.Text)
			}
			item["origin_country"] = countries
		}
		var tips []string
		if len(m.MediaSources) == 0 {
			tips = append(tips, "没有可播放的源")
		}
		item["tips"] = tips
		list = append(list, item)
		nextMarker = m.ID
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func AdminMovieProfile(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		MediaID string `json:"media_id"`
	}
	if err := c.Bind(&body); err != nil || body.MediaID == "" {
		return fail(c, 400, "缺少 media_id")
	}
	var m model.Media
	if err := c.DB().Preload("Profile.Genres").Preload("Profile.OriginCountries").Preload("MediaSources.Profile").Preload("MediaSources.Files.Drive").
		Where("id = ? AND user_id = ? AND type = 2", body.MediaID, u.ID).First(&m).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	item := R{"id": m.ID, "profile_id": m.ProfileID}
	if m.Profile != nil {
		item["name"] = m.Profile.Name
		item["overview"] = m.Profile.Overview
		item["poster_path"] = m.Profile.PosterPath
		item["backdrop_path"] = m.Profile.BackdropPath
		item["air_date"] = m.Profile.AirDate
		genres := make([]string, 0)
		for _, g := range m.Profile.Genres {
			genres = append(genres, g.Text)
		}
		item["genres"] = genres
		countries := make([]string, 0)
		for _, c := range m.Profile.OriginCountries {
			countries = append(countries, c.Text)
		}
		item["origin_country"] = countries
	}
	sources := make([]R, 0)
	for _, s := range m.MediaSources {
		src := R{"id": s.ID}
		for _, f := range s.Files {
			src["file_id"] = f.FileID
			src["file_name"] = f.FileName
			src["parent_paths"] = f.ParentPaths
			src["size"] = f.Size
			if f.Drive != nil {
				src["drive"] = R{"id": f.Drive.ID, "name": f.Drive.Name}
			}
		}
		sources = append(sources, src)
	}
	item["sources"] = sources
	return ok(c, "", item)
}

func AdminSubtitleList(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Name     string `json:"name"`
		Page     int    `json:"page"`
		PageSize int    `json:"page_size"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}
	if body.Page <= 0 {
		body.Page = 1
	}
	db := c.DB().Where("\"SubtitleV2\".user_id = ?", u.ID)
	if body.Name != "" {
		db = db.Where("\"SubtitleV2\".name LIKE ?", "%"+body.Name+"%")
	}
	var total int64
	db.Model(&model.SubtitleV2{}).Count(&total)
	var subtitles []model.SubtitleV2
	db.Preload("MediaSource.Profile").Preload("MediaSource.Media.Profile").
		Order("\"SubtitleV2\".created DESC").Offset((body.Page - 1) * body.PageSize).Limit(body.PageSize).Find(&subtitles)
	list := make([]R, 0, len(subtitles))
	for _, s := range subtitles {
		item := R{"id": s.ID, "language": s.Language, "type": s.Type, "unique_id": s.UniqueID, "name": s.Name}
		if s.MediaSource != nil && s.MediaSource.Media != nil && s.MediaSource.Media.Profile != nil {
			item["media_name"] = s.MediaSource.Media.Profile.Name
		}
		if s.MediaSource != nil && s.MediaSource.Profile != nil {
			item["source_name"] = s.MediaSource.Profile.Name
		}
		list = append(list, item)
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "page": body.Page, "no_more": (body.Page * body.PageSize) >= int(total)})
}

func AdminSubtitleParse(c Context) error {
	// TODO: requires filename parser
	return fail(c, 501, "未实现")
}

func AdminSubtitleBatchCreate(c Context) error {
	// TODO: requires file upload handling
	return fail(c, 501, "未实现")
}

func AdminSubtitleDelete(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		SubtitleID string `json:"subtitle_id"`
	}
	if err := c.Bind(&body); err != nil || body.SubtitleID == "" {
		return fail(c, 400, "缺少 subtitle_id")
	}
	var s model.SubtitleV2
	if err := c.DB().Where("id = ? AND user_id = ?", body.SubtitleID, u.ID).First(&s).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	c.DB().Delete(&s)
	return ok(c, "删除成功", nil)
}

func AdminParsedMediaList(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Name       string `json:"name"`
		Empty      *int   `json:"empty"`
		Type       *int   `json:"type"`
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}
	db := c.DB().Where("\"ParsedMedia\".user_id = ?", u.ID)
	if body.Name != "" {
		db = db.Where("\"ParsedMedia\".name LIKE ? OR \"ParsedMedia\".original_name LIKE ?", "%"+body.Name+"%", "%"+body.Name+"%")
	}
	if body.Empty != nil && *body.Empty == 1 {
		db = db.Where("\"ParsedMedia\".media_profile_id IS NULL")
	}
	if body.Type != nil {
		db = db.Where("\"ParsedMedia\".type = ?", *body.Type)
	}
	var total int64
	db.Model(&model.ParsedMedia{}).Count(&total)
	if body.NextMarker != "" {
		db = db.Where("\"ParsedMedia\".id < ?", body.NextMarker)
	}
	var items []model.ParsedMedia
	db.Preload("MediaProfile").Preload("ParsedSources", func(tx *gorm.DB) *gorm.DB {
		return tx.Limit(5)
	}).Preload("ParsedSources.MediaSource.Profile").Preload("ParsedSources.Drive").
		Order("\"ParsedMedia\".created DESC").Limit(body.PageSize).Find(&items)
	list := make([]R, 0, len(items))
	var nextMarker string
	for _, pm := range items {
		item := R{
			"id":          pm.ID,
			"type":        pm.Type,
			"name":        pm.Name,
			"season_text": pm.SeasonText,
		}
		if pm.MediaProfile != nil {
			item["profile"] = R{"id": pm.MediaProfile.ID, "name": pm.MediaProfile.Name, "poster_path": pm.MediaProfile.PosterPath}
		}
		sources := make([]R, 0)
		for _, ps := range pm.ParsedSources {
			src := R{
				"id":           ps.ID,
				"name":         ps.Name,
				"season_text":  ps.SeasonText,
				"episode_text": ps.EpisodeText,
				"file_name":    ps.FileName,
				"parent_paths": ps.ParentPaths,
			}
			if ps.MediaSource != nil && ps.MediaSource.Profile != nil {
				src["profile"] = R{"id": ps.MediaSource.Profile.ID, "name": ps.MediaSource.Profile.Name}
			}
			if ps.Drive != nil {
				src["drive"] = R{"id": ps.Drive.ID, "name": ps.Drive.Name}
			}
			sources = append(sources, src)
		}
		item["sources"] = sources
		item["source_count"] = len(pm.ParsedSources)
		list = append(list, item)
		nextMarker = pm.ID
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func AdminParsedMediaSetProfile(c Context) error {
	// TODO: requires TMDB client for profile resolution
	return fail(c, 501, "未实现")
}

func AdminParsedMediaSetProfileAfterCreate(c Context) error {
	// TODO: requires TMDB client for profile creation
	return fail(c, 501, "未实现")
}

func AdminParsedMediaSetProfileInFileId(c Context) error {
	// TODO: requires TMDB client for profile resolution
	return fail(c, 501, "未实现")
}

func AdminParsedMediaDelete(c Context) error {
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
	var pm model.ParsedMedia
	if err := c.DB().Where("id = ? AND user_id = ?", body.ID, u.ID).First(&pm).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	c.DB().Where("parsed_media_id = ?", pm.ID).Delete(&model.ParsedMediaSource{})
	c.DB().Delete(&pm)
	return ok(c, "删除成功", nil)
}

func AdminParsedMediaSourceList(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Name          string `json:"name"`
		Empty         *int   `json:"empty"`
		Type          *int   `json:"type"`
		ParsedMediaID string `json:"parsed_media_id"`
		NextMarker    string `json:"next_marker"`
		PageSize      int    `json:"page_size"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}
	db := c.DB().Where("\"ParsedSource\".user_id = ?", u.ID)
	if body.Name != "" {
		db = db.Where("\"ParsedSource\".name LIKE ? OR \"ParsedSource\".file_name LIKE ?", "%"+body.Name+"%", "%"+body.Name+"%")
	}
	if body.Empty != nil && *body.Empty == 1 {
		db = db.Where("\"ParsedSource\".media_source_id IS NULL")
	}
	if body.Type != nil {
		db = db.Where("\"ParsedSource\".type = ?", *body.Type)
	}
	if body.ParsedMediaID != "" {
		db = db.Where("\"ParsedSource\".parsed_media_id = ?", body.ParsedMediaID)
	}
	var total int64
	db.Model(&model.ParsedMediaSource{}).Count(&total)
	if body.NextMarker != "" {
		db = db.Where("\"ParsedSource\".id < ?", body.NextMarker)
	}
	var items []model.ParsedMediaSource
	db.Preload("ParsedMedia.MediaProfile").Preload("Drive").
		Order("\"ParsedSource\".created DESC").Limit(body.PageSize).Find(&items)
	list := make([]R, 0, len(items))
	var nextMarker string
	for _, ps := range items {
		item := R{
			"id":           ps.ID,
			"type":         ps.Type,
			"name":         ps.Name,
			"season_text":  ps.SeasonText,
			"episode_text": ps.EpisodeText,
			"file_name":    ps.FileName,
			"parent_paths": ps.ParentPaths,
		}
		if ps.ParsedMedia != nil && ps.ParsedMedia.MediaProfile != nil {
			item["profile"] = R{"id": ps.ParsedMedia.MediaProfile.ID, "name": ps.ParsedMedia.MediaProfile.Name}
		}
		if ps.Drive != nil {
			item["drive"] = R{"id": ps.Drive.ID, "name": ps.Drive.Name}
		}
		list = append(list, item)
		nextMarker = ps.ID
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func AdminParsedMediaSourceSetProfile(c Context) error {
	// TODO: requires TMDB client for profile resolution
	return fail(c, 501, "未实现")
}

func AdminParsedMediaSourceDelete(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ParsedMediaSourceID string `json:"parsed_media_source_id"`
	}
	if err := c.Bind(&body); err != nil || body.ParsedMediaSourceID == "" {
		return fail(c, 400, "缺少 parsed_media_source_id")
	}
	var ps model.ParsedMediaSource
	if err := c.DB().Where("id = ? AND user_id = ?", body.ParsedMediaSourceID, u.ID).First(&ps).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	c.DB().Delete(&ps)
	return ok(c, "删除成功", nil)
}

func AdminParsedMediaSourcePreview(c Context) error {
	// TODO: requires drive client for video preview
	return fail(c, 501, "未实现")
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

func AdminClearThumbnails(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	c.DB().Model(&model.PlayHistoryV2{}).Where("member_id IN (SELECT id FROM \"Member\" WHERE user_id = ?)", u.ID).Update("thumbnail_path", nil)
	return ok(c, "清除成功", nil)
}

func AdminCollectionList(c Context) error {
	u, err := authAdmin(c)
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
	db := c.DB().Where("user_id = ?", u.ID)
	if body.Type != nil {
		db = db.Where("type = ?", *body.Type)
	}
	if body.Name != "" {
		db = db.Where("title LIKE ?", "%"+body.Name+"%")
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
		for _, m := range col.Medias {
			mi := R{"id": m.ID, "type": m.Type}
			if m.Profile != nil {
				mi["name"] = m.Profile.Name
				mi["poster_path"] = m.Profile.PosterPath
				mi["air_date"] = m.Profile.AirDate
			}
			medias = append(medias, mi)
		}
		list = append(list, R{"id": col.ID, "title": col.Title, "desc": col.Desc, "medias": medias})
		nextMarker = col.ID
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func AdminCollectionCreate(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Title string `json:"title"`
		Desc  string `json:"desc"`
		Sort  int    `json:"sort"`
	}
	if err := c.Bind(&body); err != nil || body.Title == "" {
		return fail(c, 400, "缺少标题")
	}
	desc := body.Desc
	col := model.CollectionV2{ID: member.Rid(), Title: body.Title, Desc: &desc, Sort: body.Sort, Type: 1, UserID: u.ID}
	if err := c.DB().Create(&col).Error; err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "创建成功", nil)
}

func AdminCollectionEdit(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ID    string  `json:"id"`
		Title *string `json:"title"`
		Desc  *string `json:"desc"`
		Sort  *int    `json:"sort"`
	}
	if err := c.Bind(&body); err != nil || body.ID == "" {
		return fail(c, 400, "缺少 id")
	}
	var col model.CollectionV2
	if err := c.DB().Where("id = ? AND user_id = ?", body.ID, u.ID).First(&col).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	updates := map[string]interface{}{}
	if body.Title != nil {
		updates["title"] = *body.Title
	}
	if body.Desc != nil {
		updates["desc"] = *body.Desc
	}
	if body.Sort != nil {
		updates["sort"] = *body.Sort
	}
	if len(updates) > 0 {
		c.DB().Model(&col).Updates(updates)
	}
	return ok(c, "更新成功", nil)
}

func AdminCollectionDelete(c Context) error {
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
	var col model.CollectionV2
	if err := c.DB().Where("id = ? AND user_id = ?", body.ID, u.ID).First(&col).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	c.DB().Delete(&col)
	return ok(c, "删除成功", nil)
}

func AdminCollectionProfile(c Context) error {
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
	var col model.CollectionV2
	if err := c.DB().Preload("Medias.Profile").Where("id = ? AND user_id = ?", body.ID, u.ID).First(&col).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	medias := make([]R, 0)
	for _, m := range col.Medias {
		mi := R{"id": m.ID, "type": m.Type}
		if m.Profile != nil {
			mi["name"] = m.Profile.Name
			mi["poster_path"] = m.Profile.PosterPath
		}
		medias = append(medias, mi)
	}
	return ok(c, "", R{"id": col.ID, "title": col.Title, "desc": col.Desc, "sort": col.Sort, "type": col.Type, "medias": medias})
}

func AdminCollectionRefreshMediaRank(c Context) error {
	// TODO: requires external ranking data source
	return fail(c, 501, "未实现")
}

func AdminSyncTaskComplete(c Context) error {
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
	var t model.ResourceSyncTask
	if err := c.DB().Where("id = ? AND user_id = ?", body.ID, u.ID).First(&t).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	c.DB().Model(&t).Updates(map[string]interface{}{"status": 3, "updated": time.Now()})
	return ok(c, "更新成功", nil)
}

func AdminSyncTaskRun(c Context) error {
	// TODO: requires drive client for file sync
	return fail(c, 501, "未实现")
}

func AdminSyncTaskUpdate(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ID       string `json:"id"`
		SeasonID string `json:"season_id"`
	}
	if err := c.Bind(&body); err != nil || body.ID == "" || body.SeasonID == "" {
		return fail(c, 400, "参数错误")
	}
	var t model.ResourceSyncTask
	if err := c.DB().Where("id = ? AND user_id = ?", body.ID, u.ID).First(&t).Error; err != nil {
		return fail(c, 404, "没有匹配的同步任务")
	}
	var m model.Media
	if err := c.DB().Where("id = ? AND user_id = ?", body.SeasonID, u.ID).First(&m).Error; err != nil {
		return fail(c, 404, "没有匹配的影视剧")
	}
	c.DB().Model(&t).Updates(map[string]interface{}{"media_id": m.ID, "status": 2})
	return ok(c, "更新成功", nil)
}

func AdminSyncTaskPartial(c Context) error {
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
	var t model.ResourceSyncTask
	if err := c.DB().Preload("Media.Profile").Preload("Drive").
		Where("id = ? AND user_id = ?", body.ID, u.ID).First(&t).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	item := R{
		"id":                     t.ID,
		"url":                    t.URL,
		"file_id":                t.FileID,
		"name":                   t.Name,
		"file_id_link_resource":  t.FileIDLinkResource,
		"file_name_link_resource": t.FileNameLinkResource,
		"invalid":                t.Invalid,
	}
	if t.Media != nil && t.Media.Profile != nil {
		item["season"] = R{
			"id":                t.Media.ID,
			"name":              t.Media.Profile.Name,
			"poster_path":       t.Media.Profile.PosterPath,
			"episode_count":     t.Media.Profile.SourceCount,
		}
	}
	if t.Drive != nil {
		item["drive"] = R{"id": t.Drive.ID, "name": t.Drive.Name, "avatar": t.Drive.Avatar}
	}
	return ok(c, "", item)
}

func AdminSyncTaskList(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Name       string `json:"name"`
		Status     *int   `json:"status"`
		Invalid    *int   `json:"invalid"`
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}
	db := c.DB().Where("\"ResourceSyncTask\".user_id = ?", u.ID)
	if body.Name != "" {
		db = db.Where("\"ResourceSyncTask\".name LIKE ?", "%"+body.Name+"%")
	}
	if body.Status != nil {
		db = db.Where("\"ResourceSyncTask\".status = ?", *body.Status)
	}
	if body.Invalid != nil {
		db = db.Where("\"ResourceSyncTask\".invalid = ?", *body.Invalid)
	}
	var total int64
	db.Model(&model.ResourceSyncTask{}).Count(&total)
	if body.NextMarker != "" {
		db = db.Where("\"ResourceSyncTask\".id < ?", body.NextMarker)
	}
	var tasks []model.ResourceSyncTask
	db.Preload("Media.Profile").Preload("Drive").
		Order("\"ResourceSyncTask\".created DESC").Limit(body.PageSize).Find(&tasks)
	list := make([]R, 0, len(tasks))
	var nextMarker string
	for _, t := range tasks {
		item := R{
			"id":                     t.ID,
			"url":                    t.URL,
			"file_id":                t.FileID,
			"name":                   t.Name,
			"file_id_link_resource":  t.FileIDLinkResource,
			"file_name_link_resource": t.FileNameLinkResource,
			"invalid":                t.Invalid,
		}
		if t.Media != nil && t.Media.Profile != nil {
			item["season"] = R{
				"id":            t.Media.ID,
				"name":          t.Media.Profile.Name,
				"poster_path":   t.Media.Profile.PosterPath,
				"episode_count": t.Media.Profile.SourceCount,
			}
		}
		if t.Drive != nil {
			item["drive"] = R{"id": t.Drive.ID, "name": t.Drive.Name, "avatar": t.Drive.Avatar}
		}
		list = append(list, item)
		nextMarker = t.ID
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func AdminSyncTaskCreate(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		URL              string `json:"url"`
		PWD              string `json:"pwd"`
		ResourceFileID   string `json:"resource_file_id"`
		ResourceFileName string `json:"resource_file_name"`
		DriveFileID      string `json:"drive_file_id"`
		DriveFileName    string `json:"drive_file_name"`
		DriveID          string `json:"drive_id"`
	}
	if err := c.Bind(&body); err != nil || body.URL == "" {
		return fail(c, 400, "缺少 url")
	}
	var pwd *string
	if body.PWD != "" {
		pwd = &body.PWD
	}
	t := model.ResourceSyncTask{
		ID:                   member.Rid(),
		URL:                  body.URL,
		PWD:                  pwd,
		FileID:               body.ResourceFileID,
		Name:                 body.ResourceFileName,
		FileIDLinkResource:   body.DriveFileID,
		FileNameLinkResource: body.DriveFileName,
		DriveID:              body.DriveID,
		Status:               1,
		UserID:               u.ID,
	}
	if err := c.DB().Create(&t).Error; err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "新增同步任务成功", nil)
}

func AdminSyncTaskDelete(c Context) error {
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
	var t model.ResourceSyncTask
	if err := c.DB().Where("id = ? AND user_id = ?", body.ID, u.ID).First(&t).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	c.DB().Delete(&t)
	return ok(c, "删除成功", nil)
}

func AdminSyncTaskOverride(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ID               string `json:"id"`
		URL              string `json:"url"`
		PWD              string `json:"pwd"`
		ResourceFileID   string `json:"resource_file_id"`
		ResourceFileName string `json:"resource_file_name"`
	}
	if err := c.Bind(&body); err != nil || body.ID == "" {
		return fail(c, 400, "缺少 id")
	}
	var t model.ResourceSyncTask
	if err := c.DB().Where("id = ? AND user_id = ?", body.ID, u.ID).First(&t).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	updates := map[string]interface{}{"invalid": 0}
	if body.URL != "" {
		updates["url"] = body.URL
	}
	if body.PWD != "" {
		updates["pwd"] = body.PWD
	}
	if body.ResourceFileID != "" {
		updates["file_id"] = body.ResourceFileID
	}
	if body.ResourceFileName != "" {
		updates["name"] = body.ResourceFileName
	}
	c.DB().Model(&t).Updates(updates)
	return ok(c, "更新成功", nil)
}

func AdminSyncTaskTransferHistory(c Context) error {
	// TODO: requires drive client
	return fail(c, 501, "未实现")
}

func AdminSyncTaskSearchHistory(c Context) error {
	// TODO: requires drive client
	return fail(c, 501, "未实现")
}

func AdminReportList(c Context) error {
	u, err := authAdmin(c)
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
	db := c.DB().Where("\"ReportV2\".user_id = ?", u.ID)
	if body.Type != nil {
		db = db.Where("\"ReportV2\".type = ?", *body.Type)
	}
	var total int64
	db.Model(&model.ReportV2{}).Count(&total)
	if body.NextMarker != "" {
		db = db.Where("\"ReportV2\".id < ?", body.NextMarker)
	}
	var reports []model.ReportV2
	db.Preload("Media.Profile").Preload("MediaSource.Profile").Preload("Member").
		Order("\"ReportV2\".created DESC").Limit(body.PageSize).Find(&reports)
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

func AdminReportReply(c Context) error {
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
	var r model.ReportV2
	if err := c.DB().Where("id = ? AND user_id = ?", body.ID, u.ID).First(&r).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	updates := map[string]interface{}{"answer": body.Content}
	if body.MediaID != "" {
		updates["reply_media_id"] = body.MediaID
	}
	c.DB().Model(&r).Updates(updates)
	// Create notification for member
	contentJSON, _ := json.Marshal(R{"content": body.Content})
	contentStr := string(contentJSON)
	uniqueID := fmt.Sprintf("report_reply_%s", r.ID)
	var existing model.MemberNotification
	if c.DB().Where("unique_id = ?", uniqueID).First(&existing).Error != nil {
		c.DB().Create(&model.MemberNotification{
			ID:       member.Rid(),
			UniqueID: uniqueID,
			Content:  &contentStr,
			Type:     1,
			Status:   1,
			MemberID: r.MemberID,
		})
	}
	return ok(c, "", nil)
}

func AdminSettingsProfile(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	return ok(c, "", u.Settings)
}

func AdminSettingsUpdate(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body map[string]interface{}
	if err := c.Bind(&body); err != nil {
		return fail(c, 400, "参数错误")
	}
	// Merge with existing settings
	existing, _ := json.Marshal(u.Settings)
	var merged map[string]interface{}
	json.Unmarshal(existing, &merged)
	for k, v := range body {
		merged[k] = v
	}
	detail, _ := json.Marshal(merged)
	detailStr := string(detail)
	c.DB().Model(&model.Settings{}).Where("user_id = ?", u.ID).Update("detail", detailStr)
	return ok(c, "更新成功", nil)
}

func AdminParsedMediaMatchProfile(c Context) error {
	// TODO: requires TMDB client
	return fail(c, 501, "未实现")
}

func DriveFileAdd(c Context) error {
	// TODO: requires drive client
	return fail(c, 501, "未实现")
}

func DriveFileList(c Context) error {
	// TODO: requires drive client for remote file listing
	return fail(c, 501, "未实现")
}

func DriveFileProfile(c Context) error {
	// TODO: requires drive client
	return fail(c, 501, "未实现")
}

func DriveFileDelete(c Context) error {
	// TODO: requires drive client
	return fail(c, 501, "未实现")
}

func DriveFileDownload(c Context) error {
	// TODO: requires drive client
	return fail(c, 501, "未实现")
}

func DriveFileTransfer(c Context) error {
	// TODO: requires drive client
	return fail(c, 501, "未实现")
}

func DriveFileToResourceDrive(c Context) error {
	// TODO: requires drive client
	return fail(c, 501, "未实现")
}

func DriveFileSearch(c Context) error {
	// TODO: requires drive client
	return fail(c, 501, "未实现")
}

func DriveFileRename(c Context) error {
	// TODO: requires drive client
	return fail(c, 501, "未实现")
}

func DriveRenameFiles(c Context) error {
	// TODO: requires drive client
	return fail(c, 501, "未实现")
}

func LocalFileList(c Context) error {
	// TODO: requires local filesystem access
	return fail(c, 501, "未实现")
}

func MediaProfileList(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Name       string `json:"name"`
		Type       *int   `json:"type"`
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}
	_ = u
	db := c.DB()
	if body.Name != "" {
		db = db.Where("name LIKE ? OR original_name LIKE ?", "%"+body.Name+"%", "%"+body.Name+"%")
	}
	if body.Type != nil {
		db = db.Where("type = ?", *body.Type)
	}
	var total int64
	db.Model(&model.MediaProfile{}).Count(&total)
	if body.NextMarker != "" {
		db = db.Where("id < ?", body.NextMarker)
	}
	var profiles []model.MediaProfile
	db.Preload("Genres").Preload("OriginCountries").Order("created DESC").Limit(body.PageSize).Find(&profiles)
	list := make([]R, 0, len(profiles))
	var nextMarker string
	for _, p := range profiles {
		genres := make([]string, 0)
		for _, g := range p.Genres {
			genres = append(genres, g.Text)
		}
		countries := make([]string, 0)
		for _, co := range p.OriginCountries {
			countries = append(countries, co.Text)
		}
		list = append(list, R{
			"id":             p.ID,
			"type":           p.Type,
			"name":           p.Name,
			"original_name":  p.OriginalName,
			"poster_path":    p.PosterPath,
			"air_date":       p.AirDate,
			"vote_average":   p.VoteAverage,
			"source_count":   p.SourceCount,
			"genres":         genres,
			"origin_country": countries,
		})
		nextMarker = p.ID
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func MediaProfileSearch(c Context) error {
	// TODO: requires TMDB client
	return fail(c, 501, "未实现")
}

func MediaProfilePartial(c Context) error {
	_, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ID string `json:"id"`
	}
	if err := c.Bind(&body); err != nil || body.ID == "" {
		return fail(c, 400, "缺少 id")
	}
	var p model.MediaProfile
	if err := c.DB().Preload("Genres").Preload("OriginCountries").Where("id = ?", body.ID).First(&p).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	genres := make([]string, 0)
	for _, g := range p.Genres {
		genres = append(genres, g.Text)
	}
	countries := make([]string, 0)
	for _, co := range p.OriginCountries {
		countries = append(countries, co.Text)
	}
	return ok(c, "", R{
		"id": p.ID, "type": p.Type, "name": p.Name, "original_name": p.OriginalName,
		"poster_path": p.PosterPath, "air_date": p.AirDate, "vote_average": p.VoteAverage,
		"source_count": p.SourceCount, "genres": genres, "origin_country": countries,
		"overview": p.Overview, "backdrop_path": p.BackdropPath,
	})
}

func MediaProfileProfile(c Context) error {
	_, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ID string `json:"id"`
	}
	if err := c.Bind(&body); err != nil || body.ID == "" {
		return fail(c, 400, "缺少 id")
	}
	var p model.MediaProfile
	if err := c.DB().Preload("Genres").Preload("OriginCountries").Preload("Series").Preload("SourceProfiles").
		Where("id = ?", body.ID).First(&p).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	genres := make([]string, 0)
	for _, g := range p.Genres {
		genres = append(genres, g.Text)
	}
	countries := make([]string, 0)
	for _, co := range p.OriginCountries {
		countries = append(countries, co.Text)
	}
	episodes := make([]R, 0)
	for _, sp := range p.SourceProfiles {
		episodes = append(episodes, R{"id": sp.ID, "name": sp.Name, "order": sp.Order, "air_date": sp.AirDate, "runtime": sp.Runtime})
	}
	item := R{
		"id": p.ID, "type": p.Type, "name": p.Name, "original_name": p.OriginalName,
		"poster_path": p.PosterPath, "backdrop_path": p.BackdropPath, "air_date": p.AirDate,
		"vote_average": p.VoteAverage, "source_count": p.SourceCount, "overview": p.Overview,
		"genres": genres, "origin_country": countries, "episodes": episodes,
	}
	if p.Series != nil {
		item["series"] = R{"id": p.Series.ID, "name": p.Series.Name}
	}
	return ok(c, "", item)
}

func MediaProfileSeriesProfile(c Context) error {
	_, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ID string `json:"id"`
	}
	if err := c.Bind(&body); err != nil || body.ID == "" {
		return fail(c, 400, "缺少 id")
	}
	var s model.MediaSeriesProfile
	if err := c.DB().Preload("MediaProfiles").Where("id = ?", body.ID).First(&s).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	seasons := make([]R, 0)
	for _, p := range s.MediaProfiles {
		seasons = append(seasons, R{"id": p.ID, "name": p.Name, "poster_path": p.PosterPath, "air_date": p.AirDate, "order": p.Order})
	}
	return ok(c, "", R{"id": s.ID, "name": s.Name, "poster_path": s.PosterPath, "seasons": seasons})
}

func MediaProfileSetName(c Context) error {
	_, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	}
	if err := c.Bind(&body); err != nil || body.ID == "" || body.Name == "" {
		return fail(c, 400, "参数错误")
	}
	var p model.MediaProfile
	if err := c.DB().Where("id = ?", body.ID).First(&p).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	c.DB().Model(&p).Update("name", body.Name)
	return ok(c, "更新成功", nil)
}

func MediaProfileRefresh(c Context) error {
	// TODO: requires TMDB client
	return fail(c, 501, "未实现")
}

func MediaProfileInitSeries(c Context) error {
	// TODO: requires TMDB client
	return fail(c, 501, "未实现")
}

func MediaProfileInitSeason(c Context) error {
	// TODO: requires TMDB client
	return fail(c, 501, "未实现")
}

func MediaProfileEdit(c Context) error {
	_, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ID           string  `json:"id"`
		Name         *string `json:"name"`
		OriginalName *string `json:"original_name"`
		Overview     *string `json:"overview"`
		PosterPath   *string `json:"poster_path"`
		AirDate      *string `json:"air_date"`
	}
	if err := c.Bind(&body); err != nil || body.ID == "" {
		return fail(c, 400, "缺少 id")
	}
	var p model.MediaProfile
	if err := c.DB().Where("id = ?", body.ID).First(&p).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	updates := map[string]interface{}{}
	if body.Name != nil {
		updates["name"] = *body.Name
	}
	if body.OriginalName != nil {
		updates["original_name"] = *body.OriginalName
	}
	if body.Overview != nil {
		updates["overview"] = *body.Overview
	}
	if body.PosterPath != nil {
		updates["poster_path"] = *body.PosterPath
	}
	if body.AirDate != nil {
		updates["air_date"] = *body.AirDate
	}
	if len(updates) > 0 {
		c.DB().Model(&p).Updates(updates)
	}
	return ok(c, "更新成功", nil)
}

func MediaProfileDelete(c Context) error {
	_, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ID string `json:"id"`
	}
	if err := c.Bind(&body); err != nil || body.ID == "" {
		return fail(c, 400, "缺少 id")
	}
	var p model.MediaProfile
	if err := c.DB().Where("id = ?", body.ID).First(&p).Error; err != nil {
		return fail(c, 404, "没有匹配的记录")
	}
	c.DB().Delete(&p)
	return ok(c, "删除成功", nil)
}

func MediaProfileSearchTmdb(c Context) error {
	// TODO: requires TMDB client
	return fail(c, 501, "未实现")
}

func CommonAnalysis(c Context) error {
	// TODO: requires drive client for analysis
	return fail(c, 501, "未实现")
}

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

func Info(c Context) error {
	m, _, err := authMember(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	return ok(c, "", R{"id": m.ID, "remark": m.Remark, "email": m.Email, "avatar": m.Avatar, "name": m.Name})
}

func AccountMerge(c Context) error {
	// TODO: complex account merging logic
	return fail(c, 501, "未实现")
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
		Expires: time.Now().Add(3 * time.Minute),
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
	if time.Now().After(code.Expires) {
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
	if time.Now().After(code.Expires) {
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
	// TODO: requires drive client for video preview
	return fail(c, 501, "未实现")
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
	// TODO: requires drive client for video preview
	return fail(c, 501, "未实现")
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

func AliyundriveRefresh(c Context) error {
	// TODO: requires Aliyun drive client
	return fail(c, 501, "未实现")
}

func AlipanGetQrcode(c Context) error {
	// TODO: requires Alipan API
	return fail(c, 501, "未实现")
}

func AlipanGetLoginStatus(c Context) error {
	// TODO: requires Alipan API
	return fail(c, 501, "未实现")
}

func AlipanGetAccessToken(c Context) error {
	// TODO: requires Alipan API
	return fail(c, 501, "未实现")
}

func WechatProxy(c Context) error {
	// TODO: requires HTTP proxy logic
	return fail(c, 501, "未实现")
}

func AdminPersonList(c Context) error {
	u, err := authAdmin(c)
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
	_ = u
	db := c.DB()
	if body.Name != "" {
		db = db.Where("name LIKE ?", "%"+body.Name+"%")
	}
	var total int64
	db.Model(&model.PersonProfile{}).Count(&total)
	if body.NextMarker != "" {
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

func AdminSharedFileCheckSameName(c Context) error {
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
	var existing model.SharedFile
	if err := c.DB().Where("url = ? AND user_id = ?", body.URL, u.ID).First(&existing).Error; err == nil {
		return ok(c, "", R{"existing": true, "id": existing.ID})
	}
	return ok(c, "", R{"existing": false})
}

func AdminSharedFileSearch(c Context) error {
	u, err := authAdmin(c)
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
	db := c.DB().Where("user_id = ?", u.ID)
	if body.Name != "" {
		db = db.Where("title LIKE ? OR url LIKE ?", "%"+body.Name+"%", "%"+body.Name+"%")
	}
	var total int64
	db.Model(&model.SharedFile{}).Count(&total)
	if body.NextMarker != "" {
		db = db.Where("id < ?", body.NextMarker)
	}
	var files []model.SharedFile
	db.Order("created DESC").Limit(body.PageSize).Find(&files)
	list := make([]R, 0, len(files))
	var nextMarker string
	for _, f := range files {
		list = append(list, R{"id": f.ID, "title": f.Title, "url": f.URL, "created": f.Created})
		nextMarker = f.ID
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func AdminSharedFileSaveList(c Context) error {
	u, err := authAdmin(c)
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
	db := c.DB().Where("user_id = ?", u.ID)
	if body.NextMarker != "" {
		db = db.Where("id < ?", body.NextMarker)
	}
	var files []model.SharedFileInProgress
	db.Preload("Drive").Order("created DESC").Limit(body.PageSize).Find(&files)
	list := make([]R, 0, len(files))
	var nextMarker string
	for _, f := range files {
		item := R{"id": f.ID, "url": f.URL, "name": f.Name, "file_id": f.FileID, "created": f.Created}
		if f.Drive != nil {
			item["drive"] = R{"id": f.Drive.ID, "name": f.Drive.Name}
		}
		list = append(list, item)
		nextMarker = f.ID
	}
	return ok(c, "", R{"list": list, "next_marker": nextMarker})
}

func AdminShortLink(c Context) error {
	// TODO: requires short link service
	return fail(c, 501, "未实现")
}

func AdminTvList(c Context) error {
	u, err := authAdmin(c)
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
	db := c.DB().Where("user_id = ? AND hidden = 0", u.ID)
	if body.Name != "" {
		db = db.Where("name LIKE ?", "%"+body.Name+"%")
	}
	var total int64
	db.Model(&model.TVLive{}).Count(&total)
	if body.NextMarker != "" {
		db = db.Where("id < ?", body.NextMarker)
	}
	var lives []model.TVLive
	db.Order("\"order\" ASC").Limit(body.PageSize).Find(&lives)
	list := make([]R, 0, len(lives))
	var nextMarker string
	for _, l := range lives {
		list = append(list, R{"id": l.ID, "name": l.Name, "url": l.URL, "logo": l.Logo, "group_name": l.GroupName, "order": l.Order})
		nextMarker = l.ID
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
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

func V1DriveFindFirst(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var d model.Drive
	if err := c.DB().Where("user_id = ?", u.ID).First(&d).Error; err != nil {
		return fail(c, 404, "没有云盘")
	}
	return ok(c, "", R{"id": d.ID, "name": d.Name, "type": d.Type, "avatar": d.Avatar, "total_size": d.TotalSize, "used_size": d.UsedSize})
}

func V1DriveUpdate(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ID   string                 `json:"id"`
		Data map[string]interface{} `json:"data"`
	}
	if err := c.Bind(&body); err != nil || body.ID == "" {
		return fail(c, 400, "参数错误")
	}
	var d model.Drive
	if err := c.DB().Where("id = ? AND user_id = ?", body.ID, u.ID).First(&d).Error; err != nil {
		return fail(c, 404, "没有匹配的云盘")
	}
	if len(body.Data) > 0 {
		c.DB().Model(&d).Updates(body.Data)
	}
	return ok(c, "更新成功", nil)
}

func V1DriveTokenUpdate(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		ID   string `json:"id"`
		Data string `json:"data"`
	}
	if err := c.Bind(&body); err != nil || body.ID == "" {
		return fail(c, 400, "参数错误")
	}
	var d model.Drive
	if err := c.DB().Where("id = ? AND user_id = ?", body.ID, u.ID).First(&d).Error; err != nil {
		return fail(c, 404, "没有匹配的云盘")
	}
	if d.DriveTokenID != "" {
		c.DB().Model(&model.DriveToken{}).Where("id = ?", d.DriveTokenID).Update("data", body.Data)
	}
	return ok(c, "更新成功", nil)
}

func V1UserFindFirst(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	return ok(c, "", R{"id": u.ID})
}

func AdminDashboard(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var stats model.Statistics
	if err := c.DB().Where("user_id = ?", u.ID).First(&stats).Error; err != nil {
		return ok(c, "", R{})
	}
	var data map[string]interface{}
	json.Unmarshal([]byte(stats.Data), &data)
	return ok(c, "", data)
}

func AdminDashboardRefresh(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	// Recompute statistics
	var driveCount, movieCount, seasonCount, episodeCount, syncTaskCount, reportCount int64
	c.DB().Model(&model.Drive{}).Where("user_id = ?", u.ID).Count(&driveCount)
	c.DB().Model(&model.Media{}).Where("user_id = ? AND type = 2", u.ID).Count(&movieCount)
	c.DB().Model(&model.Media{}).Where("user_id = ? AND type = 1", u.ID).Count(&seasonCount)
	c.DB().Model(&model.MediaSource{}).Where("user_id = ?", u.ID).Count(&episodeCount)
	c.DB().Model(&model.ResourceSyncTask{}).Where("user_id = ?", u.ID).Count(&syncTaskCount)
	c.DB().Model(&model.ReportV2{}).Where("user_id = ?", u.ID).Count(&reportCount)
	var invalidMovieCount, invalidSeasonCount int64
	c.DB().Model(&model.InvalidMedia{}).Where("user_id = ? AND type = 2", u.ID).Count(&invalidMovieCount)
	c.DB().Model(&model.InvalidMedia{}).Where("user_id = ? AND type = 1", u.ID).Count(&invalidSeasonCount)
	var unknownCount int64
	c.DB().Model(&model.ParsedMedia{}).Where("user_id = ? AND media_profile_id IS NULL", u.ID).Count(&unknownCount)
	data := R{
		"drive_count":          driveCount,
		"movie_count":          movieCount,
		"season_count":         seasonCount,
		"episode_count":        episodeCount,
		"sync_task_count":      syncTaskCount,
		"report_count":         reportCount,
		"invalid_movie_count":  invalidMovieCount,
		"invalid_season_count": invalidSeasonCount,
		"unknown_media_count":  unknownCount,
		"updated_at":           time.Now(),
	}
	dataJSON, _ := json.Marshal(data)
	c.DB().Model(&model.Statistics{}).Where("user_id = ?", u.ID).Update("data", string(dataJSON))
	return ok(c, "更新成功", nil)
}

func AdminDashboardAddedMedia(c Context) error {
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
	now := time.Now()
	startTime := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	endTime := startTime.Add(24 * time.Hour)
	if body.StartTime != "" {
		if t, err := time.Parse("2006-01-02", body.StartTime); err == nil {
			startTime = t
		}
	}
	if body.EndTime != "" {
		if t, err := time.Parse("2006-01-02", body.EndTime); err == nil {
			endTime = t
		}
	}
	db := c.DB().Where("\"MediaSource\".user_id = ? AND \"MediaSource\".created >= ? AND \"MediaSource\".created < ?", u.ID, startTime, endTime)
	if body.NextMarker != "" {
		db = db.Where("\"MediaSource\".id < ?", body.NextMarker)
	}
	var sources []model.MediaSource
	db.Preload("Media.Profile").Order("\"MediaSource\".created DESC").Limit(body.PageSize).Find(&sources)
	// Group by media
	seen := map[string]bool{}
	list := make([]R, 0)
	var nextMarker string
	for _, s := range sources {
		if s.Media == nil || seen[s.MediaID] {
			nextMarker = s.ID
			continue
		}
		seen[s.MediaID] = true
		item := R{"id": s.Media.ID, "type": s.Media.Type, "created": s.Created.Unix()}
		if s.Media.Profile != nil {
			item["name"] = s.Media.Profile.Name
			item["poster_path"] = s.Media.Profile.PosterPath
			item["air_date"] = s.Media.Profile.AirDate
		}
		list = append(list, item)
		nextMarker = s.ID
	}
	return ok(c, "", R{"list": list, "next_marker": nextMarker})
}

func AdminAnalysis(c Context) error {
	// TODO: requires drive client for analysis
	return fail(c, 501, "未实现")
}

func AdminAnalysisFiles(c Context) error {
	// TODO: requires drive client for analysis
	return fail(c, 501, "未实现")
}

func AdminAnalysisNewFiles(c Context) error {
	// TODO: requires drive client for analysis
	return fail(c, 501, "未实现")
}
