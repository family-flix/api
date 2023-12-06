/**
 * @file 各种带有「番外篇、特别篇」等，季 或者 集 不是正常数字
 */
import { describe, expect, test } from "vitest";

import { parse_filename_for_video } from "../parse_filename_for_video";

describe("番外", () => {
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
  test("【熟肉-花絮】Transformers.2.BONUS.2009.HR-HDTV.AC3.1024X576.x264.mkv", () => {
    // @special
    const name = "【熟肉-花絮】Transformers.2.BONUS.2009.HR-HDTV.AC3.1024X576.x264.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Transformers.2",
      season: "其他",
      episode: "BONUS",
    });
  });
  test("一人之下手游泡面番 第4话 编剧的宠爱 720P(准高清).mp4", () => {
    const name = "一人之下手游泡面番 第4话 编剧的宠爱 720P(准高清).mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "一人之下手游",
      original_name: "",
      season: "泡面番",
      episode: "E04",
    });
  });
  test("[VCB-Studio] Ushio to Tora [NCOP03][Ma10p_1080p][x265_flac].mkv", () => {
    const name = "[VCB-Studio] Ushio to Tora [NCOP03][Ma10p_1080p][x265_flac].mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Ushio.to.Tora",
      season: "其他",
      episode: "NCOP03",
    });
  });
  test("假面骑士圣刃续集", () => {
    const name = "假面骑士圣刃续集";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "假面骑士圣刃",
      original_name: "",
      season: "其他",
      episode: "续集",
    });
  });
  test("[公众号：SS的笔记/腹肌崩坏太郎番外/星空][假面骑士01 番外][奇迹的身份改变！？或人VS腹肌崩坏太郎 宿命的段子对决].mp4", () => {
    const name =
      "[公众号：SS的笔记/腹肌崩坏太郎番外/星空][假面骑士01 番外][奇迹的身份改变！？或人VS腹肌崩坏太郎 宿命的段子对决].mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "其他",
      episode: "番外01",
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
  test("妖精森林的小不点 NCED01.mkv", () => {
    const name = "妖精森林的小不点 NCED01.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "妖精森林的小不点",
      original_name: "",
      season: "其他",
      episode: "NCED01",
    });
  });
  test("[VCB-Studio] Ushio to Tora [CM05][Ma10p_1080p][x265_flac].mkv", () => {
    const name = "[VCB-Studio] Ushio to Tora [CM05][Ma10p_1080p][x265_flac].mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Ushio.to.Tora",
      season: "其他",
      episode: "CM05",
    });
  });
  test("[1080P][DBD制作组&离谱Sub][龙珠GT][NCOP2][HEVC-10bit][AC3].mkv", () => {
    const name = "[1080P][DBD制作组&离谱Sub][龙珠GT][NCOP2][HEVC-10bit][AC3].mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "龙珠GT",
      original_name: "",
      season: "其他",
      episode: "NCOP2",
    });
  });
  test("[DAY][仮面戦隊ゴライダー][PR1][BDrip][1080P][X264 FLAC].mkv", () => {
    const name = "[DAY][仮面戦隊ゴライダー][PR1][BDrip][1080P][X264 FLAC].mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "仮面戦隊ゴライダー",
      original_name: "",
      season: "其他",
      episode: "PR1",
    });
  });
  test("斗破苍穹特别篇2[4K].mp4", () => {
    const name = "斗破苍穹特别篇2[4K].mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "斗破苍穹",
      original_name: "",
      season: "其他",
      episode: "特别篇2",
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
  test("番外2-杀人事件.mp4", () => {
    const name = "番外2-杀人事件.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "其他",
      episode: "番外2",
    });
  });
  /** 花絮 */
  test("花絮13 王蝉动捕演员刘珂君助力凡人修仙传特别篇.mp4", () => {
    const name = "花絮13 王蝉动捕演员刘珂君助力凡人修仙传特别篇.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "其他",
      episode: "花絮13",
    });
  });
  test("显微镜下的大明之丝绢案-预告1", () => {
    const name = "显微镜下的大明之丝绢案-预告1";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "显微镜下的大明之丝绢案",
      original_name: "",
      season: "其他",
      episode: "预告1",
    });
  });
  /** 彩蛋 */
  test("彩蛋1：腹肌胸肌肱二头肌！路哥这完美身材我爱了！.mp4", () => {
    const name = "彩蛋1：腹肌胸肌肱二头肌！路哥这完美身材我爱了！.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "其他",
      episode: "彩蛋1",
    });
  });
  test("去有风的地方_彩蛋_1080P_Tacit0924.mp4", () => {
    const name = "去有风的地方_彩蛋_1080P_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "去有风的地方",
      original_name: "",
      season: "其他",
      episode: "彩蛋01",
    });
  });
  test("今生也是第一次_彩蛋.mp4", () => {
    const name = "今生也是第一次_彩蛋.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "今生也是第一次",
      original_name: "",
      season: "其他",
      episode: "彩蛋01",
    });
  });
  test("彩蛋.mp4", () => {
    const name = "彩蛋.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "其他",
      episode: "彩蛋01",
    });
  });
  test("无间 彩蛋3 1080P(高清SDR)(1080344)_Tacit0924.mp4", () => {
    const name = "无间 彩蛋3 1080P(高清SDR)(1080344)_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "无间",
      original_name: "",
      season: "其他",
      episode: "彩蛋3",
    });
  });
  test("番外篇.mp4", () => {
    const name = "番外篇.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("0617彩蛋第1期_Tacit0924.mp4", () => {
    const name = "0617彩蛋第1期_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "其他",
      episode: "彩蛋01",
    });
  });
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
});
