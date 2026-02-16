package model


type Notification struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	UniqueID string  `json:"unique_id"`
	Content  *string `gorm:"type:text" json:"content"`
	Type     int     `gorm:"default:1" json:"type"`
	Status   int     `gorm:"default:1" json:"status"`
	IsDelete int     `gorm:"default:0" json:"is_delete"`

	UserID string `gorm:"index;size:36" json:"user_id"`
	User   *User  `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (Notification) TableName() string {
	return "Notification"
}
