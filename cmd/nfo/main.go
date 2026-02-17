package nfo

import (
	"encoding/xml"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/google/uuid"

	"github.com/family-flix/api/internal/config"
	"github.com/family-flix/api/internal/model"
	"github.com/family-flix/api/pkg/database"
	"github.com/family-flix/api/pkg/drive_client/localdrive"
	"github.com/family-flix/api/pkg/folder"
	"github.com/family-flix/api/pkg/media_profile/javbus"
	"github.com/family-flix/api/pkg/media_profile/tmdb"
	"github.com/family-flix/api/pkg/types"
	"github.com/family-flix/api/pkg/walker"
)

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
	Director      string        `xml:"director,omitempty"`
	Studio        string        `xml:"studio,omitempty"`
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
		actors = append(actors, NFOActor{Name: p.Name, Thumb: p.ProfilePath})
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

func downloadImage(imgURL, dir, filename string) string {
	if imgURL == "" {
		return ""
	}
	req, err := http.NewRequest("GET", imgURL, nil)
	if err != nil {
		fmt.Printf("download image failed: %v\n", err)
		return ""
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36")
	req.Header.Set("Referer", "https://www.javbus.com/")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Printf("download image failed: %v\n", err)
		return ""
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		fmt.Printf("download image %s status: %d\n", imgURL, resp.StatusCode)
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

// sanitizeDot replaces spaces with dots and removes characters unsafe for folder names.
func sanitizeDot(s string) string {
	s = strings.ReplaceAll(s, " ", ".")
	s = strings.ReplaceAll(s, "/", ".")
	s = strings.ReplaceAll(s, "\\", ".")
	s = strings.ReplaceAll(s, ":", ".")
	return s
}

func joinNonEmpty(sep string, parts ...string) string {
	filtered := make([]string, 0, len(parts))
	for _, p := range parts {
		if p != "" {
			filtered = append(filtered, p)
		}
	}
	return strings.Join(filtered, sep)
}

func buildTVFolderName(name, originalName, season, year string) string {
	n := sanitizeDot(name)
	o := sanitizeDot(originalName)
	if o == n {
		o = ""
	}
	return joinNonEmpty(".", n, o, season, year)
}

func buildMovieFolderName(name, originalName, year string) string {
	n := sanitizeDot(name)
	o := sanitizeDot(originalName)
	if o == n {
		o = ""
	}
	return joinNonEmpty(".", n, o, year)
}

func buildJAVFolderName(code, title, year string) string {
	return joinNonEmpty(".", code, sanitizeDot(title), year)
}

func writeStrm(dir, basename, videoPath string) {
	strmPath := filepath.Join(dir, basename+".strm")
	if err := os.WriteFile(strmPath, []byte(videoPath), 0644); err != nil {
		fmt.Printf("write strm failed: %v\n", err)
	}
}

func Main() {
	strmDir := ""
	args := []string{}
	for i := 1; i < len(os.Args); i++ {
		a := os.Args[i]
		if a == "--strm" {
			if i+1 < len(os.Args) {
				i++
				strmDir = os.Args[i]
			} else {
				fmt.Println("--strm requires an absolute path argument")
				os.Exit(1)
			}
		} else {
			args = append(args, a)
		}
	}
	if len(args) < 1 && strmDir == "" {
		fmt.Println("Usage: nfo [--strm /absolute/path] [directory]")
		os.Exit(1)
	}
	if strmDir != "" && !filepath.IsAbs(strmDir) {
		fmt.Printf("--strm path must be absolute: %s\n", strmDir)
		os.Exit(1)
	}
	rootPaths := args
	if len(rootPaths) == 0 {
		rootPaths = []string{strmDir}
	}
	for _, rp := range rootPaths {
		info, err := os.Stat(rp)
		if err != nil || !info.IsDir() {
			fmt.Printf("invalid directory: %s\n", rp)
			os.Exit(1)
		}
	}

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

	client := localdrive.NewLocalDriveClient()
	tmdbClient := tmdb.NewClient()

	seasonCache := map[string]*tmdb.SeasonProfileResult{}
	mediaProfileCache := map[string]string{}

	w := walker.NewFolderWalker()

	w.SetOnEpisode(func(f walker.SearchedEpisode) error {
		fmt.Printf("Episode: %s %s %s\n", f.TV.Name, f.Season.SeasonText, f.Episode.EpisodeText)

		videoPath := f.Episode.FileID
		seasonNum := parseSeasonNumber(f.Season.SeasonText)
		if f.Season.SeasonText == "" {
			seasonNum = 1
		}
		episodeNum := parseEpisodeNumber(f.Episode.EpisodeText)

		nfo := EpisodeNFO{
			Title:         f.TV.Name + " " + f.Episode.EpisodeText,
			ShowTitle:     f.TV.Name,
			Season:        seasonNum,
			Episode:       episodeNum,
			OriginalTitle: f.TV.OriginalName,
		}

		// Determine output directory
		tvName := f.TV.Name
		tvOriginalName := f.TV.OriginalName
		tvYear := ""

		searchName := f.TV.Name
		if f.TV.OriginalName != "" {
			searchName = f.TV.OriginalName
		}
		result, err := tmdbClient.SearchTV(searchName, 1)
		if err == nil && len(result.List) > 0 {
			tv := result.List[0]
			tvID, _ := strconv.Atoi(tv.ID)

			tvName = tv.Name
			tvOriginalName = tv.OriginalName
			if tv.FirstAirDate != "" && len(tv.FirstAirDate) >= 4 {
				tvYear = tv.FirstAirDate[:4]
			}

			nfo.ShowTitle = tv.Name
			nfo.Rating = fmt.Sprintf("%.1f", tv.VoteAverage)
			nfo.UniqueID = []NFOUniqueID{{Type: "tmdb", Default: true, Value: tv.ID}}

			cacheKey := fmt.Sprintf("%d:%d", tvID, seasonNum)
			seasonDetail, ok := seasonCache[cacheKey]
			if !ok && tvID > 0 && seasonNum > 0 {
				seasonDetail, err = tmdbClient.FetchSeasonProfile(tvID, seasonNum)
				if err != nil {
					fmt.Printf("fetch season profile failed: %v\n", err)
				} else {
					seasonCache[cacheKey] = seasonDetail
				}
			}

			if seasonDetail != nil {
				for _, ep := range seasonDetail.Episodes {
					if ep.EpisodeNumber == episodeNum {
						nfo.Title = ep.Name
						nfo.Plot = ep.Overview
						nfo.Aired = ep.AirDate
						nfo.Runtime = ep.Runtime
						break
					}
				}
			}

			if tvID > 0 && seasonNum > 0 {
				persons, err := tmdbClient.FetchPersonsOfSeason(tvID, seasonNum)
				if err == nil {
					nfo.Actors = personsToActors(persons)
				}
			}

			mediaProfileID, saved := mediaProfileCache[tv.ID]
			if !saved {
				mediaProfileID = uuid.New().String()
				mp := model.MediaProfile{
					ID:           mediaProfileID,
					Type:         1,
					Name:         tv.Name,
					OriginalName: strPtr(tv.OriginalName),
					Overview:     strPtr(tv.Overview),
					PosterPath:   strPtr(tv.PosterPath),
					BackdropPath: strPtr(tv.BackdropPath),
					AirDate:      strPtr(tv.FirstAirDate),
					VoteAverage:  tv.VoteAverage,
					TMDBID:       strPtr(tv.ID),
					SourceCount:  tv.NumberOfEpisodes,
				}
				if tv.InProduction {
					mp.InProduction = 1
				}
				if err := db.Where("tmdb_id = ?", tv.ID).FirstOrCreate(&mp).Error; err != nil {
					fmt.Printf("save MediaProfile failed: %v\n", err)
				}
				mediaProfileCache[tv.ID] = mp.ID
			}

			// Determine the directory for tvshow.nfo / poster / fanart
			seasonDir := f.Season.FileID
			if seasonDir == "" {
				seasonDir = f.TV.FileID
			}
			if strmDir != "" {
				seasonText := f.Season.SeasonText
				if seasonText == "" {
					seasonText = "S01"
				}
				seasonDir = filepath.Join(strmDir, buildTVFolderName(tvName, tvOriginalName, seasonText, tvYear))
				os.MkdirAll(seasonDir, 0755)
			}

			posterPath := tv.PosterPath
			if seasonDetail != nil && seasonDetail.PosterPath != "" {
				posterPath = seasonDetail.PosterPath
			}
			downloadImage(posterPath, seasonDir, "poster.jpg")
			downloadImage(tv.BackdropPath, seasonDir, "fanart.jpg")
			tvNfo := TVShowNFO{
				Title:         tv.Name,
				OriginalTitle: tv.OriginalName,
				Plot:          tv.Overview,
				Premiered:     tv.FirstAirDate,
				Rating:        fmt.Sprintf("%.1f", tv.VoteAverage),
				UniqueID:      []NFOUniqueID{{Type: "tmdb", Default: true, Value: tv.ID}},
				Genres:        genreNames(tv.Genres),
				Country:       tv.OriginCountry,
			}
			if err := writeNFO(filepath.Join(seasonDir, "tvshow.nfo"), tvNfo); err != nil {
				fmt.Printf("write tvshow.nfo failed: %v\n", err)
			}

			if seasonDetail != nil {
				for _, ep := range seasonDetail.Episodes {
					if ep.EpisodeNumber == episodeNum {
						epTmdbID := strconv.Itoa(ep.ID)
						msp := model.MediaSourceProfile{
							ID:             uuid.New().String(),
							Name:           ep.Name,
							Overview:       strPtr(ep.Overview),
							AirDate:        strPtr(ep.AirDate),
							StillPath:      strPtr(ep.StillPath),
							Order:          ep.EpisodeNumber,
							Runtime:        &ep.Runtime,
							TMDBID:         &epTmdbID,
							MediaProfileID: mediaProfileID,
						}
						if err := db.Where("tmdb_id = ?", epTmdbID).FirstOrCreate(&msp).Error; err != nil {
							fmt.Printf("save MediaSourceProfile failed: %v\n", err)
						}
						break
					}
				}
			}
		}

		if strmDir != "" {
			seasonText := f.Season.SeasonText
			if seasonText == "" {
				seasonText = "S01"
			}
			outDir := filepath.Join(strmDir, buildTVFolderName(tvName, tvOriginalName, seasonText, tvYear))
			os.MkdirAll(outDir, 0755)
			basename := strings.TrimSuffix(f.Episode.FileName, filepath.Ext(f.Episode.FileName))
			writeStrm(outDir, basename, videoPath)
			nfoPath := filepath.Join(outDir, basename+".nfo")
			if err := writeNFO(nfoPath, nfo); err != nil {
				fmt.Printf("write episode nfo failed: %v\n", err)
			}
		} else {
			nfoPath := strings.TrimSuffix(videoPath, filepath.Ext(videoPath)) + ".nfo"
			if err := writeNFO(nfoPath, nfo); err != nil {
				fmt.Printf("write episode nfo failed: %v\n", err)
			}
		}
		return nil
	})

	w.SetOnMovie(func(parsed any) error {
		f := parsed.(walker.SearchedMovie)
		fmt.Printf("Movie: %s (%s)\n", f.Name, f.Year)

		videoPath := f.FileID
		movieName := f.Name
		movieOriginalName := f.OriginalName
		movieYear := f.Year

		nfo := MovieNFO{
			Title:         f.Name,
			OriginalTitle: f.OriginalName,
			Year:          f.Year,
		}

		searchName := f.Name
		if f.OriginalName != "" {
			searchName = f.OriginalName
		}
		result, err := tmdbClient.SearchMovie(searchName, 1)
		if err == nil && len(result.List) > 0 {
			movie := result.List[0]
			movieID, _ := strconv.Atoi(movie.ID)

			detail, err := tmdbClient.FetchMovieProfile(movieID)
			if err == nil {
				movieName = detail.Name
				movieOriginalName = detail.OriginalName
				if detail.AirDate != "" && len(detail.AirDate) >= 4 {
					movieYear = detail.AirDate[:4]
				}

				movieDir := filepath.Dir(videoPath)
				if strmDir != "" {
					movieDir = filepath.Join(strmDir, buildMovieFolderName(movieName, movieOriginalName, movieYear))
					os.MkdirAll(movieDir, 0755)
				}
				posterFile := downloadImage(detail.PosterPath, movieDir, "poster.jpg")
				fanartFile := downloadImage(detail.BackdropPath, movieDir, "fanart.jpg")
				nfo.Title = detail.Name
				nfo.OriginalTitle = detail.OriginalName
				nfo.Plot = detail.Overview
				nfo.Premiered = detail.AirDate
				nfo.Rating = fmt.Sprintf("%.1f", detail.VoteAverage)
				nfo.Genres = genreNames(detail.Genres)
				nfo.Country = detail.OriginCountry
				nfo.Poster = posterFile
				nfo.UniqueID = []NFOUniqueID{{Type: "tmdb", Default: true, Value: detail.ID}}
				if detail.Runtime != nil {
					nfo.Runtime = *detail.Runtime
				}
				if fanartFile != "" {
					nfo.Fanart = &NFOFanart{Thumb: fanartFile}
				}
				nfo.Year = movieYear

				mp := model.MediaProfile{
					ID:           uuid.New().String(),
					Type:         2,
					Name:         detail.Name,
					OriginalName: strPtr(detail.OriginalName),
					Overview:     strPtr(detail.Overview),
					PosterPath:   strPtr(detail.PosterPath),
					BackdropPath: strPtr(detail.BackdropPath),
					AirDate:      strPtr(detail.AirDate),
					VoteAverage:  detail.VoteAverage,
					TMDBID:       strPtr(detail.ID),
				}
				if err := db.Where("tmdb_id = ?", detail.ID).FirstOrCreate(&mp).Error; err != nil {
					fmt.Printf("save movie MediaProfile failed: %v\n", err)
				}
			}

			persons, err := tmdbClient.FetchPersonsOfMovie(movieID)
			if err == nil {
				nfo.Actors = personsToActors(persons)
			}
		}

		if strmDir != "" {
			outDir := filepath.Join(strmDir, buildMovieFolderName(movieName, movieOriginalName, movieYear))
			os.MkdirAll(outDir, 0755)
			basename := strings.TrimSuffix(f.FileName, filepath.Ext(f.FileName))
			writeStrm(outDir, basename, videoPath)
			if err := writeNFO(filepath.Join(outDir, basename+".nfo"), nfo); err != nil {
				fmt.Printf("write movie nfo failed: %v\n", err)
			}
		} else {
			nfoPath := strings.TrimSuffix(videoPath, filepath.Ext(videoPath)) + ".nfo"
			if err := writeNFO(nfoPath, nfo); err != nil {
				fmt.Printf("write movie nfo failed: %v\n", err)
			}
		}
		return nil
	})

	javClient := javbus.NewJavBusClient("")
	w.OnJAV = func(jav walker.SearchedJAV) error {
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
		if strmDir != "" {
			javDir = filepath.Join(strmDir, buildJAVFolderName(jav.Code, detail.Title, javYear))
			if err := os.MkdirAll(javDir, 0755); err != nil {
				return fmt.Errorf("create jav dir failed: %w", err)
			}
			writeStrm(javDir, jav.Code, jav.FileID)
		}

		nfo := MovieNFO{
			Title:         detail.Title,
			OriginalTitle: detail.Code,
			Premiered:     detail.ReleaseDate,
			Year:          javYear,
			Genres:        detail.Genres,
			Director:      detail.Director,
			Studio:        detail.Studio,
		}
		for _, a := range detail.Actors {
			nfo.Actors = append(nfo.Actors, NFOActor{Name: a})
		}
		if err := writeNFO(filepath.Join(javDir, jav.Code+".nfo"), nfo); err != nil {
			return fmt.Errorf("write nfo for %s failed: %w", jav.Code, err)
		}

		downloadImage(detail.Cover, javDir, "poster.jpg")
		if len(detail.SampleImages) > 0 {
			downloadImage(detail.SampleImages[0], javDir, "fanart.jpg")
		}
		return nil
	}

	w.SetOnError(func(f folder.File) {
		fmt.Printf("Error processing %s\n", f.Name)
	})

	fmt.Println("Starting walker...")
	for _, rootPath := range rootPaths {
		fmt.Printf("Walking: %s\n", rootPath)
		prevFolder := folder.NewFolder(rootPath, client, []folder.ParentFolder{}, nil)
		if _, err := prevFolder.Profile(); err != nil {
			fmt.Printf("fetch folder profile failed: %v\n", err)
			continue
		}
		if err := w.Run(prevFolder, []string{}); err != nil {
			fmt.Printf("Walker run failed for %s: %v\n", rootPath, err)
		}
	}
	fmt.Println("Walker finished.")
}
