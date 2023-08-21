/**
 * 动漫
 */
import { describe, expect, test } from "vitest";

import { parse_filename_for_video } from "../parse_filename_for_video";

describe("动漫", () => {
  test("灌篮高手.1080P.国粤日三语.软字幕.AVC.默认国语音频.100.mkv", () => {
    const name = "灌篮高手.1080P.国粤日三语.软字幕.AVC.默认国语音频.100.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "灌篮高手",
      original_name: "",
      season: "",
      episode: "E100",
    });
  });
  test("[1080P][DBD制作组&离谱Sub][龙珠GT][特典映像][01][HEVC-10bit][AC3].mkv", () => {
    const name = "[1080P][DBD制作组&离谱Sub][龙珠GT][特典映像][01][HEVC-10bit][AC3].mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "龙珠GT",
      original_name: "",
      season: "特典映像",
      episode: "E01",
    });
  });
  test("X）星辰变.4K-1080P【国漫】玄幻", () => {
    const name = "X）星辰变.4K-1080P【国漫】玄幻";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "星辰变",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("师兄啊师兄. 09（纯享版）酒玖师叔与李长寿生情？齐源渡劫竟出现乌龙事件！", () => {
    const name = "师兄啊师兄. 09（纯享版）酒玖师叔与李长寿生情？齐源渡劫竟出现乌龙事件！";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "师兄啊师兄",
      original_name: "",
      season: "",
      episode: "E09",
    });
  });
  test("1989.魔动王 光能使者.41集全+OVA.双语版.1080p", () => {
    const name = "1989.魔动王 光能使者.41集全+OVA.双语版.1080p";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "魔动王",
      original_name: "",
      season: "OVA",
      episode: "",
    });
  });
  test("1981.阿蕾拉.81版+97重置版.国语", () => {
    const name = "1981.阿蕾拉.81版+97重置版.国语";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "阿蕾拉",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("H）画江湖之不良人1-6季.4K.含画江湖6部全系列【国漫】", () => {
    const name = "H）画江湖之不良人1-6季.4K.含画江湖6部全系列【国漫】";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "画江湖之不良人",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("S01 数码宝贝大冒险（日国粤）", () => {
    const name = "S01 数码宝贝大冒险（日国粤）";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "S01",
      episode: "",
    });
  });
  test("1999.数码宝贝.1-8季.多语版+10部剧场版+OVA", () => {
    const name = "1999.数码宝贝.1-8季.多语版+10部剧场版+OVA";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "数码宝贝",
      original_name: "",
      season: "OVA",
      episode: "",
    });
  });
  test("[SweetSub] Made in Abyss - 13 [8bit AVC][720P][CHS].mp4", () => {
    const name = "[SweetSub] Made in Abyss - 13 [8bit AVC][720P][CHS].mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Made.in.Abyss",
      season: "",
      episode: "E13",
    });
  });
  test("武G纪.第4季.第36集.祭天大典［总第150集］4K-H.265-HEVC- AAC-2023-03-14 - 国漫 - 《绝境涅槃》 篇-.- 酷安·公众号·QQ频道搜索 此间微凉，企鹅群159064310,更多【9124.ysepan.com】.mp4", () => {
    const name =
      "武G纪.第4季.第36集.祭天大典［总第150集］4K-H.265-HEVC- AAC-2023-03-14 - 国漫 - 《绝境涅槃》 篇-.- 酷安·公众号·QQ频道搜索 此间微凉，企鹅群159064310,更多【9124.ysepan.com】.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "武G纪",
      original_name: "",
      season: "S04",
      episode: "E36",
    });
  });
  test("九尾狐转15.mp4", () => {
    const name = "九尾狐转15.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "九尾狐转",
      original_name: "",
      season: "",
      episode: "E15",
    });
  });
  test("九尾狐传9.mp4", () => {
    const name = "九尾狐传9.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "九尾狐传",
      original_name: "",
      season: "",
      episode: "E09",
    });
  });
  test("灌篮高手日语版098.mp4", () => {
    const name = "灌篮高手日语版098.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "灌篮高手",
      original_name: "",
      season: "",
      episode: "E98",
    });
  });
  test("2001三少爷的剑31.mkv", () => {
    const name = "2001三少爷的剑31.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "三少爷的剑",
      original_name: "",
      season: "",
      episode: "E31",
    });
  });
  test("彩蛋1：腹肌胸肌肱二头肌！路哥这完美身材我爱了！.mp4", () => {
    const name = "彩蛋1：腹肌胸肌肱二头肌！路哥这完美身材我爱了！.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "彩蛋1",
    });
  });
  test("S 熟-年 [2023][40集持续更新中]", () => {
    const name = "S 熟-年 [2023][40集持续更新中]";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("好先生(未删减版)—1080P.HEVC.H264.AAC", () => {
    const name = "好先生(未删减版)—1080P.HEVC.H264.AAC";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "好先生",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("第八号当铺E112.mkv", () => {
    const name = "第八号当铺E112.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "第八号当铺",
      original_name: "",
      season: "",
      episode: "E112",
    });
  });
  test("天道EP22.mkv", () => {
    const name = "天道EP22.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "天道",
      original_name: "",
      season: "",
      episode: "E22",
    });
  });
  test("晓敏家.4K纯享版.片头.mp4", () => {
    const name = "晓敏家.4K纯享版.片头.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "晓敏家",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("逆水寒.D13.E37-38.2004.DVDRip.x264.AC3-CMCT.mkv", () => {
    const name = "逆水寒.D13.E37-38.2004.DVDRip.x264.AC3-CMCT.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "逆水寒",
      original_name: "D13",
      season: "",
      episode: "E37",
    });
  });
  test("7.mp4", () => {
    const name = "7.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "E07",
    });
  });
  test("番外2-杀人事件.mp4", () => {
    const name = "番外2-杀人事件.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "番外2",
    });
  });
  test("1080P官中", () => {
    const name = "1080P官中";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("打工吧！魔王大人S1E04.mkv", () => {
    const name = "打工吧！魔王大人S1E04.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "打工吧！魔王大人",
      original_name: "",
      season: "S01",
      episode: "E04",
    });
  });
  test("1080P超前完结", () => {
    const name = "1080P超前完结";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("1080P超前点映", () => {
    const name = "1080P超前点映";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  // test("Yinian Yong Heng-[1-5]-[041-052]-1080P.mp4", () => {
  //   const name = "Yinian Yong Heng-[1-5]-[041-052]-1080P.mp4";
  //   const result = parse_filename_for_video(name);
  //   expect(result).toStrictEqual({
  //     name: "",
  //     original_name: "",
  //     season: "",
  //     episode: "",
  //   });
  // });
  // test("月升沧海大结局点映礼 点映礼：吴磊赵露思组队游戏PK快问快答.mp4", () => {
  //   const name = "月升沧海大结局点映礼 点映礼：吴磊赵露思组队游戏PK快问快答.mp4";
  //   const result = parse_filename_for_video(name);
  //   expect(result).toStrictEqual({
  //     name: "",
  //     original_name: "",
  //     season: "",
  //     episode: "",
  //   });
  // });
  test("妖精森林的小不点 NCED01.mkv", () => {
    const name = "妖精森林的小不点 NCED01.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "妖精森林的小不点",
      original_name: "",
      season: "",
      episode: "NCED01",
    });
  });
  test("咒术回战第1季02.mp4", () => {
    const name = "咒术回战第1季02.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "咒术回战",
      original_name: "",
      season: "S01",
      episode: "E02",
    });
  });
  test("10重制版 凡人风起天南10_Tacit0924.mp4", () => {
    const name = "10重制版 凡人风起天南10_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "凡人风起天南10",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("少年白马醉春风 第15 以剑为刀.mp4", () => {
    const name = "少年白马醉春风 第15 以剑为刀.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "少年白马醉春风",
      original_name: "",
      season: "",
      episode: "E15",
    });
  });
  test("斗破苍穹特别篇2[4K].mp4", () => {
    const name = "斗破苍穹特别篇2[4K].mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "斗破苍穹",
      original_name: "",
      season: "",
      episode: "特别篇2",
    });
  });
  test("2013 LegalHigh SP2.mp4", () => {
    const name = "2013 LegalHigh SP2.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "LegalHigh",
      season: "SP",
      episode: "E02",
    });
  });
  test("显微镜下的大明之丝绢案-预告1", () => {
    const name = "显微镜下的大明之丝绢案-预告1";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "显微镜下的大明之丝绢案",
      original_name: "",
      season: "",
      episode: "预告1",
    });
  });
  test("0731入住日记第9期.mp4", () => {
    const name = "0731入住日记第9期.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "0731入住日记第9期",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("10.财阀家的小儿子.2022 - 豆瓣7.7分", () => {
    const name = "10.财阀家的小儿子.2022 - 豆瓣7.7分";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "财阀家的小儿子",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("08.9号秘事1-7季 - 豆瓣9.0分", () => {
    const name = "08.9号秘事1-7季 - 豆瓣9.0分";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "9号秘事",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("万li 归途 4K.mp4", () => {
    const name = "万li 归途 4K.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "万li",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("The.Story.of.HongMao.and.LanTu.S02.E8.再次响起.2008.720p.WEB-DL.AAC.H264-OurTV.mp4", () => {
    const name = "The.Story.of.HongMao.and.LanTu.S02.E8.再次响起.2008.720p.WEB-DL.AAC.H264-OurTV.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "The.Story.of.HongMao.and.LanTu",
      season: "S02",
      episode: "E08",
    });
  });
  test("《孤独的美食家 盛夏的博多 出差SP》第1集_高清 1080P+.mp4 ", () => {
    const name = "《孤独的美食家 盛夏的博多 出差SP》第1集_高清 1080P+.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "孤独的美食家",
      original_name: "",
      season: "SP",
      episode: "E01",
    });
  });
  test("重启人生番外篇", () => {
    const name = "重启人生番外篇";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "重启人生",
      original_name: "",
      season: "番外篇",
      episode: "",
    });
  });
  test("斗破苍穹年番 第18话 4K(超高清SDR) _Tacit0924.mp4", () => {
    const name = "斗破苍穹年番 第18话 4K(超高清SDR) _Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "斗破苍穹年番",
      original_name: "",
      season: "",
      episode: "E18",
    });
  });
  test("F 付岩洞复仇者们付岩洞复仇者们国配", () => {
    const name = "F 付岩洞复仇者们付岩洞复仇者们国配";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "付岩洞复仇者们付岩洞复仇者们",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("【幻月字幕组】【23年日剧】【心灵内科医生 稻生知性】【01】【1080P】【中文字幕】.mp4", () => {
    const name = "【幻月字幕组】【23年日剧】【心灵内科医生 稻生知性】【01】【1080P】【中文字幕】.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "心灵内科医生",
      original_name: "",
      season: "",
      episode: "E01",
    });
  });
  test("不.中英双字.V1.Nope.2022.HD1080P.X264.AAC.mp4", () => {
    const name = "不.中英双字.V1.Nope.2022.HD1080P.X264.AAC.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "不",
      original_name: "V1.Nope",
      season: "",
      episode: "",
    });
  });
});
