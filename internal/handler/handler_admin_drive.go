package handler

import (
	"encoding/json"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"

	"github.com/family-flix/api/internal/model"
	"github.com/family-flix/api/internal/repository"
	"github.com/family-flix/api/internal/service"
	"github.com/family-flix/api/pkg/drive_client"
	"github.com/family-flix/api/pkg/drive_client/localdrive"
)

type AdminDriveHandler struct {
	BaseHandler
	driveService         service.DriveService
	localFileIgnoreNames []string
}

func NewAdminDriveHandler(driveService service.DriveService, db *gorm.DB, baseDir, cacheDir, ffmpegBin string, localFileIgnoreNames []string) *AdminDriveHandler {
	if len(localFileIgnoreNames) == 0 {
		localFileIgnoreNames = []string{".DS_Store", "@eaDir", "#recycle"}
	}
	return &AdminDriveHandler{
		BaseHandler: BaseHandler{
			db:        db,
			baseDir:   baseDir,
			cacheDir:  cacheDir,
			ffmpegBin: ffmpegBin,
		},
		driveService:         driveService,
		localFileIgnoreNames: localFileIgnoreNames,
	}
}

func (h *AdminDriveHandler) List(ec echo.Context) error {
	c := h.NewContext(ec)
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
		Page       int    `json:"page"`
	}
	c.Bind(&body)
	if body.PageSize <= 0 {
		body.PageSize = 20
	}
	pageSize := body.PageSize
	filterPageSize := pageSize
	if body.Page <= 0 {
		filterPageSize = pageSize + 1
	}

	filter := repository.DriveFilter{
		Type:       body.Type,
		Name:       body.Name,
		Hidden:     body.Hidden,
		NextMarker: body.NextMarker,
		PageSize:   filterPageSize,
		Page:       body.Page,
	}

	drives, total, err := h.driveService.ListDrive(c.DB().Statement.Context, u.ID, filter)
	if err != nil {
		return fail(c, 500, err.Error())
	}

	var nextMarker string
	if body.Page > 0 {
		if int64(body.Page)*int64(pageSize) < total && len(drives) > 0 {
			nextMarker = drives[len(drives)-1].ID
		}
	} else if len(drives) > pageSize {
		nextMarker = drives[pageSize-1].ID
		drives = drives[:pageSize]
	}

	list := make([]R, 0, len(drives))
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
	}
	return ok(c, "", R{"list": list, "total": total, "page_size": body.PageSize, "next_marker": nextMarker})
}

func (h *AdminDriveHandler) Add(ec echo.Context) error {
	c := h.NewContext(ec)
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

	req := service.DriveCreateRequest{
		Type:    body.Type,
		Payload: body.Payload,
	}

	if err := h.driveService.CreateDrive(c.DB().Statement.Context, u.ID, req); err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "新增云盘成功", nil)
}

func (h *AdminDriveHandler) Delete(ec echo.Context) error {
	c := h.NewContext(ec)
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

	if err := h.driveService.DeleteDrive(c.DB().Statement.Context, body.DriveID, u.ID); err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "删除成功", nil)
}

func (h *AdminDriveHandler) Profile(ec echo.Context) error {
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

	d, err := h.driveService.GetDrive(c.DB().Statement.Context, body.ID, u.ID)
	if err != nil {
		return fail(c, 404, err.Error())
	}
	return ok(c, "", R{"id": d.ID, "name": d.Name, "used_size": d.UsedSize, "total_size": d.TotalSize})
}

func (h *AdminDriveHandler) Refresh(ec echo.Context) error {
	c := h.NewContext(ec)
	return fail(c, 501, "未实现")
}

func (h *AdminDriveHandler) SetToken(ec echo.Context) error {
	c := h.NewContext(ec)
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

	if err := h.driveService.SetDriveToken(c.DB().Statement.Context, body.ID, u.ID, body.RefreshToken); err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "更新成功", nil)
}

