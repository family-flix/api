package drive

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"

	"github.com/family-flix/api/internal/model"
	"github.com/family-flix/api/pkg/drive_client"
	"github.com/family-flix/api/pkg/folder"
	"github.com/family-flix/api/pkg/types"
)

// DriveTypes 云盘类型
type DriveTypes int

const (
	DriveTypeAliyunBackup         DriveTypes = 0  // 阿里云盘/备份盘
	DriveTypeAliyunResource       DriveTypes = 1  // 阿里云盘/资源盘
	DriveTypeCloud189             DriveTypes = 2  // 天翼云
	DriveTypeQuark                DriveTypes = 3  // 夸克
	DriveTypeXunlei               DriveTypes = 4  // 迅雷
	DriveTypeLocal                DriveTypes = 5  // 本地文件
	DriveTypeAlipanOpen           DriveTypes = 6  // 阿里云盘/开放接口
	DriveTypeAlipanResourceOpen   DriveTypes = 7  // 阿里云盘资源盘/开放接口
	DriveTypeBojuCC               DriveTypes = 8  // boju.cc
	DriveType115                  DriveTypes = 9  // 115
	DriveTypeAlist                DriveTypes = 10 // alist
)

// DriveProfile 云盘配置信息
type DriveProfile struct {
	DriveID        string `json:"drive_id"`
	UserName       string `json:"user_name,omitempty"`
	NickName       string `json:"nick_name,omitempty"`
	Avatar         string `json:"avatar,omitempty"`
	DeviceID       string `json:"device_id,omitempty"`
	UserID         string `json:"user_id,omitempty"`
	AppID          string `json:"app_id,omitempty"`
	ResourceDriveID string `json:"resource_drive_id,omitempty"`
}

// ClientFactory 根据云盘类型和记录创建 DriveClient
type ClientFactory func(driveType DriveTypes, record *model.Drive) (drive_client.DriveClient, error)

// Drive 云盘领域对象
type Drive struct {
	ID             string
	Type           DriveTypes
	Name           string
	UserID         string
	RootFolderID   string
	RootFolderName string
	TotalSize      float64
	UsedSize       float64
	TokenID        string
	Profile        DriveProfile
	Client         drive_client.DriveClient
	DB             *gorm.DB
}

// GetOptions 获取云盘的参数
type GetOptions struct {
	ID            string
	UniqueID      string
	UserID        string
	DB            *gorm.DB
	ClientFactory ClientFactory
}

// Get 根据 id 或 unique_id 获取云盘
func Get(opts GetOptions) (*Drive, error) {
	if opts.ID == "" && opts.UniqueID == "" {
		return nil, fmt.Errorf("缺少 id 参数")
	}

	query := opts.DB.Model(&model.Drive{})
	if opts.UserID != "" {
		query = query.Where("user_id = ?", opts.UserID)
	}
	if opts.ID != "" {
		query = query.Where("id = ?", opts.ID)
	}
	if opts.UniqueID != "" {
		query = query.Where("unique_id = ?", opts.UniqueID)
	}

	var record model.Drive
	if err := query.First(&record).Error; err != nil {
		return nil, fmt.Errorf("没有匹配的云盘记录")
	}

	var profile DriveProfile
	if record.Profile != "" {
		if err := json.Unmarshal([]byte(record.Profile), &profile); err != nil {
			return nil, err
		}
	}

	driveType := DriveTypes(0)
	if record.Type != nil {
		driveType = DriveTypes(*record.Type)
	}

	client, err := opts.ClientFactory(driveType, &record)
	if err != nil {
		return nil, err
	}

	var rootFolderID, rootFolderName string
	if record.RootFolderID != nil {
		rootFolderID = *record.RootFolderID
	}
	if record.RootFolderName != nil {
		rootFolderName = *record.RootFolderName
	}
	var totalSize, usedSize float64
	if record.TotalSize != nil {
		totalSize = *record.TotalSize
	}
	if record.UsedSize != nil {
		usedSize = *record.UsedSize
	}

	return &Drive{
		ID:             record.ID,
		Type:           driveType,
		Name:           record.Name,
		UserID:         opts.UserID,
		RootFolderID:   rootFolderID,
		RootFolderName: rootFolderName,
		TotalSize:      totalSize,
		UsedSize:       usedSize,
		TokenID:        record.DriveTokenID,
		Profile:        profile,
		Client:         client,
		DB:             opts.DB,
	}, nil
}

// Existing 检查云盘是否已存在
func Existing(driveID string, userID string, db *gorm.DB) (*model.Drive, error) {
	var record model.Drive
	err := db.Where("unique_id = ? AND user_id = ?", driveID, userID).First(&record).Error
	if err != nil {
		return nil, fmt.Errorf("不存在")
	}
	return &record, nil
}

