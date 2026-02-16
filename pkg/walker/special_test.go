package walker

import (
	"testing"
)

func TestParseFilenameForVideoSpecial(t *testing.T) {
	t.Run("重启人生番外篇", func(t *testing.T) {
		got := ParseFilenameForVideo("重启人生番外篇")
		want := ParsedVideoInfo{Name: "重启人生", OriginalName: "", Season: "番外篇", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("【熟肉-花絮】Transformers.2.BONUS.2009.HR-HDTV.AC3.1024X576.x264.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("【熟肉-花絮】Transformers.2.BONUS.2009.HR-HDTV.AC3.1024X576.x264.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "Transformers.2", Season: "其他", Episode: "BONUS"}
		AssertEqual(t, got, want)
	})

	t.Run("一人之下手游泡面番 第4话 编剧的宠爱 720P(准高清).mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("一人之下手游泡面番 第4话 编剧的宠爱 720P(准高清).mp4")
		want := ParsedVideoInfo{Name: "一人之下手游", OriginalName: "", Season: "泡面番", Episode: "E04"}
		AssertEqual(t, got, want)
	})

	t.Run("[VCB-Studio] Ushio to Tora [NCOP03][Ma10p_1080p][x265_flac].mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("[VCB-Studio] Ushio to Tora [NCOP03][Ma10p_1080p][x265_flac].mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "Ushio.to.Tora", Season: "其他", Episode: "NCOP03"}
		AssertEqual(t, got, want)
	})

	t.Run("假面骑士圣刃续集", func(t *testing.T) {
		got := ParseFilenameForVideo("假面骑士圣刃续集")
		want := ParsedVideoInfo{Name: "假面骑士圣刃", OriginalName: "", Season: "", Episode: "续集"}
		AssertEqual(t, got, want)
	})

	t.Run("[公众号：SS的笔记/腹肌崩坏太郎番外/星空][假面骑士01 番外][奇迹的身份改变！？或人VS腹肌崩坏太郎 宿命的段子对决].mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("[公众号：SS的笔记/腹肌崩坏太郎番外/星空][假面骑士01 番外][奇迹的身份改变！？或人VS腹肌崩坏太郎 宿命的段子对决].mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "番外01"}
		AssertEqual(t, got, want)
	})

	t.Run("[1080P][DBD制作组&离谱Sub][龙珠GT][特典映像][01][HEVC-10bit][AC3].mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("[1080P][DBD制作组&离谱Sub][龙珠GT][特典映像][01][HEVC-10bit][AC3].mkv")
		want := ParsedVideoInfo{Name: "龙珠GT", OriginalName: "", Season: "特典映像", Episode: "E01"}
		AssertEqual(t, got, want)
	})

	t.Run("妖精森林的小不点 NCED01.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("妖精森林的小不点 NCED01.mkv")
		want := ParsedVideoInfo{Name: "妖精森林的小不点", OriginalName: "", Season: "其他", Episode: "NCED01"}
		AssertEqual(t, got, want)
	})

	t.Run("[VCB-Studio] Ushio to Tora [CM05][Ma10p_1080p][x265_flac].mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("[VCB-Studio] Ushio to Tora [CM05][Ma10p_1080p][x265_flac].mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "Ushio.to.Tora", Season: "其他", Episode: "CM05"}
		AssertEqual(t, got, want)
	})

	t.Run("[1080P][DBD制作组&离谱Sub][龙珠GT][NCOP2][HEVC-10bit][AC3].mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("[1080P][DBD制作组&离谱Sub][龙珠GT][NCOP2][HEVC-10bit][AC3].mkv")
		want := ParsedVideoInfo{Name: "龙珠GT", OriginalName: "", Season: "其他", Episode: "NCOP2"}
		AssertEqual(t, got, want)
	})

	t.Run("[DAY][仮面戦隊ゴライダー][PR1][BDrip][1080P][X264 FLAC].mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("[DAY][仮面戦隊ゴライダー][PR1][BDrip][1080P][X264 FLAC].mkv")
		want := ParsedVideoInfo{Name: "仮面戦隊ゴライダー", OriginalName: "", Season: "其他", Episode: "PR1"}
		AssertEqual(t, got, want)
	})

	t.Run("斗破苍穹特别篇2[4K].mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("斗破苍穹特别篇2[4K].mp4")
		want := ParsedVideoInfo{Name: "斗破苍穹", OriginalName: "", Season: "", Episode: "特别篇2"}
		AssertEqual(t, got, want)
	})

	t.Run("《孤独的美食家 盛夏的博多 出差SP》第1集_高清 1080P+.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("《孤独的美食家 盛夏的博多 出差SP》第1集_高清 1080P+.mp4")
		want := ParsedVideoInfo{Name: "孤独的美食家", OriginalName: "", Season: "SP", Episode: "E01"}
		AssertEqual(t, got, want)
	})

	t.Run("2013 LegalHigh SP2.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("2013 LegalHigh SP2.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "LegalHigh", Season: "SP", Episode: "E02"}
		AssertEqual(t, got, want)
	})

	t.Run("番外2-杀人事件.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("番外2-杀人事件.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "番外02"}
		AssertEqual(t, got, want)
	})

	t.Run("花絮13 王蝉动捕演员刘珂君助力凡人修仙传特别篇.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("花絮13 王蝉动捕演员刘珂君助力凡人修仙传特别篇.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "花絮13"}
		AssertEqual(t, got, want)
	})

	t.Run("显微镜下的大明之丝绢案-预告1", func(t *testing.T) {
		got := ParseFilenameForVideo("显微镜下的大明之丝绢案-预告1")
		want := ParsedVideoInfo{Name: "显微镜下的大明之丝绢案", OriginalName: "", Season: "", Episode: "预告01"}
		AssertEqual(t, got, want)
	})

	t.Run("彩蛋1：腹肌胸肌肱二头肌！路哥这完美身材我爱了！.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("彩蛋1：腹肌胸肌肱二头肌！路哥这完美身材我爱了！.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "彩蛋01"}
		AssertEqual(t, got, want)
	})

	t.Run("去有风的地方_彩蛋_1080P_Tacit0924.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("去有风的地方_彩蛋_1080P_Tacit0924.mp4")
		want := ParsedVideoInfo{Name: "去有风的地方", OriginalName: "", Season: "", Episode: "彩蛋01"}
		AssertEqual(t, got, want)
	})

	t.Run("今生也是第一次_彩蛋.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("今生也是第一次_彩蛋.mp4")
		want := ParsedVideoInfo{Name: "今生也是第一次", OriginalName: "", Season: "", Episode: "彩蛋01"}
		AssertEqual(t, got, want)
	})

	t.Run("彩蛋.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("彩蛋.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "彩蛋01"}
		AssertEqual(t, got, want)
	})

	t.Run("无间 彩蛋3 1080P(高清SDR)(1080344)_Tacit0924.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("无间 彩蛋3 1080P(高清SDR)(1080344)_Tacit0924.mp4")
		want := ParsedVideoInfo{Name: "无间", OriginalName: "", Season: "", Episode: "彩蛋03"}
		AssertEqual(t, got, want)
	})

	t.Run("番外篇.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("番外篇.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("早餐中国 第2季 收官特辑：萌娃版：这些\\\"戏精\\\"宝宝太抢戏啦~.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("早餐中国 第2季 收官特辑：萌娃版：这些\\\"戏精\\\"宝宝太抢戏啦~.mp4")
		want := ParsedVideoInfo{Name: "早餐中国", OriginalName: "", Season: "S02", Episode: "特辑01"}
		AssertEqual(t, got, want)
	})

	t.Run("星际穿越预告片", func(t *testing.T) {
		got := ParseFilenameForVideo("星际穿越预告片")
		want := ParsedVideoInfo{Name: "星际穿越片", OriginalName: "", Season: "", Episode: "预告01"}
		AssertEqual(t, got, want)
	})

	t.Run("加勒比海盗预告片合集", func(t *testing.T) {
		got := ParseFilenameForVideo("加勒比海盗预告片合集")
		want := ParsedVideoInfo{Name: "加勒比海盗片合集", OriginalName: "", Season: "", Episode: "预告01"}
		AssertEqual(t, got, want)
	})

	t.Run("[YY]XX.2013.Special.E01.720p.WEB-DL.AAC.x264", func(t *testing.T) {
		got := ParseFilenameForVideo("[YY]XX.2013.Special.E01.720p.WEB-DL.AAC.x264")
		want := ParsedVideoInfo{Name: "", OriginalName: "Special", Season: "", Episode: "E01"}
		AssertEqual(t, got, want)
	})

	t.Run("Test Show - Episode 1 (2020)", func(t *testing.T) {
		got := ParseFilenameForVideo("Test Show - Episode 1 (2020)")
		want := ParsedVideoInfo{Name: "", OriginalName: "Test.Show", Season: "", Episode: "E01"}
		AssertEqual(t, got, want)
	})

	t.Run("test.cht", func(t *testing.T) {
		got := ParseFilenameForVideo("test.cht")
		want := ParsedVideoInfo{Name: "", OriginalName: "test", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("test.chs", func(t *testing.T) {
		got := ParseFilenameForVideo("test.chs")
		want := ParsedVideoInfo{Name: "", OriginalName: "test", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("test.eng", func(t *testing.T) {
		got := ParseFilenameForVideo("test.eng")
		want := ParsedVideoInfo{Name: "", OriginalName: "test", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("【B站】英语六级CET6全程班", func(t *testing.T) {
		got := ParseFilenameForVideo("【B站】英语六级CET6全程班")
		want := ParsedVideoInfo{Name: "英语六级CET6全程班", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("E25.仔细阅读passage6解析.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("E25.仔细阅读passage6解析.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "E25"}
		AssertEqual(t, got, want)
	})

	t.Run("10（1）.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("10（1）.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "E10"}
		AssertEqual(t, got, want)
	})

}