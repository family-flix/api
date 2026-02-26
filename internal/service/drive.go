package service

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/family-flix/api/internal/domain/member"
	"github.com/family-flix/api/internal/model"
	"github.com/family-flix/api/internal/repository"
	"github.com/family-flix/api/pkg/drive_client"
	"github.com/family-flix/api/pkg/drive_client/localdrive"
)

type DriveService interface {
	ListDrive(ctx context.Context, userID string, filter repository.DriveFilter) ([]model.Drive, int64, error)
	CreateDrive(ctx context.Context, userID string, req DriveCreateRequest) error
	UpdateDrive(ctx context.Context, userID string, req DriveUpdateRequest) error
	DeleteDrive(ctx context.Context, id string, userID string) error
	GetDrive(ctx context.Context, id string, userID string) (*model.Drive, error)
	GetDriveToken(ctx context.Context, id string) (*model.DriveToken, error)
	SetDriveToken(ctx context.Context, id string, userID string, refreshToken string) error
	ExportDrive(ctx context.Context, id string, userID string) (map[string]interface{}, error)

	// File operations
	DriveFileAdd(ctx context.Context, userID string, req DriveFileAddRequest) (*drive_client.DriveFile, error)
	DriveFileList(ctx context.Context, userID string, req DriveFileListRequest) (*drive_client.FetchFilesResult, error)
	GetDriveFile(ctx context.Context, userID string, driveID string, fileID string) (*drive_client.DriveFile, error)
	DeleteDriveFile(ctx context.Context, userID string, driveID string, fileID string) error
	GetDriveFileDownloadURL(ctx context.Context, userID string, driveID string, fileID string) (string, error)
	RenameDriveFile(ctx context.Context, userID string, driveID string, fileID string, newName string) (*drive_client.DriveFile, error)
}

type DriveCreateRequest struct {
	Type    *int
	Payload json.RawMessage
}

type DriveUpdateRequest struct {
	ID             string
	Remark         *string
	Hidden         *int
	RootFolderID   *string
	RootFolderName *string
}

type DriveFileAddRequest struct {
	DriveID      string
	Name         string
	ParentFileID string
}

type DriveFileListRequest struct {
	DriveID    string
	FileID     string
	NextMarker string
	PageSize   int
}

type driveService struct {
	repo repository.DriveRepository
}

func NewDriveService(repo repository.DriveRepository) DriveService {
	return &driveService{repo: repo}
}

func (s *driveService) ListDrive(ctx context.Context, userID string, filter repository.DriveFilter) ([]model.Drive, int64, error) {
	return s.repo.List(ctx, userID, filter)
}

func (s *driveService) CreateDrive(ctx context.Context, userID string, req DriveCreateRequest) error {
	if req.Type == nil {
		return fmt.Errorf("请指定云盘类型")
	}
	if len(req.Payload) == 0 {
		return fmt.Errorf("请传入云盘信息")
	}

	var payloadMap map[string]interface{}
	if err := json.Unmarshal(req.Payload, &payloadMap); err != nil {
		return fmt.Errorf("payload 格式错误")
	}

	uniqueID := ""
	for _, key := range []string{"drive_id", "dir", "url"} {
		if v, ok := payloadMap[key]; ok {
			uniqueID = fmt.Sprintf("%v", v)
			break
		}
	}
	if uniqueID == "" {
		uniqueID = member.Rid()
	}

	// Check existing
	if _, err := s.repo.GetByUniqueID(ctx, uniqueID, userID); err == nil {
		return fmt.Errorf("该云盘已存在")
	}

	// Create DriveToken
	tokenID := member.Rid()

	// Construct token data
	tokenData := make(map[string]interface{})
	if v, ok := payloadMap["refresh_token"]; ok {
		tokenData["refresh_token"] = v
	}
	if v, ok := payloadMap["access_token"]; ok {
		tokenData["access_token"] = v
	}
	tokenDataBytes, _ := json.Marshal(tokenData)

	driveToken := model.DriveToken{
		ID:        tokenID,
		Data:      string(tokenDataBytes),
		ExpiredAt: 0,
	}

	if err := s.repo.CreateToken(ctx, &driveToken); err != nil {
		return err
	}

	// Create Drive
	drive := model.Drive{
		ID:           member.Rid(),
		UserID:       userID,
		Type:         req.Type,
		Name:         uniqueID, // Default name
		DriveTokenID: tokenID,
		Profile:      string(req.Payload),
		UniqueID:     uniqueID,
	}
	if v, ok := payloadMap["name"]; ok {
		drive.Name = fmt.Sprintf("%v", v)
	}

	return s.repo.Create(ctx, &drive)
}

func (s *driveService) UpdateDrive(ctx context.Context, userID string, req DriveUpdateRequest) error {
	d, err := s.repo.Get(ctx, req.ID, userID)
	if err != nil {
		return err
	}

	updates := make(map[string]interface{})
	if req.Remark != nil {
		updates["remark"] = *req.Remark
	}
	if req.Hidden != nil {
		updates["hidden"] = *req.Hidden
	}
	if req.RootFolderID != nil {
		updates["root_folder_id"] = *req.RootFolderID
	}
	if req.RootFolderName != nil {
		updates["root_folder_name"] = *req.RootFolderName
	}

	return s.repo.Update(ctx, d, updates)
}

func (s *driveService) DeleteDrive(ctx context.Context, id string, userID string) error {
	return s.repo.Delete(ctx, id, userID)
}

func (s *driveService) GetDrive(ctx context.Context, id string, userID string) (*model.Drive, error) {
	return s.repo.Get(ctx, id, userID)
}

func (s *driveService) GetDriveToken(ctx context.Context, id string) (*model.DriveToken, error) {
	return s.repo.GetToken(ctx, id)
}

