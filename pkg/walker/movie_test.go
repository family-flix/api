package walker

import (
	"testing"
)

func TestParseFilenameForVideoMovie(t *testing.T) {
	t.Run("Everything Everywhere All At Once", func(t *testing.T) {
		got := ParseFilenameForVideo("Everything Everywhere All At Once.2022.UHD.Bluray.2160p.DV.HEVC.TrueHD 7.1.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "Everything.Everywhere.All.At.Once", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("Q 请回答1988蓝光版", func(t *testing.T) {
		got := ParseFilenameForVideo("Q 请回答1988蓝光版")
		want := ParsedVideoInfo{Name: "请回答1988", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("玩具总动员4", func(t *testing.T) {
		got := ParseFilenameForVideo("玩具总动员4.mp4")
		want := ParsedVideoInfo{Name: "玩具总动员4", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("1990.傅艺伟. 封神榜", func(t *testing.T) {
		got := ParseFilenameForVideo("1990.傅艺伟. 封神榜 4K. 高清修复")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("碟中谍7", func(t *testing.T) {
		got := ParseFilenameForVideo("碟中谍7：致命清算（上）.mp4")
		want := ParsedVideoInfo{Name: "碟中谍7：致命清算（上）", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("潜伏", func(t *testing.T) {
		got := ParseFilenameForVideo("No.62｜潜伏.2010.中字.1080p.x264.FS24P.mkv")
		want := ParsedVideoInfo{Name: "潜伏", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("封神：祸商", func(t *testing.T) {
		got := ParseFilenameForVideo("封神：祸商.4K.2023.TX洗码3.mp4")
		want := ParsedVideoInfo{Name: "封神：祸商", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("MOJH", func(t *testing.T) {
		got := ParseFilenameForVideo("MOJH.2023.4K.粤语[洗码1].mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "MOJH", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("Warriors of Future", func(t *testing.T) {
		got := ParseFilenameForVideo("5国粤双语中字.Warriors.of.Future.2022.HD1080P(1).mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "Warriors.of.Future", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("Spider-Man Across the Spider-Verse", func(t *testing.T) {
		got := ParseFilenameForVideo("[内封繁简][多国语言音轨]Spider-Man.Across.the.Spider-Verse.2023.1080p.iT.WEB-DL.DDP5.1.Atmos.H.264.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "Spider-Man.Across.the.Spider-Verse", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("4K国粤双语音轨", func(t *testing.T) {
		got := ParseFilenameForVideo("4K.国粤双语音轨 高码率.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("4K高码国粤双语", func(t *testing.T) {
		got := ParseFilenameForVideo("4K高码国粤双语 [需支持切换音轨的播放器]")
		want := ParsedVideoInfo{Name: "需支持切换音轨的播放器", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("Die Wannseekonferenz", func(t *testing.T) {
		got := ParseFilenameForVideo("Die Wannseekonferenz.中德双语.昆仑德语字幕组.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "Die.Wannseekonferenz", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("万里归途", func(t *testing.T) {
		got := ParseFilenameForVideo("10.万里归途.2022 - 豆瓣7.4分")
		want := ParsedVideoInfo{Name: "万里归途", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("奇迹笨小孩", func(t *testing.T) {
		got := ParseFilenameForVideo("06.奇迹笨小孩.2022 - 豆瓣7.4分")
		want := ParsedVideoInfo{Name: "奇迹笨小孩", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("一场很（没）有必要的春晚", func(t *testing.T) {
		got := ParseFilenameForVideo("03.一场很（没）有必要的春晚.2022 - 豆瓣7.7分")
		want := ParsedVideoInfo{Name: "一场很（没）有必要的春晚", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("放牛班的春天", func(t *testing.T) {
		got := ParseFilenameForVideo("Top013.放牛班的春天.The.Chorus.2004.Bluray.1080p.x265.AAC(5.1).2Audios.GREENOTEA.mkv")
		want := ParsedVideoInfo{Name: "放牛班的春天", OriginalName: "The.Chorus", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("十二怒汉", func(t *testing.T) {
		got := ParseFilenameForVideo("Top028.十二怒汉(CC标准收藏版).12.Angry.Men.1957.CC.Bluray.1080p.x265.AAC.GREENOTEA.mkv")
		want := ParsedVideoInfo{Name: "十二怒汉", OriginalName: "12.Angry.Men", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("007：大破天幕杀机", func(t *testing.T) {
		got := ParseFilenameForVideo("007：大破天幕杀机 (2012) DV 2160p DTSHD-MA.mkv")
		want := ParsedVideoInfo{Name: "007：大破天幕杀机", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("封神第一部", func(t *testing.T) {
		got := ParseFilenameForVideo("封神第一部")
		want := ParsedVideoInfo{Name: "封神第一部", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("黄海", func(t *testing.T) {
		got := ParseFilenameForVideo("黄海157分钟版 1080P.mkv")
		want := ParsedVideoInfo{Name: "黄海", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("咒", func(t *testing.T) {
		got := ParseFilenameForVideo("咒.2022.K站版本2.mp4")
		want := ParsedVideoInfo{Name: "咒", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("夏日重现", func(t *testing.T) {
		got := ParseFilenameForVideo("07.夏日重现.2022 - 豆瓣9.1分")
		want := ParsedVideoInfo{Name: "夏日重现", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("奇迹笨小孩压缩版", func(t *testing.T) {
		got := ParseFilenameForVideo("奇迹·笨小孩压缩高清版本.mkv")
		want := ParsedVideoInfo{Name: "奇迹·笨小孩", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("法比安", func(t *testing.T) {
		got := ParseFilenameForVideo("[原码率] 法比安.Fabian.oder.Der.Gang.vor.die.Hunde.2021.German.1080p.BluRay.x264-DETAiLS.chs.mp4")
		want := ParsedVideoInfo{Name: "法比安", OriginalName: "Fabian.oder.Der.Gang.vor.die.Hunde", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("乡村里的中国", func(t *testing.T) {
		got := ParseFilenameForVideo("乡村里的中国 H.264.mov")
		want := ParsedVideoInfo{Name: "乡村里的中国", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("Oblivion Verses", func(t *testing.T) {
		got := ParseFilenameForVideo("Oblivion.Verses.2017.SPANISH.中字.XZYS")
		want := ParsedVideoInfo{Name: "", OriginalName: "Oblivion.Verses", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("雷神4", func(t *testing.T) {
		got := ParseFilenameForVideo("[酷漫404&亿万同人字幕组][雷神4：爱与雷霆][Thor.Love.and.Thunder][WEB-IMAX][1080P][AAC 5.1][特效中英字幕][AVC-8Bit][MKV][V1].mkv")
		want := ParsedVideoInfo{Name: "雷神4：爱与雷霆", OriginalName: "Thor.Love.and.Thunder", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("The Nun II", func(t *testing.T) {
		got := ParseFilenameForVideo("The.Nun.II.2023.2160p.MA.WEB-DL.DDP5.1.Atmos.DV.HDR.H.265-FLUX.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "The.Nun2", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("S三贵情史", func(t *testing.T) {
		got := ParseFilenameForVideo("S三贵情史4KHQ60FPS")
		want := ParsedVideoInfo{Name: "S三贵情史", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("The Transformers Movie", func(t *testing.T) {
		got := ParseFilenameForVideo("The.Transformers.The.Movie.1986.2160p.UHD.BluRay.x265.10bit.HDR.DTS-HD.MA.5.1-6Audios.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "The.Transformers.The.Movie", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("倩女幽魂2", func(t *testing.T) {
		got := ParseFilenameForVideo("No.14｜倩女幽魂2.1990.1080P.国粤中字.mkv")
		want := ParsedVideoInfo{Name: "倩女幽魂2", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("电锯惊魂8", func(t *testing.T) {
		got := ParseFilenameForVideo("[电锯惊魂8：竖锯]Jigsaw.2017.BluRay.2160p.HDR.H265.Atmos.TrueHD.7.1.BOBO.mkv")
		want := ParsedVideoInfo{Name: "电锯惊魂8：竖锯", OriginalName: "Jigsaw", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("Saw IV", func(t *testing.T) {
		got := ParseFilenameForVideo("Saw IV 2007 Tw Blu-ray 1080p AVC DTS-HD MA 7.1.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "Saw4", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("电锯惊魂10", func(t *testing.T) {
		got := ParseFilenameForVideo("悬吧猪栏2367电锯惊魂10.SAW X.2023.1080p.x265.yc.mkv")
		want := ParsedVideoInfo{Name: "悬吧猪栏2367电锯惊魂10", OriginalName: "SAW10", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("Saw III", func(t *testing.T) {
		got := ParseFilenameForVideo("Saw III 2006 US Blu-ray 1080p MPEG2 DTS-HD HR 6.1.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "Saw3", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("Shrek Thriller", func(t *testing.T) {
		got := ParseFilenameForVideo("Shrek.Thriller.史莱克的恐怖片.双语字幕.HR-HDTV.AC3.1024X576-人人影视制作(1).mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "Shrek.Thriller", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("The Lego Movie 2", func(t *testing.T) {
		got := ParseFilenameForVideo("The.Lego.Movie.2.The.Second.Part.2019.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "The.Lego.Movie.2.The.Second.Part", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("电锯惊魂7", func(t *testing.T) {
		got := ParseFilenameForVideo("电锯惊魂7.mkv")
		want := ParsedVideoInfo{Name: "电锯惊魂7", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("熔炉", func(t *testing.T) {
		got := ParseFilenameForVideo("熔炉.Silenced.2011.BD720P.超清韩语中字.mp4")
		want := ParsedVideoInfo{Name: "熔炉", OriginalName: "Silenced", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("My Beloved China", func(t *testing.T) {
		got := ParseFilenameForVideo("CCTV6.My.Beloved.China.2009.HDTV.1080i.H264-HDCTV.ts")
		want := ParsedVideoInfo{Name: "", OriginalName: "My.Beloved.China", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("祸乱", func(t *testing.T) {
		got := ParseFilenameForVideo("[无字]祸乱.화란.2023.1080P.WEBRip.H264.AAC.FANov.mp4")
		want := ParsedVideoInfo{Name: "祸乱", OriginalName: "화란", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("Tetris", func(t *testing.T) {
		got := ParseFilenameForVideo("Tetris.2023.2160p.ATVP.WEB-DL.DDP5.1.Atmos.HDR.DV.HEVC-CM.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "Tetris", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("电锯惊魂7 another", func(t *testing.T) {
		got := ParseFilenameForVideo("[电锯惊魂7]Saw.VII.2010.BluRay.1080p.H265.10bit.DTS-HD.MA.5.1.BOBO.mkv")
		want := ParsedVideoInfo{Name: "电锯惊魂7", OriginalName: "Saw7", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("Detective Chinatown", func(t *testing.T) {
		got := ParseFilenameForVideo("Detective.Chinatown.2015.1080p.BluRay.REMUX.AVC.LPCM.5.1-HDHIVE.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "Detective.Chinatown", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("苦菜花", func(t *testing.T) {
		got := ParseFilenameForVideo("《苦菜花》1965.老片修复版.mp4")
		want := ParsedVideoInfo{Name: "苦菜花", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("大蛇4", func(t *testing.T) {
		got := ParseFilenameForVideo("大蛇4.mp4")
		want := ParsedVideoInfo{Name: "大蛇4", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("壮志凌云", func(t *testing.T) {
		got := ParseFilenameForVideo("《壮志凌云》1936.老片修复版.mp4")
		want := ParsedVideoInfo{Name: "壮志凌云", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("Leon The Professional", func(t *testing.T) {
		got := ParseFilenameForVideo("Leon.The.Professional.1994.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "Leon.The.Professional", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("The Red Balloon Extras", func(t *testing.T) {
		got := ParseFilenameForVideo("The.Red.Balloon.1956.Extras-01.BDRip.1080p.Ac3.x264.BMDru.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "The.Red.Balloon", Season: "", Episode: "Extras-01"}
		AssertEqual(t, got, want)
	})

	t.Run("画江湖之天罡", func(t *testing.T) {
		got := ParseFilenameForVideo("画江湖之天罡 (2023) - The.Legend.2023.2160p.WEB-DL.H265.DV.DDP2.0.mp4")
		want := ParsedVideoInfo{Name: "画江湖之天罡", OriginalName: "The.Legend", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("电锯惊魂9", func(t *testing.T) {
		got := ParseFilenameForVideo("[电锯惊魂9].2021.2160p.UHD.BluRay.x265.10bit.HDR.DTS-HD.MA.TrueHD.7.1.Atmos-SWTYBLZ.mkv")
		want := ParsedVideoInfo{Name: "电锯惊魂9", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("小城之春", func(t *testing.T) {
		got := ParseFilenameForVideo("小城之春.1948.mp4")
		want := ParsedVideoInfo{Name: "小城之春", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("7号房的礼物", func(t *testing.T) {
		got := ParseFilenameForVideo("№099 7号房的礼物 [2013（中字）.mkv")
		want := ParsedVideoInfo{Name: "7号房的礼物", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("喂帅哥", func(t *testing.T) {
		got := ParseFilenameForVideo("W 喂帅哥！！.おいハンサム!!")
		want := ParsedVideoInfo{Name: "喂帅哥！！", OriginalName: "おいハンサム!!", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("别叫我赌神", func(t *testing.T) {
		got := ParseFilenameForVideo("B 别叫我\"赌神\".2023.4K..国语中字.mp4")
		want := ParsedVideoInfo{Name: "别叫我\"赌神\"", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("BURN-E", func(t *testing.T) {
		got := ParseFilenameForVideo("2008.BURN-E.电焊工波力.HR-HDTV.AC3.1024X576.x264-人人影视制作.mkv")
		want := ParsedVideoInfo{Name: "电焊工波力", OriginalName: "BURN-E", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})
	t.Run("Rainy.Saturday-Saturday.afternoon.dildo.fuck", func(t *testing.T) {
		got := ParseFilenameForVideo("Lily Ivy - Rainy.Saturday-Saturday.afternoon.dildo.fuck-2017.04.30-720p.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "", Year: "2017.04.30"}
		AssertEqual(t, got, want)
	})
}