// RefreshProfile 获取网盘详情并更新到数据库
func (d *Drive) RefreshProfile() error {
	info, err := d.Client.RefreshProfile()
	if err != nil {
		return err
	}

	now := time.Now()
	updates := map[string]interface{}{
		"updated":    now,
		"total_size": info.TotalSize,
		"used_size":  info.UsedSize,
	}

	return d.DB.Model(&model.Drive{}).Where("id = ?", d.ID).Updates(updates).Error
}

// Refresh 刷新网盘 token
func (d *Drive) Refresh() error {
	info, err := d.Client.RefreshProfile()
	if err != nil {
		return err
	}

	return d.DB.Model(&model.Drive{}).Where("id = ?", d.ID).Updates(map[string]interface{}{
		"updated":    time.Now(),
		"total_size": info.TotalSize,
		"used_size":  info.UsedSize,
	}).Error
}

// HasRootFolder 是否设置了索引根目录
func (d *Drive) HasRootFolder() bool {
	if d.Type == DriveTypeBojuCC {
		d.RootFolderID = "root"
		d.RootFolderName = "root"
		return true
	}
	return d.RootFolderID != "" && d.RootFolderName != ""
}

// SetRootFolder 设置索引根目录
func (d *Drive) SetRootFolder(rootFolderID, rootFolderName string) error {
	if rootFolderID == "" {
		return fmt.Errorf("索引根目录为空")
	}
	if rootFolderName == "" {
		file, err := d.Client.FetchFile(rootFolderID)
		if err != nil {
			return err
		}
		rootFolderName = file.Name
	}

	return d.DB.Model(&model.Drive{}).Where("id = ?", d.ID).Updates(map[string]interface{}{
		"updated":          time.Now(),
		"root_folder_id":   rootFolderID,
		"root_folder_name": rootFolderName,
	}).Error
}

// IsExceedCapacity 容量是否超出
func (d *Drive) IsExceedCapacity() (bool, error) {
	info, err := d.Client.RefreshProfile()
	if err != nil {
		return false, err
	}
	return info.UsedSize >= info.TotalSize, nil
}

// SetName 设置云盘名称
func (d *Drive) SetName(name string, remark string) error {
	if name == "" {
		return fmt.Errorf("name is required")
	}
	updates := map[string]interface{}{
		"updated": time.Now(),
		"name":    name,
	}
	if remark != "" {
		updates["remark"] = remark
	}
	return d.DB.Model(&model.Drive{}).Where("id = ?", d.ID).Updates(updates).Error
}

// deleteFolderRecordAndRelative 删除文件夹记录及关联记录
func (d *Drive) deleteFolderRecordAndRelative(fileID string) error {
	var file model.File
	if err := d.DB.Where("file_id = ? AND user_id = ?", fileID, d.UserID).First(&file).Error; err == nil {
		d.DB.Delete(&file)
	}

	var task model.ResourceSyncTask
	if err := d.DB.Where("file_id_link_resource = ? AND user_id = ?", fileID, d.UserID).First(&task).Error; err == nil {
		d.DB.Delete(&task)
	}
	return nil
}

// deleteFileRecordAndRelative 删除文件记录及关联记录
func (d *Drive) deleteFileRecordAndRelative(fileID string) error {
	var file model.File
	if err := d.DB.Where("file_id = ? AND user_id = ?", fileID, d.UserID).First(&file).Error; err == nil {
		d.DB.Delete(&file)
	}

	var source model.ParsedMediaSource
	if err := d.DB.Where("file_id = ? AND user_id = ?", fileID, d.UserID).First(&source).Error; err == nil {
		d.DB.Delete(&source)
	}
	return nil
}

// DatabaseDriveClient 基于数据库记录的 DriveClient，用于遍历已索引的文件
type DatabaseDriveClient struct {
	DriveID string
	DB      *gorm.DB
}

func (c *DatabaseDriveClient) FetchFile(id string) (*drive_client.DriveFile, error) {
	var file model.File
	if err := c.DB.Where("file_id = ? AND drive_id = ?", id, c.DriveID).First(&file).Error; err != nil {
		return nil, err
	}
	ft := types.FileTypeFile
	if file.Type == 1 {
		ft = types.FileTypeFolder
	}
	return &drive_client.DriveFile{
		FileID:       file.FileID,
		Name:         file.Name,
		Type:         ft,
		ParentFileID: file.ParentFileID,
	}, nil
}

