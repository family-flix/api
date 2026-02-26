package handler

import (
	"encoding/json"
	"fmt"
	"github.com/family-flix/api/internal/model"
	"github.com/family-flix/api/pkg/drive_client"
	"github.com/family-flix/api/pkg/drive_client/localdrive"
	"os"
	"path/filepath"
)

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
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Type    *int            `json:"type"`
		Payload json.RawMessage `json:"payload"`
	}
	if err := c.Bind(&body); err != nil {
		return fail(c, 400, "参数错误")
	}
	if body.Type == nil {
		return fail(c, 400, "请指定云盘类型")
	}
	if len(body.Payload) == 0 {
		return fail(c, 400, "请传入云盘信息")
	}
	// 从 payload 中提取 unique_id（如 drive_id、dir 等）
	var payloadMap map[string]interface{}
	if err := json.Unmarshal(body.Payload, &payloadMap); err != nil {
		return fail(c, 400, "payload 格式错误")
	}
	uniqueID := ""
	for _, key := range []string{"drive_id", "dir", "url"} {
		if v, ok := payloadMap[key]; ok {
			uniqueID = fmt.Sprintf("%v", v)
			break
		}
	}
	if uniqueID == "" {
		uniqueID = rid()
	}
	// 检查是否已存在
	var existing model.Drive
	if err := c.DB().Where("unique_id = ? AND user_id = ?", uniqueID, u.ID).First(&existing).Error; err == nil {
		return fail(c, 400, "该云盘已存在")
	}
	// 创建 DriveToken
	tokenID := rid()
	driveToken := model.DriveToken{
		ID:   tokenID,
		Data: string(body.Payload),
	}
	if err := c.DB().Create(&driveToken).Error; err != nil {
		return fail(c, 500, "创建 token 失败")
	}
	// 创建 Drive
	driveName := uniqueID
	profile := string(body.Payload)
	var rootFolderID *string
	var rootFolderName *string
	// 本地云盘特殊处理
	if *body.Type == 5 {
		if dir, ok := payloadMap["dir"].(string); ok {
			name := filepath.Base(dir)
			driveName = name
			rootFolderID = &dir
			rootFolderName = &name
			enriched, _ := json.Marshal(map[string]string{"dir": dir, "drive_id": dir, "name": name})
			profile = string(enriched)
		}
	}
	drive := model.Drive{
		ID:             rid(),
		UniqueID:       uniqueID,
		Type:           body.Type,
		Name:           driveName,
		Profile:        profile,
		RootFolderID:   rootFolderID,
		RootFolderName: rootFolderName,
		DriveTokenID:   tokenID,
		UserID:         u.ID,
	}
	if err := c.DB().Create(&drive).Error; err != nil {
		return fail(c, 500, "新增云盘失败"+err.Error())
	}
	return ok(c, "新增云盘成功", nil)
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
		"name":           d.Name,
		"avatar":         d.Avatar,
		"root_folder_id": d.RootFolderID,
		"total_size":     d.TotalSize,
		"used_size":      d.UsedSize,
		"refresh_token":  tokenData["refresh_token"],
		"access_token":   tokenData["access_token"],
		"drive_id":       profileData["drive_id"],
		"device_id":      profileData["device_id"],
		"app_id":         profileData["app_id"],
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

func getDriveClient(c Context, driveID string, userID string) (*model.Drive, drive_client.DriveClient, error) {
	var d model.Drive
	if err := c.DB().Where("id = ? AND user_id = ?", driveID, userID).First(&d).Error; err != nil {
		return nil, nil, fmt.Errorf("云盘不存在")
	}
	if d.Type == nil || *d.Type != 5 {
		return nil, nil, fmt.Errorf("该云盘类型暂不支持")
	}
	return &d, localdrive.NewLocalDriveClient(), nil
}

func DriveFileAdd(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		DriveID      string `json:"drive_id"`
		Name         string `json:"name"`
		ParentFileID string `json:"parent_file_id"`
	}
	if err := c.Bind(&body); err != nil {
		return fail(c, 400, "参数错误")
	}
	if body.DriveID == "" || body.Name == "" {
		return fail(c, 400, "缺少必要参数")
	}
	d, client, err := getDriveClient(c, body.DriveID, u.ID)
	if err != nil {
		return fail(c, 500, err.Error())
	}
	parentID := body.ParentFileID
	if parentID == "" || parentID == "root" {
		if d.RootFolderID != nil {
			parentID = *d.RootFolderID
		} else {
			return fail(c, 400, "云盘未设置根目录")
		}
	}
	f, err := client.CreateFolder(body.Name, parentID)
	if err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "创建成功", R{
		"file_id":        f.FileID,
		"name":           f.Name,
		"type":           f.Type,
		"size":           f.Size,
		"parent_file_id": f.ParentFileID,
	})
}

