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
      episode: "第9期上",
    });
  });
  test("第9期下：医学生花式宣讲，冯岑在线卖唱.mp4", () => {
    const name = "第9期下：医学生花式宣讲，冯岑在线卖唱.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "第9期下",
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
      episode: "第4期下",
    });
  });
  test("10.04期-下.mp4", () => {
    const name = "10.04期-下.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "1004下",
    });
  });
  test("MULTISUB【了不起！舞社 Great Dance Crew】EP01上 - 搞笑女制霸舞社 苏有朋太难 - 苏有朋_王霏霏_程潇_李永钦TEN_赞多 - 优酷综艺 YOUKU SHOW.mp4", () => {
    const name =
      "MULTISUB【了不起！舞社 Great Dance Crew】EP01上 - 搞笑女制霸舞社 苏有朋太难 - 苏有朋_王霏霏_程潇_李永钦TEN_赞多 - 优酷综艺 YOUKU SHOW.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "MULTISUB.了不起！舞社",
      original_name: "Great.Dance.Crew",
      season: "",
      episode: "第1期上",
    });
  });
  test("第10期 下:冠军票数惊人", () => {
    const name = "第10期 下:冠军票数惊人";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "第10期下",
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
      episode: "第4期上",
    });
  });
  test("第14期下 半决赛五条人新歌首唱 新裤子开场舞魂爆发", () => {
    const name = "第14期下 半决赛五条人新歌首唱 新裤子开场舞魂爆发";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "第14期下",
    });
  });
  test("20200729上 张雨绮笑聊离婚 _Tacit0924 .mp4", () => {
    const name = "20200729上 张雨绮笑聊离婚 _Tacit0924 .mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "20200729上",
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
      season: "",
      episode: "20221216",
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
      season: "",
      episode: "1006",
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
      episode: "第5期下",
    });
  });
  test("集结篇：思文惊喜回归引全场沸腾_Tacit0924.mp4", () => {
    const name = "集结篇：思文惊喜回归引全场沸腾_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "集结篇：思文惊喜回归引全场沸腾",
    });
  });
  test("0910第1期加更_Tacit0924.mp4", () => {
    const name = "0910第1期加更_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "0910",
    });
  });
  test("20230503第3期加更：极挑男团夺金大战各出奇招_Tacit0924.mp4", () => {
    const name = "20230503第3期加更：极挑男团夺金大战各出奇招_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "20230503",
    });
  });
  test("第1期上_Tacit0924.mp4", () => {
    const name = "第1期上_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "第1期上",
    });
  });
  test("集结篇：脱4六强选手不断遭挑战_Tacit0924.mp4", () => {
    const name = "集结篇：脱4六强选手不断遭挑战_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
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
      episode: "第1期上",
    });
  });

  test("20230729加更版第2期_Tacit0924.mp4", () => {
    const name = "20230729加更版第2期_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "20230729",
    });
  });
  test("20230722加更版_Tacit0924.mp4", () => {
    const name = "20230722加更版_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "20230722",
    });
  });
  test("20230730-独家直拍第1期_Tacit0924.mp4", () => {
    const name = "20230730-独家直拍第1期_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "20230730",
    });
  });
  test("20231024先导片_Tacit0924.mp4", () => {
    const name = "20231024先导片_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "20231024",
    });
  });
  test("20231026-超前营业第1期_Tacit0924.mp4", () => {
    const name = "20231026-超前营业第1期_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "20231026",
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
  test("0806.2022中国好声音 第1期：刘德华和四导师隔空合唱_Tacit0924.mp4", () => {
    const name = "0806.2022中国好声音 第1期：刘德华和四导师隔空合唱_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "20220806",
    });
  });
  test("中国好声音.第四季.The.Voice.Of.China.S04.20150927.HD720P.X264.AAC.CHS.Mp4Ba.mp4", () => {
    const name = "中国好声音.第四季.The.Voice.Of.China.S04.20150927.HD720P.X264.AAC.CHS.Mp4Ba.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "中国好声音",
      original_name: "The.Voice.Of.China",
      season: "S04",
      episode: "20150927",
    });
  });
  test("Sing.China.S02SP07.20171008.HD1080P.X264.AAC.CHS.MF.mp4", () => {
    const name = "Sing.China.S02SP07.20171008.HD1080P.X264.AAC.CHS.MF.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "Sing.China",
      season: "S02",
      episode: "SP07",
    });
  });
  test("第07.22期.The.Voice.of.China.2018.1080P.WEB-DL.X264.AAC.mp4", () => {
    const name = "第07.22期.The.Voice.of.China.2018.1080P.WEB-DL.X264.AAC.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "The.Voice.of.China",
      season: "",
      episode: "0722",
    });
  });
  test("JSTV_最强大脑_2022-02-25_720p.mp4", () => {
    const name = "JSTV_最强大脑_2022-02-25_720p.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "最强大脑",
      original_name: "",
      season: "",
      episode: "20220225",
    });
  });
  test("最强大脑20190426.mp4", () => {
    const name = "最强大脑20190426.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "最强大脑",
      original_name: "",
      season: "",
      episode: "20190426",
    });
  });
  test("最强大脑第八季全集.The.Brain.2021.S08E09.1080P.WEB-DL.H264.AAC.115WiKi.mp4", () => {
    const name = "最强大脑第八季全集.The.Brain.2021.S08E09.1080P.WEB-DL.H264.AAC.115WiKi.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "最强大脑",
      original_name: "The.Brain",
      season: "S08",
      episode: "E09",
    });
  });
  test("江苏卫视《最强大脑·第三季》（全十三集）.2016.第03集.HD720P.国语中字.mkv", () => {
    const name = "江苏卫视《最强大脑·第三季》（全十三集）.2016.第03集.HD720P.国语中字.mkv";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "最强大脑",
      original_name: "",
      season: "S03",
      episode: "E03",
    });
  });
  // 向往的生活
  test("1120直拍第6期_Tacit0924.mp4", () => {
    const name = "1120直拍第6期_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "1120",
    });
  });
  test("1119Plus第12期_Tacit0924.mp4", () => {
    const name = "1119Plus第12期_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "1119",
    });
  });
  test("0917Plus+第6期_Tacit0924.mp4", () => {
    const name = "0917Plus+第6期_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "0917",
    });
  });
  test("20230929-特别企划_Tacit0924.mp4", () => {
    const name = "20230929-特别企划_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "20230929",
    });
  });
  test("中国诗词大会 第三季 20180325 第三场.mp4", () => {
    const name = "中国诗词大会 第三季 20180325 第三场.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "中国诗词大会",
      original_name: "",
      season: "S03",
      episode: "E03",
    });
  });
  test("20230507慢直播第2期：陈赫做菜大翻车_Tacit0924.mp4", () => {
    const name = "20230507慢直播第2期：陈赫做菜大翻车_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "20230507",
    });
  });
  test("第20210122期 孟美岐钢琴弹唱首秀.ts", () => {
    const name = "第20210122期 孟美岐钢琴弹唱首秀.ts";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "20210122",
    });
  });
  test("先导片：杨迪庞博被困待解救.mp4", () => {
    const name = "先导片：杨迪庞博被困待解救.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "先导片：杨迪庞博被困待解救",
    });
  });
  test("06期：校车花絮大放送.mp4", () => {
    const name = "06期：校车花絮大放送.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "E06",
    });
  });
  test("20230322第14期：收官特别彩蛋！南波万reaction复盘大会集体笑翻_Tacit0924.mp4", () => {
    const name = "20230322第14期：收官特别彩蛋！南波万reaction复盘大会集体笑翻_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "20230322",
    });
  });
  test("20230302学院普拉斯第12期：学长们玩五亩棋与六子棋的趣事+齐思钧蒲熠星挑战狐狸先生_Tacit0924.mp4", () => {
    const name = "20230302学院普拉斯第12期：学长们玩五亩棋与六子棋的趣事+齐思钧蒲熠星挑战狐狸先生_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "20230302",
    });
  });
  test("20230207学院小屋日记第9期：蒲熠星唐九洲再现校园名场面+周峻纬惊喜回归超有梗_Tacit0924.mp4", () => {
    const name = "20230207学院小屋日记第9期：蒲熠星唐九洲再现校园名场面+周峻纬惊喜回归超有梗_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "20230207",
    });
  });
  test("1006加更第2期_Tacit0924.mp4", () => {
    const name = "1006加更第2期_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "1006",
    });
  });
  test("奔跑吧黄河篇 - S01E06 - WEB1080P.20210110.新年派对.加长版.mp4", () => {
    const name = "奔跑吧黄河篇 - S01E06 - WEB1080P.20210110.新年派对.加长版.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "奔跑吧黄河篇",
      original_name: "",
      season: "S01",
      episode: "E06",
    });
  });
  test("0825彩蛋第11期_Tacit0924.mp4", () => {
    const name = "0825彩蛋第11期_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "0825",
    });
  });
  test("典籍里的中国 第二季_第一期-永乐大典.mp4", () => {
    const name = "典籍里的中国 第二季_第一期-永乐大典.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "典籍里的中国",
      original_name: "",
      season: "S02",
      episode: "E01",
    });
  });
  test("超前企划：吴昕“套路”学长团.mp4", () => {
    const name = "超前企划：吴昕“套路”学长团.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "超前企划",
    });
  });
  test("奇葩说第五季20180922.mp4", () => {
    const name = "奇葩说第五季20180922.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "奇葩说",
      original_name: "",
      season: "S05",
      episode: "20180922",
    });
  });
  test("中国好声音.第四季.The.Voice.Of.China.S04.20150807.HD720P.X264.AAC.CHS.Mp4Ba.mp4", () => {
    const name = "中国好声音.第四季.The.Voice.Of.China.S04.20150807.HD720P.X264.AAC.CHS.Mp4Ba.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "中国好声音",
      original_name: "The.Voice.Of.China",
      season: "S04",
      episode: "20150807",
    });
  });
  test("20220430第1期plus版_Tacit0924.mp4", () => {
    const name = "20220430第1期plus版_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "20220430",
    });
  });
  test("第二季_第2期：许知远对话诺兰 十三邀第二期：许知远对话诺兰 超清(720P)(1206027).mp4", () => {
    const name = "第二季_第2期：许知远对话诺兰 十三邀第二期：许知远对话诺兰 超清(720P)(1206027).mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "许知远对话诺兰",
      original_name: "",
      season: "S02",
      episode: "E02",
    });
  });
  test("20201120期.mp4", () => {
    const name = "20201120期.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "20201120",
    });
  });
  test("20171027MC热狗爆笑脱口秀 _Tacit0924 .mp4", () => {
    const name = "20171027MC热狗爆笑脱口秀 _Tacit0924 .mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "20171027",
    });
  });
  test("最强大脑20190301.mp4", () => {
    const name = "最强大脑20190301.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "最强大脑",
      original_name: "",
      season: "",
      episode: "20190301",
    });
  });
  test("奇葩说第五季20181005.mp4", () => {
    const name = "奇葩说第五季20181005.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "奇葩说",
      original_name: "",
      season: "S05",
      episode: "20181005",
    });
  });
  test("预告_Tacit0924.mp4", () => {
    const name = "预告_Tacit0924.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "预告01",
    });
  });
  test("第20210319期 THE9安崎上官喜爱“神仙姐妹”潇洒炸场，音乐合伙人上演大型抢人现场.ts", () => {
    const name = "第20210319期 THE9安崎上官喜爱“神仙姐妹”潇洒炸场，音乐合伙人上演大型抢人现场.ts";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "20210319",
    });
  });
  test("2022年01月29期.mp4", () => {
    const name = "2022年01月29期.mp4";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "20220129",
    });
  });
  test("1120.PDvlog.第3期：吴千语结婚大计.mp4", () => {
    const name = "1120.PDvlog.第3期：吴千语结婚大计.mp4;";
    const result = parse_filename_for_video(name);
    expect(result).toStrictEqual({
      name: "",
      original_name: "",
      season: "",
      episode: "1120",
    });
  });
  // test("慢直播第01期 _Tacit0924.mp4", () => {
  //   const name = "慢直播第01期 _Tacit0924.mp4";
  //   const result = parse_filename_for_video(name);
  //   expect(result).toStrictEqual({
  //     name: "慢直播",
  //     original_name: "",
  //     season: "",
  //     episode: "E01",
  //   });
  // });
  // test("20231015.独家直拍_Tacit0924.mp4", () => {
  //   const name = "20231015.独家直拍_Tacit0924.mp4";
  //   const result = parse_filename_for_video(name);
  //   expect(result).toStrictEqual({
  //     name: "奇葩说",
  //     original_name: "",
  //     season: "S05",
  //     episode: "20181005",
  //   });
  // });
  // test("07.31加更_Tacit0924.mp4", () => {
  //   const name = "07.31加更_Tacit0924.mp4";
  //   const result = parse_filename_for_video(name);
  //   expect(result).toStrictEqual({
  //     name: "",
  //     original_name: "",
  //     season: "",
  //     episode: "0731",
  //   });
  // });
  // test("《早餐中国3》云林北港·煎盘粿.mkv", () => {
  //   const name = "《早餐中国3》云林北港·煎盘粿.mkv";
  //   const result = parse_filename_for_video(name);
  //   expect(result).toStrictEqual({
  //     name: "早餐中国",
  //     original_name: "",
  //     season: "",
  //     episode: "",
  //   });
  // });
});
