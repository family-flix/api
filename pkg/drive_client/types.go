package drive_client

import "github.com/family-flix/api/pkg/types"

// DriveFile represents the raw file info from drive client
type DriveFile struct {
	FileID       string
	Name         string
	Type         types.FileType
	Size         int64
	ParentFileID string
	MD5          string
	MimeType     string
	// Add other fields as needed
}

// FetchFilesOptions options for fetching files
type FetchFilesOptions struct {
	Marker string
}

// FetchFilesResult result of fetching files
type FetchFilesResult struct {
	Items      []DriveFile
	NextMarker string
}

// DriveClient interface for interacting with cloud drives
type DriveClient interface {
	FetchFile(id string) (*DriveFile, error)
	FetchFiles(id string, options FetchFilesOptions) (*FetchFilesResult, error)
}
