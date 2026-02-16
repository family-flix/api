package model

import "time"

type Drive struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created time.Time `gorm:"autoCreateTime" json:"created"`
	Updated time.Time `gorm:"autoUpdateTime" json:"updated"`

	UniqueID       string     `gorm:"uniqueIndex:idx_user_unique" json:"unique_id"`
	Type           *int       `gorm:"default:0" json:"type"`
	Name           string     `json:"name"`
	Remark         *string    `json:"remark"`
	Avatar         string     `json:"avatar"`
	Profile        string     `gorm:"type:text" json:"profile"`
	TotalSize      *float64   `gorm:"default:0" json:"total_size"`
	UsedSize       *float64   `gorm:"default:0" json:"used_size"`
	Invalid        *int       `gorm:"default:0" json:"invalid"`
	Hidden         *int       `gorm:"default:0" json:"hidden"`
	Sort           *int       `gorm:"default:0" json:"sort"`
	LatestAnalysis *time.Time `json:"latest_analysis"`
	RootFolderName *string    `json:"root_folder_name"`
	RootFolderID   *string    `json:"root_folder_id"`

	DriveTokenID string      `gorm:"size:36" json:"drive_token_id"`
	DriveToken   *DriveToken `gorm:"foreignKey:DriveTokenID" json:"drive_token,omitempty"`
	UserID       string      `gorm:"index;size:36" json:"user_id"`
	User         *User       `gorm:"foreignKey:UserID" json:"user,omitempty"`

	ParsedTVs             []ParsedTV             `gorm:"foreignKey:DriveID" json:"parsed_tvs,omitempty"`
	ParsedSeasons         []ParsedSeason         `gorm:"foreignKey:DriveID" json:"parsed_seasons,omitempty"`
	ParsedEpisodes        []ParsedEpisode        `gorm:"foreignKey:DriveID" json:"parsed_episodes,omitempty"`
	DriveCheckIns         []DriveCheckIn         `gorm:"foreignKey:DriveID" json:"drive_check_ins,omitempty"`
	Files                 []File                 `gorm:"foreignKey:DriveID" json:"files,omitempty"`
	TmpFiles              []TmpFile              `gorm:"foreignKey:DriveID" json:"tmp_files,omitempty"`
	ParsedMovies          []ParsedMovie          `gorm:"foreignKey:DriveID" json:"parsed_movies,omitempty"`
	SharedFilesInProgress []SharedFileInProgress `gorm:"foreignKey:DriveID" json:"shared_files_in_progress,omitempty"`
	Subtitles             []Subtitle             `gorm:"foreignKey:DriveID" json:"subtitles,omitempty"`
	SyncTasks             []BindForParsedTV      `gorm:"foreignKey:DriveID" json:"sync_tasks,omitempty"`
	ResourceSyncTasks     []ResourceSyncTask     `gorm:"foreignKey:DriveID" json:"resource_sync_tasks,omitempty"`
	ParsedMedias          []ParsedMedia          `gorm:"foreignKey:DriveID" json:"parsed_medias,omitempty"`
	ParsedSources         []ParsedMediaSource    `gorm:"foreignKey:DriveID" json:"parsed_sources,omitempty"`
}

func (Drive) TableName() string {
	return "Drive"
}

type DriveToken struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created time.Time `gorm:"autoCreateTime" json:"created"`
	Updated time.Time `gorm:"autoUpdateTime" json:"updated"`

	Data      string  `gorm:"type:text" json:"data"`
	ExpiredAt float64 `json:"expired_at"`

	Drives []Drive `gorm:"foreignKey:DriveTokenID" json:"drives,omitempty"`
}

func (DriveToken) TableName() string {
	return "DriveToken"
}

type DriveCheckIn struct {
	ID        string     `gorm:"primaryKey;size:36" json:"id"`
	Created   time.Time  `gorm:"autoCreateTime" json:"created"`
	Updated   time.Time  `gorm:"autoUpdateTime" json:"updated"`
	CheckedAt *time.Time `json:"checked_at"`

	DriveID string `gorm:"index;size:36" json:"drive_id"`
	Drive   *Drive `gorm:"foreignKey:DriveID" json:"drive,omitempty"`
}

func (DriveCheckIn) TableName() string {
	return "DriveCheckIn"
}

type DriveStatistics struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created time.Time `gorm:"autoCreateTime" json:"created"`
	Updated time.Time `gorm:"autoUpdateTime" json:"updated"`
	Date    string    `gorm:"size:50" json:"date"`
	Data    string    `gorm:"type:text;default:'{}'" json:"data"`

	UserID string `gorm:"index;size:36" json:"user_id"`
	User   *User  `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (DriveStatistics) TableName() string {
	return "DriveStatistics"
}

type File struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created time.Time `gorm:"autoCreateTime" json:"created"`
	Updated time.Time `gorm:"autoUpdateTime" json:"updated"`

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
	User    *User  `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (File) TableName() string {
	return "File"
}

type TmpFile struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created time.Time `gorm:"autoCreateTime" json:"created"`
	Updated time.Time `gorm:"autoUpdateTime" json:"updated"`

	Type        float64 `gorm:"default:2" json:"type"`
	Name        string  `json:"name"`
	FileID      *string `json:"file_id"`
	ParentPaths string  `json:"parent_paths"`

	DriveID string `gorm:"index;size:36" json:"drive_id"`
	Drive   *Drive `gorm:"foreignKey:DriveID" json:"drive,omitempty"`
	UserID  string `gorm:"index;size:36" json:"user_id"`
	User    *User  `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (TmpFile) TableName() string {
	return "TmpFile"
}
