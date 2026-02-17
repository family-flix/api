package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"

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

	// 查询第一个用户作为 user_id
	var u model.User
	if err := db.First(&u).Error; err != nil {
		fmt.Printf("no user found: %v\n", err)
		os.Exit(1)
	}

	pageSize := 20
	query := db.Where("user_id = ? AND type = 1", u.ID)

	var total int64
	query.Model(&model.Media{}).Count(&total)

	var medias []model.Media
	query.Preload("Profile").Preload("Profile.Genres").Preload("Profile.OriginCountries").Preload("MediaSources").
		Preload("ResourceSyncTasks", "invalid = 0 AND status = 1").
		Limit(pageSize).Find(&medias)

	sort.Slice(medias, func(i, j int) bool {
		ai, aj := "", ""
		if medias[i].Profile != nil && medias[i].Profile.AirDate != nil {
			ai = *medias[i].Profile.AirDate
		}
		if medias[j].Profile != nil && medias[j].Profile.AirDate != nil {
			aj = *medias[j].Profile.AirDate
		}
		return ai > aj
	})

	type R = map[string]interface{}
	list := make([]R, 0, len(medias))
	var nextMarker string
	for _, m := range medias {
		item := R{"id": m.ID, "cur_episode_count": len(m.MediaSources)}
		if m.Profile != nil {
			item["name"] = m.Profile.Name
			item["original_name"] = m.Profile.OriginalName
			item["overview"] = m.Profile.Overview
			item["air_date"] = m.Profile.AirDate
			item["poster_path"] = m.Profile.PosterPath
			item["vote_average"] = m.Profile.VoteAverage
			item["episode_count"] = m.Profile.SourceCount
			genres := make([]R, 0)
			for _, g := range m.Profile.Genres {
				genres = append(genres, R{"value": g.ID, "label": g.Text})
			}
			item["genres"] = genres
			countries := make([]string, 0)
			for _, c := range m.Profile.OriginCountries {
				countries = append(countries, c.ID)
			}
			item["origin_country"] = countries
			var tips []string
			if len(m.MediaSources) == 0 {
				tips = append(tips, "关联的剧集数为 0")
			}
			if m.Profile.InProduction == 0 && len(m.MediaSources) != m.Profile.SourceCount {
				tips = append(tips, fmt.Sprintf("已完结但集数不完整，总集数 %d，当前集数 %d", m.Profile.SourceCount, len(m.MediaSources)))
			}
			if m.Profile.InProduction == 1 && len(m.MediaSources) != m.Profile.SourceCount && len(m.ResourceSyncTasks) == 0 {
				tips = append(tips, "未完结但缺少同步任务")
			}
			item["tips"] = tips
		} else {
			item["tips"] = []string{}
		}
		list = append(list, item)
		nextMarker = m.ID
	}

	result := R{"list": list, "total": total, "page_size": pageSize, "next_marker": nextMarker}
	out, _ := json.MarshalIndent(result, "", "  ")
	fmt.Println(string(out))
}