func (c *DatabaseDriveClient) FetchFiles(id string, options drive_client.FetchFilesOptions) (*drive_client.FetchFilesResult, error) {
	var files []model.File
	query := c.DB.Where("parent_file_id = ? AND drive_id = ?", id, c.DriveID)
	if options.Marker != "" {
		query = query.Where("id > ?", options.Marker)
	}
	query = query.Order("id ASC").Limit(50)
	if err := query.Find(&files).Error; err != nil {
		return nil, err
	}

	var items []drive_client.DriveFile
	var nextMarker string
	for _, f := range files {
		ft := types.FileTypeFile
		if f.Type == 1 {
			ft = types.FileTypeFolder
		}
		items = append(items, drive_client.DriveFile{
			FileID:       f.FileID,
			Name:         f.Name,
			Type:         ft,
			ParentFileID: f.ParentFileID,
		})
	}
	if len(files) == 50 {
		nextMarker = files[len(files)-1].ID
	}
	return &drive_client.FetchFilesResult{Items: items, NextMarker: nextMarker}, nil
}

func (c *DatabaseDriveClient) RefreshProfile() (*drive_client.ProfileInfo, error) {
	return &drive_client.ProfileInfo{}, nil
}
func (c *DatabaseDriveClient) RenameFile(fileID string, name string) (*drive_client.DriveFile, error) {
	return nil, fmt.Errorf("not supported")
}
func (c *DatabaseDriveClient) DeleteFile(fileID string) error {
	return fmt.Errorf("not supported")
}
func (c *DatabaseDriveClient) CreateFolder(name string, parentFileID string) (*drive_client.DriveFile, error) {
	return nil, fmt.Errorf("not supported")
}
func (c *DatabaseDriveClient) SearchFiles(name string, fileType string, marker string) (*drive_client.FetchFilesResult, error) {
	return nil, fmt.Errorf("not supported")
}
func (c *DatabaseDriveClient) Download(fileID string) (string, error) {
	return "", fmt.Errorf("not supported")
}
func (c *DatabaseDriveClient) FetchVideoPreviewInfo(fileID string) (*drive_client.VideoPreviewInfo, error) {
	return nil, fmt.Errorf("not supported")
}

// DeleteFolder 删除一个文件夹及其所有子文件记录
func (d *Drive) DeleteFolder(fileID, name, driveID string) error {
	dbClient := &DatabaseDriveClient{DriveID: driveID, DB: d.DB}
	f := folder.NewFolder(fileID, dbClient, nil, nil)
	f.Name = name

	err := f.Walk(func(item interface{}) (bool, error) {
		switch v := item.(type) {
		case *folder.File:
			d.deleteFileRecordAndRelative(v.ID)
		case *folder.Folder:
			d.deleteFolderRecordAndRelative(v.ID)
		}
		return true, nil
	}, true)
	if err != nil {
		return err
	}

	return d.deleteFolderRecordAndRelative(fileID)
}

// FileTypeFile / FileTypeFolder 对应数据库中 file.type 的值
const (
	FileTypeFolder = 1
	FileTypeFile   = 2
)

// DeleteFileOrFolderInDrive 删除云盘内的指定文件
func (d *Drive) DeleteFileOrFolderInDrive(fileID string) error {
	var file model.File
	err := d.DB.Where("file_id = ? AND user_id = ?", fileID, d.UserID).First(&file).Error
	if err != nil {
		// 不存在记录，直接从云盘删除
		if delErr := d.Client.DeleteFile(fileID); delErr != nil {
			return delErr
		}
		return nil
	}

	if file.Type == FileTypeFile {
		d.deleteFileRecordAndRelative(file.FileID)
	}
	if file.Type == FileTypeFolder {
		d.DeleteFolder(file.FileID, file.Name, file.DriveID)
	}

	if delErr := d.Client.DeleteFile(fileID); delErr != nil {
		return delErr
	}
	return nil
}

// RenameFile 重命名文件/文件夹，并重置解析结果
func (d *Drive) RenameFile(fileID, name string) error {
	if _, err := d.Client.RenameFile(fileID, name); err != nil {
		return err
	}

	var file model.File
	if err := d.DB.Where("file_id = ? AND user_id = ?", fileID, d.UserID).First(&file).Error; err != nil {
		// 没有记录，直接返回
		return nil
	}

	d.DB.Model(&model.File{}).Where("id = ?", file.ID).Update("name", name)

	if file.Type == FileTypeFile {
		var source model.ParsedMediaSource
		if err := d.DB.Where("file_id = ? AND user_id = ?", fileID, d.UserID).First(&source).Error; err == nil {
			d.DB.Delete(&source)
		}
		return nil
	}

	if file.Type == FileTypeFolder {
		d.DB.Model(&model.ResourceSyncTask{}).
			Where("file_id_link_resource = ? AND user_id = ?", fileID, d.UserID).
			Update("file_name_link_resource", name)

		newParentPaths := strings.Join([]string{file.ParentPaths, name}, "/")
		d.DB.Model(&model.File{}).
			Where("parent_file_id = ? AND user_id = ?", file.ID, d.UserID).
			Update("parent_paths", newParentPaths)
	}

	return nil
}
