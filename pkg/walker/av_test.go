package walker

import (
	"testing"
)

func TestParseFilenameForJAV(t *testing.T) {
	t.Run("STARS-456", func(t *testing.T) {
		got := ParseFilenameForJAV("[hhd800.com]STARS-456.uncensored.mp4")
		if got != "STARS-456" {
			t.Errorf("got %q, want %q", got, "STARS-456")
		}
	})

	t.Run("259LUXU-1234", func(t *testing.T) {
		got := ParseFilenameForJAV("259LUXU-1234_4K.mp4")
		if got != "259LUXU-1234" {
			t.Errorf("got %q, want %q", got, "259LUXU-1234")
		}
	})

	t.Run("FC2-PPV-1234567", func(t *testing.T) {
		got := ParseFilenameForJAV("FC2-PPV-1234567.mp4")
		if got != "FC2-PPV-1234567" {
			t.Errorf("got %q, want %q", got, "FC2-PPV-1234567")
		}
	})

	t.Run("IPX-888", func(t *testing.T) {
		got := ParseFilenameForJAV("IPX-888.中文字幕.mkv")
		if got != "IPX-888" {
			t.Errorf("got %q, want %q", got, "IPX-888")
		}
	})

	t.Run("SSIS-001", func(t *testing.T) {
		got := ParseFilenameForJAV("SSIS-001.1080p.mp4")
		if got != "SSIS-001" {
			t.Errorf("got %q, want %q", got, "SSIS-001")
		}
	})
	t.Run("SSIS-001-C", func(t *testing.T) {
		got := ParseFilenameForJAV("SSIS-001-C.mp4")
		if got != "SSIS-001" {
			t.Errorf("got %q, want %q", got, "SSIS-001")
		}
	})
	t.Run("SDMM-178-SD", func(t *testing.T) {
		got := ParseFilenameForJAV("kcf9.com@SDMM-178-SD.mp4")
		if got != "SDMM-178" {
			t.Errorf("got %q, want %q", got, "SDMM-178")
		}
	})
	t.Run("mide-775", func(t *testing.T) {
		got := ParseFilenameForJAV("mide-775ch.mp4")
		if got != "MIDE-775" {
			t.Errorf("got %q, want %q", got, "MIDE-775")
		}
	})
	t.Run("ADN-100", func(t *testing.T) {
		got := ParseFilenameForJAV("Adn-100_1.mkv")
		if got != "ADN-100" {
			t.Errorf("got %q, want %q", got, "ADN-100")
		}
	})
	t.Run("AVOP-212", func(t *testing.T) {
		got := ParseFilenameForJAV("AVOP-212-U.mp4")
		if got != "AVOP-212" {
			t.Errorf("got %q, want %q", got, "AVOP-212")
		}
	})
	t.Run("SDEN-017", func(t *testing.T) {
		got := ParseFilenameForJAV("SDEN-017-CD1.wmv")
		if got != "SDEN-017" {
			t.Errorf("got %q, want %q", got, "SDEN-017")
		}
	})
	t.Run("ABP-393", func(t *testing.T) {
		got := ParseFilenameForJAV("ABP-393-UC.mp4")
		if got != "ABP-393" {
			t.Errorf("got %q, want %q", got, "ABP-393")
		}
	})
}

func TestParseFilenameForVideoNotJAV(t *testing.T) {
	// These AV filenames should NOT be misidentified as TV shows
	t.Run("STARS-456 not TV", func(t *testing.T) {
		got := ParseFilenameForVideo("[hhd800.com]STARS-456.uncensored.mp4")
		if got.Season != "" {
			t.Errorf("should not have season, got %q", got.Season)
		}
	})

	t.Run("SSIS-001 not TV", func(t *testing.T) {
		got := ParseFilenameForVideo("SSIS-001.1080p.mp4")
		if got.Season != "" {
			t.Errorf("should not have season, got %q", got.Season)
		}
	})
}
