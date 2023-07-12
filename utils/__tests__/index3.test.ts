/**
 * 动漫
 */
import { describe, expect, test } from "vitest";

import { parse_filename_for_video } from "../index";

describe("动漫", () => {
  test("灌篮高手.1080P.国粤日三语.软字幕.AVC.默认国语音频.100.mkv", () => {
    const name = "灌篮高手.1080P.国粤日三语.软字幕.AVC.默认国语音频.100.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "灌篮高手",
      original_name: "",
      season: "",
      episode: "E100",
      episode_name: "",
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
      episode_name: "",
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
      episode_name: "",
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
      episode_name: "酒玖师叔与李长寿生情？齐源渡劫竟出现乌龙事件！",
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
      episode_name: "光能使者",
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
      episode_name: "",
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
      episode_name: "",
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
      episode_name: "数码宝贝大冒险（日国粤）",
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
      episode_name: "",
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
      episode_name: "",
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
      episode_name: "",
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
      episode_name: "OPUS.ASSx2",
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
      episode_name: "祭天大典",
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
      episode_name: "",
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
      episode_name: "",
    });
  });
});
