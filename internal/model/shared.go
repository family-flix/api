package model


type SharedMedia struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	URL string `json:"url"`

	SeasonID       *string `gorm:"size:36" json:"season_id"`
	Season         *Season `gorm:"foreignKey:SeasonID" json:"season,omitempty"`
	MovieID        *string `gorm:"size:36" json:"movie_id"`
	Movie          *Movie  `gorm:"foreignKey:MovieID" json:"movie,omitempty"`
	MemberFromID   string  `gorm:"size:36" json:"member_from_id"`
	MemberFrom     *Member `gorm:"foreignKey:MemberFromID" json:"member_from,omitempty"`
	MemberTargetID string  `gorm:"size:36" json:"member_target_id"`
	MemberTarget   *Member `gorm:"foreignKey:MemberTargetID" json:"member_target,omitempty"`
}

func (SharedMedia) TableName() string {
	return "SharedMedia"
}

type SharedMediaV2 struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	URL string `json:"url"`

	MediaID        string  `gorm:"index;size:36" json:"media_id"`
	Media          *Media  `gorm:"foreignKey:MediaID" json:"media,omitempty"`
	MemberFromID   string  `gorm:"size:36" json:"member_from_id"`
	MemberFrom     *Member `gorm:"foreignKey:MemberFromID" json:"member_from,omitempty"`
	MemberTargetID string  `gorm:"size:36" json:"member_target_id"`
	MemberTarget   *Member `gorm:"foreignKey:MemberTargetID" json:"member_target,omitempty"`
}

func (SharedMediaV2) TableName() string {
	return "SharedMediaV2"
}

type SharedFile struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	Title *string `json:"title"`
	URL   string  `json:"url"`
	PWD   *string `json:"pwd"`

	UserID string `gorm:"index;size:36" json:"user_id"`
	User   *User  `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (SharedFile) TableName() string {
	return "SharedFile"
}

type SharedFileInProgress struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	URL    string  `json:"url"`
	PWD    *string `json:"pwd"`
	FileID string  `json:"file_id"`
	Name   string  `json:"name"`

	DriveID string `gorm:"index;size:36" json:"drive_id"`
	Drive   *Drive `gorm:"foreignKey:DriveID" json:"drive,omitempty"`
	UserID  string `gorm:"index;size:36" json:"user_id"`
	User    *User  `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (SharedFileInProgress) TableName() string {
	return "SharedFileInProgress"
}
