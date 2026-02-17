package main

import (
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/family-flix/api/pkg/drive_client/localdrive"
	"github.com/family-flix/api/pkg/folder"
	"github.com/family-flix/api/pkg/media_profile/javbus"
	"github.com/family-flix/api/pkg/media_profile/tmdb"
	"github.com/family-flix/api/pkg/types"
	"github.com/family-flix/api/pkg/walker"
)

// --- NFO XML structs (Emby/Jellyfin compatible) ---

type NFOActor struct {
	Name  string `xml:"name"`
	Role  string `xml:"role,omitempty"`
	Thumb string `xml:"thumb,omitempty"`
}

type NFOUniqueID struct {
	Type    string `xml:"type,attr"`
	Default bool   `xml:"default,attr"`
	Value   string `xml:",chardata"`
}

type TVShowNFO struct {
	XMLName       xml.Name      `xml:"tvshow"`
	Title         string        `xml:"title"`
	OriginalTitle string        `xml:"originaltitle,omitempty"`
	Plot          string        `xml:"plot,omitempty"`
	UniqueID      []NFOUniqueID `xml:"uniqueid,omitempty"`
	Premiered     string        `xml:"premiered,omitempty"`
	Rating        string        `xml:"rating,omitempty"`
	Genres        []string      `xml:"genre,omitempty"`
	Country       []string      `xml:"country,omitempty"`
	Poster        string        `xml:"thumb,omitempty"`
	Fanart        *NFOFanart    `xml:"fanart,omitempty"`
	Actors        []NFOActor    `xml:"actor,omitempty"`
}

type NFOFanart struct {
	Thumb string `xml:"thumb,omitempty"`
}

type EpisodeNFO struct {
	XMLName       xml.Name      `xml:"episodedetails"`
	Title         string        `xml:"title"`
	ShowTitle     string        `xml:"showtitle"`
	Season        int           `xml:"season"`
	Episode       int           `xml:"episode"`
	OriginalTitle string        `xml:"originaltitle,omitempty"`
	Plot          string        `xml:"plot,omitempty"`
	Aired         string        `xml:"aired,omitempty"`
	Runtime       int           `xml:"runtime,omitempty"`
	Rating        string        `xml:"rating,omitempty"`
	UniqueID      []NFOUniqueID `xml:"uniqueid,omitempty"`
	Actors        []NFOActor    `xml:"actor,omitempty"`
}

type MovieNFO struct {
	XMLName       xml.Name      `xml:"movie"`
	Title         string        `xml:"title"`
	OriginalTitle string        `xml:"originaltitle,omitempty"`
	Plot          string        `xml:"plot,omitempty"`
	Year          string        `xml:"year,omitempty"`
	Premiered     string        `xml:"premiered,omitempty"`
	Rating        string        `xml:"rating,omitempty"`
	Runtime       int           `xml:"runtime,omitempty"`
	UniqueID      []NFOUniqueID `xml:"uniqueid,omitempty"`
	Genres        []string      `xml:"genre,omitempty"`
	Country       []string      `xml:"country,omitempty"`
	Poster        string        `xml:"thumb,omitempty"`
	Fanart        *NFOFanart    `xml:"fanart,omitempty"`
	Actors        []NFOActor    `xml:"actor,omitempty"`
}

func writeNFO(path string, v any) error {
	data, err := xml.MarshalIndent(v, "", "  ")
	if err != nil {
		return err
	}
	content := []byte(xml.Header)
	content = append(content, data...)
	return os.WriteFile(path, content, 0644)
}

func personsToActors(persons []tmdb.PersonProfileItem) []NFOActor {
	actors := make([]NFOActor, 0, len(persons))
	for _, p := range persons {
		if p.KnownForDepartment != "Acting" {
			continue
		}
		actors = append(actors, NFOActor{
			Name:  p.Name,
			Thumb: p.ProfilePath,
		})
	}
	return actors
}

func genreNames(genres []types.Genre) []string {
	names := make([]string, 0, len(genres))
	for _, g := range genres {
		names = append(names, g.Name)
	}
	return names
}

func parseSeasonNumber(seasonText string) int {
	s := strings.TrimPrefix(strings.ToUpper(seasonText), "S")
	n, _ := strconv.Atoi(s)
	return n
}

func parseEpisodeNumber(episodeText string) int {
	s := strings.TrimPrefix(strings.ToUpper(episodeText), "E")
	n, _ := strconv.Atoi(s)
	return n
}

func strPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// downloadImage 下载图片到 dir 目录，返回文件名（相对路径）
func downloadImage(url, dir, filename string) string {
	if url == "" {
		return ""
	}
	resp, err := http.Get(url)
	if err != nil {
		fmt.Printf("download image failed: %v\n", err)
		return ""
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return ""
	}
	dst := filepath.Join(dir, filename)
	f, err := os.Create(dst)
	if err != nil {
		fmt.Printf("create image file failed: %v\n", err)
		return ""
	}
	defer f.Close()
	io.Copy(f, resp.Body)
	return filename
}

