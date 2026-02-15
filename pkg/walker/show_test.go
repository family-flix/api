package walker

import (
	"testing"
)

func TestParseFilenameForVideoShow(t *testing.T) {
	tests := []struct {
		name     string
		filename string
		want     ParsedVideoInfo
	}{
		{
			name:     "鸡毛飞上天 - S01E55 - 第 55 集.mp4",
			filename: "鸡毛飞上天 - S01E55 - 第 55 集.mp4",
			want: ParsedVideoInfo{
				Name:    "鸡毛飞上天",
				Season:  "S01",
				Episode: "E55",
			},
		},
		{
			name:     "魔幻手机2傻妞归来.S01E42.1080P.WEB-DL.mp4",
			filename: "魔幻手机2傻妞归来.S01E42.1080P.WEB-DL.mp4",
			want: ParsedVideoInfo{
				Name:    "魔幻手机2傻妞归来",
				Season:  "S01",
				Episode: "E42",
			},
		},
		{
			name:     "Magic.Mobile.Phone.2008.S01E42.WEB-DL.1080p.H265.AAC-HotWEB.mp4",
			filename: "Magic.Mobile.Phone.2008.S01E42.WEB-DL.1080p.H265.AAC-HotWEB.mp4",
			want: ParsedVideoInfo{
				OriginalName: "Magic.Mobile.Phone",
				Season:       "S01",
				Episode:      "E42",
			},
		},
		{
			name:     "Wild.Bloom.S01E34.2022.2160p.WEB-DL.H265.DDP5.1-BlackTV.mkv",
			filename: "Wild.Bloom.S01E34.2022.2160p.WEB-DL.H265.DDP5.1-BlackTV.mkv",
			want: ParsedVideoInfo{
				OriginalName: "Wild.Bloom",
				Season:       "S01",
				Episode:      "E34",
			},
		},
		{
			name:     "白鹿原.White.Deer.Plain.2017.E75.1080p.WEB-DL.AAC.X264.mp4",
			filename: "白鹿原.White.Deer.Plain.2017.E75.1080p.WEB-DL.AAC.X264.mp4",
			want: ParsedVideoInfo{
				Name:         "白鹿原",
				OriginalName: "White.Deer.Plain",
				Episode:      "E75",
			},
		},
		{
			name:     "宝莲灯前传.Lotus.Lantern.Prequel.2009.V2.EP46.2160P(4K).WEB-DL.X265.AAC-Vampire.mp4",
			filename: "宝莲灯前传.Lotus.Lantern.Prequel.2009.V2.EP46.2160P(4K).WEB-DL.X265.AAC-Vampire.mp4",
			want: ParsedVideoInfo{
				Name:         "宝莲灯前传",
				OriginalName: "Lotus.Lantern.Prequel",
				Episode:      "E46",
			},
		},
		{
			name:     "HDJ Beijing Love Story EP39 HDTV 1080i H264-NGB.ts",
			filename: "HDJ Beijing Love Story EP39 HDTV 1080i H264-NGB.ts",
			want: ParsedVideoInfo{
				OriginalName: "Beijing.Love.Story",
				Episode:      "E39",
			},
		},
		{
			name:     "M 魔幻手机2：傻妞归来 (2014)",
			filename: "M 魔幻手机2：傻妞归来 (2014)",
			want: ParsedVideoInfo{
				Name: "魔幻手机2：傻妞归来",
			},
		},
		{
			name:     "还珠格格3.E40.Extended.DVDRip.x264.AC3-CMCT.mkv",
			filename: "还珠格格3.E40.Extended.DVDRip.x264.AC3-CMCT.mkv",
			want: ParsedVideoInfo{
				Name:    "还珠格格3",
				Episode: "E40",
			},
		},
		{
			name:     "赘婿.无字幕版.4K.2021.WEB-DL.2160P.H265.AAC-AIU",
			filename: "赘婿.无字幕版.4K.2021.WEB-DL.2160P.H265.AAC-AIU",
			want: ParsedVideoInfo{
				Name: "赘婿",
			},
		},
		{
			name:     "赘婿.第1季.E36.HD4K.2160P.HD265.mp4",
			filename: "赘婿.第1季.E36.HD4K.2160P.HD265.mp4",
			want: ParsedVideoInfo{
				Name:    "赘婿",
				Season:  "S01",
				Episode: "E36",
			},
		},
		{
			name:     "鹿鼎记(84版).38",
			filename: "鹿鼎记(84版).38",
			want: ParsedVideoInfo{
				Name:    "鹿鼎记",
				Episode: "E38",
			},
		},
		{
			name:     "谈判专家-欧阳震华(2002)1080P",
			filename: "谈判专家-欧阳震华(2002)1080P",
			want: ParsedVideoInfo{
				Name: "谈判专家",
			},
		},
		{
			name:     "枪神-20.国粤双语",
			filename: "枪神-20.国粤双语",
			want: ParsedVideoInfo{
				Name:    "枪神",
				Episode: "E20",
			},
		},
		{
			name:     "第九节课1080P.内嵌字幕",
			filename: "第九节课1080P.内嵌字幕",
			want: ParsedVideoInfo{
				Name: "第九节课",
			},
		},
		{
			name:     "知否知否应是绿肥红瘦.1080台版高码.1080三无.4k.60帧",
			filename: "知否知否应是绿肥红瘦.1080台版高码.1080三无.4k.60帧",
			want: ParsedVideoInfo{
				Name:         "知否知否应是绿肥红瘦",
				OriginalName: "1080",
			},
		},
		{
			name:     "无心法师.第一季.Wuxin：The.Monster.Killer.S01E20.2015.1080p.WEB-DL.x264.AAC-HeiGuo.mp4",
			filename: "无心法师.第一季.Wuxin：The.Monster.Killer.S01E20.2015.1080p.WEB-DL.x264.AAC-HeiGuo.mp4",
			want: ParsedVideoInfo{
				Name:         "无心法师",
				OriginalName: "Wuxin：The.Monster.Killer",
				Season:       "S01",
				Episode:      "E20",
			},
		},
		{
			name:     "W 武媚娘传奇【4k】2014 国语繁字",
			filename: "W 武媚娘传奇【4k】2014 国语繁字",
			want: ParsedVideoInfo{
				Name: "武媚娘传奇",
			},
		},
		{
			name:     "一起同过窗 第三季 第30集 4K(超高清SDR)(8298117)",
			filename: "一起同过窗 第三季 第30集 4K(超高清SDR)(8298117)",
			want: ParsedVideoInfo{
				Name:    "一起同过窗",
				Season:  "S03",
				Episode: "E30",
			},
		},
		{
			name:     "小敏家.2021.4K.H265.DVD.原版+纯享版+4K60帧",
			filename: "小敏家.2021.4K.H265.DVD.原版+纯享版+4K60帧",
			want: ParsedVideoInfo{
				Name: "小敏家",
			},
		},
		{
			name:     "别了，温哥华.Vancouver.2003.WEB-DL.4k.H265.AAC-HDSWEB",
			filename: "别了，温哥华.Vancouver.2003.WEB-DL.4k.H265.AAC-HDSWEB",
			want: ParsedVideoInfo{
				Name:         "别了，温哥华",
				OriginalName: "Vancouver",
			},
		},
		{
			name:     "天道.1080P+720P.国语中字",
			filename: "天道.1080P+720P.国语中字",
			want: ParsedVideoInfo{
				Name:         "天道",
				OriginalName: "720P",
			},
		},
		{
			name:     "腾空的日子（张伟、胡冰卿主演校园剧）",
			filename: "腾空的日子（张伟、胡冰卿主演校园剧）",
			want: ParsedVideoInfo{
				Name: "腾空的日子",
			},
		},
		{
			name:     "王子变青蛙（经典台剧）",
			filename: "王子变青蛙（经典台剧）",
			want: ParsedVideoInfo{
				Name: "王子变青蛙",
			},
		},
		{
			name:     "十六岁的花季1989年 高清修复版",
			filename: "十六岁的花季1989年 高清修复版",
			want: ParsedVideoInfo{
				Name: "十六岁的花季1989年",
			},
		},
		{
			name:     "18禁不禁（曾经很有趣很无厘头的台剧）",
			filename: "18禁不禁（曾经很有趣很无厘头的台剧）",
			want: ParsedVideoInfo{
				Name: "18禁不禁",
			},
		},
		{
			name:     "[18禁不禁].18stop-19.rmvb",
			filename: "[18禁不禁].18stop-19.rmvb",
			want: ParsedVideoInfo{
				Name:         "18禁不禁",
				OriginalName: "18stop",
				Episode:      "E19",
			},
		},
		{
			name:     "那些年，我们一起追的女孩.2011.台版无删减完整版.国语中字",
			filename: "那些年，我们一起追的女孩.2011.台版无删减完整版.国语中字",
			want: ParsedVideoInfo{
				Name: "那些年，我们一起追的女孩",
			},
		},
		{
			name:     "东北插班生_24.1080P",
			filename: "东北插班生_24.1080P",
			want: ParsedVideoInfo{
				Name:    "东北插班生",
				Episode: "E24",
			},
		},
		{
			name:     "唐砖第35集-蓝光4K;",
			filename: "唐砖第35集-蓝光4K;",
			want: ParsedVideoInfo{
				Name:    "唐砖",
				Episode: "E35",
			},
		},
		{
			name:     "一起同过窗 第三季 第24集 4K(超高清SDR)(6711482).mp4",
			filename: "一起同过窗 第三季 第24集 4K(超高清SDR)(6711482).mp4",
			want: ParsedVideoInfo{
				Name:    "一起同过窗",
				Season:  "S03",
				Episode: "E24",
			},
		},
		{
			name:     "第9集 每个人都要准备一个最好笑的笑话.mp4",
			filename: "第9集 每个人都要准备一个最好笑的笑话.mp4",
			want: ParsedVideoInfo{
				Episode: "E09",
			},
		},
		{
			name:     "大学生同居的事儿第2季.40.一天一夜（下）.rmvb",
			filename: "大学生同居的事儿第2季.40.一天一夜（下）.rmvb",
			want: ParsedVideoInfo{
				Name:    "大学生同居的事儿",
				Season:  "S02",
				Episode: "E40",
			},
		},
		{
			name:     "梦华录.4K.去除片头片中片尾广告.纯享版",
			filename: "梦华录.4K.去除片头片中片尾广告.纯享版",
			want: ParsedVideoInfo{
				Name: "梦华录",
			},
		},
		{
			name:     "【SuperMiao】A.Dream.of.Splendor.2022.EP40.V2.4K.WEB-DL.H265.AAC.mp4",
			filename: "【SuperMiao】A.Dream.of.Splendor.2022.EP40.V2.4K.WEB-DL.H265.AAC.mp4",
			want: ParsedVideoInfo{
				OriginalName: "A.Dream.of.Splendor",
				Episode:      "E40",
			},
		},
		{
			name:     "如懿传-2018-内地.三无.内封英文字幕",
			filename: "如懿传-2018-内地.三无.内封英文字幕",
			want: ParsedVideoInfo{
				Name: "如懿传",
			},
		},
		{
			name:     "[4K超高清修复]《天道》无删减完整版第9集_超清 4K.mp4",
			filename: "[4K超高清修复]《天道》无删减完整版第9集_超清 4K.mp4",
			want: ParsedVideoInfo{
				Name:    "天道",
				Episode: "E09",
			},
		},
		{
			name:     "地狱公使.韩英双语.内封多国字幕.1080P.非HDR版本",
			filename: "地狱公使.韩英双语.内封多国字幕.1080P.非HDR版本",
			want: ParsedVideoInfo{
				Name: "地狱公使",
			},
		},
		{
			name:     "地狱公使.去除英语音轨.保留简繁字幕.1080P.HDR版本",
			filename: "地狱公使.去除英语音轨.保留简繁字幕.1080P.HDR版本",
			want: ParsedVideoInfo{
				Name: "地狱公使",
			},
		},
		{
			name:     "[地狱公使]Hellbound.S01E06.Episode.6.1080p.NF.WEB-DL.x265.10bit.HDR.DDP5.1.Atmos.BOBO.mkv",
			filename: "[地狱公使]Hellbound.S01E06.Episode.6.1080p.NF.WEB-DL.x265.10bit.HDR.DDP5.1.Atmos.BOBO.mkv",
			want: ParsedVideoInfo{
				Name:         "地狱公使",
				OriginalName: "Hellbound",
				Season:       "S01",
				Episode:      "E06",
			},
		},
		{
			name:     "Hellbound.S01E06.Episode.6.1080p.NF.WEB-DL.DDP.5.1.Atmos.HDR10.H.265-BlackTV.mkv",
			filename: "Hellbound.S01E06.Episode.6.1080p.NF.WEB-DL.DDP.5.1.Atmos.HDR10.H.265-BlackTV.mkv",
			want: ParsedVideoInfo{
				OriginalName: "Hellbound",
				Season:       "S01",
				Episode:      "E06",
			},
		},
		{
			name:     "Strange.Tales.of.Tang.Dynasty.2022.S01E36.2160p.iQIYI.WEB-DL.DDP5.1.H.265-Nanzhi.mkv",
			filename: "Strange.Tales.of.Tang.Dynasty.2022.S01E36.2160p.iQIYI.WEB-DL.DDP5.1.H.265-Nanzhi.mkv",
			want: ParsedVideoInfo{
				OriginalName: "Strange.Tales.of.Tang.Dynasty",
				Season:       "S01",
				Episode:      "E36",
			},
		},
		{
			name:     "Taiwan.Crime.Stories.S01E12.2023.DSNP.WEB-DL.1080p.H264.DDP-SuperMiao.mkv",
			filename: "Taiwan.Crime.Stories.S01E12.2023.DSNP.WEB-DL.1080p.H264.DDP-SuperMiao.mkv",
			want: ParsedVideoInfo{
				OriginalName: "Taiwan.Crime.Stories",
				Season:       "S01",
				Episode:      "E12",
			},
		},
		{
			name:     "伪装者 完整全集 蓝光(1080P)",
			filename: "伪装者 完整全集 蓝光(1080P)",
			want: ParsedVideoInfo{
				Name: "伪装者",
			},
		},
		{
			name:     "毛骗.SE01.06.mp4",
			filename: "毛骗.SE01.06.mp4",
			want: ParsedVideoInfo{
				Name:    "毛骗",
				Season:  "S01",
				Episode: "E06",
			},
		},
		{
			name:     "天道4K无删减收藏版",
			filename: "天道4K无删减收藏版",
			want: ParsedVideoInfo{
				Name: "天道",
			},
		},
		{
			name:     "暗黑者3",
			filename: "暗黑者3",
			want: ParsedVideoInfo{
				Name: "暗黑者3",
			},
		},
		{
			name:     "欢乐颂3_03.1080P.mp4",
			filename: "欢乐颂3_03.1080P.mp4",
			want: ParsedVideoInfo{
				Name:    "欢乐颂3",
				Episode: "E03",
			},
		},
		{
			name:     "暗黑者2第04集-308国道校车案（上）.mp4",
			filename: "暗黑者2第04集-308国道校车案（上）.mp4",
			want: ParsedVideoInfo{
				Name:    "暗黑者2",
				Episode: "E04",
			},
		},
		{
			name:     "L 立功·东北旧事",
			filename: "L 立功·东北旧事",
			want: ParsedVideoInfo{
				Name: "立功·东北旧事",
			},
		},
		{
			name:     "第9话 就是你啊-4K 超清.mp4",
			filename: "第9话 就是你啊-4K 超清.mp4",
			want: ParsedVideoInfo{
				Episode: "E09",
			},
		},
		{
			name:     "请回答1988",
			filename: "请回答1988",
			want: ParsedVideoInfo{
				Name: "请回答1988",
			},
		},
		{
			name:     "生命时速·紧急救护120",
			filename: "生命时速·紧急救护120",
			want: ParsedVideoInfo{
				Name: "生命时速·紧急救护120",
			},
		},
		{
			name:     "xtm.dvd-halfcd2.杜拉拉升职记.2010.中国.第32集.repack.mkv",
			filename: "xtm.dvd-halfcd2.杜拉拉升职记.2010.中国.第32集.repack.mkv",
			want: ParsedVideoInfo{
				Name:    "杜拉拉升职记",
				Episode: "E32",
			},
		},
		{
			name:     "Nirvana.in.Fire.Ⅱ.2017.E49.4K.WEB-DL.AAC.H264-.mp4",
			filename: "Nirvana.in.Fire.Ⅱ.2017.E49.4K.WEB-DL.AAC.H264-.mp4",
			want: ParsedVideoInfo{
				OriginalName: "Nirvana.in.Fire",
				Season:       "S02",
				Episode:      "E49",
			},
		},
		{
			name:     "CYW.The Legend of Sword and Fairy 3.EP37.2009.2160p.WEB-DL.x265.AAC-SXG.mp4",
			filename: "CYW.The Legend of Sword and Fairy 3.EP37.2009.2160p.WEB-DL.x265.AAC-SXG.mp4",
			want: ParsedVideoInfo{
				OriginalName: "The.Legend.of.Sword.and.Fairy.3",
				Episode:      "E37",
			},
		},
		{
			name:     "小谢尔顿S05E09.mp4",
			filename: "小谢尔顿S05E09.mp4",
			want: ParsedVideoInfo{
				Name:    "小谢尔顿",
				Season:  "S05",
				Episode: "E09",
			},
		},
		{
			name:     "十八年后的终极告白2.0",
			filename: "十八年后的终极告白2.0",
			want: ParsedVideoInfo{
				Name: "十八年后的终极告白2.0",
			},
		},
		{
			name:     "S熟年 [2023]",
			filename: "S熟年 [2023]",
			want: ParsedVideoInfo{
				Name: "S熟年",
			},
		},
		{
			name:     "Friends.S08E16.720p.BluRay.x264-Psychd.mkv",
			filename: "Friends.S08E16.720p.BluRay.x264-Psychd.mkv",
			want: ParsedVideoInfo{
				OriginalName: "Friends",
				Season:       "S08",
				Episode:      "E16",
			},
		},
		{
			name:     "Friends.S08.E16.720p.BluRay.x264-Psychd.mkv",
			filename: "Friends.S08.E16.720p.BluRay.x264-Psychd.mkv",
			want: ParsedVideoInfo{
				OriginalName: "Friends",
				Season:       "S08",
				Episode:      "E16",
			},
		},
		{
			name:     "Friends.S08E16.720p.BluRay.x264-Psychd",
			filename: "Friends.S08E16.720p.BluRay.x264-Psychd",
			want: ParsedVideoInfo{
				OriginalName: "Friends",
				Season:       "S08",
				Episode:      "E16",
			},
		},
		{
			name:     "Marvel's.Agents.of.S.H.I.E.L.D.S02E01.720p.HDTV.x264-KILLERS.mkv",
			filename: "Marvel's.Agents.of.S.H.I.E.L.D.S02E01.720p.HDTV.x264-KILLERS.mkv",
			want: ParsedVideoInfo{
				OriginalName: "Marvel's.Agents.of.S.H.I.E.L.D",
				Season:       "S02",
				Episode:      "E01",
			},
		},
		{
			name:     "Marvel's.Agents.of.S.H.I.E.L.D.S02E01.720p.HDTV.x264-KILLERS",
			filename: "Marvel's.Agents.of.S.H.I.E.L.D.S02E01.720p.HDTV.x264-KILLERS",
			want: ParsedVideoInfo{
				OriginalName: "Marvel's.Agents.of.S.H.I.E.L.D",
				Season:       "S02",
				Episode:      "E01",
			},
		},
		{
			name:     "24.S09E05.720p.HDTV.x264-KILLERS.mkv",
			filename: "24.S09E05.720p.HDTV.x264-KILLERS.mkv",
			want: ParsedVideoInfo{
				OriginalName: "24",
				Season:       "S09",
				Episode:      "E05",
			},
		},
		{
			name:     "The.Big.Bang.Theory.S08E01.720p.HDTV.X264-DIMENSION.mkv",
			filename: "The.Big.Bang.Theory.S08E01.720p.HDTV.X264-DIMENSION.mkv",
			want: ParsedVideoInfo{
				OriginalName: "The.Big.Bang.Theory",
				Season:       "S08",
				Episode:      "E01",
			},
		},
		{
			name:     "Homeland.S04E01.720p.HDTV.x264-KILLERS.mkv",
			filename: "Homeland.S04E01.720p.HDTV.x264-KILLERS.mkv",
			want: ParsedVideoInfo{
				OriginalName: "Homeland",
				Season:       "S04",
				Episode:      "E01",
			},
		},
		{
			name:     "Homeland.S04E01.720p.HDTV.x264-KILLERS",
			filename: "Homeland.S04E01.720p.HDTV.x264-KILLERS",
			want: ParsedVideoInfo{
				OriginalName: "Homeland",
				Season:       "S04",
				Episode:      "E01",
			},
		},
		{
			name:     "Homeland.S04E01.720p.HDTV.x264-KILLERS[rarbg]",
			filename: "Homeland.S04E01.720p.HDTV.x264-KILLERS[rarbg]",
			want: ParsedVideoInfo{
				OriginalName: "Homeland",
				Season:       "S04",
				Episode:      "E01",
			},
		},
		{
			name:     "权力的游戏.Game.of.Thrones.S05E10.1080p.WEB-DL.DD5.1.H.264-人人影视.mkv",
			filename: "权力的游戏.Game.of.Thrones.S05E10.1080p.WEB-DL.DD5.1.H.264-人人影视.mkv",
			want: ParsedVideoInfo{
				Name:         "权力的游戏",
				OriginalName: "Game.of.Thrones",
				Season:       "S05",
				Episode:      "E10",
			},
		},
		{
			name:     "权力的游戏.Game.of.Thrones.S05E10.1080p.WEB-DL.DD5.1.H.264-人人影视",
			filename: "权力的游戏.Game.of.Thrones.S05E10.1080p.WEB-DL.DD5.1.H.264-人人影视",
			want: ParsedVideoInfo{
				Name:         "权力的游戏",
				OriginalName: "Game.of.Thrones",
				Season:       "S05",
				Episode:      "E10",
			},
		},
		{
			name:     "大明王朝1566.Da.Ming.Wang.Chao.1566.EP01-46.2007.1080p.WEB-DL.x264.AAC-HQC",
			filename: "大明王朝1566.Da.Ming.Wang.Chao.1566.EP01-46.2007.1080p.WEB-DL.x264.AAC-HQC",
			want: ParsedVideoInfo{
				Name:         "大明王朝1566",
				OriginalName: "Da.Ming.Wang.Chao",
				Episode:      "E01-46",
			},
		},
		{
			name:     "大明王朝1566.Da.Ming.Wang.Chao.1566.EP01.2007.1080p.WEB-DL.x264.AAC-HQC",
			filename: "大明王朝1566.Da.Ming.Wang.Chao.1566.EP01.2007.1080p.WEB-DL.x264.AAC-HQC",
			want: ParsedVideoInfo{
				Name:         "大明王朝1566",
				OriginalName: "Da.Ming.Wang.Chao",
				Episode:      "E01",
			},
		},
		{
			name:     "大明王朝1566.Da.Ming.Wang.Chao.1566.2007.1080p.WEB-DL.x264.AAC-HQC",
			filename: "大明王朝1566.Da.Ming.Wang.Chao.1566.2007.1080p.WEB-DL.x264.AAC-HQC",
			want: ParsedVideoInfo{
				Name:         "大明王朝1566",
				OriginalName: "Da.Ming.Wang.Chao",
			},
		},
		{
			name:     "大明王朝1566.Da.Ming.Wang.Chao.1566.2007.1080p.WEB-DL.x264.AAC-HQC.mkv",
			filename: "大明王朝1566.Da.Ming.Wang.Chao.1566.2007.1080p.WEB-DL.x264.AAC-HQC.mkv",
			want: ParsedVideoInfo{
				Name:         "大明王朝1566",
				OriginalName: "Da.Ming.Wang.Chao",
			},
		},
		{
			name:     "灵魂摆渡Ⅱ.1080p",
			filename: "灵魂摆渡Ⅱ.1080p",
			want: ParsedVideoInfo{
				Name:   "灵魂摆渡",
				Season: "S02",
			},
		},
		{
			name:     "太子妃升职记丨36_End.mp4",
			filename: "太子妃升职记丨36_End.mp4",
			want: ParsedVideoInfo{
				Name:    "太子妃升职记",
				Episode: "E36",
			},
		},
		{
			name:     "洗冤录1-01.mkv",
			filename: "洗冤录1-01.mkv",
			want: ParsedVideoInfo{
				Name:    "洗冤录1",
				Episode: "E01",
			},
		},
		{
			name:     "封神榜I NGB (34).ts",
			filename: "封神榜I NGB (34).ts",
			want: ParsedVideoInfo{
				Name:    "封神榜I",
				Episode: "E34",
			},
		},
		{
			name:     "我是特种兵之利刃出鞘.Special.Arms.Ⅱ.2012.S01E38.WEB-DL.4K.HEVC.AAC-CHDWEB.mp4",
			filename: "我是特种兵之利刃出鞘.Special.Arms.Ⅱ.2012.S01E38.WEB-DL.4K.HEVC.AAC-CHDWEB.mp4",
			want: ParsedVideoInfo{
				Name:         "我是特种兵之利刃出鞘",
				OriginalName: "Special.Arms",
				Season:       "S01",
				Episode:      "E38",
			},
		},
		{
			name:     "阿拉蒙之剑：阿斯达年代记 [2023][12集持续更新中]",
			filename: "阿拉蒙之剑：阿斯达年代记 [2023][12集持续更新中]",
			want: ParsedVideoInfo{
				Name: "阿拉蒙之剑：阿斯达年代记",
			},
		},
		{
			name:     "[知否知否应是绿肥红瘦].The.Story.of.Ming.Lan.2018.2160p.WEB-DL.HEVC.AAC-HQC.1080.1080.mp4",
			filename: "[知否知否应是绿肥红瘦].The.Story.of.Ming.Lan.2018.2160p.WEB-DL.HEVC.AAC-HQC.1080.1080.mp4",
			want: ParsedVideoInfo{
				Name:         "知否知否应是绿肥红瘦",
				OriginalName: "1080",
			},
		},
		{
			name:     "Modern.Family",
			filename: "Modern.Family",
			want: ParsedVideoInfo{
				OriginalName: "Modern.Family",
			},
		},
		{
			name:     "2.Broke.Girls",
			filename: "2.Broke.Girls",
			want: ParsedVideoInfo{
				OriginalName: "2.Broke.Girls",
			},
		},
		{
			name:     "Modern.Family.S01",
			filename: "Modern.Family.S01",
			want: ParsedVideoInfo{
				OriginalName: "Modern.Family",
				Season:       "S01",
			},
		},
		{
			name:     "Modern.Family.S01.1080p",
			filename: "Modern.Family.S01.1080p",
			want: ParsedVideoInfo{
				OriginalName: "Modern.Family",
				Season:       "S01",
			},
		},
		{
			name:     "Modern.Family.2009.S01.1080p",
			filename: "Modern.Family.2009.S01.1080p",
			want: ParsedVideoInfo{
				OriginalName: "Modern.Family",
				Season:       "S01",
			},
		},
		{
			name:     "[摩登家庭].Modern.Family.2009.S01.1080p",
			filename: "[摩登家庭].Modern.Family.2009.S01.1080p",
			want: ParsedVideoInfo{
				Name:         "摩登家庭",
				OriginalName: "Modern.Family",
				Season:       "S01",
			},
		},
		{
			name:     "[摩登家庭].Modern.Family.2009.第十季.1080p",
			filename: "[摩登家庭].Modern.Family.2009.第十季.1080p",
			want: ParsedVideoInfo{
				Name:         "摩登家庭",
				OriginalName: "Modern.Family",
				Season:       "S10",
			},
		},
		{
			name:     "Futurama.S07E22.Leela.and.the.Genestalk.1080p.Blu-ray.DD5.1.x264-CtrlHD",
			filename: "Futurama.S07E22.Leela.and.the.Genestalk.1080p.Blu-ray.DD5.1.x264-CtrlHD",
			want: ParsedVideoInfo{
				OriginalName: "Futurama",
				Season:       "S07",
				Episode:      "E22",
			},
		},
		{
			name:     "The.Tudors.S04E07.1080p.Blu-ray.x265.10bit.AC3￡cXcY@FRDS",
			filename: "The.Tudors.S04E07.1080p.Blu-ray.x265.10bit.AC3￡cXcY@FRDS",
			want: ParsedVideoInfo{
				OriginalName: "The.Tudors",
				Season:       "S04",
				Episode:      "E07",
			},
		},
		{
			name:     "Anne.with.an.E.S03E09.1080p.BluRay.x264",
			filename: "Anne.with.an.E.S03E09.1080p.BluRay.x264",
			want: ParsedVideoInfo{
				OriginalName: "Anne.with.an.E",
				Season:       "S03",
				Episode:      "E09",
			},
		},
		{
			name:     "Desperate Housewives S06E21 1080p WEB-DL DD+ 5.1 x264-TrollHD",
			filename: "Desperate Housewives S06E21 1080p WEB-DL DD+ 5.1 x264-TrollHD",
			want: ParsedVideoInfo{
				OriginalName: "Desperate.Housewives",
				Season:       "S06",
				Episode:      "E21",
			},
		},
		{
			name:     "Young.Sheldon.S01E22.1080p.Blu-Ray.AC3.x265.10bit-Yumi@FRDS.mkv",
			filename: "Young.Sheldon.S01E22.1080p.Blu-Ray.AC3.x265.10bit-Yumi@FRDS.mkv",
			want: ParsedVideoInfo{
				OriginalName: "Young.Sheldon",
				Season:       "S01",
				Episode:      "E22",
			},
		},
		{
			name:     "S01E07 - A No-Rough-Stuff-Type Deal",
			filename: "S01E07 - A No-Rough-Stuff-Type Deal",
			want: ParsedVideoInfo{
				Season:  "S01",
				Episode: "E07",
			},
		},
		{
			name:     "老友记.S01E24.瑞秋知道了",
			filename: "老友记.S01E24.瑞秋知道了",
			want: ParsedVideoInfo{
				Name:    "老友记",
				Season:  "S01",
				Episode: "E24",
			},
		},
		{
			name:     "The.Sopranos.S01E13.1999.1080P.Blu-ray.x265.AC3.cXcY@FRDS.mkv",
			filename: "The.Sopranos.S01E13.1999.1080P.Blu-ray.x265.AC3.￡cXcY@FRDS.mkv",
			want: ParsedVideoInfo{
				OriginalName: "The.Sopranos",
				Season:       "S01",
				Episode:      "E13",
			},
		},
		{
			name:     "Futurama.S07E01.The.Bots.and.the.Bees.1080p.BluRay.DD5.1.x264-CtrlHD.mkv",
			filename: "Futurama.S07E01.The.Bots.and.the.Bees.1080p.BluRay.DD5.1.x264-CtrlHD.mkv",
			want: ParsedVideoInfo{
				OriginalName: "Futurama",
				Season:       "S07",
				Episode:      "E01",
			},
		},
		{
			name:     "Futurama.S07E14.2-D.Blacktop.1080p.Blu-ray.DD5.1.x264-CtrlHD.mkv",
			filename: "Futurama.S07E14.2-D.Blacktop.1080p.Blu-ray.DD5.1.x264-CtrlHD.mkv",
			want: ParsedVideoInfo{
				OriginalName: "Futurama",
				Season:       "S07",
				Episode:      "E14",
			},
		},
		{
			name:     "Futurama.S07E15.Fry.and.Leela's.Big.Fling.1080p.Blu-ray.DD5.1.x264-CtrlHD.mkv",
			filename: "Futurama.S07E15.Fry.and.Leela's.Big.Fling.1080p.Blu-ray.DD5.1.x264-CtrlHD.mkv",
			want: ParsedVideoInfo{
				OriginalName: "Futurama",
				Season:       "S07",
				Episode:      "E15",
			},
		},
		{
			name:     "The.Boys.S03E04.Glorious.Five.Year.Plan.1080p.AMZN.WEB-DL.DDP5.1.H.264-NTb.mkv",
			filename: "The.Boys.S03E04.Glorious.Five.Year.Plan.1080p.AMZN.WEB-DL.DDP5.1.H.264-NTb.mkv",
			want: ParsedVideoInfo{
				OriginalName: "The.Boys",
				Season:       "S03",
				Episode:      "E04",
			},
		},
		{
			name:     "老友记.S03E04.赌城行（上）.mkv",
			filename: "老友记.S03E04.赌城行（上）.mkv",
			want: ParsedVideoInfo{
				Name:    "老友记",
				Season:  "S03",
				Episode: "E04",
			},
		},
		{
			name:     "Futurama.S02E01.1080p.WEB.h264-NiXON.mkv",
			filename: "Futurama.S02E01.1080p.WEB.h264-NiXON.mkv",
			want: ParsedVideoInfo{
				OriginalName: "Futurama",
				Season:       "S02",
				Episode:      "E01",
			},
		},
		{
			name:     "Ekaterina.2014.S01E02.HDTV.(1080i).MediaClub.mp4",
			filename: "Ekaterina.2014.S01E02.HDTV.(1080i).MediaClub.mp4",
			want: ParsedVideoInfo{
				OriginalName: "Ekaterina",
				Season:       "S01",
				Episode:      "E02",
			},
		},
		{
			name:     "叶卡捷琳娜大帝.Екатерина.Самозванцы (2019).S03E03.mp4",
			filename: "叶卡捷琳娜大帝.Екатерина.Самозванцы (2019).S03E03.mp4",
			want: ParsedVideoInfo{
				Name:         "叶卡捷琳娜大帝",
				OriginalName: "Екатерина.Самозванцы",
				Season:       "S03",
				Episode:      "E03",
			},
		},
		{
			name:     "The.Queens.Gambit.S01E01.2160p.NF.WEBRip.DDP5.1.x265-NTb.mkv",
			filename: "The.Queens.Gambit.S01E01.2160p.NF.WEBRip.DDP5.1.x265-NTb.mkv",
			want: ParsedVideoInfo{
				OriginalName: "The.Queens.Gambit",
				Season:       "S01",
				Episode:      "E01",
			},
		},
		{
			name:     "gotham.s01.e01.1080p.bluray.x264-rovers.mkv",
			filename: "gotham.s01.e01.1080p.bluray.x264-rovers.mkv",
			want: ParsedVideoInfo{
				OriginalName: "gotham",
				Season:       "S01",
				Episode:      "E01",
			},
		},
		{
			name:     "Gotham.S02E02.1080p.BluRay.x264-SHORTBREHD.mkv",
			filename: "Gotham.S02E02.1080p.BluRay.x264-SHORTBREHD.mkv",
			want: ParsedVideoInfo{
				OriginalName: "Gotham",
				Season:       "S02",
				Episode:      "E02",
			},
		},
		{
			name:     "The.Originals.S03E01.中英字幕.WEB-HR.AAC.1024X576.x264.mp4",
			filename: "The.Originals.S03E01.中英字幕.WEB-HR.AAC.1024X576.x264.mp4",
			want: ParsedVideoInfo{
				OriginalName: "The.Originals",
				Season:       "S03",
				Episode:      "E01",
			},
		},
		{
			name:     "Grey's.Anatomy.S01E01.A.Hard.Day's.Night.h.264-TjHD.mkv",
			filename: "Grey's.Anatomy.S01E01.A.Hard.Day's.Night.h.264-TjHD.mkv",
			want: ParsedVideoInfo{
				OriginalName: "Grey's.Anatomy",
				Season:       "S01",
				Episode:      "E01",
			},
		},
		{
			name:     "Emily.in.Paris.S02E04.Jules.and.Em.1080p.NF.WEB-DL.DDP5.1.HDR.H.265-TEPES.mkv",
			filename: "Emily.in.Paris.S02E04.Jules.and.Em.1080p.NF.WEB-DL.DDP5.1.HDR.H.265-TEPES.mkv",
			want: ParsedVideoInfo{
				OriginalName: "Emily.in.Paris",
				Season:       "S02",
				Episode:      "E04",
			},
		},
		{
			name:     "The Walking Dead - S01E06 - WEBDL-1080p h264 EAC3 5.1 - DSNP.mkv",
			filename: "The Walking Dead - S01E06 - WEBDL-1080p h264 EAC3 5.1 - DSNP.mkv",
			want: ParsedVideoInfo{
				OriginalName: "The.Walking.Dead",
				Season:       "S01",
				Episode:      "E06",
			},
		},
		{
			name:     "Bones.S04E07.WEB-DL.1080p.RusDub.Eng.SubEngSDH.mkv",
			filename: "Bones.S04E07.WEB-DL.1080p.RusDub.Eng.SubEngSDH.mkv",
			want: ParsedVideoInfo{
				OriginalName: "Bones",
				Season:       "S04",
				Episode:      "E07",
			},
		},
		{
			name:     "Bones.S10E06.The.Lost.Love.in.the.Foreign.Land.1080p.AMZN.WEB-DL.DD+5.1.H.265-SiGMA.mkv",
			filename: "Bones.S10E06.The.Lost.Love.in.the.Foreign.Land.1080p.AMZN.WEB-DL.DD+5.1GMA.mkv.H.265-Si",
			want: ParsedVideoInfo{
				OriginalName: "Bones",
				Season:       "S10",
				Episode:      "E06",
			},
		},
		{
			name:     "月光骑士.1080p.內封官方多語字幕",
			filename: "月光骑士.1080p.內封官方多語字幕",
			want: ParsedVideoInfo{
				Name: "月光骑士",
			},
		},
		{
			name:     "S01E04.M.Night.Shaym-Aliens!.mkv",
			filename: "S01E04.M.Night.Shaym-Aliens!.mkv",
			want: ParsedVideoInfo{
				Season:  "S01",
				Episode: "E04",
			},
		},
		{
			name:     "Criminal.Minds.S04E09.52.Pickup.1080p.AMZN.WEB-DL.DDP5.1.x265.10bit-Yumi@FRDS.mkv",
			filename: "Criminal.Minds.S04E09.52.Pickup.1080p.AMZN.WEB-DL.DDP5.1.x265.10bit-Yumi@FRDS.mkv",
			want: ParsedVideoInfo{
				OriginalName: "Criminal.Minds",
				Season:       "S04",
				Episode:      "E09",
			},
		},
		{
			name:     "Gravity.Falls.S01E19.Dreamscaperers.1080p.WEB-DL.DD5.1.H.264-BS666.mkv",
			filename: "Gravity.Falls.S01E19.Dreamscaperers.1080p.WEB-DL.DD5.1.H.264-BS666.mkv",
			want: ParsedVideoInfo{
				OriginalName: "Gravity.Falls",
				Season:       "S01",
				Episode:      "E19",
			},
		},
		{
			name:     "实习Y生格L.S17E03.HD1080P.YYeTs.中英双字.霸王龙压制组T-Rex.mp4",
			filename: "实习Y生格L.S17E03.HD1080P.YYeTs.中英双字.霸王龙压制组T-Rex.mp4",
			want: ParsedVideoInfo{
				Name:    "实习Y生格L",
				Season:  "S17",
				Episode: "E03",
			},
		},
		{
			name:     "[Prof] S02E02 - Mortynight Run.mkv",
			filename: "[Prof] S02E02 - Mortynight Run.mkv",
			want: ParsedVideoInfo{
				Season:  "S02",
				Episode: "E02",
			},
		},
		{
			name:     "tvr-greys-S03e02-720p.mkv",
			filename: "tvr-greys-S03e02-720p.mkv",
			want: ParsedVideoInfo{
				OriginalName: "greys",
				Season:       "S03",
				Episode:      "E02",
			},
		},
		{
			name:     "tvr-greys-S03e25-720p.mkv",
			filename: "tvr-greys-S03e25-720p.mkv",
			want: ParsedVideoInfo{
				OriginalName: "greys",
				Season:       "S03",
				Episode:      "E25",
			},
		},
		{
			name:     "老友记S02.Friends.1995.1080p.Blu-ray.x265.AC3￡cXcY@FRDS",
			filename: "老友记S02.Friends.1995.1080p.Blu-ray.x265.AC3￡cXcY@FRDS",
			want: ParsedVideoInfo{
				Name:   "老友记",
				Season: "S02",
			},
		},
		{
			name:     "Light.The.Night.S02E08.NF.WEB-DL.1080p.H264.DDP5.1.mp4",
			filename: "Light.The.Night.S02E08.NF.WEB-DL.1080p.H264.DDP5.1.mp4",
			want: ParsedVideoInfo{
				OriginalName: "Light.The.Night",
				Season:       "S02",
				Episode:      "E08",
			},
		},
		{
			name:     "Oh.No!Here.Comes.Trouble.S01E01.2023.2160p.WEB-DL.H265.DDP2.0.Gz.mkv",
			filename: "Oh.No!Here.Comes.Trouble.S01E01.2023.2160p.WEB-DL.H265.DDP2.0.Gz.mkv",
			want: ParsedVideoInfo{
				OriginalName: "Oh.No!Here.Comes.Trouble",
				Season:       "S01",
				Episode:      "E01",
			},
		},
		{
			name:     "逃避可耻却有用.NIGERUHA.HAJIDAGA.YAKUNITATSU.Ep10.Chi_Jap.HDTVrip.1280X720-ZhuixinFan.mp4",
			filename: "逃避可耻却有用.NIGERUHA.HAJIDAGA.YAKUNITATSU.Ep10.Chi_Jap.HDTVrip.1280X720-ZhuixinFan.mp4",
			want: ParsedVideoInfo{
				Name:         "逃避可耻却有用",
				OriginalName: "NIGERUHA.HAJIDAGA.YAKUNITATSU",
				Episode:      "E10",
			},
		},
		{
			name:     "2023.哈兰·科本的庇护所.8集全",
			filename: "2023.哈兰·科本的庇护所.8集全",
			want: ParsedVideoInfo{
				Name: "哈兰·科本的庇护所",
			},
		},
		{
			name:     "IT狂人.The.IT.Crowd.S01E01.Chi_Eng.DVDrip.608X336-YYeTs人人影视.rmvb",
			filename: "IT狂人.The.IT.Crowd.S01E01.Chi_Eng.DVDrip.608X336-YYeTs人人影视.rmvb",
			want: ParsedVideoInfo{
				Name:         "IT狂人",
				OriginalName: "The.IT.Crowd",
				Season:       "S01",
				Episode:      "E01",
			},
		},
		{
			name:     "2014.Doctor异乡人.20集全.1080p",
			filename: "2014.Doctor异乡人.20集全.1080p",
			want: ParsedVideoInfo{
				Name: "Doctor异乡人",
			},
		},
		{
			name:     "西行纪.S03.20",
			filename: "西行纪.S03.20",
			want: ParsedVideoInfo{
				Name:    "西行纪",
				Season:  "S03",
				Episode: "E20",
			},
		},
		{
			name:     "天官赐福_9_妖道之祸.mp4",
			filename: "天官赐福_9_妖道之祸.mp4",
			want: ParsedVideoInfo{
				Name:    "天官赐福",
				Episode: "E09",
			},
		},
		{
			name:     "盾之勇者成名录 S1 (14).mkv",
			filename: "盾之勇者成名录 S1 (14).mkv",
			want: ParsedVideoInfo{
				Name:    "盾之勇者成名录",
				Season:  "S01",
				Episode: "E14",
			},
		},
		{
			name:     "《镇魂街 第二季》第2话 慷慨悲歌_高清 1080P+.mp4",
			filename: "《镇魂街 第二季》第2话 慷慨悲歌_高清 1080P+.mp4",
			want: ParsedVideoInfo{
				Name:    "镇魂街",
				Season:  "S02",
				Episode: "E02",
			},
		},
		{
			name:     "重制版第8话_高清 1080P+.mp4",
			filename: "重制版第8话_高清 1080P+.mp4",
			want: ParsedVideoInfo{
				Episode: "E08",
			},
		},
		{
			name:     "镇魂街 第三季_01_1080P高码率_Tacit0924.mp4",
			filename: "镇魂街 第三季_01_1080P高码率_Tacit0924.mp4",
			want: ParsedVideoInfo{
				Name:    "镇魂街",
				Season:  "S03",
				Episode: "E01",
			},
		},
		{
			name:     "7-天府十三区.mp4",
			filename: "7-天府十三区.mp4",
			want: ParsedVideoInfo{
				Episode: "E07",
			},
		},
		{
			name:     "01.Cracking.Case.S02E01.2022.1080p.WEB-DL.H265.AAC-CatWEB.mp4",
			filename: "01.Cracking.Case.S02E01.2022.1080p.WEB-DL.H265.AAC-CatWEB.mp4",
			want: ParsedVideoInfo{
				OriginalName: "01.Cracking.Case",
				Season:       "S02",
				Episode:      "E01",
			},
		},
		{
			name:     "康熙微服私访记（二） 01.ts",
			filename: "康熙微服私访记（二） 01.ts",
			want: ParsedVideoInfo{
				Name:    "康熙微服私访记",
				Season:  "S02",
				Episode: "E01",
			},
		},
		{
			name:     "康熙微服私访记（一）29.ts",
			filename: "康熙微服私访记（一）29.ts",
			want: ParsedVideoInfo{
				Name:    "康熙微服私访记",
				Season:  "S01",
				Episode: "E29",
			},
		},
		{
			name:     "觀世音傳奇1(國語).mp4",
			filename: "觀世音傳奇1(國語).mp4",
			want: ParsedVideoInfo{
				Name: "觀世音傳奇1",
			},
		},
		{
			name:     "泰剧《他不是我》第13集中字版@喜翻译制组.mp4",
			filename: "泰剧《他不是我》第13集中字版@喜翻译制组.mp4",
			want: ParsedVideoInfo{
				Name:    "他不是我",
				Episode: "E13",
			},
		},
		{
			name:     "2023.CODE-愿望的代价-.10集全",
			filename: "2023.CODE-愿望的代价-.10集全",
			want: ParsedVideoInfo{
				Name: "CODE-愿望的代价-",
			},
		},
		{
			name:     "1020期 第1期.mp4",
			filename: "1020期 第1期.mp4",
			want: ParsedVideoInfo{
				Episode: "1020",
			},
		},
		{
			name:     "0731入住日记第9期.mp4",
			filename: "0731入住日记第9期.mp4",
			want: ParsedVideoInfo{
				Episode: "0731",
			},
		},
		{
			name:     "20161029.mp4",
			filename: "20161029.mp4",
			want: ParsedVideoInfo{
				Episode: "20161029",
			},
		},
		{
			name:     "01-20.mp4",
			filename: "01-20.mp4",
			want: ParsedVideoInfo{
				Episode: "0120",
			},
		},
		{
			name:     "第1期.mp4",
			filename: "第1期.mp4",
			want: ParsedVideoInfo{
				Episode: "E01",
			},
		},
		{
			name:     "05.05期.mp4",
			filename: "05.05期.mp4",
			want: ParsedVideoInfo{
				Episode: "E05",
			},
		},
		{
			name:     "Trump.Card.season.V.20200508.EP12.HD1080P.X264.AAC.Mandarin.CHS.BDE4.mp4",
			filename: "Trump.Card.season.V.20200508.EP12.HD1080P.X264.AAC.Mandarin.CHS.BDE4.mp4",
			want: ParsedVideoInfo{
				OriginalName: "Trump.Card",
				Season:       "S05",
				Episode:      "E12",
			},
		},
		{
			name:     "2021.04.16期.mp4",
			filename: "2021.04.16期.mp4",
			want: ParsedVideoInfo{
				Episode: "20210416",
			},
		},
		{
			name:     "第12期会员版 贾玲不舍.mp4",
			filename: "第12期会员版 贾玲不舍.mp4",
			want: ParsedVideoInfo{
				Episode: "E12",
			},
		},
		{
			name:     "20231020期_Tacit0924.mp4",
			filename: "20231020期_Tacit0924.mp4",
			want: ParsedVideoInfo{
				Episode: "20231020",
			},
		},
		{
			name:     "令人心动的offer第10期.mp4",
			filename: "令人心动的offer第10期.mp4",
			want: ParsedVideoInfo{
				Name:    "令人心动的offer",
				Episode: "E10",
			},
		},
		{
			name:     "第9期上：医学生花式宣讲，冯岑在线卖唱.mp4",
			filename: "第9期上：医学生花式宣讲，冯岑在线卖唱.mp4",
			want: ParsedVideoInfo{
				Episode: "第9期上",
			},
		},
		{
			name:     "第9期下：医学生花式宣讲，冯岑在线卖唱.mp4",
			filename: "第9期下：医学生花式宣讲，冯岑在线卖唱.mp4",
			want: ParsedVideoInfo{
				Episode: "第9期下",
			},
		},
		{
			name:     "0926第4局.mp4",
			filename: "0926第4局.mp4",
			want: ParsedVideoInfo{
				Episode: "0926",
			},
		},
		{
			name:     "04期-下.mp4",
			filename: "04期-下.mp4",
			want: ParsedVideoInfo{
				Episode: "第4期下",
			},
		},
		{
			name:     "10.04期-下.mp4",
			filename: "10.04期-下.mp4",
			want: ParsedVideoInfo{
				Episode: "1004下",
			},
		},
		{
			name:     "第10期 下:冠军票数惊人",
			filename: "第10期 下:冠军票数惊人",
			want: ParsedVideoInfo{
				Episode: "第10期下",
			},
		},
		{
			name:     "20230909第5期纯享_Tacit0924.mp4",
			filename: "20230909第5期纯享_Tacit0924.mp4",
			want: ParsedVideoInfo{
				Episode: "20230909",
			},
		},
		{
			name:     "12期.mp4",
			filename: "12期.mp4",
			want: ParsedVideoInfo{
				Episode: "E12",
			},
		},
		{
			name:     "04期 - 上.mp4",
			filename: "04期 - 上.mp4",
			want: ParsedVideoInfo{
				Episode: "第4期上",
			},
		},
		{
			name:     "第14期下 半决赛五条人新歌首唱 新裤子开场舞魂爆发",
			filename: "第14期下 半决赛五条人新歌首唱 新裤子开场舞魂爆发",
			want: ParsedVideoInfo{
				Episode: "第14期下",
			},
		},
		{
			name:     "20200729上 张雨绮笑聊离婚 _Tacit0924 .mp4",
			filename: "20200729上 张雨绮笑聊离婚 _Tacit0924 .mp4",
			want: ParsedVideoInfo{
				Episode: "20200729上",
			},
		},
		{
			name:     "20190922徐峥吐槽黄渤爆笑模仿沈腾 _Tacit0924 .mp4",
			filename: "20190922徐峥吐槽黄渤爆笑模仿沈腾 _Tacit0924 .mp4",
			want: ParsedVideoInfo{
				Episode: "20190922",
			},
		},
		{
			name:     "20221216-第2期加更_Tacit0924.mp4",
			filename: "20221216-第2期加更_Tacit0924.mp4",
			want: ParsedVideoInfo{
				Episode: "20221216",
			},
		},
		{
			name:     "花儿与少年第一季20140606期：花儿们抵达马德里_Tacit0924.mp4",
			filename: "花儿与少年第一季20140606期：花儿们抵达马德里_Tacit0924.mp4",
			want: ParsedVideoInfo{
				Name:    "花儿与少年",
				Season:  "S01",
				Episode: "20140606",
			},
		},
		{
			name:     "中国好声音.第四季.The.Voice.Of.China.S04.20150927.HD720P.X264.AAC.CHS.Mp4Ba.mp4",
			filename: "中国好声音.第四季.The.Voice.Of.China.S04.20150927.HD720P.X264.AAC.CHS.Mp4Ba.mp4",
			want: ParsedVideoInfo{
				Name:         "中国好声音",
				OriginalName: "The.Voice.Of.China",
				Season:       "S04",
				Episode:      "20150927",
				SubtitleLang: "chi",
			},
		},
		{
			name:     "龙门镖局.7.6.Longmen.Express.2013.EP01-40.4K.2160p.HEVC.AAC-DHTCLUB",
			filename: "龙门镖局.7.6.Longmen.Express.2013.EP01-40.4K.2160p.HEVC.AAC-DHTCLUB",
			want: ParsedVideoInfo{
				Name:         "龙门镖局",
				OriginalName: "Longmen.Express",
			},
		},
		{
			name:     "破冰行动.EP01-48.2019.2160p.DVD.WEB-DL.x264.AAC-HQC",
			filename: "破冰行动.EP01-48.2019.2160p.DVD.WEB-DL.x264.AAC-HQC",
			want: ParsedVideoInfo{
				Name: "破冰行动",
			},
		},
		{
			name:     "A.Little.Mood.For.Love.EP01-40.2021.4K.60FPS.WEB-DL.HEVC.AAC-HQC",
			filename: "A.Little.Mood.For.Love.EP01-40.2021.4K.60FPS.WEB-DL.HEVC.AAC-HQC",
			want: ParsedVideoInfo{
				OriginalName: "A.Little.Mood.For.Love",
			},
		},
		{
			name:     "J-将夜.Ever.Night.S01.2018.EP01-60.WEB-DL.1080p.H265.AAC-BtsTV",
			filename: "J-将夜.Ever.Night.S01.2018.EP01-60.WEB-DL.1080p.H265.AAC-BtsTV",
			want: ParsedVideoInfo{
				Name:         "将夜",
				OriginalName: "Ever.Night",
				Season:       "S01",
			},
		},
		{
			name:     "还珠格格3.2003.40集特别版+6部MV .繁体中字 无台标水印版",
			filename: "还珠格格3.2003.40集特别版+6部MV .繁体中字 无台标水印版",
			want: ParsedVideoInfo{
				Name: "还珠格格3",
			},
		},
		{
			name:     "鹿鼎记.1984.全40集.GOTV-TS.国语无字★【30.3G】",
			filename: "鹿鼎记.1984.全40集.GOTV-TS.国语无字★【30.3G】",
			want: ParsedVideoInfo{
				Name: "鹿鼎记",
			},
		},
		{
			name:     "布衣神相[全30集][粤语音轨+简繁字幕]",
			filename: "布衣神相[全30集][粤语音轨+简繁字幕]",
			want: ParsedVideoInfo{
				Name: "布衣神相",
			},
		},
		{
			name:     "宝莲灯前传.全46集.Lotus.Lantern.Prequel.2009.V2.Complete.2160P[4K]WEB-DL.X265.AAC-Vampire",
			filename: "宝莲灯前传.全46集.Lotus.Lantern.Prequel.2009.V2.Complete.2160P[4K]WEB-DL.X265.AAC-Vampire",
			want: ParsedVideoInfo{
				Name:         "宝莲灯前传",
				OriginalName: "Lotus.Lantern.Prequel",
			},
		},
		{
			name:     "三十而已.全43集.Nothing.But.Thirty.2020.4K.H265.AAC.内嵌简中.87.7G",
			filename: "三十而已.全43集.Nothing.But.Thirty.2020.4K.H265.AAC.内嵌简中.87.7G",
			want: ParsedVideoInfo{
				Name:         "三十而已",
				OriginalName: "Nothing.But.Thirty",
			},
		},
		{
			name:     "战长沙.豆瓣9.1.高分战争剧.全32集[2014]",
			filename: "战长沙.豆瓣9.1.高分战争剧.全32集[2014]",
			want: ParsedVideoInfo{
				Name: "战长沙",
			},
		},
		{
			name:     "大理寺日志 第一季(12集全)",
			filename: "大理寺日志 第一季(12集全)",
			want: ParsedVideoInfo{
				Name:   "大理寺日志",
				Season: "S01",
			},
		},
		{
			name:     "魔幻手机.1+2.1080P.国语中字",
			filename: "魔幻手机.1+2.1080P.国语中字",
			want: ParsedVideoInfo{
				Name: "魔幻手机",
			},
		},
		{
			name:     "一起同过窗.1-3季.国语中字",
			filename: "一起同过窗.1-3季.国语中字",
			want: ParsedVideoInfo{
				Name: "一起同过窗",
			},
		},
		{
			name:     "毛骗1-3季",
			filename: "毛骗1-3季",
			want: ParsedVideoInfo{
				Name: "毛骗",
			},
		},
		{
			name:     "Y 隐门 (2023)(25集)又名十八年后的终极告白3.0(1-3)",
			filename: "Y 隐门 (2023)(25集)又名十八年后的终极告白3.0(1-3)",
			want: ParsedVideoInfo{
				Name:    "隐门",
				Episode: "E25",
			},
		},
		{
			name:     "2021.华灯初上.1-3季",
			filename: "2021.华灯初上.1-3季",
			want: ParsedVideoInfo{
				Name: "华灯初上",
			},
		},
		{
			name:     "H）画江湖之不良人1-6季.4K.含画江湖6部全系列【国漫】",
			filename: "H）画江湖之不良人1-6季.4K.含画江湖6部全系列【国漫】",
			want: ParsedVideoInfo{
				Name: "画江湖之不良人",
			},
		},
		{
			name:     "1999.数码宝贝.1-8季.多语版+10部剧场版+OVA",
			filename: "1999.数码宝贝.1-8季.多语版+10部剧场版+OVA",
			want: ParsedVideoInfo{
				Name:   "数码宝贝",
				Season: "OVA",
			},
		},
		{
			name:     "08.9号秘事1-7季 - 豆瓣9.0分",
			filename: "08.9号秘事1-7季 - 豆瓣9.0分",
			want: ParsedVideoInfo{
				Name: "9号秘事",
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
