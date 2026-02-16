package model


type Collection struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	Title  string  `json:"title"`
	Desc   *string `json:"desc"`
	Type   int     `gorm:"default:0" json:"type"`
	Status int     `gorm:"default:0" json:"status"`
	Extra  *string `gorm:"type:text" json:"extra"`
	Rules  *string `gorm:"type:text" json:"rules"`
	Sort   int     `gorm:"default:0" json:"sort"`
	Hidden int     `gorm:"default:0" json:"hidden"`
	Styles *string `gorm:"type:text" json:"styles"`
	Medias *string `gorm:"type:text" json:"medias"`

	UserID string `gorm:"index;size:36" json:"user_id"`
}

func (Collection) TableName() string {
	return "Collection"
}

type CollectionV2 struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created LocalTime `gorm:"autoCreateTime" json:"created"`
	Updated LocalTime `gorm:"autoUpdateTime" json:"updated"`

	Title  string  `json:"title"`
	Desc   *string `json:"desc"`
	Type   int     `gorm:"default:1" json:"type"`
	Status int     `gorm:"default:1" json:"status"`
	Extra  *string `gorm:"type:text" json:"extra"`
	Rules  *string `gorm:"type:text" json:"rules"`
	Sort   int     `gorm:"default:0" json:"sort"`
	Hidden int     `gorm:"default:0" json:"hidden"`
	Styles *string `gorm:"type:text" json:"styles"`

	UserID string `gorm:"index;size:36" json:"user_id"`

	Medias []Media `gorm:"many2many:CollectionV2Media" json:"medias,omitempty"`
}

func (CollectionV2) TableName() string {
	return "CollectionV2"
}
