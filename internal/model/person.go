package model

import "time"

type PersonProfile struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created time.Time `gorm:"autoCreateTime" json:"created"`
	Updated time.Time `gorm:"autoUpdateTime" json:"updated"`

	Name               string  `json:"name"`
	Alias              *string `json:"alias"`
	Biography          *string `gorm:"type:text" json:"biography"`
	ProfilePath        *string `json:"profile_path"`
	Birthday           *string `json:"birthday"`
	PlaceOfBirth       *string `json:"place_of_birth"`
	KnownForDepartment *string `json:"known_for_department"`
	Profile            string  `gorm:"type:text;default:''" json:"profile"`
	TMDBID             *string `gorm:"uniqueIndex" json:"tmdb_id"`
	DoubanID           *string `gorm:"uniqueIndex" json:"douban_id"`
	IMDBID             *string `gorm:"uniqueIndex" json:"imdb_id"`

	PersonsInMedia []PersonInMedia `gorm:"foreignKey:ProfileID" json:"persons_in_media,omitempty"`
}

func (PersonProfile) TableName() string {
	return "PersonProfile"
}

type PersonInMedia struct {
	ID      string    `gorm:"primaryKey;size:36" json:"id"`
	Created time.Time `gorm:"autoCreateTime" json:"created"`
	Updated time.Time `gorm:"autoUpdateTime" json:"updated"`

	Name               string  `json:"name"`
	Order              int     `json:"order"`
	KnownForDepartment *string `json:"known_for_department"`

	ProfileID string         `gorm:"index;size:36" json:"profile_id"`
	Profile   *PersonProfile `gorm:"foreignKey:ProfileID" json:"profile,omitempty"`
	MediaID   string         `gorm:"index;size:36" json:"media_id"`
	Media     *MediaProfile  `gorm:"foreignKey:MediaID" json:"media,omitempty"`
}

func (PersonInMedia) TableName() string {
	return "Person"
}
