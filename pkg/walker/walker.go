package walker

import (
	"fmt"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/family-flix/api/pkg/folder"
	"github.com/family-flix/api/pkg/types"
	"github.com/rs/zerolog"
)

// ParentFolderInfo struct for recursion
type ParentFolderInfo struct {
	FileID       string
	FileName     string
	Name         string
	OriginalName string
	Season       string
	Year         string
}

// FolderWalker struct
type FolderWalker struct {
	StartFolderID string
	NeedStop      bool
	Delay         time.Duration
	FilenameRules []string // Placeholder for rules

	Logger zerolog.Logger

	// Callbacks (Events)
	OnFile     func(file folder.File) error
	OnEpisode  func(parsed SearchedEpisode) error
	OnMovie    func(parsed SearchedMovie) error
	OnSubtitle func(subtitle SearchedSubtitle) error
	OnImg      func(img SearchedImg) error
	OnNFO      func(nfo SearchedNFO) error
	OnJAV      func(jav SearchedJAV) error
	OnWarning  func(warning SearchedWarning)
	OnError    func(file folder.File)
	OnStop     func()
	Filter     func(file folder.File) (bool, error) // Return true to skip
}

// NewFolderWalker creates a new walker
func NewFolderWalker() *FolderWalker {
	// Default logger to stdout with timestamp
	logger := zerolog.New(os.Stdout).With().Timestamp().Logger()

	return &FolderWalker{
		Logger:     logger,
		OnFile:     func(f folder.File) error { return nil },
		OnEpisode:  func(e SearchedEpisode) error { return nil },
		OnMovie:    func(m SearchedMovie) error { return nil },
		OnSubtitle: func(s SearchedSubtitle) error { return nil },
		OnImg:      func(i SearchedImg) error { return nil },
		OnNFO:      func(n SearchedNFO) error { return nil },
		OnJAV:      func(j SearchedJAV) error { return nil },
		OnWarning:  func(w SearchedWarning) {},
		OnError:    func(f folder.File) {},
		OnStop:     func() {},
	}
}

// SetOnError sets error handler
func (w *FolderWalker) SetOnError(f func(file folder.File)) {
	w.OnError = f
}

// SetOnFile sets file handler
func (w *FolderWalker) SetOnFile(f func(file folder.File) error) {
	w.OnFile = f
}

// SetOnEpisode sets episode handler
func (w *FolderWalker) SetOnEpisode(f func(e SearchedEpisode) error) {
	w.OnEpisode = f
}

// SetOnMovie sets movie handler
func (w *FolderWalker) SetOnMovie(f func(parsed any) error) {
	w.OnMovie = func(m SearchedMovie) error {
		return f(m)
	}
}
func (w *FolderWalker) SetOnJav(f func(parsed any) error) {
	w.OnJAV = func(m SearchedJAV) error {
		return f(m)
	}
}

// SetOnSubtitle sets subtitle handler
func (w *FolderWalker) SetOnSubtitle(f func(s SearchedSubtitle) error) {
	w.OnSubtitle = f
}

// SetOnImg sets img handler
func (w *FolderWalker) SetOnImg(f func(i SearchedImg) error) {
	w.OnImg = f
}

// SetOnNFO sets nfo handler
func (w *FolderWalker) SetOnNFO(f func(n SearchedNFO) error) {
	w.OnNFO = f
}

// SetOnWarning sets warning handler
func (w *FolderWalker) SetOnWarning(f func(w SearchedWarning)) {
	w.OnWarning = f
}

// SetOnStop sets stop handler
func (w *FolderWalker) SetOnStop(f func()) {
	w.OnStop = f
}

// SetOnProfile sets profile handler
func (w *FolderWalker) SetOnProfile(f func(profile any) error) {
	// Not implemented yet
}

// SetFilter sets filter
func (w *FolderWalker) SetFilter(f func(curFile types.FileInfo) (bool, error)) {
	w.Filter = func(file folder.File) (bool, error) {
		return f(types.FileInfo{
			Type:        file.Type,
			Name:        file.Name,
			ParentPaths: file.GetParentPaths(),
		})
	}
}

// Run starts the walker
func (w *FolderWalker) Run(data *folder.Folder, parents []string) error {
	w.StartFolderID = data.ID
	return w.walk(data, []ParentFolderInfo{})
}