func (s *driveService) SetDriveToken(ctx context.Context, id string, userID string, refreshToken string) error {
	d, err := s.repo.Get(ctx, id, userID)
	if err != nil {
		return err
	}

	t, err := s.repo.GetToken(ctx, d.DriveTokenID)
	if err != nil {
		return err
	}

	var data map[string]interface{}
	if err := json.Unmarshal([]byte(t.Data), &data); err != nil {
		data = make(map[string]interface{})
	}
	data["refresh_token"] = refreshToken
	newData, _ := json.Marshal(data)

	return s.repo.UpdateToken(ctx, t, map[string]interface{}{
		"data": string(newData),
	})
}

func (s *driveService) ExportDrive(ctx context.Context, id string, userID string) (map[string]interface{}, error) {
	d, err := s.repo.Get(ctx, id, userID)
	if err != nil {
		return nil, err
	}

	// Convert data json string to map
	var data map[string]interface{}
	if err := json.Unmarshal([]byte(d.Profile), &data); err != nil {
		return nil, err
	}

	return data, nil
}

// Internal helper to get drive client
func (s *driveService) getDriveClient(ctx context.Context, driveID string, userID string) (*model.Drive, drive_client.DriveClient, error) {
	d, err := s.repo.Get(ctx, driveID, userID)
	if err != nil {
		return nil, nil, err
	}

	// Check token existence
	_, err = s.repo.GetToken(ctx, d.DriveTokenID)
	if err != nil {
		return nil, nil, err
	}

	// Parse config from data
	var config map[string]interface{}
	if err := json.Unmarshal([]byte(d.Profile), &config); err != nil {
		return nil, nil, fmt.Errorf("invalid drive config")
	}

	// Unused for now, but keeping parsing logic for consistency
	// tokenData := make(map[string]interface{})
	// json.Unmarshal([]byte(t.Data), &tokenData)

	// Create client based on type
	// This part needs to be expanded based on supported drive types
	// Currently only local drive is supported as an example
	var client drive_client.DriveClient

	if d.Type == nil {
		return nil, nil, fmt.Errorf("drive type is nil")
	}

	switch *d.Type {
	case 1: // Local
		if _, ok := config["dir"].(string); ok {
			client = localdrive.NewLocalDriveClient()
		} else {
			return nil, nil, fmt.Errorf("invalid local drive config")
		}
	// Add other types here (Aliyun, etc.)
	default:
		// Fallback or error
		// Assuming implementation exists for other types or we need to implement it
		// For now, return error if not local
		return nil, nil, fmt.Errorf("unsupported drive type: %d", *d.Type)
	}

	// If token management is needed, wrap client or handle here
	// For now simple implementation

	return d, client, nil
}

func (s *driveService) DriveFileAdd(ctx context.Context, userID string, req DriveFileAddRequest) (*drive_client.DriveFile, error) {
	if req.DriveID == "" || req.Name == "" {
		return nil, fmt.Errorf("缺少必要参数")
	}

	d, client, err := s.getDriveClient(ctx, req.DriveID, userID)
	if err != nil {
		return nil, err
	}

	parentID := req.ParentFileID
	if parentID == "" || parentID == "root" {
		if d.RootFolderID != nil {
			parentID = *d.RootFolderID
		} else {
			return nil, fmt.Errorf("云盘未设置根目录")
		}
	}

	return client.CreateFolder(req.Name, parentID)
}

func (s *driveService) DriveFileList(ctx context.Context, userID string, req DriveFileListRequest) (*drive_client.FetchFilesResult, error) {
	if req.DriveID == "" {
		return nil, fmt.Errorf("请指定云盘")
	}

	d, client, err := s.getDriveClient(ctx, req.DriveID, userID)
	if err != nil {
		return nil, err
	}

	fileID := req.FileID
	if fileID == "" || fileID == "root" {
		if d.RootFolderID != nil {
			fileID = *d.RootFolderID
		} else {
			return nil, fmt.Errorf("云盘未设置根目录")
		}
	}

	return client.FetchFiles(fileID, drive_client.FetchFilesOptions{
		PageSize: req.PageSize,
		Marker:   req.NextMarker,
	})
}

func (s *driveService) GetDriveFile(ctx context.Context, userID string, driveID string, fileID string) (*drive_client.DriveFile, error) {
	if driveID == "" || fileID == "" {
		return nil, fmt.Errorf("缺少必要参数")
	}
	_, client, err := s.getDriveClient(ctx, driveID, userID)
	if err != nil {
		return nil, err
	}
	return client.FetchFile(fileID)
}

func (s *driveService) DeleteDriveFile(ctx context.Context, userID string, driveID string, fileID string) error {
	if driveID == "" || fileID == "" {
		return fmt.Errorf("缺少必要参数")
	}
	_, client, err := s.getDriveClient(ctx, driveID, userID)
	if err != nil {
		return err
	}
	return client.DeleteFile(fileID)
}

func (s *driveService) GetDriveFileDownloadURL(ctx context.Context, userID string, driveID string, fileID string) (string, error) {
	if driveID == "" || fileID == "" {
		return "", fmt.Errorf("缺少必要参数")
	}
	_, client, err := s.getDriveClient(ctx, driveID, userID)
	if err != nil {
		return "", err
	}
	return client.Download(fileID)
}

func (s *driveService) RenameDriveFile(ctx context.Context, userID string, driveID string, fileID string, newName string) (*drive_client.DriveFile, error) {
	if driveID == "" || fileID == "" || newName == "" {
		return nil, fmt.Errorf("缺少必要参数")
	}
	_, client, err := s.getDriveClient(ctx, driveID, userID)
	if err != nil {
		return nil, err
	}
	return client.RenameFile(fileID, newName)
}
