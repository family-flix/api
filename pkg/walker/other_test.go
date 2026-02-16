package walker

import (
	"testing"
)

func TestParseFilenameForVideoOther(t *testing.T) {
	t.Run("第一部", func(t *testing.T) {
		got := ParseFilenameForVideo("第一部")
		want := ParsedVideoInfo{Name: "第一部", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("Season 1", func(t *testing.T) {
		got := ParseFilenameForVideo("Season 1")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "S01", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("S02 1080P  (52集)", func(t *testing.T) {
		got := ParseFilenameForVideo("S02 1080P  (52集)")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "S02", Episode: "E52"}
		AssertEqual(t, got, want)
	})

	t.Run("36.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("36.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "E36"}
		AssertEqual(t, got, want)
	})

	t.Run("【22222abc.com】30.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("【22222abc.com】30.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "E30"}
		AssertEqual(t, got, want)
	})

	t.Run("15(2).mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("15(2).mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "E15"}
		AssertEqual(t, got, want)
	})

	t.Run("28(1).mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("28(1).mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "E28"}
		AssertEqual(t, got, want)
	})

	t.Run("15_2.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("15_2.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "E15"}
		AssertEqual(t, got, want)
	})

	t.Run("01国语.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("01国语.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "E01"}
		AssertEqual(t, got, want)
	})

	t.Run("【百度云盘下载】35.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("【百度云盘下载】35.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "E35"}
		AssertEqual(t, got, want)
	})

	t.Run("粤语10", func(t *testing.T) {
		got := ParseFilenameForVideo("粤语10")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "E10"}
		AssertEqual(t, got, want)
	})

	t.Run("粤语10.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("粤语10.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "E10"}
		AssertEqual(t, got, want)
	})

	t.Run("粤语E10.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("粤语E10.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "E10"}
		AssertEqual(t, got, want)
	})

	t.Run("7.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("7.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "E07"}
		AssertEqual(t, got, want)
	})

	t.Run("【04】 .mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("【04】 .mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "E04"}
		AssertEqual(t, got, want)
	})

	t.Run("08-4K.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("08-4K.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "E08"}
		AssertEqual(t, got, want)
	})

	t.Run("外挂字幕", func(t *testing.T) {
		got := ParseFilenameForVideo("外挂字幕")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("1080P国粤双语", func(t *testing.T) {
		got := ParseFilenameForVideo("1080P国粤双语")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("1080P.外挂简中", func(t *testing.T) {
		got := ParseFilenameForVideo("1080P.外挂简中")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("1080P官中压制", func(t *testing.T) {
		got := ParseFilenameForVideo("1080P官中压制")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("1080P官中", func(t *testing.T) {
		got := ParseFilenameForVideo("1080P官中")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("1080P超前完结", func(t *testing.T) {
		got := ParseFilenameForVideo("1080P超前完结")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("1080P超前点映", func(t *testing.T) {
		got := ParseFilenameForVideo("1080P超前点映")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("连续剧版", func(t *testing.T) {
		got := ParseFilenameForVideo("连续剧版")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("4K高码率[单集6GB]", func(t *testing.T) {
		got := ParseFilenameForVideo("4K高码率[单集6GB]")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("4K B站logo", func(t *testing.T) {
		got := ParseFilenameForVideo("4K B站logo")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("4khq60fps.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("4khq60fps.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("______.2013.1080p.BluRay.REMUX.AVC.DTS-HD.MA.5.1.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("______.2013.1080p.BluRay.REMUX.AVC.DTS-HD.MA.5.1.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("前5季", func(t *testing.T) {
		got := ParseFilenameForVideo("前5季")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("PART.1", func(t *testing.T) {
		got := ParseFilenameForVideo("PART.1")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("2023.HD1080P.英语中字.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("2023.HD1080P.英语中字.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("B站S3", func(t *testing.T) {
		got := ParseFilenameForVideo("B站S3")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "S03", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("轻音少女高内存版", func(t *testing.T) {
		got := ParseFilenameForVideo("轻音少女高内存版")
		want := ParsedVideoInfo{Name: "轻音少女", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("NCOP.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("NCOP.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "其他", Episode: "NCOP"}
		AssertEqual(t, got, want)
	})

	t.Run("[VCB-Studio] Kakegurui×× [NCOP][Ma10p_1080p][x265_flac].mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("[VCB-Studio] Kakegurui×× [NCOP][Ma10p_1080p][x265_flac].mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "Kakegurui", Season: "其他", Episode: "NCOP"}
		AssertEqual(t, got, want)
	})

	t.Run("[官中 简体][1-12集全]", func(t *testing.T) {
		got := ParseFilenameForVideo("[官中 简体][1-12集全]")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("干物妹！小埋R 8 小埋与小光.flv", func(t *testing.T) {
		got := ParseFilenameForVideo("干物妹！小埋R 8 小埋与小光.flv")
		want := ParsedVideoInfo{Name: "干物妹！小埋R", OriginalName: "", Season: "", Episode: "E08"}
		AssertEqual(t, got, want)
	})

	t.Run("【海绵宝宝】.SpongeBob CCTV Version", func(t *testing.T) {
		got := ParseFilenameForVideo("【海绵宝宝】.SpongeBob CCTV Version")
		want := ParsedVideoInfo{Name: "", OriginalName: "SpongeBob", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("79.官中简体.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("79.官中简体.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "E79"}
		AssertEqual(t, got, want)
	})

	t.Run("79​.rmvb", func(t *testing.T) {
		got := ParseFilenameForVideo("79​.rmvb")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "E79"}
		AssertEqual(t, got, want)
	})

	t.Run("第10季", func(t *testing.T) {
		got := ParseFilenameForVideo("第10季")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "S10", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("4K&HDR&60FPS&Dolby&国日双语.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("4K&HDR&60FPS&Dolby&国日双语.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("001-100", func(t *testing.T) {
		got := ParseFilenameForVideo("001-100")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("901-1000", func(t *testing.T) {
		got := ParseFilenameForVideo("901-1000")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("1001-1004", func(t *testing.T) {
		got := ParseFilenameForVideo("1001-1004")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("1080P俄版流媒体中字.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("1080P俄版流媒体中字.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("4K高码杜比音效和AAC双音轨.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("4K高码杜比音效和AAC双音轨.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("4K超前26集完结", func(t *testing.T) {
		got := ParseFilenameForVideo("4K超前26集完结")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("超前35-40", func(t *testing.T) {
		got := ParseFilenameForVideo("超前35-40")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("超前点播", func(t *testing.T) {
		got := ParseFilenameForVideo("超前点播")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("备份", func(t *testing.T) {
		got := ParseFilenameForVideo("备份")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("春节限定", func(t *testing.T) {
		got := ParseFilenameForVideo("春节限定")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("4K 高码等版本", func(t *testing.T) {
		got := ParseFilenameForVideo("4K 高码等版本")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("4KHQ60FPS", func(t *testing.T) {
		got := ParseFilenameForVideo("4KHQ60FPS")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("20230326期：马晓东周志刚师徒进退两难.TS", func(t *testing.T) {
		got := ParseFilenameForVideo("20230326期：马晓东周志刚师徒进退两难.TS")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "20230326"}
		AssertEqual(t, got, want)
	})

	t.Run("20230326：马晓东周志刚师徒进退两难.TS", func(t *testing.T) {
		got := ParseFilenameForVideo("20230326：马晓东周志刚师徒进退两难.TS")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "20230326"}
		AssertEqual(t, got, want)
	})

	t.Run("[ENG] [090520] [TSKS] Cinderella Man E11.rmvb", func(t *testing.T) {
		got := ParseFilenameForVideo("[ENG] [090520] [TSKS] Cinderella Man E11.rmvb")
		want := ParsedVideoInfo{Name: "Cinderella Man", OriginalName: "", Season: "", Episode: "E11"}
		AssertEqual(t, got, want)
	})

	t.Run("Cinderella Man E11.rmvb", func(t *testing.T) {
		got := ParseFilenameForVideo("Cinderella Man E11.rmvb")
		want := ParsedVideoInfo{Name: "Cinderella Man", OriginalName: "", Season: "", Episode: "E11"}
		AssertEqual(t, got, want)
	})

	t.Run("Cinderella.Man.E11.rmvb", func(t *testing.T) {
		got := ParseFilenameForVideo("Cinderella.Man.E11.rmvb")
		want := ParsedVideoInfo{Name: "Cinderella.Man", OriginalName: "", Season: "", Episode: "E11"}
		AssertEqual(t, got, want)
	})

	t.Run("[S01] [090520] [TSKS] Cinderella Man E11.rmvb", func(t *testing.T) {
		got := ParseFilenameForVideo("[S01] [090520] [TSKS] Cinderella Man E11.rmvb")
		want := ParsedVideoInfo{Name: "Cinderella Man", OriginalName: "", Season: "S01", Episode: "E11"}
		AssertEqual(t, got, want)
	})

	t.Run("S01E11.rmvb", func(t *testing.T) {
		got := ParseFilenameForVideo("S01E11.rmvb")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "S01", Episode: "E11"}
		AssertEqual(t, got, want)
	})

	t.Run("S01E11", func(t *testing.T) {
		got := ParseFilenameForVideo("S01E11")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "S01", Episode: "E11"}
		AssertEqual(t, got, want)
	})

}