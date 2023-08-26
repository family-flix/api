/**
 * @file 日剧或日漫
 */
import { describe, expect, test } from "vitest";

import { parse_filename_for_video } from "../parse_filename_for_video";

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
    });
  });
  // @todo 难搞
  test("デジモンユニバース アプリモンスターズ 第35話 「めざせ9人ゴッド！アプリ山470総選挙！」[1280x720][HDTVrip]", () => {
    const name =
      "デジモンユニバース アプリモンスターズ 第35話 「めざせ9人ゴッド！アプリ山470総選挙！」[1280x720][HDTVrip]";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "デジモンユニバース",
      // @todo 日文中间有空格，应该忽略掉，前后视为整体
      original_name: "アプリモンスターズ",
      season: "",
      episode: "E35",
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
    });
  });
  test("[J2] 龍珠改 第098話.mp4", () => {
    const name = "[J2] 龍珠改 第098話.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "龍珠改",
      original_name: "",
      season: "",
      episode: "E98",
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
      episode: "番外",
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
    });
  });
  test("[1080P][DBD制作组&离谱Sub][龙珠GT][NCOP2][HEVC-10bit][AC3].mkv", () => {
    const name = "[1080P][DBD制作组&离谱Sub][龙珠GT][NCOP2][HEVC-10bit][AC3].mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "龙珠GT",
      original_name: "",
      season: "",
      episode: "NCOP2",
    });
  });
  test("[1080P][DBD制作组&离谱Sub][龙珠GT][60][HEVC-10bit][AC3].mkv", () => {
    const name = "[1080P][DBD制作组&离谱Sub][龙珠GT][60][HEVC-10bit][AC3].mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "龙珠GT",
      original_name: "",
      season: "",
      episode: "E60",
    });
  });
  test("[BeanSub][Nanatsu_no_Taizai_Fundo_no_Shinpan][23][GB][1080P][x264_AAC].mp4", () => {
    const name = "[BeanSub][Nanatsu_no_Taizai_Fundo_no_Shinpan][23][GB][1080P][x264_AAC].mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Nanatsu.no.Taizai.Fundo.no.Shinpan",
      season: "",
      episode: "E23",
    });
  });
  test("[SAIO-Raws] Nanatsu no Taizai Seisen no Shirushi 03 [BD 1920x1080 HEVC-10bit OPUS ASSx2].mkv", () => {
    const name = "[SAIO-Raws] Nanatsu no Taizai Seisen no Shirushi 03 [BD 1920x1080 HEVC-10bit OPUS ASSx2].mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Nanatsu.no.Taizai.Seisen.no.Shirushi",
      season: "",
      episode: "E03",
    });
  });
  test("[ANi] 政宗君的復仇 R - 03 [1080P][Baha][WEB-DL][AAC AVC][CHT].mp4", () => {
    const name = "[ANi] 政宗君的復仇 R - 03 [1080P][Baha][WEB-DL][AAC AVC][CHT].mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "政宗君的復仇",
      original_name: "",
      season: "",
      episode: "E03",
    });
  });
  test("Z 最好的老师 1年后、我被学生■了 [2023]更新中", () => {
    const name = "Z 最好的老师 1年后、我被学生■了 [2023]更新中";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "最好的老师",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("[DAY][仮面戦隊ゴライダー][PR1][BDrip][1080P][X264 FLAC].mkv", () => {
    const name = "[DAY][仮面戦隊ゴライダー][PR1][BDrip][1080P][X264 FLAC].mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "仮面戦隊ゴライダー",
      original_name: "",
      season: "",
      episode: "PR1",
    });
  });
  test("Numbers：大厦森林的监视者们 [2023][12集持续更新中]", () => {
    const name = "Numbers：大厦森林的监视者们 [2023][12集持续更新中]";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "Numbers：大厦森林的监视者们",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("OVA冒険編 第3集.mp4", () => {
    const name = "OVA冒険編 第3集.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "OVA冒険編",
      episode: "E03",
    });
  });
  test("[DBD-Raws][咒术回战][PV4][1080P][BDRip][HEVC-10bit][FLAC].mkv", () => {
    const name = "[DBD-Raws][咒术回战][PV4][1080P][BDRip][HEVC-10bit][FLAC].mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "咒术回战",
      original_name: "",
      season: "PV",
      episode: "E04",
    });
  });
  test("[VCB-Studio] Ushio to Tora [NCOP03][Ma10p_1080p][x265_flac].mkv", () => {
    const name = "[VCB-Studio] Ushio to Tora [NCOP03][Ma10p_1080p][x265_flac].mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Ushio.to.Tora",
      season: "",
      episode: "NCOP03",
    });
  });
  test("[VCB-Studio] Ushio to Tora [CM05][Ma10p_1080p][x265_flac].mkv", () => {
    const name = "[VCB-Studio] Ushio to Tora [CM05][Ma10p_1080p][x265_flac].mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Ushio.to.Tora",
      season: "",
      episode: "CM05",
    });
  });
  test("[SLAM DUNK][003][BDRIP][960x720][X264-10bit_AAC].mp4", () => {
    const name = "[SLAM DUNK][003][BDRIP][960x720][X264-10bit_AAC].mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "E03",
    });
  });
  test("[DBD-Raws][咒术回战][PV4][1080P][BDRip][HEVC-10bit][FLAC].mkv", () => {
    const name = "[DBD-Raws][咒术回战][PV4][1080P][BDRip][HEVC-10bit][FLAC].mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "咒术回战",
      original_name: "",
      season: "PV",
      episode: "E04",
    });
  });
  test("[Cleo]Baki_2nd_Season_-_06_(Dual Audio_10bit_1080p_x265).mkv", () => {
    const name = "[Cleo]Baki_2nd_Season_-_06_(Dual Audio_10bit_1080p_x265).mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Baki",
      season: "S02",
      episode: "E06",
    });
  });
});