func (w *FolderWalker) walk(data interface{}, parents []ParentFolderInfo) error {
	if w.NeedStop {
		w.OnStop()
		return nil
	}

	var fileInfo folder.File
	var isFolder bool

	switch v := data.(type) {
	case *folder.Folder:
		// Convert parents
		folderParents := []folder.ParentFolder{}
		for _, p := range parents {
			folderParents = append(folderParents, folder.ParentFolder{
				ID:   p.FileID,
				Name: p.FileName,
			})
		}
		fileInfo = folder.File{
			ID:           v.ID,
			Name:         v.Name,
			ParentFileID: v.ParentFileID,
			Type:         types.FileTypeFolder,
			Size:         v.Size,
			Parents:      folderParents,
		}
		isFolder = true
	case *folder.File:
		fileInfo = *v
		isFolder = false
	default:
		return fmt.Errorf("unknown data type")
	}

	parentPaths := []string{}
	for _, p := range parents {
		parentPaths = append(parentPaths, p.FileName)
	}
	parentPathsStr := strings.Join(parentPaths, "/")

	// Filter
	if w.Filter != nil && fileInfo.ID != w.StartFolderID {
		skip, err := w.Filter(fileInfo)
		if err != nil {
			return err
		}
		if skip {
			return nil
		}
	}

	// Replace OnPrint with Logger
	w.Logger.Info().
		Str("parent_paths", parentPathsStr).
		Str("name", fileInfo.Name).
		Msg("Walking")

	err := w.OnFile(fileInfo)
	if err != nil {
		return err
	}

	if isFolder {
		f := data.(*folder.Folder)
		parsedInfo := ParseFilenameForVideo(f.Name)

		// Handle "Season X" folder names that the parser doesn't recognize as seasons
		if parsedInfo.Season == "" {
			if m := regexp.MustCompile(`(?i)^season\s*(\d+)$`).FindStringSubmatch(f.Name); len(m) > 1 {
				parsedInfo.Season = formatSeasonNumber("S" + m[1])
			}
		}

		for {
			if w.Delay > 0 {
				time.Sleep(w.Delay)
			}
			items, err := f.Next()
			if err != nil {
				// Log error and continue
				w.Logger.Error().Err(err).Msg("Error reading folder next items")
				continue
			}
			if w.NeedStop {
				w.OnStop()
				return nil
			}
			if len(items) == 0 && f.NextMarker == "" {
				break
			}

			for _, item := range items {
				newParents := append(parents, ParentFolderInfo{
					FileID:       f.ID,
					FileName:     f.Name,
					Name:         parsedInfo.Name,
					OriginalName: parsedInfo.OriginalName,
					Season:       parsedInfo.Season,
					Year:         parsedInfo.Year,
				})
				err := w.walk(item, newParents)
				if err != nil {
					return err
				}
			}

			if f.NextMarker == "" {
				break
			}
		}
		return nil
	}

	// Handle files (Leaf nodes)
	if !isFolder {
		// Image File
		if IsImgFile(fileInfo.Name) {
			return w.OnImg(SearchedImg{
				FileID: fileInfo.ID,
				Name:   fileInfo.Name,
			})
		}

		// Subtitle File
		if IsSubtitleFile(fileInfo.Name) {
			return w.OnSubtitle(SearchedSubtitle{
				FileID: fileInfo.ID,
				Name:   fileInfo.Name,
			})
		}

		// NFO File
		if IsNfoFile(fileInfo.Name) {
			return w.OnNFO(SearchedNFO{
				FileID: fileInfo.ID,
				Name:   fileInfo.Name,
			})
		}

		// Video File
		if IsVideoFile(fileInfo.Name) {
			parsed := ParseFilenameForVideo(fileInfo.Name)
			// Find logical parent (season/tv)
			var tvInfo ParentFolderInfo
			var seasonInfo ParentFolderInfo
			foundTv := false
			foundSeason := false

			// Traverse parents backwards to find season and tv
			// parents: [root, tv, season]
			n := len(parents)
			if n > 0 {
				// Last parent might be season or tv
				last := parents[n-1]
				if last.Season != "" {
					seasonInfo = last
					foundSeason = true
					if n > 1 {
						tvInfo = parents[n-2]
						foundTv = true
					}
				} else if last.Name != "" || last.OriginalName != "" {
					// It's a TV folder only if it has a parsed name
					tvInfo = last
					foundTv = true
				}
			}

			// Try JAV first, regardless of parent folder
			javCode := ParseFilenameForJAV(fileInfo.Name)
			if javCode != "" {
				if err := w.OnJAV(SearchedJAV{
					FileID:      fileInfo.ID,
					FileName:    fileInfo.Name,
					Code:        javCode,
					ParentPaths: parentPathsStr,
					Size:        fileInfo.Size,
					MD5:         fileInfo.MD5,
				}); err != nil {
					return err
				}
			} else if foundTv {
				// It's an episode
				ep := SearchedEpisode{}
				ep.TV.Name = tvInfo.Name
				ep.TV.OriginalName = tvInfo.OriginalName
				ep.TV.FileID = tvInfo.FileID
				ep.TV.FileName = tvInfo.FileName

				if foundSeason {
					ep.Season.SeasonText = seasonInfo.Season
					ep.Season.FileID = seasonInfo.FileID
					ep.Season.FileName = seasonInfo.FileName
				}

				ep.Episode.FileID = fileInfo.ID
				ep.Episode.FileName = fileInfo.Name
				ep.Episode.ParentPaths = parentPathsStr
				ep.Episode.Size = fileInfo.Size
				ep.Episode.MD5 = fileInfo.MD5
				ep.Episode.EpisodeText = parsed.Episode
				ep.Episode.Year = parsed.Year

				if parsed.Name != "" && tvInfo.Name != "" && !strings.Contains(strings.ToLower(tvInfo.Name), strings.ToLower(parsed.Name)) {
					w.OnWarning(SearchedWarning{
						FileID:      fileInfo.ID,
						Name:        fileInfo.Name,
						ParentPaths: parentPathsStr,
						Position:    "mismatch_name",
						Message:     fmt.Sprintf("Video name '%s' does not match TV folder name '%s'", parsed.Name, tvInfo.Name),
					})
				}

				if err := w.OnEpisode(ep); err != nil {
					return err
				}
			} else {
				// Movie
				movie := SearchedMovie{}
				movie.FileID = fileInfo.ID
				movie.FileName = fileInfo.Name
				movie.Name = parsed.Name
				movie.OriginalName = parsed.OriginalName
				movie.Year = parsed.Year
				movie.ParentPaths = parentPathsStr
				movie.Size = fileInfo.Size
				movie.MD5 = fileInfo.MD5

				if err := w.OnMovie(movie); err != nil {
					return err
				}
			}
		} else {
			// Unknown file type, maybe warn?
			w.OnWarning(SearchedWarning{
				FileID:      fileInfo.ID,
				Name:        fileInfo.Name,
				ParentPaths: parentPathsStr,
				Position:    "unknown_type",
				Message:     "Unknown file type",
			})
		}
	}

	return nil
}
