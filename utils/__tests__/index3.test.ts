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
  test("三国演义01.桃园三结义.mkv", () => {
    const name = "三国演义01.桃园三结义.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "三国演义",
      original_name: "",
      season: "",
      episode: "E01",
    });
  });
  test("(1)送给你不幸.rmvb", () => {
    const name = "(1)送给你不幸.rmvb";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "E01",
    });
  });
  test("第10-11话 大器、成为骑士！ Xros Heart 、燃烧！.mkv", () => {
    const name = "第10-11话 大器、成为骑士！ Xros Heart 、燃烧！.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "E10-11",
    });
  });
  test("[ANi] 暴食狂戰士 - 01 [1080P][Baha][WEB-DL][AAC AVC][CHT].mp4", () => {
    const name = "[ANi] 暴食狂戰士 - 01 [1080P][Baha][WEB-DL][AAC AVC][CHT].mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "暴食狂戰士",
      original_name: "",
      season: "",
      episode: "E01",
    });
  });
  test("[ANi] 哥布林殺手 II - 01 [1080P][Baha][WEB-DL][AAC AVC][CHT].mp4", () => {
    const name = "[ANi] 哥布林殺手 II - 01 [1080P][Baha][WEB-DL][AAC AVC][CHT].mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "哥布林殺手",
      original_name: "",
      season: "S02",
      episode: "E01",
    });
  });
  test("[PRL][Qins_Moon_SE2][04][DVDRip][AVC_AC3][56805CCF].mkv", () => {
    const name = "[PRL][Qins_Moon_SE2][04][DVDRip][AVC_AC3][56805CCF].mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Qins.Moon",
      season: "S02",
      episode: "E04",
    });
  });
  test("秦时明月.S03.[34][DVDRip][AVC_AC3][05B5AE84].mkv", () => {
    const name = "秦时明月.S03.[34][DVDRip][AVC_AC3][05B5AE84].mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "秦时明月",
      original_name: "",
      season: "S03",
      episode: "E34",
    });
  });
});
