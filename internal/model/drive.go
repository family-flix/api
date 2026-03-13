package model

type Drive struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	UniqueID       string     `gorm:"uniqueIndex:idx_user_unique" json:"unique_id"`
	Type           *DriveType `gorm:"default:0" json:"type"`
	Name           string     `json:"name"`
	Remark         *string    `json:"remark"`
	Avatar         string     `json:"avatar"`
	Profile        string     `gorm:"type:text" json:"profile"`
	TotalSize      *float64   `gorm:"default:0" json:"total_size"`
	UsedSize       *float64   `gorm:"default:0" json:"used_size"`
	Invalid        *int       `gorm:"default:0" json:"invalid"`
	Hidden         *int       `gorm:"default:0" json:"hidden"`
	Sort           *int       `gorm:"default:0" json:"sort"`
	LatestAnalysis *LocalTime `json:"latest_analysis"`
	RootFolderName *string    `json:"root_folder_name"`
	RootFolderID   *string    `json:"root_folder_id"`

	DriveTokenID string `gorm:"size:36" json:"drive_token_id"`
	UserID       string `gorm:"index;size:36" json:"user_id"`
}

func (Drive) TableName() string {
	return "Drive"
}

type DriveToken struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	Data      string  `gorm:"type:text" json:"data"`
	ExpiredAt float64 `json:"expired_at"`
}

func (DriveToken) TableName() string {
	return "DriveToken"
}

type DriveCheckIn struct {
	ID        string     `gorm:"primaryKey;size:36" json:"id"`
	Created   LocalTime  `gorm:"autoCreateTime" json:"created"`
	Updated   LocalTime  `gorm:"autoUpdateTime" json:"updated"`
	CheckedAt *LocalTime `json:"checked_at"`

	DriveID string `gorm:"index;size:36" json:"drive_id"`
}

func (DriveCheckIn) TableName() string {
	return "DriveCheckIn"
}

type DriveStatistics struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`
	Date    string    `gorm:"size:50" json:"date"`
	Data    string    `gorm:"type:text;default:'{}'" json:"data"`

	UserID string `gorm:"index;size:36" json:"user_id"`
}

func (DriveStatistics) TableName() string {
	return "DriveStatistics"
}

type File struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	FileID       string  `json:"file_id"`
	Name         string  `json:"name"`
	ParentFileID string  `json:"parent_file_id"`
	ParentPaths  string  `json:"parent_paths"`
	Type         int     `gorm:"default:3" json:"type"`
	Size         float64 `gorm:"default:0" json:"size"`
	MD5          *string `json:"md5"`

	DriveID string `gorm:"index;size:36" json:"drive_id"`
	Drive   *Drive `gorm:"foreignKey:DriveID" json:"drive,omitempty"`
	UserID  string `gorm:"index;size:36" json:"user_id"`
}

func (File) TableName() string {
	return "File"
}

type TmpFile struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	Type        float64 `gorm:"default:2" json:"type"`
	Name        string  `json:"name"`
	FileID      *string `json:"file_id"`
	ParentPaths string  `json:"parent_paths"`

	DriveID string `gorm:"index;size:36" json:"drive_id"`
	UserID  string `gorm:"index;size:36" json:"user_id"`
}

func (TmpFile) TableName() string {
	return "TmpFile"
}
