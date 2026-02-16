package walker

import (
	"testing"
)

func TestParseFilenameForVideoShow(t *testing.T) {
	t.Run("鸡毛飞上天 - S01E55 - 第 55 集.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("鸡毛飞上天 - S01E55 - 第 55 集.mp4")
		want := ParsedVideoInfo{Name: "鸡毛飞上天", OriginalName: "", Season: "S01", Episode: "E55"}
		AssertEqual(t, got, want)
	})

	t.Run("魔幻手机2傻妞归来.S01E42.1080P.WEB-DL.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("魔幻手机2傻妞归来.S01E42.1080P.WEB-DL.mp4")
		want := ParsedVideoInfo{Name: "魔幻手机2傻妞归来", OriginalName: "", Season: "S01", Episode: "E42"}
		AssertEqual(t, got, want)
	})

	t.Run("Magic.Mobile.Phone.2008.S01E42.WEB-DL.1080p.H265.AAC-HotWEB.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("Magic.Mobile.Phone.2008.S01E42.WEB-DL.1080p.H265.AAC-HotWEB.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "Magic.Mobile.Phone", Season: "S01", Episode: "E42"}
		AssertEqual(t, got, want)
	})

	t.Run("Wild.Bloom.S01E34.2022.2160p.WEB-DL.H265.DDP5.1-BlackTV.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("Wild.Bloom.S01E34.2022.2160p.WEB-DL.H265.DDP5.1-BlackTV.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "Wild.Bloom", Season: "S01", Episode: "E34"}
		AssertEqual(t, got, want)
	})

	t.Run("白鹿原.White.Deer.Plain.2017.E75.1080p.WEB-DL.AAC.X264.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("白鹿原.White.Deer.Plain.2017.E75.1080p.WEB-DL.AAC.X264.mp4")
		want := ParsedVideoInfo{Name: "白鹿原", OriginalName: "White.Deer.Plain", Season: "", Episode: "E75"}
		AssertEqual(t, got, want)
	})

	t.Run("宝莲灯前传.Lotus.Lantern.Prequel.2009.V2.EP46.2160P(4K).WEB-DL.X265.AAC-Vampire.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("宝莲灯前传.Lotus.Lantern.Prequel.2009.V2.EP46.2160P(4K).WEB-DL.X265.AAC-Vampire.mp4")
		want := ParsedVideoInfo{Name: "宝莲灯前传", OriginalName: "Lotus.Lantern.Prequel", Season: "", Episode: "E46"}
		AssertEqual(t, got, want)
	})

	t.Run("HDJ Beijing Love Story EP39 HDTV 1080i H264-NGB.ts", func(t *testing.T) {
		got := ParseFilenameForVideo("HDJ Beijing Love Story EP39 HDTV 1080i H264-NGB.ts")
		want := ParsedVideoInfo{Name: "", OriginalName: "Beijing.Love.Story", Season: "", Episode: "E39"}
		AssertEqual(t, got, want)
	})

	t.Run("M 魔幻手机2：傻妞归来 (2014)", func(t *testing.T) {
		got := ParseFilenameForVideo("M 魔幻手机2：傻妞归来 (2014)")
		want := ParsedVideoInfo{Name: "魔幻手机2：傻妞归来", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("还珠格格3.E40.Extended.DVDRip.x264.AC3-CMCT.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("还珠格格3.E40.Extended.DVDRip.x264.AC3-CMCT.mkv")
		want := ParsedVideoInfo{Name: "还珠格格3", OriginalName: "", Season: "", Episode: "E40"}
		AssertEqual(t, got, want)
	})

	t.Run("赘婿.无字幕版.4K.2021.WEB-DL.2160P.H265.AAC-AIU", func(t *testing.T) {
		got := ParseFilenameForVideo("赘婿.无字幕版.4K.2021.WEB-DL.2160P.H265.AAC-AIU")
		want := ParsedVideoInfo{Name: "赘婿", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("赘婿.第1季.E36.HD4K.2160P.HD265.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("赘婿.第1季.E36.HD4K.2160P.HD265.mp4")
		want := ParsedVideoInfo{Name: "赘婿", OriginalName: "", Season: "S01", Episode: "E36"}
		AssertEqual(t, got, want)
	})

	t.Run("鹿鼎记(84版).38", func(t *testing.T) {
		got := ParseFilenameForVideo("鹿鼎记(84版).38")
		want := ParsedVideoInfo{Name: "鹿鼎记", OriginalName: "", Season: "", Episode: "E38"}
		AssertEqual(t, got, want)
	})

	t.Run("谈判专家-欧阳震华(2002)1080P", func(t *testing.T) {
		got := ParseFilenameForVideo("谈判专家-欧阳震华(2002)1080P")
		want := ParsedVideoInfo{Name: "谈判专家", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("枪神-20.国粤双语", func(t *testing.T) {
		got := ParseFilenameForVideo("枪神-20.国粤双语")
		want := ParsedVideoInfo{Name: "枪神", OriginalName: "", Season: "", Episode: "E20"}
		AssertEqual(t, got, want)
	})

	t.Run("第九节课1080P.内嵌字幕", func(t *testing.T) {
		got := ParseFilenameForVideo("第九节课1080P.内嵌字幕")
		want := ParsedVideoInfo{Name: "第九节课", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("知否知否应是绿肥红瘦.1080台版高码.1080三无.4k.60帧", func(t *testing.T) {
		got := ParseFilenameForVideo("知否知否应是绿肥红瘦.1080台版高码.1080三无.4k.60帧")
		want := ParsedVideoInfo{Name: "知否知否应是绿肥红瘦", OriginalName: "1080", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("无心法师.第一季.Wuxin：The.Monster.Killer.S01E20.2015.1080p.WEB-DL.x264.AAC-HeiGuo.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("无心法师.第一季.Wuxin：The.Monster.Killer.S01E20.2015.1080p.WEB-DL.x264.AAC-HeiGuo.mp4")
		want := ParsedVideoInfo{Name: "无心法师", OriginalName: "Wuxin：The.Monster.Killer", Season: "S01", Episode: "E20"}
		AssertEqual(t, got, want)
	})

	t.Run("W 武媚娘传奇【4k】2014 国语繁字", func(t *testing.T) {
		got := ParseFilenameForVideo("W 武媚娘传奇【4k】2014 国语繁字")
		want := ParsedVideoInfo{Name: "武媚娘传奇", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("一起同过窗 第三季 第30集 4K(超高清SDR)(8298117)", func(t *testing.T) {
		got := ParseFilenameForVideo("一起同过窗 第三季 第30集 4K(超高清SDR)(8298117)")
		want := ParsedVideoInfo{Name: "一起同过窗", OriginalName: "", Season: "S03", Episode: "E30"}
		AssertEqual(t, got, want)
	})

	t.Run("小敏家.2021.4K.H265.DVD.原版+纯享版+4K60帧", func(t *testing.T) {
		got := ParseFilenameForVideo("小敏家.2021.4K.H265.DVD.原版+纯享版+4K60帧")
		want := ParsedVideoInfo{Name: "小敏家", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("别了，温哥华.Vancouver.2003.WEB-DL.4k.H265.AAC-HDSWEB", func(t *testing.T) {
		got := ParseFilenameForVideo("别了，温哥华.Vancouver.2003.WEB-DL.4k.H265.AAC-HDSWEB")
		want := ParsedVideoInfo{Name: "别了，温哥华", OriginalName: "Vancouver", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("天道.1080P+720P.国语中字", func(t *testing.T) {
		got := ParseFilenameForVideo("天道.1080P+720P.国语中字")
		want := ParsedVideoInfo{Name: "天道", OriginalName: "720P", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("腾空的日子（张伟、胡冰卿主演校园剧）", func(t *testing.T) {
		got := ParseFilenameForVideo("腾空的日子（张伟、胡冰卿主演校园剧）")
		want := ParsedVideoInfo{Name: "腾空的日子", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("王子变青蛙（经典台剧）", func(t *testing.T) {
		got := ParseFilenameForVideo("王子变青蛙（经典台剧）")
		want := ParsedVideoInfo{Name: "王子变青蛙", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("十六岁的花季1989年 高清修复版", func(t *testing.T) {
		got := ParseFilenameForVideo("十六岁的花季1989年 高清修复版")
		want := ParsedVideoInfo{Name: "十六岁的花季1989年", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("18禁不禁（曾经很有趣很无厘头的台剧）", func(t *testing.T) {
		got := ParseFilenameForVideo("18禁不禁（曾经很有趣很无厘头的台剧）")
		want := ParsedVideoInfo{Name: "18禁不禁", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("[18禁不禁].18stop-19.rmvb", func(t *testing.T) {
		got := ParseFilenameForVideo("[18禁不禁].18stop-19.rmvb")
		want := ParsedVideoInfo{Name: "18禁不禁", OriginalName: "18stop", Season: "", Episode: "E19"}
		AssertEqual(t, got, want)
	})

	t.Run("那些年，我们一起追的女孩.2011.台版无删减完整版.国语中字", func(t *testing.T) {
		got := ParseFilenameForVideo("那些年，我们一起追的女孩.2011.台版无删减完整版.国语中字")
		want := ParsedVideoInfo{Name: "那些年，我们一起追的女孩", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("东北插班生_24.1080P", func(t *testing.T) {
		got := ParseFilenameForVideo("东北插班生_24.1080P")
		want := ParsedVideoInfo{Name: "东北插班生", OriginalName: "", Season: "", Episode: "E24"}
		AssertEqual(t, got, want)
	})

	t.Run("唐砖第35集-蓝光4K;", func(t *testing.T) {
		got := ParseFilenameForVideo("唐砖第35集-蓝光4K;")
		want := ParsedVideoInfo{Name: "唐砖", OriginalName: "", Season: "", Episode: "E35"}
		AssertEqual(t, got, want)
	})

	t.Run("一起同过窗 第三季 第24集 4K(超高清SDR)(6711482).mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("一起同过窗 第三季 第24集 4K(超高清SDR)(6711482).mp4")
		want := ParsedVideoInfo{Name: "一起同过窗", OriginalName: "", Season: "S03", Episode: "E24"}
		AssertEqual(t, got, want)
	})

	t.Run("第9集 每个人都要准备一个最好笑的笑话.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("第9集 每个人都要准备一个最好笑的笑话.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "E09"}
		AssertEqual(t, got, want)
	})

	t.Run("大学生同居的事儿第2季.40.一天一夜（下）.rmvb", func(t *testing.T) {
		got := ParseFilenameForVideo("大学生同居的事儿第2季.40.一天一夜（下）.rmvb")
		want := ParsedVideoInfo{Name: "大学生同居的事儿", OriginalName: "", Season: "S02", Episode: "E40"}
		AssertEqual(t, got, want)
	})

	t.Run("梦华录.4K.去除片头片中片尾广告.纯享版", func(t *testing.T) {
		got := ParseFilenameForVideo("梦华录.4K.去除片头片中片尾广告.纯享版")
		want := ParsedVideoInfo{Name: "梦华录", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("【SuperMiao】A.Dream.of.Splendor.2022.EP40.V2.4K.WEB-DL.H265.AAC.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("【SuperMiao】A.Dream.of.Splendor.2022.EP40.V2.4K.WEB-DL.H265.AAC.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "A.Dream.of.Splendor", Season: "", Episode: "E40"}
		AssertEqual(t, got, want)
	})

	t.Run("如懿传-2018-内地.三无.内封英文字幕", func(t *testing.T) {
		got := ParseFilenameForVideo("如懿传-2018-内地.三无.内封英文字幕")
		want := ParsedVideoInfo{Name: "如懿传", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("[4K超高清修复]《天道》无删减完整版第9集_超清 4K.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("[4K超高清修复]《天道》无删减完整版第9集_超清 4K.mp4")
		want := ParsedVideoInfo{Name: "天道", OriginalName: "", Season: "", Episode: "E09"}
		AssertEqual(t, got, want)
	})

	t.Run("地狱公使.韩英双语.内封多国字幕.1080P.非HDR版本", func(t *testing.T) {
		got := ParseFilenameForVideo("地狱公使.韩英双语.内封多国字幕.1080P.非HDR版本")
		want := ParsedVideoInfo{Name: "地狱公使", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("地狱公使.去除英语音轨.保留简繁字幕.1080P.HDR版本", func(t *testing.T) {
		got := ParseFilenameForVideo("地狱公使.去除英语音轨.保留简繁字幕.1080P.HDR版本")
		want := ParsedVideoInfo{Name: "地狱公使", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("[地狱公使]Hellbound.S01E06.Episode.6.1080p.NF.WEB-DL.x265.10bit.HDR.DDP5.1.Atmos.BOBO.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("[地狱公使]Hellbound.S01E06.Episode.6.1080p.NF.WEB-DL.x265.10bit.HDR.DDP5.1.Atmos.BOBO.mkv")
		want := ParsedVideoInfo{Name: "地狱公使", OriginalName: "Hellbound", Season: "S01", Episode: "E06"}
		AssertEqual(t, got, want)
	})

	t.Run("Hellbound.S01E06.Episode.6.1080p.NF.WEB-DL.DDP.5.1.Atmos.HDR10.H.265-BlackTV.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("Hellbound.S01E06.Episode.6.1080p.NF.WEB-DL.DDP.5.1.Atmos.HDR10.H.265-BlackTV.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "Hellbound", Season: "S01", Episode: "E06"}
		AssertEqual(t, got, want)
	})

	t.Run("Strange.Tales.of.Tang.Dynasty.2022.S01E36.2160p.iQIYI.WEB-DL.DDP5.1.H.265-Nanzhi.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("Strange.Tales.of.Tang.Dynasty.2022.S01E36.2160p.iQIYI.WEB-DL.DDP5.1.H.265-Nanzhi.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "Strange.Tales.of.Tang.Dynasty", Season: "S01", Episode: "E36"}
		AssertEqual(t, got, want)
	})

	t.Run("Taiwan.Crime.Stories.S01E12.2023.DSNP.WEB-DL.1080p.H264.DDP-SuperMiao.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("Taiwan.Crime.Stories.S01E12.2023.DSNP.WEB-DL.1080p.H264.DDP-SuperMiao.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "Taiwan.Crime.Stories", Season: "S01", Episode: "E12"}
		AssertEqual(t, got, want)
	})

	t.Run("伪装者 完整全集 蓝光(1080P)", func(t *testing.T) {
		got := ParseFilenameForVideo("伪装者 完整全集 蓝光(1080P)")
		want := ParsedVideoInfo{Name: "伪装者", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("毛骗.SE01.06.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("毛骗.SE01.06.mp4")
		want := ParsedVideoInfo{Name: "毛骗", OriginalName: "", Season: "S01", Episode: "E06"}
		AssertEqual(t, got, want)
	})

	t.Run("天道4K无删减收藏版", func(t *testing.T) {
		got := ParseFilenameForVideo("天道4K无删减收藏版")
		want := ParsedVideoInfo{Name: "天道", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("暗黑者3", func(t *testing.T) {
		got := ParseFilenameForVideo("暗黑者3")
		want := ParsedVideoInfo{Name: "暗黑者3", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("欢乐颂3_03.1080P.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("欢乐颂3_03.1080P.mp4")
		want := ParsedVideoInfo{Name: "欢乐颂3", OriginalName: "", Season: "", Episode: "E03"}
		AssertEqual(t, got, want)
	})

	t.Run("暗黑者2第04集-308国道校车案（上）.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("暗黑者2第04集-308国道校车案（上）.mp4")
		want := ParsedVideoInfo{Name: "暗黑者2", OriginalName: "", Season: "", Episode: "E04"}
		AssertEqual(t, got, want)
	})

	t.Run("L 立功·东北旧事", func(t *testing.T) {
		got := ParseFilenameForVideo("L 立功·东北旧事")
		want := ParsedVideoInfo{Name: "立功·东北旧事", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("第9话 就是你啊-4K 超清.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("第9话 就是你啊-4K 超清.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "E09"}
		AssertEqual(t, got, want)
	})

	t.Run("请回答1988", func(t *testing.T) {
		got := ParseFilenameForVideo("请回答1988")
		want := ParsedVideoInfo{Name: "请回答1988", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("生命时速·紧急救护120", func(t *testing.T) {
		got := ParseFilenameForVideo("生命时速·紧急救护120")
		want := ParsedVideoInfo{Name: "生命时速·紧急救护120", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("xtm.dvd-halfcd2.杜拉拉升职记.2010.中国.第32集.repack.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("xtm.dvd-halfcd2.杜拉拉升职记.2010.中国.第32集.repack.mkv")
		want := ParsedVideoInfo{Name: "杜拉拉升职记", OriginalName: "", Season: "", Episode: "E32"}
		AssertEqual(t, got, want)
	})

	t.Run("Nirvana.in.Fire.Ⅱ.2017.E49.4K.WEB-DL.AAC.H264-.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("Nirvana.in.Fire.Ⅱ.2017.E49.4K.WEB-DL.AAC.H264-.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "Nirvana.in.Fire", Season: "S02", Episode: "E49"}
		AssertEqual(t, got, want)
	})

	t.Run("CYW.The Legend of Sword and Fairy 3.EP37.2009.2160p.WEB-DL.x265.AAC-SXG.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("CYW.The Legend of Sword and Fairy 3.EP37.2009.2160p.WEB-DL.x265.AAC-SXG.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "The.Legend.of.Sword.and.Fairy.3", Season: "", Episode: "E37"}
		AssertEqual(t, got, want)
	})

	t.Run("小谢尔顿S05E09.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("小谢尔顿S05E09.mp4")
		want := ParsedVideoInfo{Name: "小谢尔顿", OriginalName: "", Season: "S05", Episode: "E09"}
		AssertEqual(t, got, want)
	})

	t.Run("十八年后的终极告白2.0", func(t *testing.T) {
		got := ParseFilenameForVideo("十八年后的终极告白2.0")
		want := ParsedVideoInfo{Name: "十八年后的终极告白2.0", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("S熟年 [2023]", func(t *testing.T) {
		got := ParseFilenameForVideo("S熟年 [2023]")
		want := ParsedVideoInfo{Name: "S熟年", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("Friends.S08E16.720p.BluRay.x264-Psychd.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("Friends.S08E16.720p.BluRay.x264-Psychd.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "Friends", Season: "S08", Episode: "E16"}
		AssertEqual(t, got, want)
	})

	t.Run("Friends.S08.E16.720p.BluRay.x264-Psychd.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("Friends.S08.E16.720p.BluRay.x264-Psychd.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "Friends", Season: "S08", Episode: "E16"}
		AssertEqual(t, got, want)
	})

	t.Run("Friends.S08E16.720p.BluRay.x264-Psychd", func(t *testing.T) {
		got := ParseFilenameForVideo("Friends.S08E16.720p.BluRay.x264-Psychd")
		want := ParsedVideoInfo{Name: "", OriginalName: "Friends", Season: "S08", Episode: "E16"}
		AssertEqual(t, got, want)
	})

	t.Run("Marvel's.Agents.of.S.H.I.E.L.D.S02E01.720p.HDTV.x264-KILLERS.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("Marvel's.Agents.of.S.H.I.E.L.D.S02E01.720p.HDTV.x264-KILLERS.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "Marvel's.Agents.of.S.H.I.E.L.D", Season: "S02", Episode: "E01"}
		AssertEqual(t, got, want)
	})

	t.Run("Marvel's.Agents.of.S.H.I.E.L.D.S02E01.720p.HDTV.x264-KILLERS", func(t *testing.T) {
		got := ParseFilenameForVideo("Marvel's.Agents.of.S.H.I.E.L.D.S02E01.720p.HDTV.x264-KILLERS")
		want := ParsedVideoInfo{Name: "", OriginalName: "Marvel's.Agents.of.S.H.I.E.L.D", Season: "S02", Episode: "E01"}
		AssertEqual(t, got, want)
	})

	t.Run("24.S09E05.720p.HDTV.x264-KILLERS.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("24.S09E05.720p.HDTV.x264-KILLERS.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "24", Season: "S09", Episode: "E05"}
		AssertEqual(t, got, want)
	})

	t.Run("The.Big.Bang.Theory.S08E01.720p.HDTV.X264-DIMENSION.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("The.Big.Bang.Theory.S08E01.720p.HDTV.X264-DIMENSION.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "The.Big.Bang.Theory", Season: "S08", Episode: "E01"}
		AssertEqual(t, got, want)
	})

	t.Run("Homeland.S04E01.720p.HDTV.x264-KILLERS.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("Homeland.S04E01.720p.HDTV.x264-KILLERS.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "Homeland", Season: "S04", Episode: "E01"}
		AssertEqual(t, got, want)
	})

	t.Run("Homeland.S04E01.720p.HDTV.x264-KILLERS", func(t *testing.T) {
		got := ParseFilenameForVideo("Homeland.S04E01.720p.HDTV.x264-KILLERS")
		want := ParsedVideoInfo{Name: "", OriginalName: "Homeland", Season: "S04", Episode: "E01"}
		AssertEqual(t, got, want)
	})

	t.Run("Homeland.S04E01.720p.HDTV.x264-KILLERS[rarbg]", func(t *testing.T) {
		got := ParseFilenameForVideo("Homeland.S04E01.720p.HDTV.x264-KILLERS[rarbg]")
		want := ParsedVideoInfo{Name: "", OriginalName: "Homeland", Season: "S04", Episode: "E01"}
		AssertEqual(t, got, want)
	})

	t.Run("权力的游戏.Game.of.Thrones.S05E10.1080p.WEB-DL.DD5.1.H.264-人人影视.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("权力的游戏.Game.of.Thrones.S05E10.1080p.WEB-DL.DD5.1.H.264-人人影视.mkv")
		want := ParsedVideoInfo{Name: "权力的游戏", OriginalName: "Game.of.Thrones", Season: "S05", Episode: "E10"}
		AssertEqual(t, got, want)
	})

	t.Run("权力的游戏.Game.of.Thrones.S05E10.1080p.WEB-DL.DD5.1.H.264-人人影视", func(t *testing.T) {
		got := ParseFilenameForVideo("权力的游戏.Game.of.Thrones.S05E10.1080p.WEB-DL.DD5.1.H.264-人人影视")
		want := ParsedVideoInfo{Name: "权力的游戏", OriginalName: "Game.of.Thrones", Season: "S05", Episode: "E10"}
		AssertEqual(t, got, want)
	})

	t.Run("大明王朝1566.Da.Ming.Wang.Chao.1566.EP01-46.2007.1080p.WEB-DL.x264.AAC-HQC", func(t *testing.T) {
		got := ParseFilenameForVideo("大明王朝1566.Da.Ming.Wang.Chao.1566.EP01-46.2007.1080p.WEB-DL.x264.AAC-HQC")
		want := ParsedVideoInfo{Name: "大明王朝1566", OriginalName: "Da.Ming.Wang.Chao", Season: "", Episode: "E01-46"}
		AssertEqual(t, got, want)
	})

	t.Run("大明王朝1566.Da.Ming.Wang.Chao.1566.EP01.2007.1080p.WEB-DL.x264.AAC-HQC", func(t *testing.T) {
		got := ParseFilenameForVideo("大明王朝1566.Da.Ming.Wang.Chao.1566.EP01.2007.1080p.WEB-DL.x264.AAC-HQC")
		want := ParsedVideoInfo{Name: "大明王朝1566", OriginalName: "Da.Ming.Wang.Chao", Season: "", Episode: "E01"}
		AssertEqual(t, got, want)
	})

	t.Run("大明王朝1566.Da.Ming.Wang.Chao.1566.2007.1080p.WEB-DL.x264.AAC-HQC", func(t *testing.T) {
		got := ParseFilenameForVideo("大明王朝1566.Da.Ming.Wang.Chao.1566.2007.1080p.WEB-DL.x264.AAC-HQC")
		want := ParsedVideoInfo{Name: "大明王朝1566", OriginalName: "Da.Ming.Wang.Chao", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("大明王朝1566.Da.Ming.Wang.Chao.1566.2007.1080p.WEB-DL.x264.AAC-HQC.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("大明王朝1566.Da.Ming.Wang.Chao.1566.2007.1080p.WEB-DL.x264.AAC-HQC.mkv")
		want := ParsedVideoInfo{Name: "大明王朝1566", OriginalName: "Da.Ming.Wang.Chao", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("灵魂摆渡Ⅱ.1080p", func(t *testing.T) {
		got := ParseFilenameForVideo("灵魂摆渡Ⅱ.1080p")
		want := ParsedVideoInfo{Name: "灵魂摆渡", OriginalName: "", Season: "S02", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("太子妃升职记丨36_End.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("太子妃升职记丨36_End.mp4")
		want := ParsedVideoInfo{Name: "太子妃升职记", OriginalName: "", Season: "", Episode: "E36"}
		AssertEqual(t, got, want)
	})

	t.Run("洗冤录1-01.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("洗冤录1-01.mkv")
		want := ParsedVideoInfo{Name: "洗冤录1", OriginalName: "", Season: "", Episode: "E01"}
		AssertEqual(t, got, want)
	})

	t.Run("封神榜I NGB (34).ts", func(t *testing.T) {
		got := ParseFilenameForVideo("封神榜I NGB (34).ts")
		want := ParsedVideoInfo{Name: "封神榜I", OriginalName: "", Season: "", Episode: "E34"}
		AssertEqual(t, got, want)
	})

	t.Run("我是特种兵之利刃出鞘.Special.Arms.Ⅱ.2012.S01E38.WEB-DL.4K.HEVC.AAC-CHDWEB.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("我是特种兵之利刃出鞘.Special.Arms.Ⅱ.2012.S01E38.WEB-DL.4K.HEVC.AAC-CHDWEB.mp4")
		want := ParsedVideoInfo{Name: "我是特种兵之利刃出鞘", OriginalName: "Special.Arms", Season: "S01", Episode: "E38"}
		AssertEqual(t, got, want)
	})

	t.Run("阿拉蒙之剑：阿斯达年代记 [2023][12集持续更新中]", func(t *testing.T) {
		got := ParseFilenameForVideo("阿拉蒙之剑：阿斯达年代记 [2023][12集持续更新中]")
		want := ParsedVideoInfo{Name: "阿拉蒙之剑：阿斯达年代记", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("[知否知否应是绿肥红瘦].The.Story.of.Ming.Lan.2018.2160p.WEB-DL.HEVC.AAC-HQC.1080.1080.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("[知否知否应是绿肥红瘦].The.Story.of.Ming.Lan.2018.2160p.WEB-DL.HEVC.AAC-HQC.1080.1080.mp4")
		want := ParsedVideoInfo{Name: "知否知否应是绿肥红瘦", OriginalName: "1080", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("Modern.Family", func(t *testing.T) {
		got := ParseFilenameForVideo("Modern.Family")
		want := ParsedVideoInfo{Name: "", OriginalName: "Modern.Family", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("2.Broke.Girls", func(t *testing.T) {
		got := ParseFilenameForVideo("2.Broke.Girls")
		want := ParsedVideoInfo{Name: "", OriginalName: "2.Broke.Girls", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("Modern.Family.S01", func(t *testing.T) {
		got := ParseFilenameForVideo("Modern.Family.S01")
		want := ParsedVideoInfo{Name: "", OriginalName: "Modern.Family", Season: "S01", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("Modern.Family.S01.1080p", func(t *testing.T) {
		got := ParseFilenameForVideo("Modern.Family.S01.1080p")
		want := ParsedVideoInfo{Name: "", OriginalName: "Modern.Family", Season: "S01", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("Modern.Family.2009.S01.1080p", func(t *testing.T) {
		got := ParseFilenameForVideo("Modern.Family.2009.S01.1080p")
		want := ParsedVideoInfo{Name: "", OriginalName: "Modern.Family", Season: "S01", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("[摩登家庭].Modern.Family.2009.S01.1080p", func(t *testing.T) {
		got := ParseFilenameForVideo("[摩登家庭].Modern.Family.2009.S01.1080p")
		want := ParsedVideoInfo{Name: "摩登家庭", OriginalName: "Modern.Family", Season: "S01", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("[摩登家庭].Modern.Family.2009.第十季.1080p", func(t *testing.T) {
		got := ParseFilenameForVideo("[摩登家庭].Modern.Family.2009.第十季.1080p")
		want := ParsedVideoInfo{Name: "摩登家庭", OriginalName: "Modern.Family", Season: "S10", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("Futurama.S07E22.Leela.and.the.Genestalk.1080p.Blu-ray.DD5.1.x264-CtrlHD", func(t *testing.T) {
		got := ParseFilenameForVideo("Futurama.S07E22.Leela.and.the.Genestalk.1080p.Blu-ray.DD5.1.x264-CtrlHD")
		want := ParsedVideoInfo{Name: "", OriginalName: "Futurama", Season: "S07", Episode: "E22"}
		AssertEqual(t, got, want)
	})

	t.Run("The.Tudors.S04E07.1080p.Blu-ray.x265.10bit.AC3￡cXcY@FRDS", func(t *testing.T) {
		got := ParseFilenameForVideo("The.Tudors.S04E07.1080p.Blu-ray.x265.10bit.AC3￡cXcY@FRDS")
		want := ParsedVideoInfo{Name: "", OriginalName: "The.Tudors", Season: "S04", Episode: "E07"}
		AssertEqual(t, got, want)
	})

	t.Run("Anne.with.an.E.S03E09.1080p.BluRay.x264", func(t *testing.T) {
		got := ParseFilenameForVideo("Anne.with.an.E.S03E09.1080p.BluRay.x264")
		want := ParsedVideoInfo{Name: "", OriginalName: "Anne.with.an.E", Season: "S03", Episode: "E09"}
		AssertEqual(t, got, want)
	})

	t.Run("Desperate Housewives S06E21 1080p WEB-DL DD+ 5.1 x264-TrollHD", func(t *testing.T) {
		got := ParseFilenameForVideo("Desperate Housewives S06E21 1080p WEB-DL DD+ 5.1 x264-TrollHD")
		want := ParsedVideoInfo{Name: "", OriginalName: "Desperate.Housewives", Season: "S06", Episode: "E21"}
		AssertEqual(t, got, want)
	})

	t.Run("Young.Sheldon.S01E22.1080p.Blu-Ray.AC3.x265.10bit-Yumi@FRDS.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("Young.Sheldon.S01E22.1080p.Blu-Ray.AC3.x265.10bit-Yumi@FRDS.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "Young.Sheldon", Season: "S01", Episode: "E22"}
		AssertEqual(t, got, want)
	})

	t.Run("S01E07 - A No-Rough-Stuff-Type Deal", func(t *testing.T) {
		got := ParseFilenameForVideo("S01E07 - A No-Rough-Stuff-Type Deal")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "S01", Episode: "E07"}
		AssertEqual(t, got, want)
	})

	t.Run("老友记.S01E24.瑞秋知道了", func(t *testing.T) {
		got := ParseFilenameForVideo("老友记.S01E24.瑞秋知道了")
		want := ParsedVideoInfo{Name: "老友记", OriginalName: "", Season: "S01", Episode: "E24"}
		AssertEqual(t, got, want)
	})

	t.Run("The.Sopranos.S01E13.1999.1080P.Blu-ray.x265.AC3.cXcY@FRDS.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("The.Sopranos.S01E13.1999.1080P.Blu-ray.x265.AC3.￡cXcY@FRDS.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "The.Sopranos", Season: "S01", Episode: "E13"}
		AssertEqual(t, got, want)
	})

	t.Run("Futurama.S07E01.The.Bots.and.the.Bees.1080p.BluRay.DD5.1.x264-CtrlHD.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("Futurama.S07E01.The.Bots.and.the.Bees.1080p.BluRay.DD5.1.x264-CtrlHD.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "Futurama", Season: "S07", Episode: "E01"}
		AssertEqual(t, got, want)
	})

	t.Run("Futurama.S07E14.2-D.Blacktop.1080p.Blu-ray.DD5.1.x264-CtrlHD.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("Futurama.S07E14.2-D.Blacktop.1080p.Blu-ray.DD5.1.x264-CtrlHD.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "Futurama", Season: "S07", Episode: "E14"}
		AssertEqual(t, got, want)
	})

	t.Run("Futurama.S07E15.Fry.and.Leela's.Big.Fling.1080p.Blu-ray.DD5.1.x264-CtrlHD.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("Futurama.S07E15.Fry.and.Leela's.Big.Fling.1080p.Blu-ray.DD5.1.x264-CtrlHD.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "Futurama", Season: "S07", Episode: "E15"}
		AssertEqual(t, got, want)
	})

	t.Run("The.Boys.S03E04.Glorious.Five.Year.Plan.1080p.AMZN.WEB-DL.DDP5.1.H.264-NTb.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("The.Boys.S03E04.Glorious.Five.Year.Plan.1080p.AMZN.WEB-DL.DDP5.1.H.264-NTb.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "The.Boys", Season: "S03", Episode: "E04"}
		AssertEqual(t, got, want)
	})

	t.Run("老友记.S03E04.赌城行（上）.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("老友记.S03E04.赌城行（上）.mkv")
		want := ParsedVideoInfo{Name: "老友记", OriginalName: "", Season: "S03", Episode: "E04"}
		AssertEqual(t, got, want)
	})

	t.Run("Futurama.S02E01.1080p.WEB.h264-NiXON.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("Futurama.S02E01.1080p.WEB.h264-NiXON.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "Futurama", Season: "S02", Episode: "E01"}
		AssertEqual(t, got, want)
	})

	t.Run("Ekaterina.2014.S01E02.HDTV.(1080i).MediaClub.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("Ekaterina.2014.S01E02.HDTV.(1080i).MediaClub.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "Ekaterina", Season: "S01", Episode: "E02"}
		AssertEqual(t, got, want)
	})

	t.Run("叶卡捷琳娜大帝.Екатерина.Самозванцы (2019).S03E03.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("叶卡捷琳娜大帝.Екатерина.Самозванцы (2019).S03E03.mp4")
		want := ParsedVideoInfo{Name: "叶卡捷琳娜大帝", OriginalName: "Екатерина.Самозванцы", Season: "S03", Episode: "E03"}
		AssertEqual(t, got, want)
	})

	t.Run("The.Queens.Gambit.S01E01.2160p.NF.WEBRip.DDP5.1.x265-NTb.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("The.Queens.Gambit.S01E01.2160p.NF.WEBRip.DDP5.1.x265-NTb.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "The.Queens.Gambit", Season: "S01", Episode: "E01"}
		AssertEqual(t, got, want)
	})

	t.Run("gotham.s01.e01.1080p.bluray.x264-rovers.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("gotham.s01.e01.1080p.bluray.x264-rovers.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "gotham", Season: "S01", Episode: "E01"}
		AssertEqual(t, got, want)
	})

	t.Run("Gotham.S02E02.1080p.BluRay.x264-SHORTBREHD.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("Gotham.S02E02.1080p.BluRay.x264-SHORTBREHD.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "Gotham", Season: "S02", Episode: "E02"}
		AssertEqual(t, got, want)
	})

	t.Run("The.Originals.S03E01.中英字幕.WEB-HR.AAC.1024X576.x264.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("The.Originals.S03E01.中英字幕.WEB-HR.AAC.1024X576.x264.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "The.Originals", Season: "S03", Episode: "E01"}
		AssertEqual(t, got, want)
	})

	t.Run("Grey's.Anatomy.S01E01.A.Hard.Day's.Night.h.264-TjHD.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("Grey's.Anatomy.S01E01.A.Hard.Day's.Night.h.264-TjHD.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "Grey's.Anatomy", Season: "S01", Episode: "E01"}
		AssertEqual(t, got, want)
	})

	t.Run("Emily.in.Paris.S02E04.Jules.and.Em.1080p.NF.WEB-DL.DDP5.1.HDR.H.265-TEPES.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("Emily.in.Paris.S02E04.Jules.and.Em.1080p.NF.WEB-DL.DDP5.1.HDR.H.265-TEPES.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "Emily.in.Paris", Season: "S02", Episode: "E04"}
		AssertEqual(t, got, want)
	})

	t.Run("The Walking Dead - S01E06 - WEBDL-1080p h264 EAC3 5.1 - DSNP.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("The Walking Dead - S01E06 - WEBDL-1080p h264 EAC3 5.1 - DSNP.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "The.Walking.Dead", Season: "S01", Episode: "E06"}
		AssertEqual(t, got, want)
	})

	t.Run("Bones.S04E07.WEB-DL.1080p.RusDub.Eng.SubEngSDH.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("Bones.S04E07.WEB-DL.1080p.RusDub.Eng.SubEngSDH.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "Bones", Season: "S04", Episode: "E07"}
		AssertEqual(t, got, want)
	})

	t.Run("Bones.S10E06.The.Lost.Love.in.the.Foreign.Land.1080p.AMZN.WEB-DL.DD+5.1.H.265-SiGMA.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("Bones.S10E06.The.Lost.Love.in.the.Foreign.Land.1080p.AMZN.WEB-DL.DD+5.1GMA.mkv.H.265-Si")
		want := ParsedVideoInfo{Name: "", OriginalName: "Bones", Season: "S10", Episode: "E06"}
		AssertEqual(t, got, want)
	})

	t.Run("月光骑士.1080p.內封官方多語字幕", func(t *testing.T) {
		got := ParseFilenameForVideo("月光骑士.1080p.內封官方多語字幕")
		want := ParsedVideoInfo{Name: "月光骑士", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("S01E04.M.Night.Shaym-Aliens!.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("S01E04.M.Night.Shaym-Aliens!.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "S01", Episode: "E04"}
		AssertEqual(t, got, want)
	})

	t.Run("Criminal.Minds.S04E09.52.Pickup.1080p.AMZN.WEB-DL.DDP5.1.x265.10bit-Yumi@FRDS.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("Criminal.Minds.S04E09.52.Pickup.1080p.AMZN.WEB-DL.DDP5.1.x265.10bit-Yumi@FRDS.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "Criminal.Minds", Season: "S04", Episode: "E09"}
		AssertEqual(t, got, want)
	})

	t.Run("Gravity.Falls.S01E19.Dreamscaperers.1080p.WEB-DL.DD5.1.H.264-BS666.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("Gravity.Falls.S01E19.Dreamscaperers.1080p.WEB-DL.DD5.1.H.264-BS666.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "Gravity.Falls", Season: "S01", Episode: "E19"}
		AssertEqual(t, got, want)
	})

	t.Run("实习Y生格L.S17E03.HD1080P.YYeTs.中英双字.霸王龙压制组T-Rex.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("实习Y生格L.S17E03.HD1080P.YYeTs.中英双字.霸王龙压制组T-Rex.mp4")
		want := ParsedVideoInfo{Name: "实习Y生格L", OriginalName: "", Season: "S17", Episode: "E03"}
		AssertEqual(t, got, want)
	})

	t.Run("[Prof] S02E02 - Mortynight Run.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("[Prof] S02E02 - Mortynight Run.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "S02", Episode: "E02"}
		AssertEqual(t, got, want)
	})

	t.Run("tvr-greys-S03e02-720p.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("tvr-greys-S03e02-720p.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "greys", Season: "S03", Episode: "E02"}
		AssertEqual(t, got, want)
	})

	t.Run("tvr-greys-S03e25-720p.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("tvr-greys-S03e25-720p.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "greys", Season: "S03", Episode: "E25"}
		AssertEqual(t, got, want)
	})

	t.Run("老友记S02.Friends.1995.1080p.Blu-ray.x265.AC3￡cXcY@FRDS", func(t *testing.T) {
		got := ParseFilenameForVideo("老友记S02.Friends.1995.1080p.Blu-ray.x265.AC3￡cXcY@FRDS")
		want := ParsedVideoInfo{Name: "老友记", OriginalName: "", Season: "S02", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("Light.The.Night.S02E08.NF.WEB-DL.1080p.H264.DDP5.1.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("Light.The.Night.S02E08.NF.WEB-DL.1080p.H264.DDP5.1.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "Light.The.Night", Season: "S02", Episode: "E08"}
		AssertEqual(t, got, want)
	})

	t.Run("Oh.No!Here.Comes.Trouble.S01E01.2023.2160p.WEB-DL.H265.DDP2.0.Gz.mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("Oh.No!Here.Comes.Trouble.S01E01.2023.2160p.WEB-DL.H265.DDP2.0.Gz.mkv")
		want := ParsedVideoInfo{Name: "", OriginalName: "Oh.No!Here.Comes.Trouble", Season: "S01", Episode: "E01"}
		AssertEqual(t, got, want)
	})

	t.Run("逃避可耻却有用.NIGERUHA.HAJIDAGA.YAKUNITATSU.Ep10.Chi_Jap.HDTVrip.1280X720-ZhuixinFan.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("逃避可耻却有用.NIGERUHA.HAJIDAGA.YAKUNITATSU.Ep10.Chi_Jap.HDTVrip.1280X720-ZhuixinFan.mp4")
		want := ParsedVideoInfo{Name: "逃避可耻却有用", OriginalName: "NIGERUHA.HAJIDAGA.YAKUNITATSU", Season: "", Episode: "E10"}
		AssertEqual(t, got, want)
	})

	t.Run("2023.哈兰·科本的庇护所.8集全", func(t *testing.T) {
		got := ParseFilenameForVideo("2023.哈兰·科本的庇护所.8集全")
		want := ParsedVideoInfo{Name: "哈兰·科本的庇护所", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("IT狂人.The.IT.Crowd.S01E01.Chi_Eng.DVDrip.608X336-YYeTs人人影视.rmvb", func(t *testing.T) {
		got := ParseFilenameForVideo("IT狂人.The.IT.Crowd.S01E01.Chi_Eng.DVDrip.608X336-YYeTs人人影视.rmvb")
		want := ParsedVideoInfo{Name: "IT狂人", OriginalName: "The.IT.Crowd", Season: "S01", Episode: "E01"}
		AssertEqual(t, got, want)
	})

	t.Run("2014.Doctor异乡人.20集全.1080p", func(t *testing.T) {
		got := ParseFilenameForVideo("2014.Doctor异乡人.20集全.1080p")
		want := ParsedVideoInfo{Name: "Doctor异乡人", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("西行纪.S03.20", func(t *testing.T) {
		got := ParseFilenameForVideo("西行纪.S03.20")
		want := ParsedVideoInfo{Name: "西行纪", OriginalName: "", Season: "S03", Episode: "E20"}
		AssertEqual(t, got, want)
	})

	t.Run("天官赐福_9_妖道之祸.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("天官赐福_9_妖道之祸.mp4")
		want := ParsedVideoInfo{Name: "天官赐福", OriginalName: "", Season: "", Episode: "E09"}
		AssertEqual(t, got, want)
	})

	t.Run("盾之勇者成名录 S1 (14).mkv", func(t *testing.T) {
		got := ParseFilenameForVideo("盾之勇者成名录 S1 (14).mkv")
		want := ParsedVideoInfo{Name: "盾之勇者成名录", OriginalName: "", Season: "S01", Episode: "E14"}
		AssertEqual(t, got, want)
	})

	t.Run("《镇魂街 第二季》第2话 慷慨悲歌_高清 1080P+.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("《镇魂街 第二季》第2话 慷慨悲歌_高清 1080P+.mp4")
		want := ParsedVideoInfo{Name: "镇魂街", OriginalName: "", Season: "S02", Episode: "E02"}
		AssertEqual(t, got, want)
	})

	t.Run("重制版第8话_高清 1080P+.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("重制版第8话_高清 1080P+.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "E08"}
		AssertEqual(t, got, want)
	})

	t.Run("镇魂街 第三季_01_1080P高码率_Tacit0924.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("镇魂街 第三季_01_1080P高码率_Tacit0924.mp4")
		want := ParsedVideoInfo{Name: "镇魂街", OriginalName: "", Season: "S03", Episode: "E01"}
		AssertEqual(t, got, want)
	})

	t.Run("7-天府十三区.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("7-天府十三区.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "E07"}
		AssertEqual(t, got, want)
	})

	t.Run("01.Cracking.Case.S02E01.2022.1080p.WEB-DL.H265.AAC-CatWEB.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("01.Cracking.Case.S02E01.2022.1080p.WEB-DL.H265.AAC-CatWEB.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "01.Cracking.Case", Season: "S02", Episode: "E01"}
		AssertEqual(t, got, want)
	})

	t.Run("康熙微服私访记（二） 01.ts", func(t *testing.T) {
		got := ParseFilenameForVideo("康熙微服私访记（二） 01.ts")
		want := ParsedVideoInfo{Name: "康熙微服私访记", OriginalName: "", Season: "S02", Episode: "E01"}
		AssertEqual(t, got, want)
	})

	t.Run("康熙微服私访记（一）29.ts", func(t *testing.T) {
		got := ParseFilenameForVideo("康熙微服私访记（一）29.ts")
		want := ParsedVideoInfo{Name: "康熙微服私访记", OriginalName: "", Season: "S01", Episode: "E29"}
		AssertEqual(t, got, want)
	})

	t.Run("觀世音傳奇1(國語).mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("觀世音傳奇1(國語).mp4")
		want := ParsedVideoInfo{Name: "觀世音傳奇1", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("泰剧《他不是我》第13集中字版@喜翻译制组.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("泰剧《他不是我》第13集中字版@喜翻译制组.mp4")
		want := ParsedVideoInfo{Name: "他不是我", OriginalName: "", Season: "", Episode: "E13"}
		AssertEqual(t, got, want)
	})

	t.Run("2023.CODE-愿望的代价-.10集全", func(t *testing.T) {
		got := ParseFilenameForVideo("2023.CODE-愿望的代价-.10集全")
		want := ParsedVideoInfo{Name: "CODE-愿望的代价-", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("1020期 第1期.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("1020期 第1期.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "1020"}
		AssertEqual(t, got, want)
	})

	t.Run("0731入住日记第9期.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("0731入住日记第9期.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "0731"}
		AssertEqual(t, got, want)
	})

	t.Run("20161029.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("20161029.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "20161029"}
		AssertEqual(t, got, want)
	})

	t.Run("01-20.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("01-20.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "0120"}
		AssertEqual(t, got, want)
	})

	t.Run("第1期.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("第1期.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "E01"}
		AssertEqual(t, got, want)
	})

	t.Run("05.05期.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("05.05期.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "E05"}
		AssertEqual(t, got, want)
	})

	t.Run("Trump.Card.season.V.20200508.EP12.HD1080P.X264.AAC.Mandarin.CHS.BDE4.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("Trump.Card.season.V.20200508.EP12.HD1080P.X264.AAC.Mandarin.CHS.BDE4.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "Trump.Card", Season: "S05", Episode: "E12"}
		AssertEqual(t, got, want)
	})

	t.Run("2021.04.16期.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("2021.04.16期.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "20210416"}
		AssertEqual(t, got, want)
	})

	t.Run("第12期会员版 贾玲不舍.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("第12期会员版 贾玲不舍.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "E12"}
		AssertEqual(t, got, want)
	})

	t.Run("20231020期_Tacit0924.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("20231020期_Tacit0924.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "20231020"}
		AssertEqual(t, got, want)
	})

	t.Run("令人心动的offer第10期.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("令人心动的offer第10期.mp4")
		want := ParsedVideoInfo{Name: "令人心动的offer", OriginalName: "", Season: "", Episode: "E10"}
		AssertEqual(t, got, want)
	})

	t.Run("第9期上：医学生花式宣讲，冯岑在线卖唱.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("第9期上：医学生花式宣讲，冯岑在线卖唱.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "第9期上"}
		AssertEqual(t, got, want)
	})

	t.Run("第9期下：医学生花式宣讲，冯岑在线卖唱.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("第9期下：医学生花式宣讲，冯岑在线卖唱.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "第9期下"}
		AssertEqual(t, got, want)
	})

	t.Run("0926第4局.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("0926第4局.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "0926"}
		AssertEqual(t, got, want)
	})

	t.Run("04期-下.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("04期-下.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "第4期下"}
		AssertEqual(t, got, want)
	})

	t.Run("10.04期-下.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("10.04期-下.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "1004下"}
		AssertEqual(t, got, want)
	})

	t.Run("第10期 下:冠军票数惊人", func(t *testing.T) {
		got := ParseFilenameForVideo("第10期 下:冠军票数惊人")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "第10期下"}
		AssertEqual(t, got, want)
	})

	t.Run("20230909第5期纯享_Tacit0924.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("20230909第5期纯享_Tacit0924.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "20230909"}
		AssertEqual(t, got, want)
	})

	t.Run("12期.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("12期.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "E12"}
		AssertEqual(t, got, want)
	})

	t.Run("04期 - 上.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("04期 - 上.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "第4期上"}
		AssertEqual(t, got, want)
	})

	t.Run("第14期下 半决赛五条人新歌首唱 新裤子开场舞魂爆发", func(t *testing.T) {
		got := ParseFilenameForVideo("第14期下 半决赛五条人新歌首唱 新裤子开场舞魂爆发")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "第14期下"}
		AssertEqual(t, got, want)
	})

	t.Run("20200729上 张雨绮笑聊离婚 _Tacit0924 .mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("20200729上 张雨绮笑聊离婚 _Tacit0924 .mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "20200729上"}
		AssertEqual(t, got, want)
	})

	t.Run("20190922徐峥吐槽黄渤爆笑模仿沈腾 _Tacit0924 .mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("20190922徐峥吐槽黄渤爆笑模仿沈腾 _Tacit0924 .mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "20190922"}
		AssertEqual(t, got, want)
	})

	t.Run("20221216-第2期加更_Tacit0924.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("20221216-第2期加更_Tacit0924.mp4")
		want := ParsedVideoInfo{Name: "", OriginalName: "", Season: "", Episode: "20221216"}
		AssertEqual(t, got, want)
	})

	t.Run("花儿与少年第一季20140606期：花儿们抵达马德里_Tacit0924.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("花儿与少年第一季20140606期：花儿们抵达马德里_Tacit0924.mp4")
		want := ParsedVideoInfo{Name: "花儿与少年", OriginalName: "", Season: "S01", Episode: "20140606"}
		AssertEqual(t, got, want)
	})

	t.Run("中国好声音.第四季.The.Voice.Of.China.S04.20150927.HD720P.X264.AAC.CHS.Mp4Ba.mp4", func(t *testing.T) {
		got := ParseFilenameForVideo("中国好声音.第四季.The.Voice.Of.China.S04.20150927.HD720P.X264.AAC.CHS.Mp4Ba.mp4")
		want := ParsedVideoInfo{Name: "中国好声音", OriginalName: "The.Voice.Of.China", Season: "S04", Episode: "20150927"}
		AssertEqual(t, got, want)
	})

	t.Run("龙门镖局.7.6.Longmen.Express.2013.EP01-40.4K.2160p.HEVC.AAC-DHTCLUB", func(t *testing.T) {
		got := ParseFilenameForVideo("龙门镖局.7.6.Longmen.Express.2013.EP01-40.4K.2160p.HEVC.AAC-DHTCLUB")
		want := ParsedVideoInfo{Name: "龙门镖局", OriginalName: "Longmen.Express", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("破冰行动.EP01-48.2019.2160p.DVD.WEB-DL.x264.AAC-HQC", func(t *testing.T) {
		got := ParseFilenameForVideo("破冰行动.EP01-48.2019.2160p.DVD.WEB-DL.x264.AAC-HQC")
		want := ParsedVideoInfo{Name: "破冰行动", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("A.Little.Mood.For.Love.EP01-40.2021.4K.60FPS.WEB-DL.HEVC.AAC-HQC", func(t *testing.T) {
		got := ParseFilenameForVideo("A.Little.Mood.For.Love.EP01-40.2021.4K.60FPS.WEB-DL.HEVC.AAC-HQC")
		want := ParsedVideoInfo{Name: "", OriginalName: "A.Little.Mood.For.Love", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("J-将夜.Ever.Night.S01.2018.EP01-60.WEB-DL.1080p.H265.AAC-BtsTV", func(t *testing.T) {
		got := ParseFilenameForVideo("J-将夜.Ever.Night.S01.2018.EP01-60.WEB-DL.1080p.H265.AAC-BtsTV")
		want := ParsedVideoInfo{Name: "将夜", OriginalName: "Ever.Night", Season: "S01", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("还珠格格3.2003.40集特别版+6部MV .繁体中字 无台标水印版", func(t *testing.T) {
		got := ParseFilenameForVideo("还珠格格3.2003.40集特别版+6部MV .繁体中字 无台标水印版")
		want := ParsedVideoInfo{Name: "还珠格格3", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("鹿鼎记.1984.全40集.GOTV-TS.国语无字★【30.3G】", func(t *testing.T) {
		got := ParseFilenameForVideo("鹿鼎记.1984.全40集.GOTV-TS.国语无字★【30.3G】")
		want := ParsedVideoInfo{Name: "鹿鼎记", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("布衣神相[全30集][粤语音轨+简繁字幕]", func(t *testing.T) {
		got := ParseFilenameForVideo("布衣神相[全30集][粤语音轨+简繁字幕]")
		want := ParsedVideoInfo{Name: "布衣神相", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("宝莲灯前传.全46集.Lotus.Lantern.Prequel.2009.V2.Complete.2160P[4K]WEB-DL.X265.AAC-Vampire", func(t *testing.T) {
		got := ParseFilenameForVideo("宝莲灯前传.全46集.Lotus.Lantern.Prequel.2009.V2.Complete.2160P[4K]WEB-DL.X265.AAC-Vampire")
		want := ParsedVideoInfo{Name: "宝莲灯前传", OriginalName: "Lotus.Lantern.Prequel", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("三十而已.全43集.Nothing.But.Thirty.2020.4K.H265.AAC.内嵌简中.87.7G", func(t *testing.T) {
		got := ParseFilenameForVideo("三十而已.全43集.Nothing.But.Thirty.2020.4K.H265.AAC.内嵌简中.87.7G")
		want := ParsedVideoInfo{Name: "三十而已", OriginalName: "Nothing.But.Thirty", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("战长沙.豆瓣9.1.高分战争剧.全32集[2014]", func(t *testing.T) {
		got := ParseFilenameForVideo("战长沙.豆瓣9.1.高分战争剧.全32集[2014]")
		want := ParsedVideoInfo{Name: "战长沙", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("大理寺日志 第一季(12集全)", func(t *testing.T) {
		got := ParseFilenameForVideo("大理寺日志 第一季(12集全)")
		want := ParsedVideoInfo{Name: "大理寺日志", OriginalName: "", Season: "S01", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("魔幻手机.1+2.1080P.国语中字", func(t *testing.T) {
		got := ParseFilenameForVideo("魔幻手机.1+2.1080P.国语中字")
		want := ParsedVideoInfo{Name: "魔幻手机", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("一起同过窗.1-3季.国语中字", func(t *testing.T) {
		got := ParseFilenameForVideo("一起同过窗.1-3季.国语中字")
		want := ParsedVideoInfo{Name: "一起同过窗", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("毛骗1-3季", func(t *testing.T) {
		got := ParseFilenameForVideo("毛骗1-3季")
		want := ParsedVideoInfo{Name: "毛骗", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("Y 隐门 (2023)(25集)又名十八年后的终极告白3.0(1-3)", func(t *testing.T) {
		got := ParseFilenameForVideo("Y 隐门 (2023)(25集)又名十八年后的终极告白3.0(1-3)")
		want := ParsedVideoInfo{Name: "隐门", OriginalName: "", Season: "", Episode: "E25"}
		AssertEqual(t, got, want)
	})

	t.Run("2021.华灯初上.1-3季", func(t *testing.T) {
		got := ParseFilenameForVideo("2021.华灯初上.1-3季")
		want := ParsedVideoInfo{Name: "华灯初上", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("H）画江湖之不良人1-6季.4K.含画江湖6部全系列【国漫】", func(t *testing.T) {
		got := ParseFilenameForVideo("H）画江湖之不良人1-6季.4K.含画江湖6部全系列【国漫】")
		want := ParsedVideoInfo{Name: "画江湖之不良人", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("1999.数码宝贝.1-8季.多语版+10部剧场版+OVA", func(t *testing.T) {
		got := ParseFilenameForVideo("1999.数码宝贝.1-8季.多语版+10部剧场版+OVA")
		want := ParsedVideoInfo{Name: "数码宝贝", OriginalName: "", Season: "OVA", Episode: ""}
		AssertEqual(t, got, want)
	})

	t.Run("08.9号秘事1-7季 - 豆瓣9.0分", func(t *testing.T) {
		got := ParseFilenameForVideo("08.9号秘事1-7季 - 豆瓣9.0分")
		want := ParsedVideoInfo{Name: "9号秘事", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})
	t.Run("春色寄情人", func(t *testing.T) {
		got := ParseFilenameForVideo("C 春色JI情REN (2024)[剧情 爱情][李现 周雨彤]21集全")
		want := ParsedVideoInfo{Name: "春色JI情REN", OriginalName: "", Season: "", Episode: ""}
		AssertEqual(t, got, want)
	})
	t.Run("Blue Lights", func(t *testing.T) {
		got := ParseFilenameForVideo("Blue Lights.s02e05.Where I Want to Be.strm")
		want := ParsedVideoInfo{Name: "", OriginalName: "Blue.Lights", Season: "S02", Episode: "E05"}
		AssertEqual(t, got, want)
	})
	t.Run("Fallout", func(t *testing.T) {
		got := ParseFilenameForVideo("Fallout.S02E08.The.Strip.2160p.AMZN.WEB-DL.DDP5.1.DoVi.H.265.strm")
		want := ParsedVideoInfo{Name: "", OriginalName: "Fallout", Season: "S02", Episode: "E08"}
		AssertEqual(t, got, want)
	})
}
