package drive

import (
	"encoding/json"

	"github.com/family-flix/api/pkg/drive_client"
)

// DriveTypes enum
type DriveTypes string

const (
	DriveTypeAliyunBackup   DriveTypes = "aliyun_backup_drive"
	DriveTypeAliyunResource DriveTypes = "aliyun_resource_drive"
	DriveTypeLocal          DriveTypes = "local"
	// Add others
)

// DriveProfile struct
type DriveProfile struct {
	Type           DriveTypes `json:"type"`
	Name           string     `json:"name"`
	DriveID        string     `json:"drive_id"`
	TokenID        string     `json:"token_id"`
	RootFolderID   string     `json:"root_folder_id"`
	RootFolderName string     `json:"root_folder_name"`
	UsedSize       int64      `json:"used_size"`
	TotalSize      int64      `json:"total_size"`
}

// Drive struct
type Drive struct {
	ID      string
	Type    DriveTypes
	Profile DriveProfile
	Client  drive_client.DriveClient
	UserID  string
}

// NewDrive creates a new Drive instance
func NewDrive(id string, driveType DriveTypes, profile DriveProfile, client drive_client.DriveClient, userID string) *Drive {
	return &Drive{
		ID:      id,
		Type:    driveType,
		Profile: profile,
		Client:  client,
		UserID:  userID,
	}
}

// GetID returns drive ID
func (d *Drive) GetID() string {
	return d.ID
}

// GetName returns drive name
func (d *Drive) GetName() string {
	return d.Profile.Name
}

// GetProfile returns drive profile
func (d *Drive) GetProfile() DriveProfile {
	return d.Profile
}

// HasRootFolder checks if root folder is set
func (d *Drive) HasRootFolder() bool {
	return d.Profile.RootFolderID != ""
}

// GetClient returns the underlying client
func (d *Drive) GetClient() drive_client.DriveClient {
	return d.Client
}

// Factory for creating Drive from DB record
// Since we don't have DB and Client implementations yet, we define a structure that can be extended.

type DriveFactory struct {
	ClientFactory func(driveType DriveTypes, uniqueID string) (drive_client.DriveClient, error)
}

func (f *DriveFactory) Get(record map[string]interface{}) (*Drive, error) {
	// Parse record and create Drive
	// This is a placeholder for actual implementation
	return nil, nil
}

// ParseProfile parses profile JSON string
func ParseProfile(profileStr string) (*DriveProfile, error) {
	var p DriveProfile
	err := json.Unmarshal([]byte(profileStr), &p)
	if err != nil {
		return nil, err
	}
	return &p, nil
}