func DriveFileList(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		DriveID    string `json:"drive_id"`
		FileID     string `json:"file_id"`
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
	}
	if err := c.Bind(&body); err != nil {
		return fail(c, 400, "参数错误")
	}
	if body.DriveID == "" {
		return fail(c, 400, "请指定云盘")
	}
	d, client, err := getDriveClient(c, body.DriveID, u.ID)
	if err != nil {
		return fail(c, 500, err.Error())
	}
	fileID := body.FileID
	if fileID == "" || fileID == "root" {
		if d.RootFolderID != nil {
			fileID = *d.RootFolderID
		} else {
			return fail(c, 400, "云盘未设置根目录")
		}
	}
	result, err := client.FetchFiles(fileID, drive_client.FetchFilesOptions{
		PageSize: body.PageSize,
		Marker:   body.NextMarker,
	})
	if err != nil {
		return fail(c, 500, err.Error())
	}
	list := make([]R, 0, len(result.Items))
	for _, f := range result.Items {
		list = append(list, R{
			"file_id":        f.FileID,
			"name":           f.Name,
			"type":           f.Type,
			"size":           f.Size,
			"parent_file_id": f.ParentFileID,
			"mime_type":      f.MimeType,
		})
	}
	return ok(c, "", R{"items": list, "next_marker": result.NextMarker})
}

func DriveFileProfile(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		DriveID string `json:"drive_id"`
		FileID  string `json:"file_id"`
	}
	if err := c.Bind(&body); err != nil {
		return fail(c, 400, "参数错误")
	}
	if body.DriveID == "" || body.FileID == "" {
		return fail(c, 400, "缺少必要参数")
	}
	_, client, err := getDriveClient(c, body.DriveID, u.ID)
	if err != nil {
		return fail(c, 500, err.Error())
	}
	f, err := client.FetchFile(body.FileID)
	if err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "", R{
		"file_id":        f.FileID,
		"name":           f.Name,
		"type":           f.Type,
		"size":           f.Size,
		"parent_file_id": f.ParentFileID,
		"mime_type":      f.MimeType,
	})
}

func DriveFileDelete(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		DriveID string `json:"drive_id"`
		FileID  string `json:"file_id"`
	}
	if err := c.Bind(&body); err != nil {
		return fail(c, 400, "参数错误")
	}
	if body.DriveID == "" || body.FileID == "" {
		return fail(c, 400, "缺少必要参数")
	}
	_, client, err := getDriveClient(c, body.DriveID, u.ID)
	if err != nil {
		return fail(c, 500, err.Error())
	}
	if err := client.DeleteFile(body.FileID); err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "删除成功", nil)
}

func DriveFileDownload(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		DriveID string `json:"drive_id"`
		FileID  string `json:"file_id"`
	}
	if err := c.Bind(&body); err != nil {
		return fail(c, 400, "参数错误")
	}
	if body.DriveID == "" || body.FileID == "" {
		return fail(c, 400, "缺少必要参数")
	}
	_, client, err := getDriveClient(c, body.DriveID, u.ID)
	if err != nil {
		return fail(c, 500, err.Error())
	}
	url, err := client.Download(body.FileID)
	if err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "", R{"url": url})
}

func DriveFileTransfer(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		DriveID      string `json:"drive_id"`
		FileID       string `json:"file_id"`
		TargetFoldID string `json:"target_folder_id"`
	}
	if err := c.Bind(&body); err != nil {
		return fail(c, 400, "参数错误")
	}
	if body.DriveID == "" || body.FileID == "" || body.TargetFoldID == "" {
		return fail(c, 400, "缺少必要参数")
	}
	_, client, err := getDriveClient(c, body.DriveID, u.ID)
	if err != nil {
		return fail(c, 500, err.Error())
	}
	// 获取原文件信息
	f, err := client.FetchFile(body.FileID)
	if err != nil {
		return fail(c, 500, err.Error())
	}
	// 移动 = 在目标目录创建同名，再删除原文件（本地盘直接 rename）
	newPath := filepath.Join(body.TargetFoldID, f.Name)
	if err := os.Rename(body.FileID, newPath); err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "移动成功", nil)
}

