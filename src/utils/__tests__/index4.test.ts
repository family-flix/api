/**
 * @file 国漫
 */
import { describe, expect, test } from "vitest";

import { parse_filename_for_video } from "../parse_filename_for_video";

describe("电视剧4", () => {
  test("[Tracer][S2E01修正][双语特效1080P][小玩剧字幕组].mp4", () => {
    const name = "[Tracer][S2E01修正][双语特效1080P][小玩剧字幕组].mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "S02",
      episode: "E01",
    });
  });
  test("Unforgettable.S310.mkv", () => {
    // @todo 没有剧集，将 季 认为是序号，拼接在名字后面
    const name = "Unforgettable.S310.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Unforgettable310",
      season: "",
      episode: "",
    });
  });
  test("S01E012：掠夺者.mp4", () => {
    const name = "S01E012：掠夺者.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "S01",
      episode: "E12",
    });
  });
  test("S02E01-红月.mkv", () => {
    const name = "S02E01-红月.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "S02",
      episode: "E01",
    });
  });
  test("the.company.you.keep.s01e04.1080p.web.h264-cakes.chs.eng.mp4", () => {
    const name = "the.company.you.keep.s01e04.1080p.web.h264-cakes.chs.eng.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "the.company.you.keep",
      season: "S01",
      episode: "E04",
    });
  });
  test("风味人间-CCTV", () => {
    const name = "风味人间-CCTV";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "风味人间",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("Planet.Earth.III.E04.Freshwater.2160p.iP.WEB-DL.AAC2.0.HLG.H.265-FLUX.mkv", () => {
    const name = "Planet.Earth.III.E04.Freshwater.2160p.iP.WEB-DL.AAC2.0.HLG.H.265-FLUX.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Planet.Earth",
      season: "S03",
      episode: "E04",
    });
  });
  test("01买或死？ .mp4", () => {
    const name = "01买或死？ .mp4";
    const result = parse_filename_for_video(name);
    // @todo 会有 数字+中文 的名字，比如 007系列
    expect(result).toStrictEqual({
      name: "01买或死",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("2018.妖精森林的小不点.12集全+OVA.1080p", () => {
    const name = "2018.妖精森林的小不点.12集全+OVA.1080p";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "妖精森林的小不点",
      original_name: "",
      // @todo 不应该识别成 OVA
      season: "OVA",
      episode: "",
    });
  });
  test("西行纪前缘篇_动漫_2023_01.mp4", () => {
    const name = "西行纪前缘篇_动漫_2023_01.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "西行纪前缘篇",
      original_name: "",
      season: "",
      episode: "E01",
    });
  });
  test("2018.斗罗大陆.264集全.4K", () => {
    const name = "2018.斗罗大陆.264集全.4K";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "斗罗大陆",
      original_name: "",
      season: "",
      episode: "",
    });
  });
  test("D.P：逃兵追缉令第2季.E01.1080p.WEB-DL.x264.DDP2.0.mkv", () => {
    const name = "D.P：逃兵追缉令第2季.E01.1080p.WEB-DL.x264.DDP2.0.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "D.P：逃兵追缉令",
      original_name: "",
      season: "S02",
      episode: "E01",
    });
  });
  test("[ANi] 狩火之王 第二季 - 01 [1080P][Baha][WEB-DL][AAC AVC][CHT].mp4", () => {
    const name = "[ANi] 狩火之王 第二季 - 01 [1080P][Baha][WEB-DL][AAC AVC][CHT].mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "狩火之王",
      original_name: "",
      season: "S02",
      episode: "E01",
    });
  });
  test("第一神拳.E67.[1080P].mp4", () => {
    const name = "第一神拳.E67.[1080P].mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "第一神拳",
      original_name: "",
      season: "",
      episode: "E67",
    });
  });
  test("Modern.Family.S02E20.1080p.BluRay.x264-7SINS.mkv", () => {
    const name = "Modern.Family.S02E20.1080p.BluRay.x264-7SINS.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Modern.Family",
      season: "S02",
      episode: "E20",
    });
  });
  test("第二季.全20集.韩语官中.含特别篇", () => {
    const name = "第二季.全20集.韩语官中.含特别篇";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "S02",
      episode: "",
    });
  });
  test("迪士尼版 10.mkv", () => {
    const name = "迪士尼版 10.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "E10",
    });
  });
  // test("9-1-1.lone.star.s04e17.1080p.web.h264-cakes.chs.eng.mp4", () => {
  //   const name = "9-1-1.lone.star.s04e17.1080p.web.h264-cakes.chs.eng.mp4";
  //   const result = parse_filename_for_video(name);
  //   expect(result).toStrictEqual({
  //     name: "",
  //     original_name: "1.lone.star",
  //     season: "S04",
  //     episode: "E17",
  //   });
  // });
  test("Romance.Of.A.Twin.Flower.S01SP02.2023.2160p.WEB-DL.H265.AAC-HaresWEB.mp4", () => {
    const name = "Romance.Of.A.Twin.Flower.S01SP02.2023.2160p.WEB-DL.H265.AAC-HaresWEB.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Romance.Of.A.Twin.Flower",
      season: "S01",
      episode: "SP02",
    });
  });
  test("[末路狂花钱].The.Last.Frenzy.2024.2160p.WEB-DL.HEVC.10bit.DTS5.1.6Audios-QHstudIo.mp4", () => {
    const name = "[末路狂花钱].The.Last.Frenzy.2024.2160p.WEB-DL.HEVC.10bit.DTS5.1.6Audios-QHstudIo.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "末路狂花钱",
      original_name: "The.Last.Frenzy",
      season: "",
      episode: "",
    });
  });
  test("D 度华年 (2024) 4K60FPS", () => {
    const name = "D 度华年 (2024) 4K60FPS";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "度华年",
      original_name: "",
      season: "",
      episode: "",
    });
  });
});
