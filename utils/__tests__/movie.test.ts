/**
 * @file 电影
 */
import { describe, expect, test } from "vitest";

import { parse_filename_for_video } from "../parse_filename_for_video";

describe("电影", () => {
  test("Everything Everywhere All At Once.2022.UHD.Bluray.2160p.DV.HEVC.TrueHD 7.1.mkv", () => {
    const name = "Everything Everywhere All At Once.2022.UHD.Bluray.2160p.DV.HEVC.TrueHD 7.1.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Everything.Everywhere.All.At.Once",
      season: "",
      episode: "",
      // @todo 这个是什么意义
    });
  });

  test("Q 请回答1988蓝光版", () => {
    const name = "Q 请回答1988蓝光版";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "请回答1988",
      original_name: "",
      season: "",
      episode: "",
    });
  });

  test("玩具总动员4.mp4", () => {
    const name = "玩具总动员4.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "玩具总动员",
      original_name: "",
      season: "",
      episode: "E04",
    });
  });
  test("1990.傅艺伟. 封神榜 4K. 高清修复", () => {
    const name = "1990.傅艺伟. 封神榜 4K. 高清修复";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "封神榜",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("碟中谍7：致命清算（上）.mp4", () => {
    const name = "碟中谍7：致命清算（上）.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      // @todo
      name: "碟中谍7：致命清算（上）",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("No.62｜潜伏.2010.中字.1080p.x264.FS24P.mkv", () => {
    const name = "No.62｜潜伏.2010.中字.1080p.x264.FS24P.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "潜伏",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("封神：祸商.4K.2023.TX洗码3.mp4", () => {
    const name = "封神：祸商.4K.2023.TX洗码3.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "封神：祸商",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("MOJH.2023.4K.粤语[洗码1].mp4", () => {
    const name = "MOJH.2023.4K.粤语[洗码1].mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "MOJH",
      season: "",
      episode: "",
    });
  });
  test("5国粤双语中字.Warriors.of.Future.2022.HD1080P(1).mp4", () => {
    const name = "5国粤双语中字.Warriors.of.Future.2022.HD1080P(1).mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "5.Warriors.of.Future",
      season: "",
      episode: "",
    });
  });
  test("[内封繁简][多国语言音轨]Spider-Man.Across.the.Spider-Verse.2023.1080p.iT.WEB-DL.DDP5.1.Atmos.H.264.mkv", () => {
    const name =
      "[内封繁简][多国语言音轨]Spider-Man.Across.the.Spider-Verse.2023.1080p.iT.WEB-DL.DDP5.1.Atmos.H.264.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Spider-Man.Across.the.Spider-Verse",
      season: "",
      episode: "",
    });
  });
  test("4K.国粤双语音轨 高码率.mp4", () => {
    const name = "4K.国粤双语音轨 高码率.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("4K高码国粤双语 [需支持切换音轨的播放器]", () => {
    const name = "4K高码国粤双语 [需支持切换音轨的播放器]";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "需支持切换音轨的播放器",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("Die Wannseekonferenz.中德双语.昆仑德语字幕组.mp4", () => {
    const name = "Die Wannseekonferenz.中德双语.昆仑德语字幕组.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Die.Wannseekonferenz",
      season: "",
      episode: "",
    });
  });
  test("10.万里归途.2022 - 豆瓣7.4分", () => {
    const name = "10.万里归途.2022 - 豆瓣7.4分";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "万里归途",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("06.奇迹笨小孩.2022 - 豆瓣7.4分", () => {
    const name = "06.奇迹笨小孩.2022 - 豆瓣7.4分";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "奇迹笨小孩",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("03.一场很（没）有必要的春晚.2022 - 豆瓣7.7分", () => {
    const name = "03.一场很（没）有必要的春晚.2022 - 豆瓣7.7分";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "一场很（没）有必要的春晚",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("Top013.放牛班的春天.The.Chorus.2004.Bluray.1080p.x265.AAC(5.1).2Audios.GREENOTEA.mkv", () => {
    const name = "Top013.放牛班的春天.The.Chorus.2004.Bluray.1080p.x265.AAC(5.1).2Audios.GREENOTEA.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "放牛班的春天",
      original_name: "The.Chorus",
      season: "",
      episode: "",
    });
  });
  test("Top028.十二怒汉(CC标准收藏版).12.Angry.Men.1957.CC.Bluray.1080p.x265.AAC.GREENOTEA.mkv", () => {
    const name = "Top028.十二怒汉(CC标准收藏版).12.Angry.Men.1957.CC.Bluray.1080p.x265.AAC.GREENOTEA.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "十二怒汉",
      original_name: "",
      season: "",
      // @todo 电视剧和电影合在一起解析，这种就很难避免
      episode: "E12",
    });
  });
  test("007：大破天幕杀机 (2012) DV 2160p DTSHD-MA.mkv", () => {
    const name = "007：大破天幕杀机 (2012) DV 2160p DTSHD-MA.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "007：大破天幕杀机",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("封神第一部", () => {
    const name = "封神第一部";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "封神第一部",
      original_name: "",
      season: "",
      episode: "",
    });
  });
});
