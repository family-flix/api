/**
 * 外文电视剧
 */
import { describe, expect, test } from "vitest";

import { extra_season_and_episode, is_season, parse_filename_for_video } from "../index";

describe("提取视频信息", () => {
  test("Modern.Family", () => {
    const name = "Modern.Family";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Modern.Family",
      season: "",
      episode: "",
      episode_name: "",
    });
  });
  test("2.Broke.Girls", () => {
    const name = "2.Broke.Girls";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "2.Broke.Girls",
      season: "",
      episode: "",
      episode_name: "",
    });
  });
  test("Modern.Family.S01", () => {
    const name = "Modern.Family.S01";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Modern.Family",
      season: "S01",
      episode: "",
      episode_name: "",
    });
  });
  test("Modern.Family.S01.1080p", () => {
    const name = "Modern.Family.S01.1080p";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Modern.Family",
      season: "S01",
      episode: "",
      episode_name: "",
    });
  });
  test("Modern.Family.2009.S01.1080p", () => {
    const name = "Modern.Family.2009.S01.1080p";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Modern.Family",
      season: "S01",
      episode: "",
      episode_name: "",
    });
  });
  test("[摩登家庭].Modern.Family.2009.S01.1080p", () => {
    const name = "[摩登家庭].Modern.Family.2009.S01.1080p";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "摩登家庭",
      original_name: "Modern.Family",
      season: "S01",
      episode: "",
      episode_name: "",
    });
  });
  test("[摩登家庭].Modern.Family.2009.第十季.1080p", () => {
    const name = "[摩登家庭].Modern.Family.2009.第十季.1080p";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "摩登家庭",
      original_name: "Modern.Family",
      season: "S10",
      episode: "",
      episode_name: "",
    });
  });
  test("Futurama.S07E22.Leela.and.the.Genestalk.1080p.Blu-ray.DD5.1.x264-CtrlHD", () => {
    const name = "Futurama.S07E22.Leela.and.the.Genestalk.1080p.Blu-ray.DD5.1.x264-CtrlHD";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Futurama",
      season: "S07",
      episode: "E22",
      episode_name: "Leela.and.the.Genestalk",
    });
  });
  test("The.Tudors.S04E07.1080p.Blu-ray.x265.10bit.AC3￡cXcY@FRDS", () => {
    const name = "The.Tudors.S04E07.1080p.Blu-ray.x265.10bit.AC3￡cXcY@FRDS";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "The.Tudors",
      season: "S04",
      episode: "E07",
      episode_name: "",
    });
  });
  test("Anne.with.an.E.S03E09.1080p.BluRay.x264", () => {
    const name = "Anne.with.an.E.S03E09.1080p.BluRay.x264";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Anne.with.an.E",
      season: "S03",
      episode: "E09",
      episode_name: "",
    });
  });
  test("Desperate Housewives S06E21 1080p WEB-DL DD+ 5.1 x264-TrollHD", () => {
    const name = "Desperate Housewives S06E21 1080p WEB-DL DD+ 5.1 x264-TrollHD";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Desperate.Housewives",
      season: "S06",
      episode: "E21",
      episode_name: "",
    });
  });

  test("Young.Sheldon.S01E22.1080p.Blu-Ray.AC3.x265.10bit-Yumi@FRDS.mkv", () => {
    const name = "Young.Sheldon.S01E22.1080p.Blu-Ray.AC3.x265.10bit-Yumi@FRDS.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Young.Sheldon",
      season: "S01",
      episode: "E22",
      episode_name: "",
    });
  });
  test("S01E07 - A No-Rough-Stuff-Type Deal", () => {
    const name = "S01E07 - A No-Rough-Stuff-Type Deal";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "S01",
      episode: "E07",
      episode_name: "A.No-Rough-Stuff-Type.Deal",
    });
  });
  test("老友记.S01E24.瑞秋知道了", () => {
    const name = "老友记.S01E24.瑞秋知道了";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "老友记",
      original_name: "",
      season: "S01",
      episode: "E24",
      episode_name: "瑞秋知道了",
    });
  });
  test("The.Sopranos.S01E13.1999.1080P.Blu-ray.x265.AC3.cXcY@FRDS.mkv", () => {
    const name = "The.Sopranos.S01E13.1999.1080P.Blu-ray.x265.AC3.￡cXcY@FRDS.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "The.Sopranos",
      season: "S01",
      episode: "E13",
      episode_name: "",
    });
  });
  test("Futurama.S07E01.The.Bots.and.the.Bees.1080p.BluRay.DD5.1.x264-CtrlHD.mkv", () => {
    const name = "Futurama.S07E01.The.Bots.and.the.Bees.1080p.BluRay.DD5.1.x264-CtrlHD.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Futurama",
      season: "S07",
      episode: "E01",
      episode_name: "The.Bots.and.the.Bees",
    });
  });
  test("Futurama.S07E14.2-D.Blacktop.1080p.Blu-ray.DD5.1.x264-CtrlHD.mkv", () => {
    const name = "Futurama.S07E14.2-D.Blacktop.1080p.Blu-ray.DD5.1.x264-CtrlHD.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Futurama",
      season: "S07",
      episode: "E14",
      episode_name: "2-D.Blacktop",
    });
  });
  test("Futurama.S07E15.Fry.and.Leela's.Big.Fling.1080p.Blu-ray.DD5.1.x264-CtrlHD.mkv", () => {
    const name = "Futurama.S07E15.Fry.and.Leela's.Big.Fling.1080p.Blu-ray.DD5.1.x264-CtrlHD.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Futurama",
      season: "S07",
      episode: "E15",
      episode_name: "Fry.and.Leela's.Big.Fling",
    });
  });
  test("The.Boys.S03E04.Glorious.Five.Year.Plan.1080p.AMZN.WEB-DL.DDP5.1.H.264-NTb.mkv", () => {
    const name = "The.Boys.S03E04.Glorious.Five.Year.Plan.1080p.AMZN.WEB-DL.DDP5.1.H.264-NTb.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "The.Boys",
      season: "S03",
      episode: "E04",
      episode_name: "Glorious.Five.Year.Plan",
    });
  });
  test("老友记.S03E04.赌城行（上）.mkv", () => {
    const name = "老友记.S03E04.赌城行（上）.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "老友记",
      original_name: "",
      season: "S03",
      episode: "E04",
      episode_name: "赌城行（上）",
    });
  });
  test("Rick and Morty - 302 - Rickmancing the Stone.mkv", () => {
    const name = "Rick and Morty - 302 - Rickmancing the Stone.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Rick.and.Morty",
      season: "",
      episode: "E302",
      episode_name: "Rickmancing.the.Stone",
    });
  });
  test("Futurama.S02E01.1080p.WEB.h264-NiXON.mkv", () => {
    const name = "Futurama.S02E01.1080p.WEB.h264-NiXON.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Futurama",
      season: "S02",
      episode: "E01",
      episode_name: "",
    });
  });
  test("Ekaterina.2014.S01E02.HDTV.(1080i).MediaClub.mp4", () => {
    const name = "Ekaterina.2014.S01E02.HDTV.(1080i).MediaClub.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Ekaterina",
      season: "S01",
      episode: "E02",
      episode_name: "",
    });
  });
  test("叶卡捷琳娜大帝.Екатерина.Самозванцы (2019).S03E03.mp4", () => {
    const name = "叶卡捷琳娜大帝.Екатерина.Самозванцы (2019).S03E03.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "叶卡捷琳娜大帝",
      original_name: "Екатерина.Самозванцы",
      season: "S03",
      episode: "E03",
      episode_name: "",
    });
  });
  test("The.Queens.Gambit.S01E01.2160p.NF.WEBRip.DDP5.1.x265-NTb.mkv", () => {
    const name = "The.Queens.Gambit.S01E01.2160p.NF.WEBRip.DDP5.1.x265-NTb.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "The.Queens.Gambit",
      season: "S01",
      episode: "E01",
      episode_name: "",
    });
  });
  test("gotham.s01.e01.1080p.bluray.x264-rovers.mkv", () => {
    const name = "gotham.s01.e01.1080p.bluray.x264-rovers.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "gotham",
      season: "S01",
      episode: "E01",
      episode_name: "",
    });
  });
  test("Gotham.S02E02.1080p.BluRay.x264-SHORTBREHD.mkv", () => {
    const name = "Gotham.S02E02.1080p.BluRay.x264-SHORTBREHD.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Gotham",
      season: "S02",
      episode: "E02",
      episode_name: "",
    });
  });
  test("The.Originals.S03E01.中英字幕.WEB-HR.AAC.1024X576.x264.mp4", () => {
    const name = "The.Originals.S03E01.中英字幕.WEB-HR.AAC.1024X576.x264.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "The.Originals",
      season: "S03",
      episode: "E01",
      episode_name: "",
    });
  });
  test("Grey's.Anatomy.S01E01.A.Hard.Day's.Night.h.264-TjHD.mkv", () => {
    const name = "Grey's.Anatomy.S01E01.A.Hard.Day's.Night.h.264-TjHD.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Grey's.Anatomy",
      season: "S01",
      episode: "E01",
      episode_name: "A.Hard.Day's.Night",
    });
  });
  test("Emily.in.Paris.S02E04.Jules.and.Em.1080p.NF.WEB-DL.DDP5.1.HDR.H.265-TEPES.mkv", () => {
    const name = "Emily.in.Paris.S02E04.Jules.and.Em.1080p.NF.WEB-DL.DDP5.1.HDR.H.265-TEPES.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Emily.in.Paris",
      season: "S02",
      episode: "E04",
      episode_name: "Jules.and.Em",
    });
  });
  test("The Walking Dead - S01E06 - WEBDL-1080p h264 EAC3 5.1 - DSNP.mkv", () => {
    const name = "The Walking Dead - S01E06 - WEBDL-1080p h264 EAC3 5.1 - DSNP.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "The.Walking.Dead",
      season: "S01",
      episode: "E06",
      episode_name: "",
    });
  });
  test("Bones.S04E07.WEB-DL.1080p.RusDub.Eng.SubEngSDH.mkv", () => {
    const name = "Bones.S04E07.WEB-DL.1080p.RusDub.Eng.SubEngSDH.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Bones",
      season: "S04",
      episode: "E07",
      episode_name: "",
    });
  });
  test("Bones.S10E06.The.Lost.Love.in.the.Foreign.Land.1080p.AMZN.WEB-DL.DD+5.1.H.265-SiGMA.mkv", () => {
    const name = "Bones.S10E06.The.Lost.Love.in.the.Foreign.Land.1080p.AMZN.WEB-DL.DD+5.1.H.265-SiGMA.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Bones",
      season: "S10",
      episode: "E06",
      episode_name: "The.Lost.Love.in.the.Foreign.Land",
    });
  });
  test("Friends.S10E17E18.2003.1080p.Blu-ray.x265.AC3￡cXcY@FRDS.mkv", () => {
    const name = "Friends.S10E17E18.2003.1080p.Blu-ray.x265.AC3￡cXcY@FRDS.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Friends",
      season: "S10",
      episode: "E17-18",
      episode_name: "",
    });
  });
  test("月光骑士.1080p.內封官方多語字幕", () => {
    const name = "月光骑士.1080p.內封官方多語字幕";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "月光骑士",
      original_name: "",
      season: "",
      episode: "",
      episode_name: "",
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
      episode_name: "Hit&Run",
    });
  });
  test("S01E04.M.Night.Shaym-Aliens!.mkv", () => {
    const name = "S01E04.M.Night.Shaym-Aliens!.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "S01",
      episode: "E04",
      episode_name: "M.Night.Shaym-Aliens!",
    });
  });
  test("Criminal.Minds.S04E09.52.Pickup.1080p.AMZN.WEB-DL.DDP5.1.x265.10bit-Yumi@FRDS.mkv", () => {
    const name = "Criminal.Minds.S04E09.52.Pickup.1080p.AMZN.WEB-DL.DDP5.1.x265.10bit-Yumi@FRDS.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Criminal.Minds",
      season: "S04",
      episode: "E09",
      episode_name: "52.Pickup",
    });
  });
  test("Gravity.Falls.S01E19.Dreamscaperers.1080p.WEB-DL.DD5.1.H.264-BS666.mkv", () => {
    const name = "Gravity.Falls.S01E19.Dreamscaperers.1080p.WEB-DL.DD5.1.H.264-BS666.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Gravity.Falls",
      season: "S01",
      episode: "E19",
      episode_name: "Dreamscaperers",
    });
  });
  test("实习Y生格L.S17E03.HD1080P.YYeTs.中英双字.霸王龙压制组T-Rex.mp4", () => {
    const name = "实习Y生格L.S17E03.HD1080P.YYeTs.中英双字.霸王龙压制组T-Rex.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "实习Y生格L",
      original_name: "",
      season: "S17",
      episode: "E03",
      episode_name: "霸王龙压制组T-Rex",
    });
  });
  test("[Prof] S02E02 - Mortynight Run.mkv", () => {
    const name = "[Prof] S02E02 - Mortynight Run.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "S02",
      episode: "E02",
      episode_name: "Mortynight.Run",
    });
  });
  test("tvr-greys-S03e02-720p.mkv", () => {
    const name = "tvr-greys-S03e02-720p.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "greys",
      season: "S03",
      episode: "E02",
      episode_name: "",
    });
  });
  test("老友记S02.Friends.1995.1080p.Blu-ray.x265.AC3￡cXcY@FRDS", () => {
    // @todo 由于存在 S02E01.Episode.Name 场景，所以做了判断如果提取到 original_name 在季后面，视为无效
    // 怎么兼容这两种情况呢？
    // 这个还关联到一个问题，怎么将多个「应该是同一 tv」的 tv 合并。如「还珠格格1」和「还珠格格2」就应该同属一个 tv
    // 但现在识别不出来
    // 而且应该在什么时机去识别？
    const name = "老友记S02.Friends.1995.1080p.Blu-ray.x265.AC3￡cXcY@FRDS";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "老友记",
      original_name: "",
      season: "S02",
      episode: "",
      episode_name: "Friends",
    });
  });
  test("Light.The.Night.S02E08.NF.WEB-DL.1080p.H264.DDP5.1.mp4", () => {
    const name = "Light.The.Night.S02E08.NF.WEB-DL.1080p.H264.DDP5.1.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Light.The.Night",
      season: "S02",
      episode: "E08",
      episode_name: "",
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
      episode_name: "",
    });
  });
  test("tvr-greys-S03e25-720p.mkv", () => {
    const name = "tvr-greys-S03e25-720p.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "greys",
      season: "S03",
      episode: "E25",
      episode_name: "",
    });
  });
});
