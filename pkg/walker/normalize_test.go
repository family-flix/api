package walker

import (
	"fmt"
	"testing"
)

func TestNormalizeEpisodeText(t *testing.T) {
	filename := "知否知否应是绿肥红瘦.1080台版高码.1080三无.4k.60帧"
	fmt.Printf("Original: %s\n", filename)
	normalized := normalizeEpisodeText(filename)
	fmt.Printf("Normalized: %s\n", normalized)
	
	if normalized != filename {
		// If it changed, we want to know why/how.
		// For 1080, it should NOT change if it's considered resolution.
		// But normalizeEpisodeText is dumb regex.
		fmt.Printf("CHANGED! %s -> %s\n", filename, normalized)
	}

	filename2 := ".1080."
	normalized2 := normalizeEpisodeText(filename2)
	fmt.Printf("Original: %s, Normalized: %s\n", filename2, normalized2)
}
