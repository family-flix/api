/**
 * 中文电视剧
 */
import { describe, expect, test } from "vitest";

import { parse_filename_for_video } from "../parse_filename_for_video";

describe("影视剧1", () => {
  test("鸡毛飞上天 - S01E55 - 第 55 集.mp4", () => {
    const name = "鸡毛飞上天 - S01E55 - 第 55 集.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "鸡毛飞上天",
      original_name: "",
      season: "S01",
      episode: "E55",
    });
  });
  test("魔幻手机2傻妞归来.S01E42.1080P.WEB-DL.mp4", () => {
    const name = "魔幻手机2傻妞归来.S01E42.1080P.WEB-DL.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "魔幻手机2傻妞归来",
      original_name: "",
      season: "S01",
      episode: "E42",
    });
  });
  test("Magic.Mobile.Phone.2008.S01E42.WEB-DL.1080p.H265.AAC-HotWEB.mp4", () => {
    const name = "Magic.Mobile.Phone.2008.S01E42.WEB-DL.1080p.H265.AAC-HotWEB.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Magic.Mobile.Phone",
      season: "S01",
      episode: "E42",
    });
  });
  test("Wild.Bloom.S01E34.2022.2160p.WEB-DL.H265.DDP5.1-BlackTV.mkv", () => {
    const name = "Wild.Bloom.S01E34.2022.2160p.WEB-DL.H265.DDP5.1-BlackTV.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Wild.Bloom",
      season: "S01",
      episode: "E34",
    });
  });
  test("白鹿原.White.Deer.Plain.2017.E75.1080p.WEB-DL.AAC.X264.mp4", () => {
    const name = "白鹿原.White.Deer.Plain.2017.E75.1080p.WEB-DL.AAC.X264.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "白鹿原",
      original_name: "White.Deer.Plain",
      season: "",
      episode: "E75",
    });
  });
  test("宝莲灯前传.Lotus.Lantern.Prequel.2009.V2.EP46.2160P(4K).WEB-DL.X265.AAC-Vampire.mp4", () => {
    const name = "宝莲灯前传.Lotus.Lantern.Prequel.2009.V2.EP46.2160P(4K).WEB-DL.X265.AAC-Vampire.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "宝莲灯前传",
      original_name: "Lotus.Lantern.Prequel",
      season: "",
      episode: "E46",
    });
  });
  test("HDJ Beijing Love Story EP39 HDTV 1080i H264-NGB.ts", () => {
    const name = "HDJ Beijing Love Story EP39 HDTV 1080i H264-NGB.ts";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Beijing.Love.Story",
      season: "",
      episode: "E39",
    });
  });
  test("HDJ Beijing Love Story EP11 HDTV 1080i H264-NGB.ts", () => {
    const name = "HDJ Beijing Love Story EP11 HDTV 1080i H264-NGB.ts";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Beijing.Love.Story",
      season: "",
      episode: "E11",
    });
  });
  test("M 魔幻手机2：傻妞归来 (2014)", () => {
    const name = "M 魔幻手机2：傻妞归来 (2014)";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "魔幻手机2：傻妞归来",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("还珠格格3.E40.Extended.DVDRip.x264.AC3-CMCT.mkv", () => {
    const name = "还珠格格3.E40.Extended.DVDRip.x264.AC3-CMCT.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "还珠格格3",
      original_name: "",
      season: "",
      episode: "E40",
    });
  });
  test("赘婿.无字幕版.4K.2021.WEB-DL.2160P.H265.AAC-AIU", () => {
    const name = "赘婿.无字幕版.4K.2021.WEB-DL.2160P.H265.AAC-AIU";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "赘婿",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("赘婿.第1季.E36.HD4K.2160P.HD265.mp4", () => {
    const name = "赘婿.第1季.E36.HD4K.2160P.HD265.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "赘婿",
      original_name: "",
      season: "S01",
      episode: "E36",
    });
  });
  test("鹿鼎记(84版).38", () => {
    const name = "鹿鼎记(84版).38";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "鹿鼎记",
      original_name: "",
      season: "",
      episode: "E38",
    });
  });
  test("谈判专家-欧阳震华(2002)1080P", () => {
    const name = "谈判专家-欧阳震华(2002)1080P";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "谈判专家",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("枪神-20.国粤双语", () => {
    const name = "枪神-20.国粤双语";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "枪神",
      original_name: "",
      season: "",
      episode: "E20",
    });
  });
  test("第九节课1080P.内嵌字幕", () => {
    const name = "第九节课1080P.内嵌字幕";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "第九节课",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("知否知否应是绿肥红瘦.1080台版高码.1080三无.4k.60帧", () => {
    const name = "知否知否应是绿肥红瘦.1080台版高码.1080三无.4k.60帧";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "知否知否应是绿肥红瘦",
      original_name: "1080",
      season: "",
      episode: "",
    });
  });
  test("无心法师.第一季.Wuxin：The.Monster.Killer.S01E20.2015.1080p.WEB-DL.x264.AAC-HeiGuo.mp4", () => {
    const name = "无心法师.第一季.Wuxin：The.Monster.Killer.S01E20.2015.1080p.WEB-DL.x264.AAC-HeiGuo.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "无心法师",
      original_name: "Wuxin：The.Monster.Killer",
      season: "S01",
      episode: "E20",
    });
  });
  test("W 武媚娘传奇【4k】2014 国语繁字", () => {
    const name = "W 武媚娘传奇【4k】2014 国语繁字";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "武媚娘传奇",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("一起同过窗 第三季 第30集 4K(超高清SDR)(8298117)", () => {
    const name = "一起同过窗 第三季 第30集 4K(超高清SDR)(8298117)";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "一起同过窗",
      original_name: "",
      season: "S03",
      episode: "E30",
    });
  });
  test("小敏家.2021.4K.H265.DVD.原版+纯享版+4K60帧", () => {
    const name = "小敏家.2021.4K.H265.DVD.原版+纯享版+4K60帧";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "小敏家",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("别了，温哥华.Vancouver.2003.WEB-DL.4k.H265.AAC-HDSWEB", () => {
    const name = "别了，温哥华.Vancouver.2003.WEB-DL.4k.H265.AAC-HDSWEB";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "别了，温哥华",
      original_name: "Vancouver",
      season: "",
      episode: "",
    });
  });
  test("天道.1080P+720P.国语中字", () => {
    const name = "天道.1080P+720P.国语中字";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "天道",
      // @todo 很多合集都会有这种多个分辨率用符号 `+` 连接的，也要支持处理
      original_name: "720P",
      season: "",
      episode: "",
    });
  });
  test("腾空的日子（张伟、胡冰卿主演校园剧）", () => {
    const name = "腾空的日子（张伟、胡冰卿主演校园剧）";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "腾空的日子",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("王子变青蛙（经典台剧）", () => {
    const name = "王子变青蛙（经典台剧）";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "王子变青蛙",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("十六岁的花季1989年 高清修复版", () => {
    const name = "十六岁的花季1989年 高清修复版";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      // @todo 这种情况没办法，如果有些影片名字就是「请回答1988」这种怎么办
      // 所以这种视为异常数据
      name: "十六岁的花季1989年",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("18禁不禁（曾经很有趣很无厘头的台剧）", () => {
    const name = "18禁不禁（曾经很有趣很无厘头的台剧）";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "18禁不禁",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("[18禁不禁].18stop-19.rmvb", () => {
    const name = "[18禁不禁].18stop-19.rmvb";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "18禁不禁",
      original_name: "18stop",
      season: "",
      episode: "E19",
    });
  });
  test("那些年，我们一起追的女孩.2011.台版无删减完整版.国语中字", () => {
    const name = "那些年，我们一起追的女孩.2011.台版无删减完整版.国语中字";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "那些年，我们一起追的女孩",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("东北插班生_24.1080P", () => {
    const name = "东北插班生_24.1080P";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "东北插班生",
      original_name: "",
      season: "",
      episode: "E24",
    });
  });
  test("唐砖第35集-蓝光4K", () => {
    const name = "唐砖第35集-蓝光4K;";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "唐砖",
      original_name: "",
      season: "",
      episode: "E35",
    });
  });
  test("一起同过窗 第三季 第24集 4K(超高清SDR)(6711482).mp4", () => {
    const name = "一起同过窗 第三季 第24集 4K(超高清SDR)(6711482).mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "一起同过窗",
      original_name: "",
      season: "S03",
      episode: "E24",
    });
  });
  test("第9集 每个人都要准备一个最好笑的笑话.mp4", () => {
    const name = "第9集 每个人都要准备一个最好笑的笑话.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "E09",
    });
  });
  test("大学生同居的事儿第2季.40.一天一夜（下）.rmvb", () => {
    const name = "大学生同居的事儿第2季.40.一天一夜（下）.rmvb";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "大学生同居的事儿",
      original_name: "",
      season: "S02",
      episode: "E40",
    });
  });
  test("梦华录.4K.去除片头片中片尾广告.纯享版", () => {
    const name = "梦华录.4K.去除片头片中片尾广告.纯享版";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "梦华录",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("【SuperMiao】A.Dream.of.Splendor.2022.EP40.V2.4K.WEB-DL.H265.AAC.mp4", () => {
    const name = "【SuperMiao】A.Dream.of.Splendor.2022.EP40.V2.4K.WEB-DL.H265.AAC.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "A.Dream.of.Splendor",
      season: "",
      episode: "E40",
    });
  });
  test("如懿传-2018-内地.三无.内封英文字幕", () => {
    const name = "如懿传-2018-内地.三无.内封英文字幕";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "如懿传",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("[4K超高清修复]《天道》无删减完整版第9集_超清 4K.mp4", () => {
    const name = "[4K超高清修复]《天道》无删减完整版第9集_超清 4K.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "天道",
      original_name: "",
      season: "",
      episode: "E09",
    });
  });
  test("地狱公使.韩英双语.内封多国字幕.1080P.非HDR版本", () => {
    const name = "地狱公使.韩英双语.内封多国字幕.1080P.非HDR版本";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "地狱公使",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("地狱公使.去除英语音轨.保留简繁字幕.1080P.HDR版本", () => {
    const name = "地狱公使.去除英语音轨.保留简繁字幕.1080P.HDR版本";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "地狱公使",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("[地狱公使]Hellbound.S01E06.Episode.6.1080p.NF.WEB-DL.x265.10bit.HDR.DDP5.1.Atmos.BOBO.mkv", () => {
    const name = "[地狱公使]Hellbound.S01E06.Episode.6.1080p.NF.WEB-DL.x265.10bit.HDR.DDP5.1.Atmos.BOBO.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "地狱公使",
      original_name: "Hellbound",
      season: "S01",
      episode: "E06",
    });
  });
  test("Hellbound.S01E06.Episode.6.1080p.NF.WEB-DL.DDP.5.1.Atmos.HDR10.H.265-BlackTV.mkv", () => {
    const name = "Hellbound.S01E06.Episode.6.1080p.NF.WEB-DL.DDP.5.1.Atmos.HDR10.H.265-BlackTV.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Hellbound",
      season: "S01",
      episode: "E06",
    });
  });
  test("Strange.Tales.of.Tang.Dynasty.2022.S01E36.2160p.iQIYI.WEB-DL.DDP5.1.H.265-Nanzhi.mkv", () => {
    const name = "Strange.Tales.of.Tang.Dynasty.2022.S01E36.2160p.iQIYI.WEB-DL.DDP5.1.H.265-Nanzhi.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Strange.Tales.of.Tang.Dynasty",
      season: "S01",
      episode: "E36",
    });
  });
  test("Taiwan.Crime.Stories.S01E12.2023.DSNP.WEB-DL.1080p.H264.DDP-SuperMiao.mkv", () => {
    const name = "Taiwan.Crime.Stories.S01E12.2023.DSNP.WEB-DL.1080p.H264.DDP-SuperMiao.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Taiwan.Crime.Stories",
      season: "S01",
      episode: "E12",
    });
  });
  test("伪装者 完整全集 蓝光(1080P)", () => {
    const name = "伪装者 完整全集 蓝光(1080P)";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "伪装者",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("毛骗.SE01.06.mp4", () => {
    const name = "毛骗.SE01.06.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "毛骗",
      original_name: "",
      season: "S01",
      episode: "E06",
    });
  });
  test("天道4K无删减收藏版", () => {
    const name = "天道4K无删减收藏版";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "天道",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("暗黑者3", () => {
    const name = "暗黑者3";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "暗黑者3",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("欢乐颂3_03.1080P.mp4", () => {
    const name = "欢乐颂3_03.1080P.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "欢乐颂3",
      original_name: "",
      season: "",
      episode: "E03",
    });
  });
  test("暗黑者2第04集-308国道校车案（上）.mp4", () => {
    const name = "暗黑者2第04集-308国道校车案（上）.mp4";
    const result = parse_filename_for_video(name);
    // @todo 308 会被处理成「集数」，又不能判断已经存在「集数」，所以跳过（其他重复出现同样信息时会有问题）
    expect(result).toStrictEqual({
      name: "暗黑者2",
      original_name: "",
      season: "",
      episode: "E04",
    });
  });
  test("L 立功·东北旧事", () => {
    const name = "L 立功·东北旧事";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "立功·东北旧事",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("第9话 就是你啊-4K 超清.mp4", () => {
    const name = "第9话 就是你啊-4K 超清.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "E09",
    });
  });
  test("请回答1988", () => {
    const name = "请回答1988";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "请回答1988",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("生命时速·紧急救护120", () => {
    const name = "生命时速·紧急救护120";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "生命时速·紧急救护120",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("xtm.dvd-halfcd2.杜拉拉升职记.2010.中国.第32集.repack.mkv", () => {
    const name = "xtm.dvd-halfcd2.杜拉拉升职记.2010.中国.第32集.repack.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "杜拉拉升职记",
      original_name: "",
      season: "",
      episode: "E32",
    });
  });
  test("Nirvana.in.Fire.Ⅱ.2017.E49.4K.WEB-DL.AAC.H264-.mp4", () => {
    const name = "Nirvana.in.Fire.Ⅱ.2017.E49.4K.WEB-DL.AAC.H264-.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Nirvana.in.Fire",
      season: "S02",
      episode: "E49",
    });
  });
  test("CYW.The Legend of Sword and Fairy 3.EP37.2009.2160p.WEB-DL.x265.AAC-SXG.mp4", () => {
    const name = "CYW.The Legend of Sword and Fairy 3.EP37.2009.2160p.WEB-DL.x265.AAC-SXG.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "The.Legend.of.Sword.and.Fairy.3",
      season: "",
      episode: "E37",
    });
  });
  test("小谢尔顿S05E09.mp4", () => {
    const name = "小谢尔顿S05E09.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "小谢尔顿",
      original_name: "",
      season: "S05",
      episode: "E09",
    });
  });
  test("十八年后的终极告白2.0", () => {
    const name = "十八年后的终极告白2.0";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "十八年后的终极告白2.0",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("S熟年 [2023]", () => {
    const name = "S熟年 [2023]";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "S熟年",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("灵魂摆渡Ⅱ.1080p", () => {
    const name = "灵魂摆渡Ⅱ.1080p";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "灵魂摆渡",
      original_name: "",
      season: "S02",
      episode: "",
    });
  });
  test("太子妃升职记丨36_End.mp4", () => {
    const name = "太子妃升职记丨36_End.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "太子妃升职记",
      original_name: "",
      season: "",
      episode: "E36",
      // @todo
    });
  });
  test("洗冤录1-01.mkv", () => {
    const name = "洗冤录1-01.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "洗冤录1",
      original_name: "",
      season: "",
      episode: "E01",
    });
  });
  test("封神榜I NGB (34).ts", () => {
    const name = "封神榜I NGB (34).ts";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "封神榜I",
      original_name: "",
      season: "",
      episode: "E34",
    });
  });
  test("我是特种兵之利刃出鞘.Special.Arms.Ⅱ.2012.S01E38.WEB-DL.4K.HEVC.AAC-CHDWEB.mp4", () => {
    const name = "我是特种兵之利刃出鞘.Special.Arms.Ⅱ.2012.S01E38.WEB-DL.4K.HEVC.AAC-CHDWEB.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "我是特种兵之利刃出鞘",
      original_name: "Special.Arms",
      season: "S01",
      episode: "E38",
    });
  });
  test("阿拉蒙之剑：阿斯达年代记 [2023][12集持续更新中]", () => {
    const name = "阿拉蒙之剑：阿斯达年代记 [2023][12集持续更新中]";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "阿拉蒙之剑：阿斯达年代记",
      original_name: "",
      season: "",
      episode: "",
    });
  });
});
