package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/family-flix/api/internal/config"
	"github.com/family-flix/api/internal/model"
	"github.com/family-flix/api/pkg/database"
)

func main() {
	cfg, err := config.New()
	if err != nil {
		fmt.Printf("load config failed: %v\n", err)
		os.Exit(1)
	}
	datacfg := database.DatabaseConfig{
		DBType:     cfg.GetString("database.type"),
		DBHost:     cfg.GetString("database.host"),
		DBPort:     cfg.GetString("database.port"),
		DBUser:     cfg.GetString("database.user"),
		DBPassword: cfg.GetString("database.password"),
		DBName:     cfg.GetString("database.name"),
		DBPath:     filepath.Join(cfg.BaseDir, cfg.GetString("database.path")),
	}
	db, err := database.NewDatabase(&datacfg)
	if err != nil {
		fmt.Printf("open database failed: %v\n", err)
		os.Exit(1)
	}

	var u model.User
	if err := db.First(&u).Error; err != nil {
		fmt.Printf("no user found: %v\n", err)
		os.Exit(1)
	}

	pageSize := 20
	query := db.Where("user_id = ? AND type = 3", u.ID)

	var total int64
	query.Model(&model.Media{}).Count(&total)

	var medias []model.Media
	query.Preload("Profile").Preload("MediaSources").
		Limit(pageSize).Find(&medias)

	type R = map[string]interface{}
	list := make([]R, 0, len(medias))
	var nextMarker string
	for _, m := range medias {
		item := R{"id": m.ID}
		if m.Profile != nil {
			item["name"] = m.Profile.Name
			item["original_name"] = m.Profile.OriginalName
			item["poster_path"] = m.Profile.PosterPath
			item["air_date"] = m.Profile.AirDate
		}
		list = append(list, item)
		nextMarker = m.ID
	}

	result := R{"list": list, "total": total, "page_size": pageSize, "next_marker": nextMarker}
	out, _ := json.MarshalIndent(result, "", "  ")
	fmt.Println(string(out))
}
