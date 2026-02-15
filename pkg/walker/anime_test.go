package walker

import (
	"testing"
)

func TestParseFilenameForVideoAnime(t *testing.T) {
	tests := []struct {
		name     string
		filename string
		want     ParsedVideoInfo
	}{
		{
			name:     "斗破苍穹年番 第18话 4K(超高清SDR) _Tacit0924.mp4",
			filename: "斗破苍穹年番 第18话 4K(超高清SDR) _Tacit0924.mp4",
			want: ParsedVideoInfo{
				Name:    "斗破苍穹年番",
				Episode: "E18",
			},
		},
		{
			name:     "10重制版 凡人风起天南10_Tacit0924.mp4",
			filename: "10重制版 凡人风起天南10_Tacit0924.mp4",
			want: ParsedVideoInfo{
				Episode: "E10",
			},
		},
		{
			name:     "11重制版_Tacit0924.mp4",
			filename: "11重制版_Tacit0924.mp4",
			want: ParsedVideoInfo{
				Episode: "E11",
			},
		},
		{
			name:     "斗罗大陆 第264话 4K(超高清SDR)90分钟大结局_Tacit0924 .mp4",
			filename: "斗罗大陆 第264话 4K(超高清SDR)90分钟大结局_Tacit0924 .mp4",
			want: ParsedVideoInfo{
				Name:    "斗罗大陆",
				Episode: "E264",
			},
		},
		{
			name:     "[ANi] 殭屍100～在成為殭屍前要做的100件事～ - 08 [1080P][Baha][WEB-DL][AAC AVC][CHT].mp4",
			filename: "[ANi] 殭屍100～在成為殭屍前要做的100件事～ - 08 [1080P][Baha][WEB-DL][AAC AVC][CHT].mp4",
			want: ParsedVideoInfo{
				Name:    "殭屍100～在成為殭屍前要做的100件事～",
				Episode: "E08",
			},
		},
		{
			name:     "[Judas] Tensei Shitara Slime Datta Ken - OAD 3 [1080p][HEVC x265 10bit][Multi-Su.mkv",
			filename: "[Judas] Tensei Shitara Slime Datta Ken - OAD 3 [1080p][HEVC x265 10bit][Multi-Su.mkv",
			want: ParsedVideoInfo{
				OriginalName: "Tensei.Shitara.Slime.Datta.Ken",
				Episode:      "OAD03",
			},
		},
		{
			name:     "犬夜叉 - 本篇 - 第166-167话：最终话-二人の绊 四魂のかけらを使え！（两人的羁绊 使用四魂碎片吧！-前后篇）；640×480P.mkv",
			filename: "犬夜叉 - 本篇 - 第166-167话：最终话-二人の绊 四魂のかけらを使え！（两人的羁绊 使用四魂碎片吧！-前后篇）；640×480P.mkv",
			want: ParsedVideoInfo{
				Name:    "犬夜叉",
				Season:  "S01",
				Episode: "E167",
			},
		},
		{
			name:     "犬夜叉 - 本篇 - 第001话.mkv",
			filename: "犬夜叉 - 本篇 - 第001话.mkv",
			want: ParsedVideoInfo{
				Name:    "犬夜叉",
				Season:  "S01",
				Episode: "E001",
			},
		},
		{
			name:     "犬夜叉 - OVA.2010-01-29：It's a Rumic World 犬夜叉～黒い鐵砕牙（黑色的铁碎牙）；1920×1080P.mkv",
			filename: "犬夜叉 - OVA.2010-01-29：It's a Rumic World 犬夜叉～黒い鐵砕牙（黑色的铁碎牙）；1920×1080P.mkv",
			want: ParsedVideoInfo{
				Name:    "犬夜叉",
				Season:  "OVA",
				Episode: "20100129",
			},
		},
		{
			name:     "犬夜叉 SP",
			filename: "犬夜叉 SP",
			want: ParsedVideoInfo{
				Name:   "犬夜叉",
				Season: "SP01",
			},
		},
		{
			name:     "OVA最後のマジカル大戦 第2集.mp4",
			filename: "OVA最後のマジカル大戦 第2集.mp4",
			want: ParsedVideoInfo{
				Season:  "OVA",
				Episode: "E02",
			},
		},
		{
			name:     "第17集 キケンがグルグル!.mp4",
			filename: "第17集 キケンがグルグル!.mp4",
			want: ParsedVideoInfo{
				Episode: "E17",
			},
		},
		{
			name:     "49. さらばヌメモン.mkv",
			filename: "49. さらばヌメモン.mkv",
			want: ParsedVideoInfo{
				Episode: "E49",
			},
		},
		{
			name:     "灌篮高手.1080P.国粤日三语.软字幕.AVC.默认国语音频.100.mkv",
			filename: "灌篮高手.1080P.国粤日三语.软字幕.AVC.默认国语音频.100.mkv",
			want: ParsedVideoInfo{
				Name:    "灌篮高手",
				Episode: "E100",
			},
		},
		{
			name:     "X）星辰变.4K-1080P【国漫】玄幻",
			filename: "X）星辰变.4K-1080P【国漫】玄幻",
			want: ParsedVideoInfo{
				Name: "星辰变",
			},
		},
		{
			name:     "师兄啊师兄. 09（纯享版）酒玖师叔与李长寿生情？齐源渡劫竟出现乌龙事件！",
			filename: "师兄啊师兄. 09（纯享版）酒玖师叔与李长寿生情？齐源渡劫竟出现乌龙事件！",
			want: ParsedVideoInfo{
				Name:    "师兄啊师兄",
				Episode: "E09",
			},
		},
		{
			name:     "1989.魔动王 光能使者.41集全+OVA.双语版.1080p",
			filename: "1989.魔动王 光能使者.41集全+OVA.双语版.1080p",
			want: ParsedVideoInfo{
				Name:   "魔动王",
				Season: "OVA",
			},
		},
		{
			name:     "S01 数码宝贝大冒险（日国粤）",
			filename: "S01 数码宝贝大冒险（日国粤）",
			want: ParsedVideoInfo{
				Season: "S01",
			},
		},
		{
			name:     "[SweetSub] Made in Abyss - 13 [8bit AVC][720P][CHS].mp4",
			filename: "[SweetSub] Made in Abyss - 13 [8bit AVC][720P][CHS].mp4",
			want: ParsedVideoInfo{
				OriginalName: "Made.in.Abyss",
				Episode:      "E13",
			},
		},
		{
			name:     "武G纪.第4季.第36集...",
			filename: "武G纪.第4季.第36集.祭天大典［总第150集］4K-H.265-HEVC- AAC-2023-03-14 - 国漫 - 《绝境涅槃》 篇-.- 酷安·公众号·QQ频道搜索 此间微凉，企鹅群159064310,更多【9124.ysepan.com】.mp4",
			want: ParsedVideoInfo{
				Name:    "武G纪",
				Season:  "S04",
				Episode: "E36",
			},
		},
		{
			name:     "九尾狐传9.mp4",
			filename: "九尾狐传9.mp4",
			want: ParsedVideoInfo{
				Name: "九尾狐传9",
			},
		},
		{
			name:     "灌篮高手日语版098.mp4",
			filename: "灌篮高手日语版098.mp4",
			want: ParsedVideoInfo{
				Name:    "灌篮高手",
				Episode: "E98",
			},
		},
		{
			name:     "2001三少爷的剑31.mkv",
			filename: "2001三少爷的剑31.mkv",
			want: ParsedVideoInfo{
				Name:    "三少爷的剑",
				Episode: "E31",
			},
		},
		{
			name:     "S 熟-年 [2023][40集持续更新中]",
			filename: "S 熟-年 [2023][40集持续更新中]",
			want:     ParsedVideoInfo{},
		},
		{
			name:     "好先生(未删减版)—1080P.HEVC.H264.AAC",
			filename: "好先生(未删减版)—1080P.HEVC.H264.AAC",
			want: ParsedVideoInfo{
				Name: "好先生",
			},
		},
		{
			name:     "第八号当铺E112.mkv",
			filename: "第八号当铺E112.mkv",
			want: ParsedVideoInfo{
				Name:    "第八号当铺",
				Episode: "E112",
			},
		},
		{
			name:     "天道EP22.mkv",
			filename: "天道EP22.mkv",
			want: ParsedVideoInfo{
				Name:    "天道",
				Episode: "E22",
			},
		},
		{
			name:     "晓敏家.4K纯享版.片头.mp4",
			filename: "晓敏家.4K纯享版.片头.mp4",
			want: ParsedVideoInfo{
				Name: "晓敏家",
			},
		},
		{
			name:     "打工吧！魔王大人S1E04.mkv",
			filename: "打工吧！魔王大人S1E04.mkv",
			want: ParsedVideoInfo{
				Name:    "打工吧！魔王大人",
				Season:  "S01",
				Episode: "E04",
			},
		},
		{
			name:     "咒术回战第1季02.mp4",
			filename: "咒术回战第1季02.mp4",
			want: ParsedVideoInfo{
				Name:    "咒术回战",
				Season:  "S01",
				Episode: "E02",
			},
		},
		{
			name:     "少年白马醉春风 第15 以剑为刀.mp4",
			filename: "少年白马醉春风 第15 以剑为刀.mp4",
			want: ParsedVideoInfo{
				Name:    "少年白马醉春风",
				Episode: "E15",
			},
		},
		{
			name:     "10.财阀家的小儿子.2022 - 豆瓣7.7分",
			filename: "10.财阀家的小儿子.2022 - 豆瓣7.7分",
			want: ParsedVideoInfo{
				Name: "财阀家的小儿子",
			},
		},
		{
			name:     "万li 归途 4K.mp4",
			filename: "万li 归途 4K.mp4",
			want: ParsedVideoInfo{
				Name: "万li",
			},
		},
		{
			name:     "The.Story.of.HongMao.and.LanTu.S02.E8.再次响起.2008.720p.WEB-DL.AAC.H264-OurTV.mp4",
			filename: "The.Story.of.HongMao.and.LanTu.S02.E8.再次响起.2008.720p.WEB-DL.AAC.H264-OurTV.mp4",
			want: ParsedVideoInfo{
				OriginalName: "The.Story.of.HongMao.and.LanTu",
				Season:       "S02",
				Episode:      "E08",
			},
		},
		{
			name:     "F 付岩洞复仇者们付岩洞复仇者们国配",
			filename: "F 付岩洞复仇者们付岩洞复仇者们国配",
			want: ParsedVideoInfo{
				Name: "付岩洞复仇者们付岩洞复仇者们",
			},
		},
		{
			name:     "【幻月字幕组】【23年日剧】【心灵内科医生 稻生知性】【01】【1080P】【中文字幕】.mp4",
			filename: "【幻月字幕组】【23年日剧】【心灵内科医生 稻生知性】【01】【1080P】【中文字幕】.mp4",
			want: ParsedVideoInfo{
				Name:    "心灵内科医生",
				Episode: "E01",
			},
		},
		{
			name:     "不.中英双字.V1.Nope.2022.HD1080P.X264.AAC.mp4",
			filename: "不.中英双字.V1.Nope.2022.HD1080P.X264.AAC.mp4",
			want: ParsedVideoInfo{
				Name:         "不",
				OriginalName: "V1.Nope",
			},
		},
		{
			name:     "三国演义01.桃园三结义.mkv",
			filename: "三国演义01.桃园三结义.mkv",
			want: ParsedVideoInfo{
				Name:    "三国演义",
				Episode: "E01",
			},
		},
		{
			name:     "(1)送给你不幸.rmvb",
			filename: "(1)送给你不幸.rmvb",
			want: ParsedVideoInfo{
				Episode: "E01",
			},
		},
		{
			name:     "第10-11话 大器、成为骑士！ Xros Heart 、燃烧！.mkv",
			filename: "第10-11话 大器、成为骑士！ Xros Heart 、燃烧！.mkv",
			want: ParsedVideoInfo{
				Episode: "E10-11",
			},
		},
		{
			name:     "[ANi] 暴食狂戰士 - 01 [1080P][Baha][WEB-DL][AAC AVC][CHT].mp4",
			filename: "[ANi] 暴食狂戰士 - 01 [1080P][Baha][WEB-DL][AAC AVC][CHT].mp4",
			want: ParsedVideoInfo{
				Name:    "暴食狂戰士",
				Episode: "E01",
			},
		},
		{
			name:     "[ANi] 哥布林殺手 II - 01 [1080P][Baha][WEB-DL][AAC AVC][CHT].mp4",
			filename: "[ANi] 哥布林殺手 II - 01 [1080P][Baha][WEB-DL][AAC AVC][CHT].mp4",
			want: ParsedVideoInfo{
				Name:    "哥布林殺手",
				Season:  "S02",
				Episode: "E01",
			},
		},
		{
			name:     "[PRL][Qins_Moon_SE2][04][DVDRip][AVC_AC3][56805CCF].mkv",
			filename: "[PRL][Qins_Moon_SE2][04][DVDRip][AVC_AC3][56805CCF].mkv",
			want: ParsedVideoInfo{
				OriginalName: "Qins.Moon",
				Season:       "S02",
				Episode:      "E04",
			},
		},
		{
			name:     "秦时明月.S03.[34][DVDRip][AVC_AC3][05B5AE84].mkv",
			filename: "秦时明月.S03.[34][DVDRip][AVC_AC3][05B5AE84].mkv",
			want: ParsedVideoInfo{
				Name:    "秦时明月",
				Season:  "S03",
				Episode: "E34",
			},
		},
		{
			name:     "S01E01.2024.2160p.WEB-DL.H265.EDR.DDP5.1.Atmos-BestWEB",
			filename: "S01E01.2024.2160p.WEB-DL.H265.EDR.DDP5.1.Atmos-BestWEB",
			want: ParsedVideoInfo{
				Season:  "S01",
				Episode: "E01",
			},
		},
		{
			name:     "SPY×FAMILY.S02E25 简中.mp4",
			filename: "SPY×FAMILY.S02E25 简中.mp4",
			want: ParsedVideoInfo{
				OriginalName: "SPY×FAMILY",
				Season:       "S02",
				Episode:      "E25",
			},
		},
		{
			name:     "[Tracer][S2E01修正][双语特效1080P][小玩剧字幕组].mp4",
			filename: "[Tracer][S2E01修正][双语特效1080P][小玩剧字幕组].mp4",
			want: ParsedVideoInfo{
				Season:  "S02",
				Episode: "E01",
			},
		},
		{
			name:     "Unforgettable.S310.mkv",
			filename: "Unforgettable.S310.mkv",
			want: ParsedVideoInfo{
				OriginalName: "Unforgettable310",
			},
		},
		{
			name:     "S01E012：掠夺者.mp4",
			filename: "S01E012：掠夺者.mp4",
			want: ParsedVideoInfo{
				Season:  "S01",
				Episode: "E12",
			},
		},
		{
			name:     "S02E01-红月.mkv",
			filename: "S02E01-红月.mkv",
			want: ParsedVideoInfo{
				Season:  "S02",
				Episode: "E01",
			},
		},
		{
			name:     "the.company.you.keep.s01e04.1080p.web.h264-cakes.chs.eng.mp4",
			filename: "the.company.you.keep.s01e04.1080p.web.h264-cakes.chs.eng.mp4",
			want: ParsedVideoInfo{
				OriginalName: "the.company.you.keep",
				Season:       "S01",
				Episode:      "E04",
			},
		},
		{
			name:     "风味人间-CCTV",
			filename: "风味人间-CCTV",
			want: ParsedVideoInfo{
				Name: "风味人间",
			},
		},
		{
			name:     "Planet.Earth.III.E04.Freshwater.2160p.iP.WEB-DL.AAC2.0.HLG.H.265-FLUX.mkv",
			filename: "Planet.Earth.III.E04.Freshwater.2160p.iP.WEB-DL.AAC2.0.HLG.H.265-FLUX.mkv",
			want: ParsedVideoInfo{
				OriginalName: "Planet.Earth",
				Season:       "S03",
				Episode:      "E04",
			},
		},
		{
			name:     "01买或死？ .mp4",
			filename: "01买或死？ .mp4",
			want: ParsedVideoInfo{
				Name: "01买或死",
			},
		},
		{
			name:     "2018.妖精森林的小不点.12集全+OVA.1080p",
			filename: "2018.妖精森林的小不点.12集全+OVA.1080p",
			want: ParsedVideoInfo{
				Name:   "妖精森林的小不点",
				Season: "OVA",
			},
		},
		{
			name:     "西行纪前缘篇_动漫_2023_01.mp4",
			filename: "西行纪前缘篇_动漫_2023_01.mp4",
			want: ParsedVideoInfo{
				Name:    "西行纪前缘篇",
				Episode: "E01",
			},
		},
		{
			name:     "2018.斗罗大陆.264集全.4K",
			filename: "2018.斗罗大陆.264集全.4K",
			want: ParsedVideoInfo{
				Name: "斗罗大陆",
			},
		},
		{
			name:     "D.P：逃兵追缉令第2季.E01.1080p.WEB-DL.x264.DDP2.0.mkv",
			filename: "D.P：逃兵追缉令第2季.E01.1080p.WEB-DL.x264.DDP2.0.mkv",
			want: ParsedVideoInfo{
				Name:    "D.P：逃兵追缉令",
				Season:  "S02",
				Episode: "E01",
			},
		},
		{
			name:     "[ANi] 狩火之王 第二季 - 01 [1080P][Baha][WEB-DL][AAC AVC][CHT].mp4",
			filename: "[ANi] 狩火之王 第二季 - 01 [1080P][Baha][WEB-DL][AAC AVC][CHT].mp4",
			want: ParsedVideoInfo{
				Name:    "狩火之王",
				Season:  "S02",
				Episode: "E01",
			},
		},
		{
			name:     "第一神拳.E67.[1080P].mp4",
			filename: "第一神拳.E67.[1080P].mp4",
			want: ParsedVideoInfo{
				Name:    "第一神拳",
				Episode: "E67",
			},
		},
		{
			name:     "Modern.Family.S02E20.1080p.BluRay.x264-7SINS.mkv",
			filename: "Modern.Family.S02E20.1080p.BluRay.x264-7SINS.mkv",
			want: ParsedVideoInfo{
				OriginalName: "Modern.Family",
				Season:       "S02",
				Episode:      "E20",
			},
		},
		{
			name:     "第二季.全20集.韩语官中.含特别篇",
			filename: "第二季.全20集.韩语官中.含特别篇",
			want: ParsedVideoInfo{
				Season: "S02",
			},
		},
		{
			name:     "迪士尼版 10.mkv",
			filename: "迪士尼版 10.mkv",
			want: ParsedVideoInfo{
				Episode: "E10",
			},
		},
		{
			name:     "Romance.Of.A.Twin.Flower.S01SP02.2023.2160p.WEB-DL.H265.AAC-HaresWEB.mp4",
			filename: "Romance.Of.A.Twin.Flower.S01SP02.2023.2160p.WEB-DL.H265.AAC-HaresWEB.mp4",
			want: ParsedVideoInfo{
				OriginalName: "Romance.Of.A.Twin.Flower",
				Season:       "S01",
				Episode:      "SP02",
			},
		},
		{
			name:     "[末路狂花钱].The.Last.Frenzy.2024.2160p.WEB-DL.HEVC.10bit.DTS5.1.6Audios-QHstudIo.mp4",
			filename: "[末路狂花钱].The.Last.Frenzy.2024.2160p.WEB-DL.HEVC.10bit.DTS5.1.6Audios-QHstudIo.mp4",
			want: ParsedVideoInfo{
				Name:         "末路狂花钱",
				OriginalName: "The.Last.Frenzy",
			},
		},
		{
			name:     "D 度华年 (2024) 4K60FPS",
			filename: "D 度华年 (2024) 4K60FPS",
			want: ParsedVideoInfo{
				Name: "度华年",
			},
		},
		{
			name:     "25.ts",
			filename: "25.ts",
			want: ParsedVideoInfo{
				Episode: "E25",
			},
		},
		{
			name:     "✔一起吃晚餐吗2020国语7.2(50g)",
			filename: "✔一起吃晚餐吗2020国语7.2(50g)",
			want: ParsedVideoInfo{
				Name:    "一起吃晚餐吗2020",
				Episode: "E07",
			},
		},
		{
			name:     "BASTARD！！暗黑破坏神.BASTARD!!－暗黒の破壊神－.S02E01.2023.1080p.WEB-DL.x264.DDP2.0.mkv",
			filename: "BASTARD！！暗黑破坏神.BASTARD!!－暗黒の破壊神－.S02E01.2023.1080p.WEB-DL.x264.DDP2.0.mkv",
			want: ParsedVideoInfo{
				Name:    "BASTARD！！暗黑破坏神",
				Season:  "S02",
				Episode: "E01",
			},
		},
		{
			name:     "2023.Pending Train-8点23分，明天和你.10集全",
			filename: "2023.Pending Train-8点23分，明天和你.10集全",
			want: ParsedVideoInfo{
				Name: "Pending.Train-8点23分，明天和你",
			},
		},
		{
			name:     "2023.1840~两个人的梦想与恋爱~.10集全",
			filename: "2023.1840~两个人的梦想与恋爱~.10集全",
			want: ParsedVideoInfo{
				Name: "1840~两个人的梦想与恋爱~",
			},
		},
		{
			name:     "2023.4月的东京….8集全",
			filename: "2023.4月的东京….8集全",
			want: ParsedVideoInfo{
				Name: "4月的东京",
			},
		},
		{
			name:     "2023.局中人 第二季 Fixer 第二季.5集全",
			filename: "2023.局中人 第二季 Fixer 第二季.5集全",
			want: ParsedVideoInfo{
				Name:   "局中人",
				Season: "S02",
			},
		},
		{
			name:     "2023.测试名称第二季第 5 集.mp4",
			filename: "2023.测试名称第二季第 5 集.mp4",
			want: ParsedVideoInfo{
				Name:    "测试名称",
				Season:  "S02",
				Episode: "E05",
			},
		},
		{
			name:     "2023.Stealer：七个朝鲜通宝.12集全",
			filename: "2023.Stealer：七个朝鲜通宝.12集全",
			want: ParsedVideoInfo{
				Name: "Stealer：七个朝鲜通宝",
			},
		},
		{
			name:     "2023.69两头勾.6集全",
			filename: "2023.69两头勾.6集全",
			want: ParsedVideoInfo{
				Name: "69两头勾",
			},
		},
		{
			name:     "2012.雾都.36集全",
			filename: "2012.雾都.36集全",
			want: ParsedVideoInfo{
				Name: "雾都",
			},
		},
		{
			name:     "神盾局特工（全7季）",
			filename: "神盾局特工（全7季）",
			want: ParsedVideoInfo{
				Name: "神盾局特工",
			},
		},
		{
			name:     "神盾局特工1-8季全",
			filename: "神盾局特工1-8季全",
			want: ParsedVideoInfo{
				Name: "神盾局特工",
			},
		},
		{
			name:     "The.DaysS01E06.2023.NF.WEB-DL.1080p.x264.DDP-Xiaomi.mkv",
			filename: "The.DaysS01E06.2023.NF.WEB-DL.1080p.x264.DDP-Xiaomi.mkv",
			want: ParsedVideoInfo{
				OriginalName: "The.Days",
				Season:       "S01",
				Episode:      "E06",
			},
		},
		{
			name:     "IT狂人.The.IT.Crowd.S01E06.END.Chi_Eng.DVDrip.608X336-YYeTs人人影视.rmvb",
			filename: "IT狂人.The.IT.Crowd.S01E06.END.Chi_Eng.DVDrip.608X336-YYeTs人人影视.rmvb",
			want: ParsedVideoInfo{
				Name:         "IT狂人",
				OriginalName: "The.IT.Crowd",
				Season:       "S01",
				Episode:      "E06",
			},
		},
		{
			name:     "[ANi] LV1魔王與獨居廢勇者 - 09 [1080P][Baha][WEB-DL][AAC AVC][CHT].mp4",
			filename: "[ANi] LV1魔王與獨居廢勇者 - 09 [1080P][Baha][WEB-DL][AAC AVC][CHT].mp4",
			want: ParsedVideoInfo{
				Name:    "LV1魔王與獨居廢勇者",
				Episode: "E09",
			},
		},
		{
			name:     "[破烂熊][是,大臣.Yes,Minister.S01E03].mp4",
			filename: "[破烂熊][是,大臣.Yes,Minister.S01E03].mp4",
			want: ParsedVideoInfo{
				Name:         "是,大臣",
				OriginalName: "Yes,Minister",
				Season:       "S01",
				Episode:      "E03",
			},
		},
		{
			name:     "Friends.1994.S01E01精校版",
			filename: "Friends.1994.S01E01精校版",
			want: ParsedVideoInfo{
				OriginalName: "Friends",
				Season:       "S01",
				Episode:      "E01",
			},
		},
		{
			name:     "【JTTL】韩剧-我的女孩.My.Girl.2005.S01E05.中文字幕.mp4",
			filename: "【JTTL】韩剧-我的女孩.My.Girl.2005.S01E05.中文字幕.mp4",
			want: ParsedVideoInfo{
				Name:    "韩剧",
				Season:  "S01",
				Episode: "E05",
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ParseFilenameForVideo(tt.filename)
			AssertEqual(t, got, tt.want)
		})
	}
}
