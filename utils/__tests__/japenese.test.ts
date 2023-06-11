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
});