func (h *AdminDriveHandler) SetRootFolder(ec echo.Context) error {
	c := h.NewContext(ec)
	return fail(c, 501, "未实现")
}

func (h *AdminDriveHandler) Export(ec echo.Context) error {
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

	result, err := h.driveService.ExportDrive(c.DB().Statement.Context, body.ID, u.ID)
	if err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "", result)
}

func (h *AdminDriveHandler) CheckIn(ec echo.Context) error {
	c := h.NewContext(ec)
	return fail(c, 501, "未实现")
}

func (h *AdminDriveHandler) ReceiveRewards(ec echo.Context) error {
	c := h.NewContext(ec)
	return fail(c, 501, "未实现")
}

func (h *AdminDriveHandler) Update(ec echo.Context) error {
	c := h.NewContext(ec)
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

	req := service.DriveUpdateRequest{
		ID:             body.ID,
		Remark:         body.Remark,
		Hidden:         body.Hidden,
		RootFolderID:   body.RootFolderID,
		RootFolderName: body.RootFolderName,
	}
	if body.RootFolderID != nil && *body.RootFolderID == "root" {
		d, err := h.driveService.GetDrive(c.DB().Statement.Context, body.ID, u.ID)
		if err != nil {
			return fail(c, 404, err.Error())
		}
		if d.Type == nil {
			return fail(c, 400, "云盘类型错误")
		}
		if *d.Type != model.DriveTypeLocal {
			return fail(c, 400, "非本地盘不支持 root")
		}
		if d.UniqueID == "" {
			return fail(c, 500, "本地盘 unique_id 为空")
		}
		req.RootFolderID = &d.UniqueID
	}

	if err := h.driveService.UpdateDrive(c.DB().Statement.Context, u.ID, req); err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "更新成功", nil)
}

func (h *AdminDriveHandler) FileAdd(ec echo.Context) error {
	c := h.NewContext(ec)
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

	req := service.DriveFileAddRequest{
		DriveID:      body.DriveID,
		Name:         body.Name,
		ParentFileID: body.ParentFileID,
	}

	f, err := h.driveService.DriveFileAdd(c.DB().Statement.Context, u.ID, req)
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

func (h *AdminDriveHandler) FileList(ec echo.Context) error {
	c := h.NewContext(ec)
	u, err := authAdmin(c)
	if err != nil {
		return fail(c, 900, err.Error())
	}
	var body struct {
		Name       string `json:"name"`
		DriveID    string `json:"drive_id"`
		FileID     string `json:"file_id"`
		NextMarker string `json:"next_marker"`
		PageSize   int    `json:"page_size"`
	}
	if err := c.Bind(&body); err != nil {
		return fail(c, 400, "参数错误")
	}

	req := service.DriveFileListRequest{
		DriveID:     body.DriveID,
		FileID:      body.FileID,
		NextMarker:  body.NextMarker,
		PageSize:    body.PageSize,
		Name:        body.Name,
		IgnoreNames: h.localFileIgnoreNames,
	}

	result, err := h.driveService.DriveFileList(c.DB().Statement.Context, u.ID, req)
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
			"thumbnail":      f.Thumbnail,
			"mime_type":      f.MimeType,
		})
	}
	return ok(c, "", R{"items": list, "next_marker": result.NextMarker})
}

func (h *AdminDriveHandler) FileProfile(ec echo.Context) error {
	c := h.NewContext(ec)
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

	f, err := h.driveService.GetDriveFile(c.DB().Statement.Context, u.ID, body.DriveID, body.FileID)
	if err != nil {
		return fail(c, 500, err.Error())
	}

	return ok(c, "", R{
		"file_id":        f.FileID,
		"name":           f.Name,
		"type":           f.Type,
		"size":           f.Size,
		"parent_file_id": f.ParentFileID,
		"thumbnail":      f.Thumbnail,
		"mime_type":      f.MimeType,
	})
}

func (h *AdminDriveHandler) FileDelete(ec echo.Context) error {
	c := h.NewContext(ec)
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

	if err := h.driveService.DeleteDriveFile(c.DB().Statement.Context, u.ID, body.DriveID, body.FileID); err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "删除成功", nil)
}

