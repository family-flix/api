package analysis

import (
	"context"

	"github.com/family-flix/api/pkg/types"
)

// Result represents a generic result type
type Result[T any] struct {
	Data  T
	Error error
}

func Ok[T any](data T) Result[T] {
	return Result[T]{Data: data}
}

func Err[T any](err error) Result[T] {
	return Result[T]{Error: err}
}

// User interface
type User interface {
	GetID() string
	GetFilenameRules() string
	GetIgnoreFiles() []string
}

// DriveProfile represents drive profile
type DriveProfile struct {
	TotalSize      int64
	RootFolderID   string
	RootFolderName string
}

// Drive interface
type Drive interface {
	GetID() string
	GetName() string
	GetProfile() DriveProfile
	HasRootFolder() bool
	GetClient() any // Generic client
}

// File represents a file from walker
type File struct {
	FileID       string
	Name         string
	ParentFileID string
	ParentPaths  string
	Type         types.FileType
	Size         int64
	MD5          string
	Position     string // For error reporting
}

// FolderWalker interface
type FolderWalker interface {
	SetOnError(func(file File))
	SetOnFile(func(file File) error)
	SetOnEpisode(func(parsed any) error) // parsed is generic for now
	SetOnMovie(func(parsed any) error)
	SetOnProfile(func(profile any) error)
	SetFilter(func(curFile types.FileInfo) (bool, error))
	Run(folder any, paths []string) error
}

// MediaSearcher interface
type MediaSearcher interface {
	OnPercent(func(percent float64))
}

// Store interface
type Store interface {
	types.DataStore
	FindFile(ctx context.Context, fileID, userID, driveID string) (*FileRecord, error)
	CreateFile(ctx context.Context, data FileData) error
	UpdateFile(ctx context.Context, id string, data FileUpdateData) error

	FindTmpFile(ctx context.Context, fileID, userID, driveID string) (*FileRecord, error)
	DeleteTmpFile(ctx context.Context, id string) error
}

// FileData for creating file
type FileData struct {
	ID           string
	FileID       string
	Name         string
	ParentFileID string
	ParentPaths  string
	Type         types.FileType
	Size         int64
	MD5          string
	DriveID      string
	UserID       string
}

// Events for callbacks
type Events string

const (
	EventAddTV         Events = "AddTV"
	EventAddSeason     Events = "AddSeason"
	EventAddEpisode    Events = "AddEpisode"
	EventAddMovie      Events = "AddMovie"
	EventPrint         Events = "Print"
	EventError         Events = "Error"
	EventPercent       Events = "Percent"
	EventWalkCompleted Events = "WalkCompleted"
	EventFinished      Events = "Finished"
)

// ParsedMediaSourceRecord mock
type ParsedMediaSourceRecord struct {
	// Add fields as needed
}

// Article structures
type ArticleNode interface{}

type ArticleLineNode struct {
	Children []ArticleNode
	Text     string
}

type ArticleSectionNode struct {
	Children []ArticleNode
}

type ArticleHeadNode struct {
	Level int
	Text  string
}

// Processor interfaces
type ProcessorResult struct {
	Data  ParsedMediaSourceRecord
	Error error
}

type Processor interface {
	Run(input any) ProcessorResult
}

type ProcessorFactory interface {
	NewEpisodeFileProcessor(uniqueID string, episode any, user User, drive Drive, store Store, onPrint func(ArticleNode)) Processor
	NewMovieFileProcessor(uniqueID string, movie any, userID, driveID string, store Store) Processor
	NewMediaProfileProcessor(token, assets string, store Store, user User, drive Drive, searcher MediaSearcher) Processor
}
