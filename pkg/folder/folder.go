package folder

import (
	"strings"
	"time"

	"github.com/family-flix/api/pkg/drive_client"
	"github.com/family-flix/api/pkg/types"
)

// ParentFolder represents a parent folder info
type ParentFolder struct {
	ID   string
	Name string
}

// File struct
type File struct {
	ID           string
	Name         string
	ParentFileID string
	Type         types.FileType
	Size         int64
	MD5          string
	MimeType     string
	Parents      []ParentFolder
	Parent       *Folder
	Client       drive_client.DriveClient
}

// NewFile creates a new File
func NewFile(id string, client drive_client.DriveClient, parents []ParentFolder, parent *Folder) *File {
	return &File{
		ID:      id,
		Client:  client,
		Parents: parents,
		Parent:  parent,
		Type:    types.FileTypeFile,
	}
}

// SetProfile sets file profile
func (f *File) SetProfile(file drive_client.DriveFile) {
	f.Name = file.Name
	f.Size = file.Size
	f.MD5 = file.MD5
	f.MimeType = file.MimeType
}

func (f *File) GetParentPaths() string {
	var names []string
	for _, p := range f.Parents {
		names = append(names, p.Name)
	}
	return strings.Join(names, "/")
}

// Folder struct
type Folder struct {
	ID           string
	Name         string
	ParentFileID string
	Type         types.FileType
	Size         int64
	Parents      []ParentFolder
	Parent       *Folder
	Client       drive_client.DriveClient
	NextMarker   string
	Items        []interface{} // File or Folder
	CurItems     []interface{}
	Delay        time.Duration
}

// NewFolder creates a new Folder
func NewFolder(id string, client drive_client.DriveClient, parents []ParentFolder, parent *Folder) *Folder {
	return &Folder{
		ID:         id,
		Client:     client,
		Parents:    parents,
		Parent:     parent,
		Type:       types.FileTypeFolder,
		NextMarker: "initial",
	}
}

// SetProfile sets folder profile
func (f *Folder) SetProfile(file drive_client.DriveFile) {
	f.Name = file.Name
	f.Size = file.Size
	f.ParentFileID = file.ParentFileID
}

// Profile fetches and sets folder profile
func (f *Folder) Profile() (*drive_client.DriveFile, error) {
	file, err := f.Client.FetchFile(f.ID)
	if err != nil {
		return nil, err
	}
	f.SetProfile(*file)
	return file, nil
}

// Next fetches next batch of files
func (f *Folder) Next() ([]interface{}, error) {
	if f.Delay > 0 {
		time.Sleep(f.Delay)
	}
	if f.NextMarker == "" {
		return []interface{}{}, nil
	}

	marker := f.NextMarker
	if marker == "initial" {
		marker = ""
	}

	res, err := f.Client.FetchFiles(f.ID, drive_client.FetchFilesOptions{Marker: marker})
	if err != nil {
		return nil, err
	}

	f.NextMarker = res.NextMarker
	var items []interface{}

	currentParents := append(f.Parents, ParentFolder{ID: f.ID, Name: f.Name})

	for _, item := range res.Items {
		if item.Type == types.FileTypeFolder {
			folder := NewFolder(item.FileID, f.Client, currentParents, f)
			folder.SetProfile(item)
			items = append(items, folder)
		} else {
			file := NewFile(item.FileID, f.Client, currentParents, f)
			file.SetProfile(item)
			items = append(items, file)
		}
	}

	f.CurItems = items
	f.Items = append(f.Items, items...)
	return items, nil
}

// Walk recursively walks the folder
func (f *Folder) Walk(handler func(item interface{}) (bool, error), deep bool) error {
	if f.Name == "" {
		_, err := f.Profile()
		if err != nil {
			return err
		}
	}

	for {
		items, err := f.Next()
		if err != nil {
			// Log error and continue? Node version continues on error in next() with console.log
			// "if (r.error) { console.log(r.error.message); continue; }"
			// But if FetchFiles fails, we might want to return error or just stop this folder?
			// Let's return error for now.
			return err
		}
		if len(items) == 0 && f.NextMarker == "" {
			break
		}

		for _, item := range items {
			cont, err := handler(item)
			if err != nil {
				return err
			}
			if !cont {
				return nil
			}

			if folder, ok := item.(*Folder); ok && deep {
				err := folder.Walk(handler, deep)
				if err != nil {
					return err
				}
			}
		}

		if f.NextMarker == "" {
			break
		}
	}
	return nil
}

func (f *Folder) GetParentPaths() string {
	var names []string
	for _, p := range f.Parents {
		names = append(names, p.Name)
	}
	return strings.Join(names, "/")
}
