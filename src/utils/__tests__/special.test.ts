/**
 * @file 名字奇奇怪怪的剧集、电影
 */
import { describe, expect, test } from "vitest";

import { parse_filename_for_video } from "../parse_filename_for_video";

describe("奇怪", () => {
  /**
   * 包含剧集总数
   */
  test("龙门镖局.7.6.Longmen.Express.2013.EP01-40.4K.2160p.HEVC.AAC-DHTCLUB", () => {
    const name = "龙门镖局.7.6.Longmen.Express.2013.EP01-40.4K.2160p.HEVC.AAC-DHTCLUB";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "龙门镖局",
      original_name: "Longmen.Express",
      season: "",
      episode: "",
    });
  });
  test("破冰行动.EP01-48.2019.2160p.DVD.WEB-DL.x264.AAC-HQC", () => {
    const name = "破冰行动.EP01-48.2019.2160p.DVD.WEB-DL.x264.AAC-HQC";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "破冰行动",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("A.Little.Mood.For.Love.EP01-40.2021.4K.60FPS.WEB-DL.HEVC.AAC-HQC", () => {
    const name = "A.Little.Mood.For.Love.EP01-40.2021.4K.60FPS.WEB-DL.HEVC.AAC-HQC";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "A.Little.Mood.For.Love",
      season: "",
      episode: "",
    });
  });
  test("J-将夜.Ever.Night.S01.2018.EP01-60.WEB-DL.1080p.H265.AAC-BtsTV", () => {
    const name = "J-将夜.Ever.Night.S01.2018.EP01-60.WEB-DL.1080p.H265.AAC-BtsTV";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "将夜",
      original_name: "Ever.Night",
      season: "S01",
      episode: "",
    });
  });
  test("还珠格格3.2003.40集特别版+6部MV .繁体中字 无台标水印版", () => {
    const name = "还珠格格3.2003.40集特别版+6部MV .繁体中字 无台标水印版";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "还珠格格3",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("鹿鼎记.1984.全40集.GOTV-TS.国语无字★【30.3G】", () => {
    const name = "鹿鼎记.1984.全40集.GOTV-TS.国语无字★【30.3G】";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "鹿鼎记",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("布衣神相[全30集][粤语音轨+简繁字幕]", () => {
    const name = "布衣神相[全30集][粤语音轨+简繁字幕]";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "布衣神相",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("宝莲灯前传.全46集.Lotus.Lantern.Prequel.2009.V2.Complete.2160P[4K]WEB-DL.X265.AAC-Vampire", () => {
    const name = "宝莲灯前传.全46集.Lotus.Lantern.Prequel.2009.V2.Complete.2160P[4K]WEB-DL.X265.AAC-Vampire";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "宝莲灯前传",
      original_name: "Lotus.Lantern.Prequel",
      season: "",
      episode: "",
      // @todo 剩余太多的满足 episode_name 的字符怎么办？
    });
  });
  test("三十而已.全43集.Nothing.But.Thirty.2020.4K.H265.AAC.内嵌简中.87.7G", () => {
    const name = "三十而已.全43集.Nothing.But.Thirty.2020.4K.H265.AAC.内嵌简中.87.7G";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "三十而已",
      original_name: "Nothing.But.Thirty",
      season: "",
      episode: "",
    });
  });
  test("战长沙.豆瓣9.1.高分战争剧.全32集[2014]", () => {
    const name = "战长沙.豆瓣9.1.高分战争剧.全32集[2014]";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "战长沙",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("大理寺日志 第一季(12集全)", () => {
    const name = "大理寺日志 第一季(12集全)";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "大理寺日志",
      original_name: "",
      season: "S01",
      episode: "",
    });
  });
  // 包含季总数
  test("魔幻手机.1+2.1080P.国语中字", () => {
    const name = "魔幻手机.1+2.1080P.国语中字";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "魔幻手机",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("一起同过窗.1-3季.国语中字", () => {
    const name = "一起同过窗.1-3季.国语中字";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "一起同过窗",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("毛骗1-3季", () => {
    const name = "毛骗1-3季";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "毛骗",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("Y 隐门 (2023)(25集)又名十八年后的终极告白3.0(1-3)", () => {
    // @special
    const name = "Y 隐门 (2023)(25集)又名十八年后的终极告白3.0(1-3)";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "隐门",
      original_name: "",
      season: "",
      episode: "E25",
    });
  });
  test("2021.华灯初上.1-3季", () => {
    const name = "2021.华灯初上.1-3季";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "华灯初上",
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
  /** 季和集数合在一起了 */
  test("Rick and Morty - 302 - Rickmancing the Stone.mkv", () => {
    const name = "Rick and Morty - 302 - Rickmancing the Stone.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Rick.and.Morty",
      season: "",
      // @todo 应该是 S03E02
      episode: "E302",
    });
  });
  /** 多集合并在一集中 */
  test("Friends.S10E17E18.2003.1080p.Blu-ray.x265.AC3￡cXcY@FRDS.mkv", () => {
    const name = "Friends.S10E17E18.2003.1080p.Blu-ray.x265.AC3￡cXcY@FRDS.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Friends",
      season: "S10",
      episode: "E17-18",
    });
  });
  test("Criminal.Minds.S07E23-E24.Hit&Run.1080p.AMZN.WEB-DL.DDP5.1.x265.10bit-Yumi@FRDS.mkv", () => {
    const name = "Criminal.Minds.S07E23-E24.Hit&Run.1080p.AMZN.WEB-DL.DDP5.1.x265.10bit-Yumi@FRDS.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Criminal.Minds",
      season: "S07",
      episode: "E23-24",
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
  /** 多版本 */
  test("1981.阿蕾拉.81版+97重置版.国语", () => {
    const name = "1981.阿蕾拉.81版+97重置版.国语";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "阿蕾拉",
      original_name: "",
      season: "",
      // @todo 太无语了 凡人修仙传 有 12重置版 表示 重置版第12集，没办法只能这里异常
      episode: "E97",
    });
  });
});
