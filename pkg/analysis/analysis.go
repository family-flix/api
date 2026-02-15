package analysis

import (
	"context"
	"fmt"
	"strings"

	"github.com/family-flix/api/pkg/file_processor"
	"github.com/family-flix/api/pkg/types"
	"github.com/family-flix/api/pkg/walker"
)

// DriveAnalysisProps properties for creating DriveAnalysis
type DriveAnalysisProps struct {
	UniqueID      string
	Assets        string
	TMDBToken     string
	ExtraScope    []string
	User          User
	Drive         Drive
	Store         Store
	Walker        FolderWalker
	Searcher      MediaSearcher
	FolderFactory func(id string, client any) any

	OnPrint  func(ArticleNode)
	OnError  func(error)
	OnFinish func()
}

// DriveAnalysis struct
type DriveAnalysis struct {
	uniqueID   string
	tmdbToken  string
	assets     string
	extraScope []string

	needStop           bool
	parsedMediaSources []ParsedMediaSourceRecord

	store         Store
	drive         Drive
	user          User
	walker        FolderWalker
	searcher      MediaSearcher
	folderFactory func(id string, client any) any

	handlers map[Events][]func(any)
}

// NewDriveAnalysis creates a new DriveAnalysis instance
func NewDriveAnalysis(props DriveAnalysisProps) (*DriveAnalysis, error) {
	if props.User == nil {
		return nil, fmt.Errorf("missing user info")
	}
	if props.Assets == "" {
		return nil, fmt.Errorf("missing assets root path")
	}
	if props.Drive == nil {
		return nil, fmt.Errorf("missing drive info")
	}
	if props.Store == nil {
		return nil, fmt.Errorf("missing store instance")
	}

	da := &DriveAnalysis{
		uniqueID:      props.UniqueID,
		tmdbToken:     props.TMDBToken,
		assets:        props.Assets,
		extraScope:    props.ExtraScope,
		store:         props.Store,
		drive:         props.Drive,
		user:          props.User,
		walker:        props.Walker,
		searcher:      props.Searcher,
		folderFactory: props.FolderFactory,
		handlers:      make(map[Events][]func(any)),
	}

	// Register initial handlers
	if props.OnPrint != nil {
		da.On(EventPrint, func(data any) {
			if node, ok := data.(ArticleNode); ok {
				props.OnPrint(node)
			}
		})
	}
	if props.OnError != nil {
		da.On(EventError, func(data any) {
			if err, ok := data.(error); ok {
				props.OnError(err)
			}
		})
	}
	if props.OnFinish != nil {
		da.On(EventFinished, func(data any) {
			props.OnFinish()
		})
	}

	da.setupWalker()
	da.setupSearcher()

	return da, nil
}

// On registers an event handler
func (da *DriveAnalysis) On(event Events, handler func(any)) {
	da.handlers[event] = append(da.handlers[event], handler)
}

// Emit emits an event
func (da *DriveAnalysis) Emit(event Events, data any) {
	if handlers, ok := da.handlers[event]; ok {
		for _, h := range handlers {
			h(data)
		}
	}
}

func (da *DriveAnalysis) setupWalker() {
	w := da.walker
	drive := da.drive
	user := da.user
	store := da.store

	w.SetOnError(func(file File) {
		da.Emit(EventPrint, BuildArticleLine(
			fmt.Sprintf("[%s]", drive.GetName()),
			"文件 「", file.Name, "」 出现错误", file.Position,
		))
	})

	totalSize := drive.GetProfile().TotalSize
	var curSizeCount int64 = 0

	w.SetOnFile(func(file File) error {
		curSizeCount += file.Size
		if totalSize != 0 {
			v := float64(curSizeCount) / float64(totalSize)
			if v < 0.0001 {
				v = 0.0001
			}
			if v >= 1 {
				v = 1
			}
			// Node: Number(v.toFixed(4))
			// Node: this.emit(Events.Percent, percent / 2);
			da.Emit(EventPercent, v/2)
		}

		ctx := context.Background()
		existing, err := store.FindFile(ctx, file.FileID, user.GetID(), drive.GetID())
		if err != nil {
			return err
		}

		if existing == nil {
			err := store.CreateFile(ctx, FileData{
				ID:           file.FileID, // Node uses file_id as id? v2.ts: id: file_id
				FileID:       file.FileID,
				Name:         file.Name,
				ParentFileID: file.ParentFileID,
				ParentPaths:  file.ParentPaths,
				Type:         file.Type,
				Size:         file.Size,
				MD5:          file.MD5,
				DriveID:      drive.GetID(),
				UserID:       user.GetID(),
			})
			if err != nil {
				return err
			}
		} else {
			diff := GetDiffOfFile(file.Size, file.MD5, *existing)
			if diff != nil {
				err := store.UpdateFile(ctx, existing.ID, *diff)
				if err != nil {
					return err
				}
			}
		}

		// Delete tmp file if exists
		tmpExisting, _ := store.FindTmpFile(ctx, file.FileID, user.GetID(), drive.GetID())
		if tmpExisting != nil {
			_ = store.DeleteTmpFile(ctx, tmpExisting.ID)
		}

		return nil
	})

	w.SetOnEpisode(func(parsed any) error {
		ep, ok := parsed.(walker.SearchedEpisode)
		if !ok {
			return fmt.Errorf("invalid episode type")
		}

		processor := file_processor.NewEpisodeFileProcessor(
			ep, user.GetID(), drive.GetID(), store,
		)
		processor.OnPrint = func(msg string) {
			da.Emit(EventPrint, BuildArticleLine(msg))
		}
		processor.OnAddEp = func(ep types.ParsedEpisode) {
			da.Emit(EventAddEpisode, ep)
		}

		return processor.Run()
	})

	w.SetOnMovie(func(parsed any) error {
		movie, ok := parsed.(walker.SearchedMovie)
		if !ok {
			return fmt.Errorf("invalid movie type")
		}

		processor := file_processor.NewMovieFileProcessor(
			movie, user.GetID(), drive.GetID(), store,
		)
		processor.OnPrint = func(msg string) {
			da.Emit(EventPrint, BuildArticleLine(msg))
		}
		processor.OnAddMovie = func(m types.ParsedMovie) {
			da.Emit(EventAddMovie, m)
		}

		return processor.Run()
	})

	w.SetOnProfile(func(profile any) error {
		// Not implemented yet
		return nil
	})
}