func main() {
	root_path := "/Users/litao/Documents/FakeLocalDrive/AV"
	fmt.Printf("Walking: %s\n", root_path)

	// 初始化数据库（与 cmd/server/main.go 共用）
	// cfg, err := config.New()
	// if err != nil {
	// 	fmt.Printf("load config failed: %v\n", err)
	// 	return
	// }
	// datacfg := database.DatabaseConfig{
	// 	DBType:     cfg.GetString("database.type"),
	// 	DBHost:     cfg.GetString("database.host"),
	// 	DBPort:     cfg.GetString("database.port"),
	// 	DBUser:     cfg.GetString("database.user"),
	// 	DBPassword: cfg.GetString("database.password"),
	// 	DBName:     cfg.GetString("database.name"),
	// 	DBPath:     filepath.Join(cfg.BaseDir, cfg.GetString("database.path")),
	// }
	// db, err := database.NewDatabase(&datacfg)
	// if err != nil {
	// 	fmt.Printf("open database failed: %v\n", err)
	// 	return
	// }

	client := localdrive.NewLocalDriveClient()
	// tmdbClient := tmdb.NewClient()

	// 缓存: key = "tvID:seasonNum" -> season detail
	// seasonCache := map[string]*tmdb.SeasonProfileResult{}
	// 缓存: key = tmdbID -> 已保存的 MediaProfile ID
	// mediaProfileCache := map[string]string{}

	prevFolder := folder.NewFolder(root_path, client, []folder.ParentFolder{}, nil)

	profile, err := prevFolder.Profile()
	if err != nil {
		fmt.Printf("fetch folder profile failed %v\n", err)
		return
	}
	fmt.Printf("Folder Profile: %+v\n", profile)

	w := walker.NewFolderWalker()

	// w.SetOnEpisode(func(f walker.SearchedEpisode) error {
	// 	name := f.TV.Name
	// 	if name == "" {
	// 		name = f.TV.OriginalName
	// 	}
	// 	fmt.Printf("Episode: %s %s %s\n", name, f.Season.SeasonText, f.Episode.EpisodeText)

	// 	videoPath := f.Episode.FileID
	// 	nfoPath := strings.TrimSuffix(videoPath, filepath.Ext(videoPath)) + ".nfo"
	// 	seasonNum := parseSeasonNumber(f.Season.SeasonText)
	// 	// 空字符串说明是第一季
	// 	if f.Season.SeasonText == "" {
	// 		seasonNum = 1
	// 	}
	// 	episodeNum := parseEpisodeNumber(f.Episode.EpisodeText)

	// 	nfo := EpisodeNFO{
	// 		Title:         f.TV.Name + " " + f.Episode.EpisodeText,
	// 		ShowTitle:     f.TV.Name,
	// 		Season:        seasonNum,
	// 		Episode:       episodeNum,
	// 		OriginalTitle: f.TV.OriginalName,
	// 	}

	// 	// 搜索 TMDB 获取详细信息
	// 	searchName := f.TV.Name
	// 	if f.TV.OriginalName != "" {
	// 		searchName = f.TV.OriginalName
	// 	}
	// 	result, err := tmdbClient.SearchTV(searchName, 1)
	// 	if err == nil && len(result.List) > 0 {
	// 		tv := result.List[0]
	// 		tvID, _ := strconv.Atoi(tv.ID)

	// 		nfo.ShowTitle = tv.Name
	// 		nfo.Rating = fmt.Sprintf("%.1f", tv.VoteAverage)
	// 		nfo.UniqueID = []NFOUniqueID{{Type: "tmdb", Default: true, Value: tv.ID}}

	// 		// 获取季详情（带缓存）
	// 		cacheKey := fmt.Sprintf("%d:%d", tvID, seasonNum)
	// 		seasonDetail, ok := seasonCache[cacheKey]
	// 		if !ok && tvID > 0 && seasonNum > 0 {
	// 			seasonDetail, err = tmdbClient.FetchSeasonProfile(tvID, seasonNum)
	// 			if err != nil {
	// 				fmt.Printf("fetch season profile failed: %v\n", err)
	// 			} else {
	// 				seasonCache[cacheKey] = seasonDetail
	// 			}
	// 		}

	// 		// 从缓存的季详情中查找当前集
	// 		if seasonDetail != nil {
	// 			for _, ep := range seasonDetail.Episodes {
	// 				if ep.EpisodeNumber == episodeNum {
	// 					nfo.Title = ep.Name
	// 					nfo.Plot = ep.Overview
	// 					nfo.Aired = ep.AirDate
	// 					nfo.Runtime = ep.Runtime
	// 					break
	// 				}
	// 			}
	// 		}

	// 		// 获取演员
	// 		if tvID > 0 && seasonNum > 0 {
	// 			persons, err := tmdbClient.FetchPersonsOfSeason(tvID, seasonNum)
	// 			if err == nil {
	// 				nfo.Actors = personsToActors(persons)
	// 			}
	// 		}

	// 		// 保存 MediaProfile 到数据库 + 下载海报 + 创建 tvshow.nfo（每个 TV 只执行一次）
	// 		mediaProfileID, saved := mediaProfileCache[tv.ID]
	// 		if !saved {
	// 			mediaProfileID = uuid.New().String()
	// 			mp := model.MediaProfile{
	// 				ID:           mediaProfileID,
	// 				Type:         1,
	// 				Name:         tv.Name,
	// 				OriginalName: strPtr(tv.OriginalName),
	// 				Overview:     strPtr(tv.Overview),
	// 				PosterPath:   strPtr(tv.PosterPath),
	// 				BackdropPath: strPtr(tv.BackdropPath),
	// 				AirDate:      strPtr(tv.FirstAirDate),
	// 				VoteAverage:  tv.VoteAverage,
	// 				TMDBID:       strPtr(tv.ID),
	// 				SourceCount:  tv.NumberOfEpisodes,
	// 			}
	// 			if tv.InProduction {
	// 				mp.InProduction = 1
	// 			}
	// 			if err := db.Where("tmdb_id = ?", tv.ID).FirstOrCreate(&mp).Error; err != nil {
	// 				fmt.Printf("save MediaProfile failed: %v\n", err)
	// 			}
	// 			mediaProfileCache[tv.ID] = mp.ID

	// 			// 在剧集根目录下载海报和创建 tvshow.nfo
	// 			tvShowDir := f.TV.FileID
	// 			posterFile := downloadImage(tv.PosterPath, tvShowDir, "poster.jpg")
	// 			fanartFile := downloadImage(tv.BackdropPath, tvShowDir, "fanart.jpg")
	// 			tvNfo := TVShowNFO{
	// 				Title:         tv.Name,
	// 				OriginalTitle: tv.OriginalName,
	// 				Plot:          tv.Overview,
	// 				Premiered:     tv.FirstAirDate,
	// 				Rating:        fmt.Sprintf("%.1f", tv.VoteAverage),
	// 				UniqueID:      []NFOUniqueID{{Type: "tmdb", Default: true, Value: tv.ID}},
	// 				Genres:        genreNames(tv.Genres),
	// 				Country:       tv.OriginCountry,
	// 				Poster:        posterFile,
	// 			}
	// 			if fanartFile != "" {
	// 				tvNfo.Fanart = &NFOFanart{Thumb: fanartFile}
	// 			}
	// 			tvShowNFOPath := filepath.Join(tvShowDir, "tvshow.nfo")
	// 			if err := writeNFO(tvShowNFOPath, tvNfo); err != nil {
	// 				fmt.Printf("write tvshow.nfo failed: %v\n", err)
	// 			}
	// 		}
	// 		if seasonDetail != nil {
	// 			for _, ep := range seasonDetail.Episodes {
	// 				if ep.EpisodeNumber == episodeNum {
	// 					epTmdbID := strconv.Itoa(ep.ID)
	// 					msp := model.MediaSourceProfile{
	// 						ID:             uuid.New().String(),
	// 						Name:           ep.Name,
	// 						Overview:       strPtr(ep.Overview),
	// 						AirDate:        strPtr(ep.AirDate),
	// 						StillPath:      strPtr(ep.StillPath),
	// 						Order:          ep.EpisodeNumber,
	// 						Runtime:        &ep.Runtime,
	// 						TMDBID:         &epTmdbID,
	// 						MediaProfileID: mediaProfileID,
	// 					}
	// 					if err := db.Where("tmdb_id = ?", epTmdbID).FirstOrCreate(&msp).Error; err != nil {
	// 						fmt.Printf("save MediaSourceProfile failed: %v\n", err)
	// 					}
	// 					break
	// 				}
	// 			}
	// 		}

	// 	}

	// 	if err := writeNFO(nfoPath, nfo); err != nil {
	// 		fmt.Printf("write episode nfo failed: %v\n", err)
	// 	}
	// 	return nil
	// })

	// w.SetOnMovie(func(parsed any) error {
	// 	f := parsed.(walker.SearchedMovie)
	// 	fmt.Printf("Movie: %s (%s)\n", f.Name, f.Year)

	// 	videoPath := f.FileID
	// 	nfoPath := strings.TrimSuffix(videoPath, filepath.Ext(videoPath)) + ".nfo"

	// 	nfo := MovieNFO{
	// 		Title:         f.Name,
	// 		OriginalTitle: f.OriginalName,
	// 		Year:          f.Year,
	// 	}

	// 	searchName := f.Name
	// 	if f.OriginalName != "" {
	// 		searchName = f.OriginalName
	// 	}
	// 	result, err := tmdbClient.SearchMovie(searchName, 1)
	// 	if err == nil && len(result.List) > 0 {
	// 		movie := result.List[0]
	// 		movieID, _ := strconv.Atoi(movie.ID)

	// 		detail, err := tmdbClient.FetchMovieProfile(movieID)
	// 		if err == nil {
	// 			movieDir := filepath.Dir(videoPath)
	// 			posterFile := downloadImage(detail.PosterPath, movieDir, "poster.jpg")
	// 			fanartFile := downloadImage(detail.BackdropPath, movieDir, "fanart.jpg")
	// 			nfo.Title = detail.Name
	// 			nfo.OriginalTitle = detail.OriginalName
	// 			nfo.Plot = detail.Overview
	// 			nfo.Premiered = detail.AirDate
	// 			nfo.Rating = fmt.Sprintf("%.1f", detail.VoteAverage)
	// 			nfo.Genres = genreNames(detail.Genres)
	// 			nfo.Country = detail.OriginCountry
	// 			nfo.Poster = posterFile
	// 			nfo.UniqueID = []NFOUniqueID{{Type: "tmdb", Default: true, Value: detail.ID}}
	// 			if detail.Runtime != nil {
	// 				nfo.Runtime = *detail.Runtime
	// 			}
	// 			if fanartFile != "" {
	// 				nfo.Fanart = &NFOFanart{Thumb: fanartFile}
	// 			}
	// 			if detail.AirDate != "" && len(detail.AirDate) >= 4 {
	// 				nfo.Year = detail.AirDate[:4]
	// 			}

	// 			// 保存 MediaProfile
	// 			mp := model.MediaProfile{
	// 				ID:           uuid.New().String(),
	// 				Type:         2,
	// 				Name:         detail.Name,
	// 				OriginalName: strPtr(detail.OriginalName),
	// 				Overview:     strPtr(detail.Overview),
	// 				PosterPath:   strPtr(detail.PosterPath),
	// 				BackdropPath: strPtr(detail.BackdropPath),
	// 				AirDate:      strPtr(detail.AirDate),
	// 				VoteAverage:  detail.VoteAverage,
	// 				TMDBID:       strPtr(detail.ID),
	// 			}
	// 			if err := db.Where("tmdb_id = ?", detail.ID).FirstOrCreate(&mp).Error; err != nil {
	// 				fmt.Printf("save movie MediaProfile failed: %v\n", err)
	// 			}
	// 		}

	// 		persons, err := tmdbClient.FetchPersonsOfMovie(movieID)
	// 		if err == nil {
	// 			nfo.Actors = personsToActors(persons)
	// 		}
	// 	}

	// 	if err := writeNFO(nfoPath, nfo); err != nil {
	// 		fmt.Printf("write movie nfo failed: %v\n", err)
	// 	}
	// 	return nil
	// })
	javClient := javbus.NewJavBusClient("")
	w.SetOnJav(func(parsed any) error {
		jav := parsed.(walker.SearchedJAV)
		fmt.Printf("JAV: %s (%s)\n", jav.Code, jav.FileName)

		detail, err := javClient.GetMovieDetail(jav.Code)
		if err != nil {
			fmt.Printf("skip %s: %v\n", jav.Code, err)
			return nil
		}

		javYear := ""
		if detail.ReleaseDate != "" && len(detail.ReleaseDate) >= 4 {
			javYear = detail.ReleaseDate[:4]
		}

		javDir := filepath.Dir(jav.FileID)
		nfo := MovieNFO{
			Title:         detail.Title,
			OriginalTitle: detail.Code,
			Premiered:     detail.ReleaseDate,
			Year:          javYear,
			Genres:        detail.Genres,
		}
		nfoPath := filepath.Join(javDir, jav.Code+".nfo")
		if err := writeNFO(nfoPath, nfo); err != nil {
			return fmt.Errorf("write nfo for %s failed: %w", jav.Code, err)
		}

		downloadImage(detail.Cover, javDir, "poster.jpg")
		return nil
	})

	w.SetOnError(func(f folder.File) {
		fmt.Printf("Error processing %s\n", f.Name)
	})

	fmt.Println("Starting walker...")
	err = w.Run(prevFolder, []string{})
	if err != nil {
		fmt.Printf("Walker run failed: %v\n", err)
		return
	}
	fmt.Println("Walker finished.")
}
