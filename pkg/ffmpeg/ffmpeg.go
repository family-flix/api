package ffmpeg

import (
	"crypto/md5"
	"encoding/binary"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

type FFmpeg struct {
	Bin      string
	CacheDir string
}

func New(bin, cache_dir string) *FFmpeg {
	if bin == "" {
		bin = "ffmpeg"
	}
	return &FFmpeg{Bin: bin, CacheDir: cache_dir}
}

func (f *FFmpeg) Available() bool {
	_, err := exec.LookPath(f.Bin)
	return err == nil
}

// CheckMoovPosition returns true if moov atom is before mdat (i.e. faststart).
func CheckMoovPosition(filePath string) bool {
	file, err := os.Open(filePath)
	if err != nil {
		return false
	}
	defer file.Close()

	var offset int64
	buf := make([]byte, 8)
	for {
		if _, err := file.ReadAt(buf, offset); err != nil {
			return false
		}
		size := int64(binary.BigEndian.Uint32(buf[0:4]))
		boxType := string(buf[4:8])
		if size == 1 {
			// 64-bit extended size
			buf64 := make([]byte, 8)
			if _, err := file.ReadAt(buf64, offset+8); err != nil {
				return false
			}
			size = int64(binary.BigEndian.Uint64(buf64))
		}
		if size < 8 {
			return false
		}
		switch boxType {
		case "moov":
			return true // moov found before mdat
		case "mdat":
			return false // mdat found before moov
		}
		offset += size
	}
}

// CacheKey returns md5 hex of a file path.
func CacheKey(filePath string) string {
	return fmt.Sprintf("%x", md5.Sum([]byte(filePath)))
}

func (f *FFmpeg) FaststartPath(filePath string) string {
	return filepath.Join(f.CacheDir, "faststart", CacheKey(filePath)+".mp4")
}

func (f *FFmpeg) HLSDir(filePath string) string {
	return filepath.Join(f.CacheDir, "hls", CacheKey(filePath))
}

// FixFaststart creates a faststart copy of the input file.
func (f *FFmpeg) FixFaststart(input, output string) error {
	os.MkdirAll(filepath.Dir(output), 0755)
	cmd := exec.Command(f.Bin, "-i", input, "-c", "copy", "-movflags", "+faststart", "-y", output)
	return cmd.Run()
}

// GenerateHLS transcodes input to HLS segments in outputDir.
func (f *FFmpeg) GenerateHLS(input, outputDir string) error {
	os.MkdirAll(outputDir, 0755)
	m3u8 := filepath.Join(outputDir, "index.m3u8")
	segPattern := filepath.Join(outputDir, "seg%03d.ts")
	cmd := exec.Command(f.Bin,
		"-i", input,
		"-c:v", "libx264", "-b:v", "1500k", "-maxrate", "1500k", "-bufsize", "3000k",
		"-c:a", "aac", "-b:a", "128k",
		"-f", "hls", "-hls_time", "6", "-hls_list_size", "0",
		"-hls_segment_filename", segPattern,
		"-y", m3u8,
	)
	return cmd.Run()
}
