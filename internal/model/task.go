package model


type AsyncTask struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	UniqueID    string  `json:"unique_id"`
	Type        int     `gorm:"default:1" json:"type"`
	Desc        *string `json:"desc"`
	Percent     float64 `gorm:"default:0" json:"percent"`
	PercentText *string `json:"percent_text"`
	Status      int     `gorm:"default:1" json:"status"`
	NeedStop    int     `gorm:"default:0" json:"need_stop"`
	Error       *string `gorm:"type:text" json:"error"`

	OutputID string  `gorm:"uniqueIndex;size:36" json:"output_id"`
	Output   *Output `gorm:"foreignKey:OutputID" json:"output,omitempty"`
	UserID   string  `gorm:"index;size:36" json:"user_id"`
	User     *User   `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (AsyncTask) TableName() string {
	return "AsyncTask"
}

type Output struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	Filepath *string `json:"filepath"`

	UserID string `gorm:"index;size:36" json:"user_id"`
	User   *User  `gorm:"foreignKey:UserID" json:"user,omitempty"`

	AsyncTask *AsyncTask   `gorm:"foreignKey:OutputID" json:"async_task,omitempty"`
	Lines     []OutputLine `gorm:"foreignKey:OutputID" json:"lines,omitempty"`
}

func (Output) TableName() string {
	return "Output"
}

type OutputLine struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	Content string `gorm:"type:text" json:"content"`

	OutputID *string `gorm:"index;size:36" json:"output_id"`
	Output   *Output `gorm:"foreignKey:OutputID" json:"output,omitempty"`
}

func (OutputLine) TableName() string {
	return "OutputLine"
}

type ResourceSyncTask struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	Status               int     `gorm:"default:1" json:"status"`
	URL                  string  `json:"url"`
	PWD                  *string `json:"pwd"`
	FileID               string  `json:"file_id"`
	Name                 string  `json:"name"`
	FileIDLinkResource   string  `json:"file_id_link_resource"`
	FileNameLinkResource string  `json:"file_name_link_resource"`
	Invalid              int     `gorm:"default:0" json:"invalid"`

	MediaID *string `gorm:"size:36" json:"media_id"`
	Media   *Media  `gorm:"foreignKey:MediaID" json:"media,omitempty"`
	DriveID string  `gorm:"index;size:36" json:"drive_id"`
	Drive   *Drive  `gorm:"foreignKey:DriveID" json:"drive,omitempty"`
	UserID  string  `gorm:"index;size:36" json:"user_id"`
	User    *User   `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (ResourceSyncTask) TableName() string {
	return "ResourceSyncTask"
}

type BindForParsedTV struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	URL                  string `json:"url"`
	FileID               string `json:"file_id"`
	Name                 string `json:"name"`
	FileIDLinkResource   string `json:"file_id_link_resource"`
	FileNameLinkResource string `json:"file_name_link_resource"`
	InProduction         *int   `gorm:"default:1" json:"in_production"`
	Invalid              *int   `gorm:"default:0" json:"invalid"`

	SeasonID *string `gorm:"size:36" json:"season_id"`
	Season   *Season `gorm:"foreignKey:SeasonID" json:"season,omitempty"`
	DriveID  string  `gorm:"index;size:36" json:"drive_id"`
	Drive    *Drive  `gorm:"foreignKey:DriveID" json:"drive,omitempty"`
	UserID   string  `gorm:"index;size:36" json:"user_id"`
	User     *User   `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (BindForParsedTV) TableName() string {
	return "BindForParsedTV"
}
