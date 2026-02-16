package drive_client

import "github.com/family-flix/api/pkg/types"

// DriveFile 所有云盘的文件结构，统一转换成该结构
type DriveFile struct {
	FileID       string
	Name         string
	Type         types.FileType
	Size         int64
	ParentFileID string
	MD5          string
	ContentHash  string
	MimeType     string
	Thumbnail    string
	URL          string
}

type SortField struct {
	Field string // "name" | "updated_at" | "size"
	Order string // "asc" | "desc"
}

type FetchFilesOptions struct {
	Page     int
	PageSize int
	Marker   string
	Sort     []SortField
}

type FetchFilesResult struct {
	Items      []DriveFile
	NextMarker string
}

type VideoSource struct {
	Name    string
	Width   int
	Height  int
	Type    string
	URL     string
	Invalid int
}

type VideoSubtitle struct {
	ID       string
	Name     string
	URL      string
	Language string
}

type VideoPreviewInfo struct {
	ThumbURL  string
	Sources   []VideoSource
	Subtitles []VideoSubtitle
}

type ProfileInfo struct {
	TotalSize float64
	UsedSize  float64
}

// DriveClient 云盘客户端接口
type DriveClient interface {
	// FetchFile 获取单个文件/文件夹详情
	FetchFile(id string) (*DriveFile, error)
	// FetchFiles 获取文件夹下的子文件/文件夹
	FetchFiles(id string, options FetchFilesOptions) (*FetchFilesResult, error)
	// RefreshProfile 刷新云盘信息
	RefreshProfile() (*ProfileInfo, error)
	// RenameFile 重命名指定文件
	RenameFile(fileID string, name string) (*DriveFile, error)
	// DeleteFile 删除指定文件
	DeleteFile(fileID string) error
	// CreateFolder 创建文件夹
	CreateFolder(name string, parentFileID string) (*DriveFile, error)
	// SearchFiles 搜索文件
	SearchFiles(name string, fileType string, marker string) (*FetchFilesResult, error)
	// Download 获取文件下载链接
	Download(fileID string) (string, error)
	// FetchVideoPreviewInfo 获取视频文件播放地址等信息
	FetchVideoPreviewInfo(fileID string) (*VideoPreviewInfo, error)
}