func DriveFileToResourceDrive(c Context) error {
	// TODO: requires drive client
	return fail(c, 501, "未实现")
}

func DriveFileSearch(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		DriveID    string `json:"drive_id"`
		Name       string `json:"name"`
		FileType   string `json:"file_type"`
		NextMarker string `json:"next_marker"`
	}
	if err := c.Bind(&body); err != nil {
		return fail(c, 400, "参数错误")
	}
	if body.DriveID == "" || body.Name == "" {
		return fail(c, 400, "缺少必要参数")
	}
	_, client, err := getDriveClient(c, body.DriveID, u.ID)
	if err != nil {
		return fail(c, 500, err.Error())
	}
	result, err := client.SearchFiles(body.Name, body.FileType, body.NextMarker)
	if err != nil {
		return fail(c, 500, err.Error())
	}
	list := make([]R, 0, len(result.Items))
	for _, f := range result.Items {
		list = append(list, R{
			"file_id":        f.FileID,
			"name":           f.Name,
			"type":           f.Type,
			"size":           f.Size,
			"parent_file_id": f.ParentFileID,
			"mime_type":      f.MimeType,
		})
	}
	return ok(c, "", R{"items": list, "next_marker": result.NextMarker})
}

func FilePreview(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		DriveID string `json:"drive_id"`
		FileID  string `json:"file_id"`
	}
	if err := c.Bind(&body); err != nil {
		return fail(c, 400, "参数错误")
	}
	if body.DriveID == "" || body.FileID == "" {
		return fail(c, 400, "缺少必要参数")
	}
	_, client, err := getDriveClient(c, body.DriveID, u.ID)
	if err != nil {
		return fail(c, 500, err.Error())
	}
	info, err := client.Preview(body.FileID)
	if err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "", info)
}

func DriveFileRename(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		DriveID string `json:"drive_id"`
		FileID  string `json:"file_id"`
		Name    string `json:"name"`
	}
	if err := c.Bind(&body); err != nil {
		return fail(c, 400, "参数错误")
	}
	if body.DriveID == "" || body.FileID == "" || body.Name == "" {
		return fail(c, 400, "缺少必要参数")
	}
	_, client, err := getDriveClient(c, body.DriveID, u.ID)
	if err != nil {
		return fail(c, 500, err.Error())
	}
	f, err := client.RenameFile(body.FileID, body.Name)
	if err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "重命名成功", R{
		"file_id":        f.FileID,
		"name":           f.Name,
		"type":           f.Type,
		"size":           f.Size,
		"parent_file_id": f.ParentFileID,
	})
}

func DriveRenameFiles(c Context) error {
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		DriveID string `json:"drive_id"`
		Files   []struct {
			FileID string `json:"file_id"`
			Name   string `json:"name"`
		} `json:"files"`
	}
	if err := c.Bind(&body); err != nil {
		return fail(c, 400, "参数错误")
	}
	if body.DriveID == "" || len(body.Files) == 0 {
		return fail(c, 400, "缺少必要参数")
	}
	_, client, err := getDriveClient(c, body.DriveID, u.ID)
	if err != nil {
		return fail(c, 500, err.Error())
	}
	for _, item := range body.Files {
		if item.FileID == "" || item.Name == "" {
			continue
		}
		client.RenameFile(item.FileID, item.Name)
	}
	return ok(c, "重命名成功", nil)
}

func LocalFileList(c Context) error {
	_, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		FileId     string `json:"file_id"`
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
	}
	if err := c.Bind(&body); err != nil {
		return fail(c, 400, "参数错误")
	}
	if body.FileId == "" || body.FileId == "root" {
		home_dir, _ := os.UserHomeDir()
		body.FileId = home_dir
	}

	client := localdrive.NewLocalDriveClient()
	result, err := client.FetchFiles(body.FileId, drive_client.FetchFilesOptions{
		PageSize: body.PageSize,
		Marker:   body.NextMarker,
	})
	if err != nil {
		return fail(c, 500, err.Error())
	}

	list := make([]R, 0, len(result.Items))
	for _, f := range result.Items {
		list = append(list, R{
			"file_id":        f.FileID,
			"name":           f.Name,
			"type":           f.Type,
			"size":           f.Size,
			"parent_file_id": f.ParentFileID,
			"mime_type":      f.MimeType,
		})
	}
	return ok(c, "", R{"items": list, "next_marker": result.NextMarker})
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
