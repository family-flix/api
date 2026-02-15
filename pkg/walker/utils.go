package walker

import (
	"fmt"
	"path/filepath"
	"regexp"
	"strings"
)

func IsImgFile(filename string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif":
		return true
	}
	return false
}

func IsSubtitleFile(filename string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".ass", ".srt", ".vtt", ".ssa":
		return true
	}
	return false
}

func IsNfoFile(filename string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	return ext == ".nfo"
}

func IsVideoFile(filename string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".mp4", ".mkv", ".avi", ".mov", ".rmvb", ".wmv", ".flv", ".webm", ".iso", ".m2ts", ".ts":
		return true
	}
	return false
}

// Helper functions for Parser

func IsJapanese(text string) bool {
	// TS:
	// const chinese_char = text.match(/[\u4e00-\u9fff]/g) || [];
	// const japanese_char = text.match(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/g) || [];
	// if (japanese_char.length > chinese_char.length) { return true; }

	chineseCount := 0
	japaneseCount := 0

	// Go regex for unicode ranges
	// \u4e00-\u9fff is CJK Unified Ideographs
	// \u3040-\u30ff is Hiragana and Katakana
	// \u3400-\u4dbf is CJK Unified Ideographs Extension A

	rChinese := regexp.MustCompile(`[\x{4e00}-\x{9fff}]`)
	rJapanese := regexp.MustCompile(`[\x{3040}-\x{30ff}\x{3400}-\x{4dbf}\x{4e00}-\x{9fff}]`)

	// FindAllString returns a slice of all matches
	chineseMatches := rChinese.FindAllString(text, -1)
	japaneseMatches := rJapanese.FindAllString(text, -1)

	chineseCount = len(chineseMatches)
	japaneseCount = len(japaneseMatches)

	return japaneseCount > chineseCount
}

func IsKorean(text string) bool {
	// TS:
	// const chinese_char = text.match(/[\u4e00-\u9fff]/g) || [];
	// const korean_char = text.match(/[\uac00-\ud7a3]/g) || [];
	// if (korean_char.length > chinese_char.length) { return true; }

	rChinese := regexp.MustCompile(`[\x{4e00}-\x{9fff}]`)
	rKorean := regexp.MustCompile(`[\x{ac00}-\x{d7a3}]`)

	chineseCount := len(rChinese.FindAllString(text, -1))
	koreanCount := len(rKorean.FindAllString(text, -1))

	return koreanCount > chineseCount
}

func PaddingZero(v interface{}) string {
	var s string
	switch val := v.(type) {
	case int:
		s = fmt.Sprintf("%d", val)
	case string:
		s = val
	default:
		return ""
	}

	if len(s) < 2 {
		return "0" + s
	}
	return s
}

// ChineseNumToNum converts Chinese numerals to int.
// Supports 0-9999 roughly.
func ChineseNumToNum(s string) int {
	cnNums := map[rune]int{
		'零': 0, '一': 1, '二': 2, '三': 3, '四': 4,
		'五': 5, '六': 6, '七': 7, '八': 8, '九': 9,
		'十': 10, '百': 100, '千': 1000, '万': 10000,
		'两': 2,
	}

	// Simple mapping check first
	if len([]rune(s)) == 1 {
		if v, ok := cnNums[[]rune(s)[0]]; ok {
			return v
		}
	}

	// Complex parsing
	// A simple approach: iterate and sum
	// Examples:
	// 十一 -> 11 (10 + 1)
	// 二十 -> 20 (2 * 10)
	// 一百零一 -> 101

	runes := []rune(s)
	// Reverse loop might be easier for some algos, but let's do forward
	// Standard algo:
	// Iterate chars. If digit, update temp. If unit, total += temp * unit, temp = 0.
	// But '十' can be a digit (10) or unit.
	// In "十一", '十' is 10. In "二十", '十' is unit 10.

	// Let's use a robust method.
	// Split into units: 万, 千, 百, 十

	// Simplified implementation for common cases in filenames (Season/Episode numbers usually < 1000)

	// Handle "十" at start (e.g. 十一, 十二) -> treated as 1 * 10 + ...
	// Handle "十" at end (e.g. 二十) -> treated as ... * 10

	val := 0
	current := 0

	for i, r := range runes {
		if v, ok := cnNums[r]; ok {
			if v >= 10 { // Unit
				if current == 0 && (v == 10) && i == 0 {
					// "十..." -> 10 + ...
					current = 1
				}
				if current == 0 && (v == 10) && i > 0 {
					// "...十" where prev was not a number? Should not happen if valid.
					// But if we have "一百零十" (invalid) vs "一百一十"
				}

				val += current * v
				current = 0
			} else {
				current = v
			}
		}
	}
	val += current
	return val
}

func RemoveStr(s string, from int, length int, placeholder string) string {
	// In TS:
	// const pre = str.slice(0, index);
	// const post = str.slice(index + count);
	// return pre + (replacement || "") + post;

	// Note: 'from' is byte index in Go if we used index from regex match?
	// Regex match indices in Go are byte indices.
	// So we can use simple slicing.

	if from < 0 || from >= len(s) {
		return s
	}
	if from+length > len(s) {
		return s
	}

	pre := s[:from]
	post := s[from+length:]
	return pre + placeholder + post
}
