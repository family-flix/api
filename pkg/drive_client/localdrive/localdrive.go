package localdrive

import (
	"fmt"
	"mime"
	"os"
	"path/filepath"

	"github.com/family-flix/api/pkg/drive_client"
	"github.com/family-flix/api/pkg/types"
)

const DefaultPageSize = 50

type LocalDriveClient struct {
	// RootPath string // Optional: if we want to restrict access or use relative paths
}

func NewLocalDriveClient() *LocalDriveClient {
	return &LocalDriveClient{}
}

// FetchFile implements DriveClient.FetchFile
func (c *LocalDriveClient) FetchFile(id string) (*drive_client.DriveFile, error) {
	info, err := os.Stat(id)
	if err != nil {
		return nil, err
	}

	return c.fileInfoToDriveFile(id, info), nil
}

// FetchFiles implements DriveClient.FetchFiles
func (c *LocalDriveClient) FetchFiles(id string, options drive_client.FetchFilesOptions) (*drive_client.FetchFilesResult, error) {
	entries, err := os.ReadDir(id)
	if err != nil {
		return nil, err
	}

	var startIndex int
	if options.Marker != "" {
		// Find the index after the marker
		// os.ReadDir returns sorted entries by name
		found := false
		for i, entry := range entries {
			if entry.Name() == options.Marker {
				startIndex = i + 1
				found = true
				break
			}
		}
		if !found {
			// If marker not found (e.g. file deleted), start from beginning?
			// Or maybe the marker *is* the last processed file, so if it's gone, we might have an issue.
			// For simplicity, if marker not found but we have a marker, we might want to search for the insertion point.
			// But simple exact match is safer for now.
			// If marker provided but not found, let's start from 0 to be safe, or return empty?
			// Let's assume correct usage. If not found, maybe we should search for where it *would* be.
			// But let's keep it simple: if not found, we scan to find the first one > marker.
			for i, entry := range entries {
				if entry.Name() > options.Marker {
					startIndex = i
					break
				}
			}
			// If all are <= marker, startIndex remains 0? No, that would repeat.
			// If we iterated all and didn't find one > marker, startIndex should be len(entries)
			if startIndex == 0 && len(entries) > 0 && entries[len(entries)-1].Name() <= options.Marker {
				startIndex = len(entries)
			}
		}
	}

	var items []drive_client.DriveFile
	var nextMarker string

	count := 0
	for i := startIndex; i < len(entries); i++ {
		if count >= DefaultPageSize {
			nextMarker = entries[i-1].Name()
			break
		}

		entry := entries[i]
		info, err := entry.Info()
		if err != nil {
			continue // Skip files we can't stat
		}

		fullPath := filepath.Join(id, entry.Name())
		items = append(items, *c.fileInfoToDriveFile(fullPath, info))
		count++
	}

	// If we finished the list without hitting the limit
	if nextMarker == "" && startIndex+count < len(entries) {
		// This happens if we broke loop? No, we break only if count >= limit.
		// Wait, the logic above: if we break, nextMarker is set.
		// If we finish loop normally, nextMarker remains empty, which is correct (no more pages).
	} else if nextMarker == "" && count == DefaultPageSize && startIndex+count < len(entries) {
		// We hit the limit exactly at the end?
		// If there are more items remaining:
		nextMarker = items[len(items)-1].Name
	}

	return &drive_client.FetchFilesResult{
		Items:      items,
		NextMarker: nextMarker,
	}, nil
}

func (c *LocalDriveClient) RefreshProfile() (*drive_client.ProfileInfo, error) {
	return &drive_client.ProfileInfo{}, nil
}

func (c *LocalDriveClient) RenameFile(fileID string, name string) (*drive_client.DriveFile, error) {
	dir := filepath.Dir(fileID)
	newPath := filepath.Join(dir, name)
	if err := os.Rename(fileID, newPath); err != nil {
		return nil, err
	}
	return c.FetchFile(newPath)
}

func (c *LocalDriveClient) DeleteFile(fileID string) error {
	return os.RemoveAll(fileID)
}

func (c *LocalDriveClient) CreateFolder(name string, parentFileID string) (*drive_client.DriveFile, error) {
	p := filepath.Join(parentFileID, name)
	if err := os.MkdirAll(p, 0755); err != nil {
		return nil, err
	}
	return c.FetchFile(p)
}

func (c *LocalDriveClient) SearchFiles(name string, fileType string, marker string) (*drive_client.FetchFilesResult, error) {
	return &drive_client.FetchFilesResult{}, nil
}

func (c *LocalDriveClient) Download(fileID string) (string, error) {
	return fileID, nil
}

func (c *LocalDriveClient) FetchVideoPreviewInfo(fileID string) (*drive_client.VideoPreviewInfo, error) {
	return nil, fmt.Errorf("local drive does not support video preview")
}

func (c *LocalDriveClient) fileInfoToDriveFile(path string, info os.FileInfo) *drive_client.DriveFile {
	fileType := types.FileTypeFile
	if info.IsDir() {
		fileType = types.FileTypeFolder
	}

	parentID := filepath.Dir(path)
	if parentID == path { // Root
		parentID = ""
	}

	mimeType := mime.TypeByExtension(filepath.Ext(info.Name()))

	return &drive_client.DriveFile{
		FileID:       path,
		Name:         info.Name(),
		Type:         fileType,
		Size:         info.Size(),
		ParentFileID: parentID,
		MD5:          "", // Calculating MD5 is expensive
		MimeType:     mimeType,
	}
}
