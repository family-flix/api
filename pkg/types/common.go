package types

// FileType represents the type of file (file or folder)
type FileType string

const (
	FileTypeFile    FileType = "file"
	FileTypeFolder  FileType = "folder"
	FileTypeUnknown FileType = "unknown"
)

// FileInfo represents the file information used in walk
type FileInfo struct {
	Type        FileType
	Name        string
	ParentPaths string
}