func (h *AdminDriveHandler) FileDownload(ec echo.Context) error {
	c := h.NewContext(ec)
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

	url, err := h.driveService.GetDriveFileDownloadURL(c.DB().Statement.Context, u.ID, body.DriveID, body.FileID)
	if err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "", R{"url": url})
}

func (h *AdminDriveHandler) FileRename(ec echo.Context) error {
	c := h.NewContext(ec)
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

	f, err := h.driveService.RenameDriveFile(c.DB().Statement.Context, u.ID, body.DriveID, body.FileID, body.Name)
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

// Placeholders for remaining handlers
func (h *AdminDriveHandler) FileTransfer(ec echo.Context) error {
	c := h.NewContext(ec)
	return fail(c, 501, "未实现")
}
func (h *AdminDriveHandler) FileToResourceDrive(ec echo.Context) error {
	c := h.NewContext(ec)
	return fail(c, 501, "未实现")
}
func (h *AdminDriveHandler) FileSearch(ec echo.Context) error {
	c := h.NewContext(ec)
	return fail(c, 501, "未实现")
}
func (h *AdminDriveHandler) FilePreview(ec echo.Context) error {
	c := h.NewContext(ec)
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

	_, client, err := h.driveService.GetDriveClient(c.DB().Statement.Context, body.DriveID, u.ID)
	if err != nil {
		return fail(c, 500, err.Error())
	}

	info, err := client.Preview(body.FileID)
	if err != nil {
		return fail(c, 500, err.Error())
	}
	return ok(c, "", info)
}
func (h *AdminDriveHandler) RenameFiles(ec echo.Context) error {
	c := h.NewContext(ec)
	return fail(c, 501, "未实现")
}
func (h *AdminDriveHandler) LocalFileList(ec echo.Context) error {
	c := h.NewContext(ec)
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
		body.FileId = "/"
	}

	client := localdrive.NewLocalDriveClient()
	res, err := client.FetchFiles(body.FileId, drive_client.FetchFilesOptions{
		Marker:      body.NextMarker,
		PageSize:    body.PageSize,
		IgnoreNames: h.localFileIgnoreNames,
	})
	if err != nil {
		return fail(c, 500, err.Error())
	}

	list := make([]R, 0, len(res.Items))
	for _, f := range res.Items {
		list = append(list, R{
			"file_id":        f.FileID,
			"name":           f.Name,
			"type":           f.Type,
			"size":           f.Size,
			"parent_file_id": f.ParentFileID,
			"mime_type":      f.MimeType,
		})
	}

	return ok(c, "", R{"items": list, "next_marker": res.NextMarker})
}

// V1 Legacy endpoints
func (h *AdminDriveHandler) V1FindFirst(ec echo.Context) error {
	c := h.NewContext(ec)
	return fail(c, 501, "未实现")
}
func (h *AdminDriveHandler) V1Update(ec echo.Context) error {
	c := h.NewContext(ec)
	return fail(c, 501, "未实现")
}
func (h *AdminDriveHandler) V1TokenUpdate(ec echo.Context) error {
	c := h.NewContext(ec)
	return fail(c, 501, "未实现")
}

// Ali/Alipan endpoints
func (h *AdminDriveHandler) AliyundriveRefresh(ec echo.Context) error {
	c := h.NewContext(ec)
	return fail(c, 501, "未实现")
}
func (h *AdminDriveHandler) AlipanGetQrcode(ec echo.Context) error {
	c := h.NewContext(ec)
	return fail(c, 501, "未实现")
}
func (h *AdminDriveHandler) AlipanGetLoginStatus(ec echo.Context) error {
	c := h.NewContext(ec)
	return fail(c, 501, "未实现")
}
func (h *AdminDriveHandler) AlipanGetAccessToken(ec echo.Context) error {
	c := h.NewContext(ec)
	return fail(c, 501, "未实现")
}
