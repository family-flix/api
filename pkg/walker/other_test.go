package walker

import (
	"testing"
)

func TestParseFilenameForVideoOther(t *testing.T) {
	tests := []struct {
		name     string
		filename string
		want     ParsedVideoInfo
	}{
		{
			name:     "第一部",
			filename: "第一部",
			want: ParsedVideoInfo{
				Name: "第一部",
			},
		},
		{
			name:     "Season 1",
			filename: "Season 1",
			want: ParsedVideoInfo{
				Season: "S01",
			},
		},
		{
			name:     "S02 1080P  (52集)",
			filename: "S02 1080P  (52集)",
			want: ParsedVideoInfo{
				Season:  "S02",
				Episode: "E52",
			},
		},
		{
			name:     "36.mp4",
			filename: "36.mp4",
			want: ParsedVideoInfo{
				Episode: "E36",
			},
		},
		{
			name:     "【22222abc.com】30.mkv",
			filename: "【22222abc.com】30.mkv",
			want: ParsedVideoInfo{
				Episode: "E30",
			},
		},
		{
			name:     "15(2).mp4",
			filename: "15(2).mp4",
			want: ParsedVideoInfo{
				Episode: "E15",
			},
		},
		{
			name:     "28(1).mp4",
			filename: "28(1).mp4",
			want: ParsedVideoInfo{
				Episode: "E28",
			},
		},
		{
			name:     "15_2.mp4",
			filename: "15_2.mp4",
			want: ParsedVideoInfo{
				Episode: "E15",
			},
		},
		{
			name:     "01国语.mp4",
			filename: "01国语.mp4",
			want: ParsedVideoInfo{
				Episode: "E01",
			},
		},
		{
			name:     "【百度云盘下载】35.mp4",
			filename: "【百度云盘下载】35.mp4",
			want: ParsedVideoInfo{
				Episode: "E35",
			},
		},
		{
			name:     "粤语10",
			filename: "粤语10",
			want: ParsedVideoInfo{
				Episode: "E10",
			},
		},
		{
			name:     "粤语10.mp4",
			filename: "粤语10.mp4",
			want: ParsedVideoInfo{
				Episode: "E10",
			},
		},
		{
			name:     "粤语E10.mp4",
			filename: "粤语E10.mp4",
			want: ParsedVideoInfo{
				Episode: "E10",
			},
		},
		{
			name:     "7.mp4",
			filename: "7.mp4",
			want: ParsedVideoInfo{
				Episode: "E07",
			},
		},
		{
			name:     "【04】 .mp4",
			filename: "【04】 .mp4",
			want: ParsedVideoInfo{
				Episode: "E04",
			},
		},
		{
			name:     "08-4K.mp4",
			filename: "08-4K.mp4",
			want: ParsedVideoInfo{
				Episode: "E08",
			},
		},
		{
			name:     "外挂字幕",
			filename: "外挂字幕",
			want:     ParsedVideoInfo{},
		},
		{
			name:     "1080P国粤双语",
			filename: "1080P国粤双语",
			want:     ParsedVideoInfo{},
		},
		{
			name:     "1080P.外挂简中",
			filename: "1080P.外挂简中",
			want:     ParsedVideoInfo{},
		},
		{
			name:     "1080P官中压制",
			filename: "1080P官中压制",
			want:     ParsedVideoInfo{},
		},
		{
			name:     "1080P官中",
			filename: "1080P官中",
			want:     ParsedVideoInfo{},
		},
		{
			name:     "1080P超前完结",
			filename: "1080P超前完结",
			want:     ParsedVideoInfo{},
		},
		{
			name:     "1080P超前点映",
			filename: "1080P超前点映",
			want:     ParsedVideoInfo{},
		},
		{
			name:     "连续剧版",
			filename: "连续剧版",
			want:     ParsedVideoInfo{},
		},
		{
			name:     "4K高码率[单集6GB]",
			filename: "4K高码率[单集6GB]",
			want:     ParsedVideoInfo{},
		},
		{
			name:     "4K B站logo",
			filename: "4K B站logo",
			want:     ParsedVideoInfo{},
		},
		{
			name:     "4khq60fps.mp4",
			filename: "4khq60fps.mp4",
			want:     ParsedVideoInfo{},
		},
		{
			name:     "______.2013.1080p.BluRay.REMUX.AVC.DTS-HD.MA.5.1.mkv",
			filename: "______.2013.1080p.BluRay.REMUX.AVC.DTS-HD.MA.5.1.mkv",
			want:     ParsedVideoInfo{},
		},
		{
			name:     "前5季",
			filename: "前5季",
			want:     ParsedVideoInfo{},
		},
		{
			name:     "PART.1",
			filename: "PART.1",
			want:     ParsedVideoInfo{},
		},
		{
			name:     "2023.HD1080P.英语中字.mp4",
			filename: "2023.HD1080P.英语中字.mp4",
			want:     ParsedVideoInfo{},
		},
		{
			name:     "B站S3",
			filename: "B站S3",
			want: ParsedVideoInfo{
				Season: "S03",
			},
		},
		{
			name:     "轻音少女高内存版",
			filename: "轻音少女高内存版",
			want: ParsedVideoInfo{
				Name: "轻音少女",
			},
		},
		{
			name:     "NCOP.mp4",
			filename: "NCOP.mp4",
			want: ParsedVideoInfo{
				Season:  "其他",
				Episode: "NCOP",
			},
		},
		{
			name:     "[VCB-Studio] Kakegurui×× [NCOP][Ma10p_1080p][x265_flac].mkv",
			filename: "[VCB-Studio] Kakegurui×× [NCOP][Ma10p_1080p][x265_flac].mkv",
			want: ParsedVideoInfo{
				OriginalName: "Kakegurui",
				Season:       "其他",
				Episode:      "NCOP",
			},
		},
		{
			name:     "[官中 简体][1-12集全]",
			filename: "[官中 简体][1-12集全]",
			want:     ParsedVideoInfo{},
		},
		{
			name:     "干物妹！小埋R 8 小埋与小光.flv",
			filename: "干物妹！小埋R 8 小埋与小光.flv",
			want: ParsedVideoInfo{
				Name:    "干物妹！小埋R",
				Episode: "E08",
			},
		},
		{
			name:     "【海绵宝宝】.SpongeBob CCTV Version",
			filename: "【海绵宝宝】.SpongeBob CCTV Version",
			want: ParsedVideoInfo{
				OriginalName: "SpongeBob",
			},
		},
		{
			name:     "79.官中简体.mp4",
			filename: "79.官中简体.mp4",
			want: ParsedVideoInfo{
				Episode: "E79",
			},
		},
		{
			name:     "79​.rmvb",
			filename: "79​.rmvb",
			want: ParsedVideoInfo{
				Episode: "E79",
			},
		},
		{
			name:     "第10季",
			filename: "第10季",
			want: ParsedVideoInfo{
				Season: "S10",
			},
		},
		{
			name:     "4K&HDR&60FPS&Dolby&国日双语.mkv",
			filename: "4K&HDR&60FPS&Dolby&国日双语.mkv",
			want:     ParsedVideoInfo{},
		},
		{
			name:     "001-100",
			filename: "001-100",
			want:     ParsedVideoInfo{},
		},
		{
			name:     "901-1000",
			filename: "901-1000",
			want:     ParsedVideoInfo{},
		},
		{
			name:     "1001-1004",
			filename: "1001-1004",
			want:     ParsedVideoInfo{},
		},
		{
			name:     "1080P俄版流媒体中字.mkv",
			filename: "1080P俄版流媒体中字.mkv",
			want:     ParsedVideoInfo{},
		},
		{
			name:     "4K高码杜比音效和AAC双音轨.mkv",
			filename: "4K高码杜比音效和AAC双音轨.mkv",
			want:     ParsedVideoInfo{},
		},
		{
			name:     "4K超前26集完结",
			filename: "4K超前26集完结",
			want:     ParsedVideoInfo{},
		},
		{
			name:     "超前35-40",
			filename: "超前35-40",
			want:     ParsedVideoInfo{},
		},
		{
			name:     "超前点播",
			filename: "超前点播",
			want:     ParsedVideoInfo{},
		},
		{
			name:     "备份",
			filename: "备份",
			want:     ParsedVideoInfo{},
		},
		{
			name:     "春节限定",
			filename: "春节限定",
			want:     ParsedVideoInfo{},
		},
		{
			name:     "4K 高码等版本",
			filename: "4K 高码等版本",
			want:     ParsedVideoInfo{},
		},
		{
			name:     "4KHQ60FPS",
			filename: "4KHQ60FPS",
			want:     ParsedVideoInfo{},
		},
		{
			name:     "20230326期：马晓东周志刚师徒进退两难.TS",
			filename: "20230326期：马晓东周志刚师徒进退两难.TS",
			want: ParsedVideoInfo{
				Episode: "20230326",
			},
		},
		{
			name:     "20230326：马晓东周志刚师徒进退两难.TS",
			filename: "20230326：马晓东周志刚师徒进退两难.TS",
			want: ParsedVideoInfo{
				Episode: "20230326",
			},
		},
		{
			name:     "[ENG] [090520] [TSKS] Cinderella Man E11.rmvb",
			filename: "[ENG] [090520] [TSKS] Cinderella Man E11.rmvb",
			want: ParsedVideoInfo{
				Name:    "Cinderella Man",
				Episode: "E11",
			},
		},
		{
			name:     "Cinderella Man E11.rmvb",
			filename: "Cinderella Man E11.rmvb",
			want: ParsedVideoInfo{
				Name:    "Cinderella Man",
				Episode: "E11",
			},
		},
		{
			name:     "Cinderella.Man.E11.rmvb",
			filename: "Cinderella.Man.E11.rmvb",
			want: ParsedVideoInfo{
				Name:    "Cinderella.Man",
				Episode: "E11",
			},
		},
		{
			name:     "[S01] [090520] [TSKS] Cinderella Man E11.rmvb",
			filename: "[S01] [090520] [TSKS] Cinderella Man E11.rmvb",
			want: ParsedVideoInfo{
				Name:    "Cinderella Man",
				Season:  "S01",
				Episode: "E11",
			},
		},
		{
			name:     "S01E11.rmvb",
			filename: "S01E11.rmvb",
			want: ParsedVideoInfo{
				Season:  "S01",
				Episode: "E11",
			},
		},
		{
			name:     "S01E11",
			filename: "S01E11",
			want: ParsedVideoInfo{
				Season:  "S01",
				Episode: "E11",
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