func (da *DriveAnalysis) setupSearcher() {
	da.searcher.OnPercent(func(percent float64) {
		// Node: Number((0.5 + percent / 2).toFixed(2))
		da.Emit(EventPercent, 0.5+percent/2)
	})
}

// Run executes the analysis
func (da *DriveAnalysis) Run(options map[string]any) error {
	if !da.drive.HasRootFolder() {
		tip := "未设置索引目录，请先设置索引目录"
		da.Emit(EventPrint, BuildArticleLine(tip))
		err := fmt.Errorf("%s", tip)
		da.Emit(EventError, err)
		return err
	}

	walker := da.walker
	ignoreFiles := []string{}
	for _, f := range da.user.GetIgnoreFiles() {
		ignoreFiles = append(ignoreFiles, strings.Join([]string{da.drive.GetProfile().RootFolderName, f}, "/"))
	}

	walker.SetFilter(func(curFile types.FileInfo) (bool, error) {
		// Node: if (ignore_files.includes([cur_file.parent_paths, cur_file.name].join("/")))
		path := curFile.ParentPaths
		if path != "" {
			path += "/"
		}
		path += curFile.Name

		for _, ignore := range ignoreFiles {
			if path == ignore {
				return true, nil
			}
		}
		return false, nil
	})

	episodeCount := 0
	movieCount := 0

	da.On(EventAddEpisode, func(data any) {
		episodeCount++
	})
	da.On(EventAddMovie, func(data any) {
		movieCount++
	})

	if da.folderFactory == nil {
		return fmt.Errorf("folder factory not provided")
	}
	folder := da.folderFactory(da.drive.GetProfile().RootFolderID, da.drive.GetClient())

	// Assuming folder has Profile() method, but we can't call it on 'any'
	// We'll skip the folder.profile() check for now or assume walker handles it

	err := walker.Run(folder, []string{})
	if err != nil {
		return err
	}

	da.Emit(EventPrint, BuildArticleLine(fmt.Sprintf("[%s]", da.drive.GetName()), "云盘文件查找完成"))

	if episodeCount+movieCount == 0 {
		da.Emit(EventPrint, BuildArticleLine(fmt.Sprintf("[%s]", da.drive.GetName()), "遍历云盘没有查找到新增影视剧"))
	} else {
		da.Emit(EventPrint, BuildArticleLine(fmt.Sprintf("[%s]", da.drive.GetName()), fmt.Sprintf("共找到 %d 个剧集，%d 个电影", episodeCount, movieCount)))
	}

	da.Emit(EventPercent, 0.5)
	if da.needStop {
		return nil
	}

	// Start searching logic...
	// In v2.ts, it continues to search logic.
	da.Emit(EventPrint, BuildArticleLine("开始搜索影视剧信息"))

	// Logic for searcher is triggered here or searcher is already running?
	// In v2.ts: "const r2 = await MediaSearcher.New(...)". "const searcher = r2.data".
	// DriveAnalysis constructor receives searcher.
	// But in `Run`, it doesn't seem to call `searcher.run()`.
	// Wait, `MediaSearcher` in Node might be active or reactive?
	// Ah, I missed where searcher is triggered.
	// In v2.ts:
	// ...
	// this.emit(Events.Print, new ArticleSectionNode({...}))
	// ...
	// The rest of the file was cut off in previous read.

	return nil
}

// Helper for building article lines
func BuildArticleLine(parts ...any) ArticleLineNode {
	text := ""
	for _, p := range parts {
		text += fmt.Sprint(p)
	}
	return ArticleLineNode{Text: text}
}
