package walker

import (
	"testing"
)

func TestParseFilenameForVideoSpecial(t *testing.T) {
	tests := []struct {
		name     string
		filename string
		want     ParsedVideoInfo
	}{
		{
			name:     "重启人生番外篇",
			filename: "重启人生番外篇",
			want: ParsedVideoInfo{
				Name:   "重启人生",
				Season: "番外篇",
			},
		},
		{
			name:     "【熟肉-花絮】Transformers.2.BONUS.2009.HR-HDTV.AC3.1024X576.x264.mkv",
			filename: "【熟肉-花絮】Transformers.2.BONUS.2009.HR-HDTV.AC3.1024X576.x264.mkv",
			want: ParsedVideoInfo{
				OriginalName: "Transformers.2",
				Season:       "其他",
				Episode:      "BONUS",
			},
		},
		{
			name:     "一人之下手游泡面番 第4话 编剧的宠爱 720P(准高清).mp4",
			filename: "一人之下手游泡面番 第4话 编剧的宠爱 720P(准高清).mp4",
			want: ParsedVideoInfo{
				Name:    "一人之下手游",
				Season:  "泡面番",
				Episode: "E04",
			},
		},
		{
			name:     "[VCB-Studio] Ushio to Tora [NCOP03][Ma10p_1080p][x265_flac].mkv",
			filename: "[VCB-Studio] Ushio to Tora [NCOP03][Ma10p_1080p][x265_flac].mkv",
			want: ParsedVideoInfo{
				OriginalName: "Ushio.to.Tora",
				Season:       "其他",
				Episode:      "NCOP03",
			},
		},
		{
			name:     "假面骑士圣刃续集",
			filename: "假面骑士圣刃续集",
			want: ParsedVideoInfo{
				Name:    "假面骑士圣刃",
				Episode: "续集",
			},
		},
		{
			name:     "[公众号：SS的笔记/腹肌崩坏太郎番外/星空][假面骑士01 番外][奇迹的身份改变！？或人VS腹肌崩坏太郎 宿命的段子对决].mp4",
			filename: "[公众号：SS的笔记/腹肌崩坏太郎番外/星空][假面骑士01 番外][奇迹的身份改变！？或人VS腹肌崩坏太郎 宿命的段子对决].mp4",
			want: ParsedVideoInfo{
				Episode: "番外01",
			},
		},
		{
			name:     "[1080P][DBD制作组&离谱Sub][龙珠GT][特典映像][01][HEVC-10bit][AC3].mkv",
			filename: "[1080P][DBD制作组&离谱Sub][龙珠GT][特典映像][01][HEVC-10bit][AC3].mkv",
			want: ParsedVideoInfo{
				Name:    "龙珠GT",
				Season:  "特典映像",
				Episode: "E01",
			},
		},
		{
			name:     "妖精森林的小不点 NCED01.mkv",
			filename: "妖精森林的小不点 NCED01.mkv",
			want: ParsedVideoInfo{
				Name:    "妖精森林的小不点",
				Season:  "其他",
				Episode: "NCED01",
			},
		},
		{
			name:     "[VCB-Studio] Ushio to Tora [CM05][Ma10p_1080p][x265_flac].mkv",
			filename: "[VCB-Studio] Ushio to Tora [CM05][Ma10p_1080p][x265_flac].mkv",
			want: ParsedVideoInfo{
				OriginalName: "Ushio.to.Tora",
				Season:       "其他",
				Episode:      "CM05",
			},
		},
		{
			name:     "[1080P][DBD制作组&离谱Sub][龙珠GT][NCOP2][HEVC-10bit][AC3].mkv",
			filename: "[1080P][DBD制作组&离谱Sub][龙珠GT][NCOP2][HEVC-10bit][AC3].mkv",
			want: ParsedVideoInfo{
				Name:    "龙珠GT",
				Season:  "其他",
				Episode: "NCOP2",
			},
		},
		{
			name:     "[DAY][仮面戦隊ゴライダー][PR1][BDrip][1080P][X264 FLAC].mkv",
			filename: "[DAY][仮面戦隊ゴライダー][PR1][BDrip][1080P][X264 FLAC].mkv",
			want: ParsedVideoInfo{
				Name:    "仮面戦隊ゴライダー",
				Season:  "其他",
				Episode: "PR1",
			},
		},
		{
			name:     "斗破苍穹特别篇2[4K].mp4",
			filename: "斗破苍穹特别篇2[4K].mp4",
			want: ParsedVideoInfo{
				Name:    "斗破苍穹",
				Episode: "特别篇2",
			},
		},
		{
			name:     "《孤独的美食家 盛夏的博多 出差SP》第1集_高清 1080P+.mp4",
			filename: "《孤独的美食家 盛夏的博多 出差SP》第1集_高清 1080P+.mp4",
			want: ParsedVideoInfo{
				Name:    "孤独的美食家",
				Season:  "SP",
				Episode: "E01",
			},
		},
		{
			name:     "2013 LegalHigh SP2.mp4",
			filename: "2013 LegalHigh SP2.mp4",
			want: ParsedVideoInfo{
				OriginalName: "LegalHigh",
				Season:       "SP",
				Episode:      "E02",
			},
		},
		{
			name:     "番外2-杀人事件.mp4",
			filename: "番外2-杀人事件.mp4",
			want: ParsedVideoInfo{
				Episode: "番外02",
			},
		},
		{
			name:     "花絮13 王蝉动捕演员刘珂君助力凡人修仙传特别篇.mp4",
			filename: "花絮13 王蝉动捕演员刘珂君助力凡人修仙传特别篇.mp4",
			want: ParsedVideoInfo{
				Episode: "花絮13",
			},
		},
		{
			name:     "显微镜下的大明之丝绢案-预告1",
			filename: "显微镜下的大明之丝绢案-预告1",
			want: ParsedVideoInfo{
				Name:    "显微镜下的大明之丝绢案",
				Episode: "预告01",
			},
		},
		{
			name:     "彩蛋1：腹肌胸肌肱二头肌！路哥这完美身材我爱了！.mp4",
			filename: "彩蛋1：腹肌胸肌肱二头肌！路哥这完美身材我爱了！.mp4",
			want: ParsedVideoInfo{
				Episode: "彩蛋01",
			},
		},
		{
			name:     "去有风的地方_彩蛋_1080P_Tacit0924.mp4",
			filename: "去有风的地方_彩蛋_1080P_Tacit0924.mp4",
			want: ParsedVideoInfo{
				Name:    "去有风的地方",
				Episode: "彩蛋01",
			},
		},
		{
			name:     "今生也是第一次_彩蛋.mp4",
			filename: "今生也是第一次_彩蛋.mp4",
			want: ParsedVideoInfo{
				Name:    "今生也是第一次",
				Episode: "彩蛋01",
			},
		},
		{
			name:     "彩蛋.mp4",
			filename: "彩蛋.mp4",
			want: ParsedVideoInfo{
				Episode: "彩蛋01",
			},
		},
		{
			name:     "无间 彩蛋3 1080P(高清SDR)(1080344)_Tacit0924.mp4",
			filename: "无间 彩蛋3 1080P(高清SDR)(1080344)_Tacit0924.mp4",
			want: ParsedVideoInfo{
				Name:    "无间",
				Episode: "彩蛋03",
			},
		},
		{
			name:     "番外篇.mp4",
			filename: "番外篇.mp4",
			want:     ParsedVideoInfo{},
		},
		{
			name:     "早餐中国 第2季 收官特辑：萌娃版：这些\"戏精\"宝宝太抢戏啦~.mp4",
			filename: "早餐中国 第2季 收官特辑：萌娃版：这些\"戏精\"宝宝太抢戏啦~.mp4",
			want: ParsedVideoInfo{
				Name:    "早餐中国",
				Season:  "S02",
				Episode: "特辑01",
			},
		},
		{
			name:     "星际穿越预告片",
			filename: "星际穿越预告片",
			want: ParsedVideoInfo{
				Name:    "星际穿越片",
				Episode: "预告01",
			},
		},
		{
			name:     "加勒比海盗预告片合集",
			filename: "加勒比海盗预告片合集",
			want: ParsedVideoInfo{
				Name:    "加勒比海盗片合集",
				Episode: "预告01",
			},
		},
		{
			name:     "[YY]XX.2013.Special.E01.720p.WEB-DL.AAC.x264",
			filename: "[YY]XX.2013.Special.E01.720p.WEB-DL.AAC.x264",
			want: ParsedVideoInfo{
				OriginalName: "Special",
				Episode:      "E01",
			},
		},
		{
			name:     "Test Show - Episode 1 (2020)",
			filename: "Test Show - Episode 1 (2020)",
			want: ParsedVideoInfo{
				OriginalName: "Test.Show",
				Episode:      "E01",
			},
		},
		{
			name:     "test.cht",
			filename: "test.cht",
			want: ParsedVideoInfo{
				OriginalName: "test",
			},
		},
		{
			name:     "test.chs",
			filename: "test.chs",
			want: ParsedVideoInfo{
				OriginalName: "test",
			},
		},
		{
			name:     "test.eng",
			filename: "test.eng",
			want: ParsedVideoInfo{
				OriginalName: "test",
			},
		},
		{
			name:     "【B站】英语六级CET6全程班",
			filename: "【B站】英语六级CET6全程班",
			want: ParsedVideoInfo{
				Name: "英语六级CET6全程班",
			},
		},
		{
			name:     "E25.仔细阅读passage6解析.mp4",
			filename: "E25.仔细阅读passage6解析.mp4",
			want: ParsedVideoInfo{
				Episode: "E25",
			},
		},
		{
			name:     "10（1）.mp4",
			filename: "10（1）.mp4",
			want: ParsedVideoInfo{
				Episode: "E10",
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
