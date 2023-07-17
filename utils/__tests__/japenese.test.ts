/**
 * @file 日剧或日漫
 */
import { describe, expect, test } from "vitest";

import { parse_filename_for_video } from "../index";

describe("动漫", () => {
  test("犬夜叉 - 本篇 - 第166-167话：最终话-二人の绊 四魂のかけらを使え！（两人的羁绊 使用四魂碎片吧！-前后篇）；640×480P.mkv", () => {
    const name =
      "犬夜叉 - 本篇 - 第166-167话：最终话-二人の绊 四魂のかけらを使え！（两人的羁绊 使用四魂碎片吧！-前后篇）；640×480P.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "犬夜叉",
      original_name: "",
      season: "S01",
      episode: "E166-167",
      episode_name: "最终话-二人の绊.四魂のかけらを使え！（两人的羁绊.使用四魂碎片吧！-前后篇）",
    });
  });

  test("犬夜叉 - OVA.2010-01-29：It’s a Rumic World 犬夜叉～黒い鐵砕牙（黑色的铁碎牙）；1920×1080P.mkv", () => {
    const name = "犬夜叉 - OVA.2010-01-29：It’s a Rumic World 犬夜叉～黒い鐵砕牙（黑色的铁碎牙）；1920×1080P.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "犬夜叉",
      original_name: "",
      season: "OVA",
      episode: "",
      episode_name: "It’s.a.Rumic.World.犬夜叉～黒い鐵砕牙（黑色的铁碎牙）",
    });
  });

  test("犬夜叉 SP", () => {
    const name = "犬夜叉 SP";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "犬夜叉",
      original_name: "",
      season: "SP",
      episode: "",
      episode_name: "",
    });
  });

  test("OVA最後のマジカル大戦 第2集.mp4", () => {
    const name = "OVA最後のマジカル大戦 第2集.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "OVA",
      episode: "E02",
      episode_name: "最後のマジカル大戦",
    });
  });
  test("第17集 キケンがグルグル!.mp4", () => {
    const name = "第17集 キケンがグルグル!.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "E17",
      episode_name: "キケンがグルグル!",
    });
  });
  test("49. さらばヌメモン.mkv", () => {
    const name = "49. さらばヌメモン.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "E49",
      episode_name: "さらばヌメモン",
    });
  });
  // @todo 难搞
  test("デジモンユニバース アプリモンスターズ 第35話 「めざせ9人ゴッド！アプリ山470総選挙！」[1280x720][HDTVrip]", () => {
    const name =
      "デジモンユニバース アプリモンスターズ 第35話 「めざせ9人ゴッド！アプリ山470総選挙！」[1280x720][HDTVrip]";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "デジモンユニバース",
      original_name: "",
      season: "",
      episode: "E35",
      episode_name: "アプリモンスターズ",
    });
  });
  test("[BeanSub&FZSD][Jigokuraku][07][GB][1080P][x264_ACC].mp4", () => {
    const name = "[BeanSub&FZSD][Jigokuraku][07][GB][1080P][x264_ACC].mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Jigokuraku",
      season: "",
      episode: "E07",
      episode_name: "",
    });
  });
  test("【推しの子】 屍體如山的死亡遊戲 - 03 (Baha 1920x1080 AVC AAC MP4) [FFE940AF].mp4", () => {
    const name = "【推しの子】 屍體如山的死亡遊戲 - 03 (Baha 1920x1080 AVC AAC MP4) [FFE940AF].mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "屍體如山的死亡遊戲",
      original_name: "",
      season: "",
      episode: "E03",
      episode_name: "Baha",
    });
  });
  test("【推しの子】 我家的英雄 - 03 (Baha 1920x1080 AVC AAC MP4) [CD2BE146].mp4", () => {
    const name = "【推しの子】 我家的英雄 - 03 (Baha 1920x1080 AVC AAC MP4) [CD2BE146].mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "我家的英雄",
      original_name: "",
      season: "",
      episode: "E03",
      episode_name: "Baha",
    });
  });
  test("【勇者字幕组】【假面骑士亚马逊】【第4话】【冲吧！愤怒的丛林者】.mp4", () => {
    const name = "【勇者字幕组】【假面骑士亚马逊】【第4话】【冲吧！愤怒的丛林者】.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "假面骑士亚马逊",
      original_name: "",
      season: "",
      episode: "E04",
      episode_name: "冲吧！愤怒的丛林者",
    });
  });
  test("[KRL][Kamen Rider Wizard][20][BDRip][1080p][x265_FLAC][HEVC][2AE13DF1].mkv", () => {
    const name = "[KRL][Kamen Rider Wizard][20][BDRip][1080p][x265_FLAC][HEVC][2AE13DF1].mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Kamen.Rider.Wizard",
      season: "",
      episode: "E20",
      episode_name: "",
    });
  });
  // test("2012.假面骑士.巫骑.Wizard", () => {
  //   const name = "2012.假面骑士.巫骑.Wizard";
  //   const result = parse_filename_for_video(name);
  //   expect(result).toStrictEqual({
  //     name: "假面骑士.巫骑",
  //     original_name: "Wizard",
  //     season: "",
  //     episode: "",
  //     episode_name: "",
  //   });
  // });
  test("[Shimazu] 廻り廻って in your pocket (BDRip 1920x1080p AVC FLAC).mkv", () => {
    const name = "[Shimazu] 廻り廻って in your pocket (BDRip 1920x1080p AVC FLAC).mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "廻り廻って",
      original_name: "in.your.pocket",
      season: "",
      episode: "",
      episode_name: "",
    });
  });
  test("[天の翼&FLT][假面骑士1号][完成披露会][1920X1080][X264(10-bit) AAC][BDrip][MP4].mp4", () => {
    const name = "[天の翼&FLT][假面骑士1号][完成披露会][1920X1080][X264(10-bit) AAC][BDrip][MP4].mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "假面骑士1号",
      original_name: "",
      season: "",
      episode: "",
      episode_name: "完成披露会",
    });
  });
  test("[J2] 龍珠改 第098話.mp4", () => {
    const name = "[J2] 龍珠改 第098話.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "龍珠改",
      original_name: "",
      season: "",
      episode: "E098",
      episode_name: "",
    });
  });
  test("[KTXP][Made in Abyss - Dawn of the Deep Soul][SP04][GB][1080p][BDrip].mp4", () => {
    const name = "[KTXP][Made in Abyss - Dawn of the Deep Soul][SP04][GB][1080p][BDrip].mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Made.in.Abyss.Dawn.of.the.Deep.Soul",
      season: "SP",
      episode: "E04",
      episode_name: "",
    });
  });
  test("[公众号：SS的笔记/腹肌崩坏太郎番外/星空][假面骑士01 番外][奇迹的身份改变！？或人VS腹肌崩坏太郎 宿命的段子对决].mp4", () => {
    const name =
      "[公众号：SS的笔记/腹肌崩坏太郎番外/星空][假面骑士01 番外][奇迹的身份改变！？或人VS腹肌崩坏太郎 宿命的段子对决].mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "假面骑士",
      original_name: "",
      season: "S01",
      episode: "",
      episode_name: "番外.奇迹的身份改变！？或人VS腹肌崩坏太郎.宿命的段子对决",
    });
  });
  test("【蓝色狂想制作】数码宝贝1：大冒险第48集-轰炸指令！无限龙兽1080P.mkv", () => {
    const name = "【蓝色狂想制作】数码宝贝1：大冒险第48集-轰炸指令！无限龙兽1080P.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "数码宝贝1：大冒险",
      original_name: "",
      season: "",
      episode: "E48",
      episode_name: "轰炸指令！无限龙兽",
    });
  });
  test("[EMTP-Raws&TamersUnion]デジモンアドベンチャー：[66][WEBrip][x264_AAC][CHS_JPN].mp4", () => {
    const name = "[EMTP-Raws&TamersUnion]デジモンアドベンチャー：[66][WEBrip][x264_AAC][CHS_JPN].mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "デジモンアドベンチャー",
      original_name: "",
      season: "",
      episode: "E66",
      episode_name: "",
    });
  });
  test("风间公亲-教场0-Kazama.Kimichika.Kyojo.Zero.Ep03.Chi_Jap.HDTVrip.1280X720.mp4", () => {
    const name = "风间公亲-教场0-Kazama.Kimichika.Kyojo.Zero.Ep03.Chi_Jap.HDTVrip.1280X720.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "风间公亲",
      original_name: "",
      season: "",
      episode: "E03",
      episode_name: "教场0-Kazama.Kimichika.Kyojo.Zero",
    });
  });
});
