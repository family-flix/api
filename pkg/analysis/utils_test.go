package analysis

import (
	"testing"
)

func TestNeedSkipTheFileWhenWalk(t *testing.T) {
	tests := []struct {
		name           string
		targetFileName string
		targetFileType FileType
		curFile        FileInfo
		want           bool
	}{
		{
			name:           "Folder target, file in folder",
			targetFileName: "a/b",
			targetFileType: FileTypeFolder,
			curFile: FileInfo{
				Type:        FileTypeFile,
				Name:        "e.mp4",
				ParentPaths: "a/b/c/d",
			},
			want: false, // Keep (starts with a/b)
		},
		{
			name:           "Folder target, file outside folder",
			targetFileName: "a/b",
			targetFileType: FileTypeFolder,
			curFile: FileInfo{
				Type:        FileTypeFile,
				Name:        "g.mp4",
				ParentPaths: "a/f",
			},
			want: true, // Skip
		},
		{
			name:           "Folder target, visiting parent folder",
			targetFileName: "a/b",
			targetFileType: FileTypeFolder,
			curFile: FileInfo{
				Type:        FileTypeFolder,
				Name:        "a",
				ParentPaths: "",
			},
			want: false, // Keep (a is part of a/b)
		},
		{
			name:           "Folder target, visiting sub folder",
			targetFileName: "a/b",
			targetFileType: FileTypeFolder,
			curFile: FileInfo{
				Type:        FileTypeFolder,
				Name:        "c",
				ParentPaths: "a/b",
			},
			want: false, // Keep (a/b/c starts with a/b)
		},
		{
			name:           "File target, exact file",
			targetFileName: "a/b/c/e.mp4",
			targetFileType: FileTypeFile,
			curFile: FileInfo{
				Type:        FileTypeFile,
				Name:        "e.mp4",
				ParentPaths: "a/b/c",
			},
			want: false, // Keep
		},
		{
			name:           "File target, other file",
			targetFileName: "a/b/c/e.mp4",
			targetFileType: FileTypeFile,
			curFile: FileInfo{
				Type:        FileTypeFile,
				Name:        "f.mp4",
				ParentPaths: "a/b/c",
			},
			want: true, // Skip
		},
		{
			name:           "File target, parent folder",
			targetFileName: "a/b/c/e.mp4",
			targetFileType: FileTypeFile,
			curFile: FileInfo{
				Type:        FileTypeFolder,
				Name:        "b",
				ParentPaths: "a",
			},
			want: false, // Keep
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := NeedSkipTheFileWhenWalk(tt.targetFileName, tt.targetFileType, tt.curFile)
			if got != tt.want {
				t.Errorf("NeedSkipTheFileWhenWalk() = %v, want %v", got, tt.want)
			}
		})
	}
}
