/**
 * @file 综艺
 */
import { describe, expect, test } from "vitest";

import { parse_filename_for_video } from "../parse_filename_for_video";

describe("提取综艺信息", () => {
  test("1020期 第1期.mp4", () => {
    const name = "1020期 第1期.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "1020",
    });
  });
  test("0731入住日记第9期.mp4", () => {
    const name = "0731入住日记第9期.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "0731",
    });
  });
  test("20161029.mp4", () => {
    const name = "20161029.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "20161029",
    });
  });
  test("01-20.mp4", () => {
    const name = "01-20.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "0120",
    });
  });
  test("第1期.mp4", () => {
    const name = "第1期.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "E01",
    });
  });
  test("05.05期.mp4", () => {
    const name = "05.05期.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "0505",
    });
  });
  test("Trump.Card.season.V.20200508.EP12.HD1080P.X264.AAC.Mandarin.CHS.BDE4.mp4", () => {
    const name = "Trump.Card.season.V.20200508.EP12.HD1080P.X264.AAC.Mandarin.CHS.BDE4.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Trump.Card",
      season: "S05",
      episode: "E12",
    });
  });
  test("2021.04.16期.mp4", () => {
    const name = "2021.04.16期.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "20210416",
    });
  });
  test("第12期会员版 贾玲不舍.mp4", () => {
    const name = "第12期会员版 贾玲不舍.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "E12",
    });
  });
  test("20231020期_Tacit0924.mp4", () => {
    const name = "20231020期_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "20231020",
    });
  });
  test("令人心动的offer第10期.mp4", () => {
    const name = "令人心动的offer第10期.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "令人心动的offer",
      original_name: "",
      season: "",
      episode: "E10",
    });
  });
  test("第9期上：医学生花式宣讲，冯岑在线卖唱.mp4", () => {
    const name = "第9期上：医学生花式宣讲，冯岑在线卖唱.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "E09@上",
    });
  });
  test("第9期下：医学生花式宣讲，冯岑在线卖唱.mp4", () => {
    const name = "第9期下：医学生花式宣讲，冯岑在线卖唱.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "E09@下",
    });
  });
  test("0926第4局.mp4", () => {
    const name = "0926第4局.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "0926",
    });
  });
  test("04期-下.mp4", () => {
    const name = "04期-下.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "E04@下",
    });
  });
  test("10.04期-下.mp4", () => {
    const name = "10.04期-下.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "1004@下",
    });
  });
  test("MULTISUB【了不起！舞社 Great Dance Crew】EP01上 - 搞笑女制霸舞社 苏有朋太难 - 苏有朋_王霏霏_程潇_李永钦TEN_赞多 - 优酷综艺 YOUKU SHOW.mp4", () => {
    const name =
      "MULTISUB【了不起！舞社 Great Dance Crew】EP01上 - 搞笑女制霸舞社 苏有朋太难 - 苏有朋_王霏霏_程潇_李永钦TEN_赞多 - 优酷综艺 YOUKU SHOW.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "E01@上",
    });
  });
  test("第10期 下:冠军票数惊人", () => {
    const name = "第10期 下:冠军票数惊人";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "E10@下",
    });
  });
  test("20230909第5期纯享_Tacit0924.mp4", () => {
    const name = "20230909第5期纯享_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "20230909",
    });
  });
  test("12期.mp4", () => {
    const name = "12期.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "E12",
    });
  });
  test("04期 - 上.mp4", () => {
    const name = "04期 - 上.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "E04@上",
    });
  });
  test("第14期下 半决赛五条人新歌首唱 新裤子开场舞魂爆发", () => {
    const name = "第14期下 半决赛五条人新歌首唱 新裤子开场舞魂爆发";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "E14@下",
    });
  });
  test("20200729上 张雨绮笑聊离婚 _Tacit0924 .mp4", () => {
    const name = "20200729上 张雨绮笑聊离婚 _Tacit0924 .mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "20200729@上",
    });
  });
  test("20190922徐峥吐槽黄渤爆笑模仿沈腾 _Tacit0924 .mp4", () => {
    const name = "20190922徐峥吐槽黄渤爆笑模仿沈腾 _Tacit0924 .mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "20190922",
    });
  });
  test("20221216-第2期加更_Tacit0924.mp4", () => {
    const name = "20221216-第2期加更_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "其他",
      episode: "加更2",
    });
  });
  test("20200812 黄圣依回应被骂：对不起 _Tacit0924 .mp4", () => {
    const name = "20200812 黄圣依回应被骂：对不起 _Tacit0924 .mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "20200812",
    });
  });
  test("1006第6期加更_Tacit0924.mp4", () => {
    const name = "1006第6期加更_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "其他",
      episode: "加更6",
    });
  });
  test("20190728Ella回应生产后遗症 _Tacit0924 .mp4", () => {
    const name = "20190728Ella回应生产后遗症 _Tacit0924 .mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "20190728",
    });
  });
  test("0831第1期下_Tacit0924 .mp4", () => {
    const name = "0831第1期下_Tacit0924 .mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "0831",
    });
  });
  test("1116-第10期下_Tacit0924.mp4", () => {
    const name = "1116-第10期下_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "1116",
    });
  });
  test("20210811 第1期下：黄西炸场，建国博洋惊喜组合 _Tacit0924 .mp4", () => {
    const name = "20210811 第1期下：黄西炸场，建国博洋惊喜组合 _Tacit0924 .mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "20210811",
    });
  });
  test("20211013 第10期下：冠军诞生！大张伟王勉再合作 _Tacit0924 .mp4", () => {
    const name = "20211013 第10期下：冠军诞生！大张伟王勉再合作 _Tacit0924 .mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "20211013",
    });
  });
  test("第5期 (下)：周奇墨聊前任，童漠男遭反向催婚.mp4", () => {
    const name = "第5期 (下)：周奇墨聊前任，童漠男遭反向催婚";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "E05@下",
    });
  });
  test("集结篇：思文惊喜回归引全场沸腾_Tacit0924.mp4", () => {
    const name = "集结篇：思文惊喜回归引全场沸腾_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "其他",
      episode: "集结篇：思文惊喜回归引全场沸腾",
    });
  });
  test("0910第1期加更_Tacit0924.mp4", () => {
    const name = "0910第1期加更_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "其他",
      episode: "加更1",
    });
  });
  test("20230503第3期加更：极挑男团夺金大战各出奇招_Tacit0924.mp4", () => {
    const name = "20230503第3期加更：极挑男团夺金大战各出奇招_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "其他",
      episode: "加更3",
    });
  });
  test("第1期上_Tacit0924.mp4", () => {
    const name = "第1期上_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "E01@上",
    });
  });
  test("集结篇：脱4六强选手不断遭挑战_Tacit0924.mp4", () => {
    const name = "集结篇：脱4六强选手不断遭挑战_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "其他",
      episode: "集结篇：脱4六强选手不断遭挑战",
    });
  });
  test("第1期上：那英周迅加盟！53组演员激烈突围", () => {
    const name = "第1期上：那英周迅加盟！53组演员激烈突围";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "E01@上",
    });
  });

  test("20230729加更版第2期_Tacit0924.mp4", () => {
    const name = "20230729加更版第2期_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "其他",
      episode: "加更2",
    });
  });
  test("20230722加更版_Tacit0924.mp4", () => {
    const name = "20230722加更版_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "其他",
      episode: "加更1",
    });
  });
  test("20230730-独家直拍第1期_Tacit0924.mp4", () => {
    const name = "20230730-独家直拍第1期_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "其他",
      episode: "独家直拍1",
    });
  });
  test("20231024先导片_Tacit0924.mp4", () => {
    const name = "20231024先导片_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "其他",
      episode: "先导片",
    });
  });
  test("20231026-超前营业第1期_Tacit0924.mp4", () => {
    const name = "20231026-超前营业第1期_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "其他",
      episode: "超前营业1",
    });
  });
  test("花儿与少年第一季20140606期：花儿们抵达马德里_Tacit0924.mp4", () => {
    const name = "花儿与少年第一季20140606期：花儿们抵达马德里_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "花儿与少年",
      original_name: "",
      season: "S01",
      episode: "20140606",
    });
  });
  test("20150704.EP11_Tacit0924.mkv", () => {
    const name = "20150704.EP11_Tacit0924.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "E11",
    });
  });
  test("170709-花儿与少年_Tacit0924.mp4", () => {
    const name = "170709-花儿与少年_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "170709",
    });
  });
});
