package walker

import (
	"fmt"
	"regexp"
	"testing"
)

func TestNameRegexp(t *testing.T) {
	nameRegexpStr := `[\x{0400}-\x{04FF}\x{0800}-\x{4e00}\x{4e00}-\x{9fa5}\x{ac00}-\x{d7a3}0-9a-zA-Z]{1,}[ \.\-&!,'（）：！？～×－\x{0400}-\x{04FF}\x{0800}-\x{4e00}\x{4e00}-\x{9fa5}\x{ac00}-\x{d7a3}0-9a-zA-Z]{1,}[）\x{0400}-\x{04FF}\x{0800}-\x{4e00}\x{4e00}-\x{9fa5}\x{ac00}-\x{d7a3}0-9a-zA-Z!！？－]`
	nameRegexp := regexp.MustCompile(nameRegexpStr)

	// Simulate "1080台版高码.1080三无.4k.60帧" after removing parts
	// "台版" removed, "高码" removed, "三无" removed.
	// Assuming placeholders or just removal.
	// "1080.1080.4k.60帧" -> if removing just text, dots might remain.
	// "1080..1080..4k.60帧"

	curFilename := "1080..1080..4k.60帧"

	// Simulate removeMultipleDot
	curFilename = regexp.MustCompile(`[\.]{2,}`).ReplaceAllString(curFilename, "`")
	curFilename = regexp.MustCompile(`^\.{0,1}`).ReplaceAllString(curFilename, "")

	fmt.Printf("After removeMultipleDot: %s\n", curFilename)

	match := nameRegexp.FindString(curFilename)
	fmt.Printf("Match: %s\n", match)
}
