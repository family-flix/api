package analysis

import (
	"strings"

	"github.com/family-flix/api/pkg/types"
)

// NeedSkipTheFileWhenWalk determines if the current file should be skipped based on target
func NeedSkipTheFileWhenWalk(targetFileName string, targetFileType types.FileType, curFile types.FileInfo) bool {
	curType := curFile.Type
	name := curFile.Name
	curFileParentPaths := curFile.ParentPaths

	if targetFileType == types.FileTypeFolder {
		// If we only want to process a specific folder, e.g., a/b
		if curType == types.FileTypeFile {
			// Visiting a/b/c/d/e.mp4 -> parent_paths = a/b/c/d -> starts with a/b -> Keep
			// Visiting a/f/g.mp4 -> parent_paths = a/f -> starts with a/b? No -> Skip
			if strings.HasPrefix(curFileParentPaths, targetFileName) {
				return false
			}
		}
		if curType == types.FileTypeFolder {
			// curFile.Name = d; curFile.ParentPaths = a/b/c
			// curFile.Name = c; curFile.ParentPaths = a/b
			// curFile.Name = b; curFile.ParentPaths = a
			// curFile.Name = a; curFile.ParentPaths = ""

			// Construct current filepath: parent_paths/name/
			// Note: Node code uses [cur_file_parent_paths, name, ""].join("/") which results in "path/name/"
			parts := []string{curFileParentPaths, name, ""}
			curFilepath := strings.Join(parts, "/")
			// Handle leading slash if parent path is empty but Join adds one?
			// Node: ["", "a", ""].join("/") -> "/a/" if empty string.
			// But usually parent_paths is not empty or handled.
			// Let's mimic Node's join behavior.
			if curFileParentPaths == "" {
				// If parent is empty, Join("", "name", "") -> "/name/"
				// But if parent_paths is "a", Join("a", "b", "") -> "a/b/"
				// Wait, strings.Join([]string{"a", "b", ""}, "/") -> "a/b/"
				// strings.Join([]string{"", "a", ""}, "/") -> "/a/"
				// If parent_paths is empty string?
			}

			// Let's refine join logic to match simple concatenation with separator
			curFilepath = curFileParentPaths
			if curFilepath != "" {
				curFilepath += "/"
			}
			curFilepath += name + "/"

			if strings.HasPrefix(curFilepath, targetFileName) {
				return false
			}
			// target_file_name starts with cur_file_path?
			// e.g. target="a/b/c", cur="a/b/" -> Yes.
			if strings.HasPrefix(targetFileName, curFilepath) {
				return false
			}
		}
	}

	if targetFileType == types.FileTypeFile {
		// If we only want to process a specific file, e.g., a/b/c/d/e.mp4
		if curType == types.FileTypeFile {
			// Current file: a/b/c/e.mp4
			// Node: `${cur_file_parent_paths}/${name}` === target_file_name
			curFullPath := curFileParentPaths
			if curFullPath != "" {
				curFullPath += "/"
			}
			curFullPath += name

			if curFullPath == targetFileName {
				return false
			}
		}
		if curType == types.FileTypeFolder {
			// Check if target file is inside this folder or this folder is part of target file path
			curFullPath := curFileParentPaths
			if curFullPath != "" {
				curFullPath += "/"
			}
			curFullPath += name

			// target_file_name starts with curFullPath?
			// e.g. target="a/b/c.mp4", cur="a/b" -> Yes
			// Node uses `${cur_file_parent_paths}/${name}`
			if strings.HasPrefix(targetFileName, curFullPath) {
				return false
			}
			// curFullPath starts with target? (Folder name is longer than target file? Unlikely for file target)
			if strings.HasPrefix(curFullPath, targetFileName) {
				return false
			}
		}
	}

	return true
}

// FileRecord represents the file record in DB
type FileRecord struct {
	ID   string
	Size int64
	MD5  string
}

// FileUpdateData represents fields to update
type FileUpdateData struct {
	Size *int64
	MD5  *string
}

// GetDiffOfFile compares file info with existing record
func GetDiffOfFile(fileSize int64, fileMD5 string, record FileRecord) *FileUpdateData {
	diff := &FileUpdateData{}
	hasDiff := false

	if fileSize != 0 && fileSize != record.Size {
		diff.Size = &fileSize
		hasDiff = true
	}
	if fileMD5 != "" && fileMD5 != record.MD5 {
		diff.MD5 = &fileMD5
		hasDiff = true
	}

	if !hasDiff {
		return nil
	}
	return diff
}
