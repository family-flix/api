package analysis

import (
	"testing"

	"github.com/family-flix/api/pkg/types"
)

func TestNeedSkipTheFileWhenWalk(t *testing.T) {
	tests := []struct {
		name           string
		targetFileName string
		targetFileType types.FileType
		curFile        types.FileInfo
		want           bool
	}{
		{
			name:           "Folder target, file in folder",
			targetFileName: "a/b",
			targetFileType: types.FileTypeFolder,
			curFile: types.FileInfo{
				Type:        types.FileTypeFile,
				Name:        "e.mp4",
				ParentPaths: "a/b/c/d",
			},
			want: false,
		},
		{
			name:           "Folder target, file outside folder",
			targetFileName: "a/b",
			targetFileType: types.FileTypeFolder,
			curFile: types.FileInfo{
				Type:        types.FileTypeFile,
				Name:        "g.mp4",
				ParentPaths: "a/f",
			},
			want: true,
		},
		{
			name:           "Folder target, visiting parent folder",
			targetFileName: "a/b",
			targetFileType: types.FileTypeFolder,
			curFile: types.FileInfo{
				Type:        types.FileTypeFolder,
				Name:        "a",
				ParentPaths: "",
			},
			want: false,
		},
		{
			name:           "Folder target, visiting sub folder",
			targetFileName: "a/b",
			targetFileType: types.FileTypeFolder,
			curFile: types.FileInfo{
				Type:        types.FileTypeFolder,
				Name:        "c",
				ParentPaths: "a/b",
			},
			want: false,
		},
		{
			name:           "File target, exact file",
			targetFileName: "a/b/c/e.mp4",
			targetFileType: types.FileTypeFile,
			curFile: types.FileInfo{
				Type:        types.FileTypeFile,
				Name:        "e.mp4",
				ParentPaths: "a/b/c",
			},
			want: false,
		},
		{
			name:           "File target, other file",
			targetFileName: "a/b/c/e.mp4",
			targetFileType: types.FileTypeFile,
			curFile: types.FileInfo{
				Type:        types.FileTypeFile,
				Name:        "f.mp4",
				ParentPaths: "a/b/c",
			},
			want: true,
		},
		{
			name:           "File target, parent folder",
			targetFileName: "a/b/c/e.mp4",
			targetFileType: types.FileTypeFile,
			curFile: types.FileInfo{
				Type:        types.FileTypeFolder,
				Name:        "b",
				ParentPaths: "a",
			},
			want: false,
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
