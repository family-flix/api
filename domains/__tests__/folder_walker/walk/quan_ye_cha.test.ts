/**
 * __root/name1/s01/name2.mp4@@错误影片2
 * __root/name1/name1.e01.mp4@@正常4
 * __root/name1/name1.s01.e01.mp4@@正常10
 * @example
 * 犬夜叉
 *  犬夜叉 - 完结篇
 *    犬夜叉 - 完结篇 - 第25话.mp4
 *  犬夜叉 - 合集
 *    151 - 167
 *      犬夜叉 - 本篇 - 第167话.mp4
 *    101 - 150
 *      犬夜叉 - 本篇 - 第150话.mp4
 *    051 - 100
 *      犬夜叉 - 本篇 - 第100话.mp4
 *  犬夜叉 - SP
 *    [犬夜叉][豪華絢爛][05][無休的亂世].mp4
 *  犬夜叉 - OVA
 *    犬夜叉 - OVA.2010-01-29：It’s a Rumic World 犬夜叉～黒い鐵砕牙（黑色的铁碎牙）；1920×1080P.mkv
 *  犬夜叉 剧场版
 *    犬夜叉 - 剧场版.2004-12-23：红莲的蓬莱岛
 *      犬夜叉 - 剧场版.2004-12-23：紅蓮の蓬莱島（红莲的蓬莱岛）；BDrip版；1920X1042P.mkv
 * @result
 */
require("dotenv").config();
import { describe, test, expect, vi, afterEach, beforeEach } from "vitest";

import {
  fetch_files_factory,
  add_parsed_infos_when_walk,
  adding_file_safely,
} from "@/domains/walker/utils";
import { FolderWalker } from "@/domains/walker";
import { Folder } from "@/domains/folder";
import { data, id } from "@/mock/quan_ye_cha";

import { test_store as store } from "../../store";

describe("detect a tv dir", () => {
  const { user_id, drive_id } = {
    user_id: "123",
    drive_id: "123",
  };
  beforeEach(async () => {
    const tables = ["episode", "season", "tv", "folder"];
    for (let i = 0; i < tables.length; i += 1) {
      const table = tables[i];
      await store.operation.clear_dataset(table);
    }
  });
  test("犬夜叉", async () => {
    const detector = new FolderWalker();
    const handle_error = vi.fn((v) => v);
    const handle_warning = vi.fn((v) => v);
    const handle_folder = vi.fn((v) => v);
    const handle_episode = vi.fn((v) => v);
    detector.on_error = (file) => {
      handle_error(file);
    };
    detector.on_warning = (file) => {
      handle_warning(file);
    };
    detector.on_file = async (folder) => {
      handle_folder(folder);
      adding_file_safely(folder, { user_id, drive_id }, store);
      return;
    };
    detector.on_episode = async (task) => {
      handle_episode(task);
      add_parsed_infos_when_walk(task, { user_id, drive_id }, store);
      return;
    };
    const folder = new Folder(id, {
      client: fetch_files_factory({
        tree: data,
      }),
    });
    await folder.profile();
    const resp = await detector.detect(folder);
    /** ---------------------- 开始断言 ------------------ */
    expect(resp.error).toBe(null);
    if (resp.error) {
      return;
    }
    expect(handle_error).toBeCalledTimes(5);
    expect(handle_warning).toBeCalledTimes(27);
    expect(handle_folder).toBeCalledTimes(30);
    expect(handle_episode).toBeCalledTimes(16);
    /** --------- 查看 episode --------- */
    const episodes_resp = await store.find_episodes();
    expect(episodes_resp.error).toBe(null);
    if (episodes_resp.error) {
      return;
    }
    expect(episodes_resp.data.length).toBe(16);
    expect(
      episodes_resp.data.map((e) => {
        const { file_id, file_name, parent_file_id, episode, season } = e;
        return {
          file_id,
          file_name,
          parent_file_id,
          episode,
          season,
        };
      })
    ).toStrictEqual([
      {
        file_id: "640579bd986fe513a3ab4e8b9cc750e836aa2411",
        parent_file_id: "640579bb69b3b6a8365c467b9d71beb45ed7eed4",
        file_name:
          "犬夜叉 - 完结篇 - 第26话：明日へ（ 迈向明日）；1920×1080P.mkv",
        season: "S01",
        episode: "E26",
      },
      {
        file_id: "640579bd9f64cecfe7ca4bdcae6ee1f34a51fdc3",
        file_name:
          "犬夜叉 - 完结篇 - 第25话：届かぬ想い（无法传达的思念）；1920×1080P.mkv",
        parent_file_id: "640579bb69b3b6a8365c467b9d71beb45ed7eed4",
        season: "S01",
        episode: "E25",
      },
      {
        file_id: "640579be00cf81252f424e72864857ee34a5805e",
        file_name:
          "犬夜叉 - 完结篇 - 第24话：奈落 儚き望み（ 奈落 虚幻的愿望）；1920×1080P.mkv",
        parent_file_id: "640579bb69b3b6a8365c467b9d71beb45ed7eed4",
        season: "S01",
        episode: "E24",
      },
      {
        file_id: "640579c96eba9b81e8214a7ea56453ebca97556f",
        file_name:
          "犬夜叉 - 本篇 - 第166-167话：最终话-二人の绊 四魂のかけらを使え！（两人的羁绊 使用四魂碎片吧！-前后篇）；640×480P.mkv",
        parent_file_id: "640579c8da6fee6f91884e468e3e1b713da21b23",
        season: "S01",
        episode: "E166-167",
      },
      {
        file_id: "640579c8a4c2a5403aa24835b3774338f9657d47",
        file_name:
          "犬夜叉 - 本篇 - 第165话：奈落を倒す最大の手がかり（打倒奈落最大的线索）；640×480P.mkv",
        parent_file_id: "640579c8da6fee6f91884e468e3e1b713da21b23",
        season: "S01",
        episode: "E165",
      },
      {
        file_id: "640579c90ab545bac5fd4a38afa0c2b172c77b99",
        file_name:
          "犬夜叉 - 本篇 - 第164话：最强の敌 宿り蛹七宝（最强之敌！寄生蛹•七宝）；640×480P.mkv",
        parent_file_id: "640579c8da6fee6f91884e468e3e1b713da21b23",
        season: "S01",
        episode: "E164",
      },
      {
        file_id: "640579c8d566a1cbc82a4b94b9c101a0fcd53d37",
        file_name:
          "犬夜叉 - 本篇 - 第150话：圣者を导く不思议な光（圣者所引导的不思议之光）；640×480P.mkv",
        parent_file_id: "640579c56be2a8445e524c2ebd78f9aa8c5da2ec",
        season: "S01",
        episode: "E150",
      },
      {
        file_id: "640579c819ebc0512bef49d69838df2e8fd634a6",
        file_name:
          "犬夜叉 - 本篇 - 第149话：波乱を呼ぶ一本の矢（在风波中呼啸而至的孤矢）；640×480P.mkv",
        parent_file_id: "640579c56be2a8445e524c2ebd78f9aa8c5da2ec",
        season: "S01",
        episode: "E149",
      },
      {
        file_id: "640579c86b602caad0634cc5ba1ba9e316bd108e",
        file_name:
          "犬夜叉 - 本篇 - 第147-148话：犬夜叉スペシャル めぐり逢う前の运命恋歌（相逢前的命运恋歌-前后篇）；640×480P.mkv",
        parent_file_id: "640579c56be2a8445e524c2ebd78f9aa8c5da2ec",
        season: "S01",
        episode: "E147-148",
      },
      {
        file_id: "640579c4de492a72f093429fa19f515a7ad5173a",
        file_name:
          "犬夜叉 - 本篇 - 第100话：悪梦の真実 叹きの森の戦い（噩梦般的真实！叹息之森的战斗！）；640×480P.mkv",
        parent_file_id: "640579c2a154db64e6ad4c1ea08bb7605f0ea8ae",
        season: "S01",
        episode: "E100",
      },
      {
        file_id: "640579c35a57320e5a7a4838ae649b6e9c5913be",
        file_name:
          "犬夜叉 - 本篇 - 第099话：钢牙と杀生丸 危険な遭遇（钢牙与杀生丸！危险的遭遇！）；640×480P.mkv",
        parent_file_id: "640579c2a154db64e6ad4c1ea08bb7605f0ea8ae",
        season: "S01",
        episode: "E099",
      },
      {
        file_id: "640579c342a82c9f74284312a4e06ec1eafdc7af",
        file_name:
          "犬夜叉 - 本篇 - 第098话：洞窟には桔梗とかごめの二人だけ桔梗与戈薇！（洞窟中的单独相处！）；640×480P.mkv",
        parent_file_id: "640579c2a154db64e6ad4c1ea08bb7605f0ea8ae",
        season: "S01",
        episode: "E098",
      },
      {
        file_id: "640579c04d5afe3a6151418289731f423cb22be6",
        file_name:
          "犬夜叉 - 本篇 - 第050话：あの颜が心から消えない（不灭的脸）；640×480P.mkv",
        parent_file_id: "640579bf7f2dff189ad349a39b915a69485e2ff9",
        season: "S01",
        episode: "E050",
      },
      {
        file_id: "640579d308230270fc4c41439698c0fd97ae710b",
        file_name: "[犬夜叉][豪華絢爛][06][只有一個約定].mp4",
        parent_file_id: "640579d2953d300180284176937880f5b109315e",
        season: "S01",
        episode: "E06",
      },
      {
        file_id: "640579d35322d70e97d54f0ab1ec6834dff6a47c",
        file_name: "[犬夜叉][豪華絢爛][05][無休的亂世].mp4",
        parent_file_id: "640579d2953d300180284176937880f5b109315e",
        season: "S01",
        episode: "E05",
      },
      {
        file_id: "640579d30b8942c057d34827ae32477c5ad79231",
        file_name: "[犬夜叉][豪華絢爛][04][黑暗盡頭的幻影].mp4",
        parent_file_id: "640579d2953d300180284176937880f5b109315e",
        season: "S01",
        episode: "E04",
      },
      // {
      //   file_id: "640579bef1f59eb386bc4a2b8509b7760c2dee83",
      //   file_name:
      //     "犬夜叉 - OVA.2010-01-29：It’s a Rumic World 犬夜叉～黒い鐵砕牙（黑色的铁碎牙）；1920×1080P.mkv",
      //   parent_file_id: "640579bec1544f3277a64c49bf66855137c1216c",
      //   season: "S01",
      //   episode: "E01",
      // },
      // {
      //   file_id: "640579bb4ecf5f1e195b48f5ad91b9ab97e37e33",
      //   file_name:
      //     "犬夜叉 - 剧场版.2004-12-23：紅蓮の蓬莱島（红莲的蓬莱岛）；BDrip版；1920X1042P.mkv",
      //   parent_file_id: "640579ba039a94797d42461d824099b7fde7d277",
      // },
      // {
      //   file_id: "640579ba3773636ba7814794bc1c79edf672d715",
      //   file_name:
      //     "犬夜叉 - 剧场版.2003-12-20：天下覇道の剣（天下霸道之剑）；BDrip版；1920×1040P.mkv",
      //   parent_file_id: "640579baae0c04c8511e473b9d2e4c711f723431",
      // },
      // {
      //   file_id: "640579bbbb149ca1658b466a90f52dc951ad2703",
      //   file_name:
      //     "犬夜叉 - 剧场版.2002-12-21：鏡の中の夢幻城（镜中的梦幻城）；BDrip版；1920×1040P.mkv",
      //   parent_file_id: "640579bbdfd0f7b6e2cb4711ab6a49e845b57a05",
      // },
      // {
      //   file_id: "640579baac5ef0db0d5e4806be2302d310321e7e",
      //   file_name:
      //     "犬夜叉 - 剧场版.2001-12-16：時代を超える想い（超越时代的思念）；BDrip版；1920×1050P.mkv",
      //   parent_file_id: "640579ba559a284ca5674300abb05d571ffa78eb",
      // },
    ]);
    /** --------- 查看 season --------- */
    const season_resp = await store.find_seasons();
    expect(season_resp.error).toBe(null);
    if (season_resp.error) {
      return;
    }
    expect(season_resp.data.map((s) => s.season)).toStrictEqual(["S01"]);
    /** --------- 查看 tv --------- */
    const tvs_resp = await store.find_parsed_tv_list();
    expect(tvs_resp.error).toBe(null);
    if (tvs_resp.error) {
      return;
    }
    expect(
      tvs_resp.data.map((t) => {
        const { name, original_name } = t;
        return {
          name,
          original_name,
        };
      })
    ).toStrictEqual([
      {
        name: "犬夜叉",
        original_name: "",
      },
    ]);
    /** --------- 查看文件夹 --------- */
    const folders_resp = await store.find_files(
      {
        drive_id,
      },
      {
        sorts: [
          {
            key: "file_id",
            order: "ASC",
          },
        ],
      }
    );
    expect(folders_resp.error).toBe(null);
    if (folders_resp.error) {
      return;
    }
    expect(
      folders_resp.data
        .map((f) => {
          const { file_id, name, parent_file_id } = f;
          return {
            file_id,
            name,
            parent_file_id,
          };
        })
        .map((i) => JSON.stringify(i))
        .sort()
    ).toStrictEqual(
      [
        {
          file_id: "640579ba21e88ac11b2949c884527a5b68455b5a",
          name: "转存赠送优惠券，购买会员立减！更多资源点击头像订阅",
          parent_file_id: "640579ba559a284ca5674300abb05d571ffa78eb",
        },
        {
          file_id: "640579ba559a284ca5674300abb05d571ffa78eb",
          name: "犬夜叉 - 剧场版.2001-12-16：超越时代的思念",
          parent_file_id: "640579ba5a23cfbac25649d3b495b13a9982c8d4",
        },
        {
          file_id: "640579bb7a96ef03d8c54400b347392c56d0dce0",
          name: "转存赠送优惠券，购买会员立减！更多资源点击头像订阅",
          parent_file_id: "640579bbdfd0f7b6e2cb4711ab6a49e845b57a05",
        },
        {
          file_id: "640579bbdfd0f7b6e2cb4711ab6a49e845b57a05",
          name: "犬夜叉 - 剧场版.2002-12-21：镜中的梦幻城",
          parent_file_id: "640579ba5a23cfbac25649d3b495b13a9982c8d4",
        },
        {
          file_id: "640579baa8b7b1d97e384173814326b3c6bb85c8",
          name: "转存赠送优惠券，购买会员立减！更多资源点击头像订阅",
          parent_file_id: "640579baae0c04c8511e473b9d2e4c711f723431",
        },
        {
          file_id: "640579baae0c04c8511e473b9d2e4c711f723431",
          name: "犬夜叉 - 剧场版.2003-12-20：天下霸道之剑",
          parent_file_id: "640579ba5a23cfbac25649d3b495b13a9982c8d4",
        },
        {
          file_id: "640579ba09bef3ac14b44d209562d5f785e20ef0",
          name: "转存赠送优惠券，购买会员立减！更多资源点击头像订阅",
          parent_file_id: "640579ba039a94797d42461d824099b7fde7d277",
        },
        {
          file_id: "640579ba039a94797d42461d824099b7fde7d277",
          name: "犬夜叉 - 剧场版.2004-12-23：红莲的蓬莱岛",
          parent_file_id: "640579ba5a23cfbac25649d3b495b13a9982c8d4",
        },
        {
          file_id: "640579bbb090fad484ba45c4a68ac8846245467a",
          name: "转存赠送优惠券，购买会员立减！更多资源点击头像订阅",
          parent_file_id: "640579ba5a23cfbac25649d3b495b13a9982c8d4",
        },
        {
          file_id: "640579ba5a23cfbac25649d3b495b13a9982c8d4",
          name: "犬夜叉  剧场版",
          parent_file_id: "640579ba5281316059024263986e1fbe83d873a5",
        },
        {
          file_id: "640579bec1544f3277a64c49bf66855137c1216c",
          name: "犬夜叉 OVA",
          parent_file_id: "640579ba5281316059024263986e1fbe83d873a5",
        },
        {
          file_id: "640579d2474050d2dfd443a98a6698ef518628a2",
          name: "转存赠送优惠券，购买会员立减！更多资源点击头像订阅",
          parent_file_id: "640579d2953d300180284176937880f5b109315e",
        },
        {
          file_id: "640579d2953d300180284176937880f5b109315e",
          name: "犬夜叉 SP",
          parent_file_id: "640579ba5281316059024263986e1fbe83d873a5",
        },
        {
          file_id: "640579bf7f2dff189ad349a39b915a69485e2ff9",
          name: "001-050",
          parent_file_id: "640579bf61226b12aaa543018397324bab37ad0a",
        },
        {
          file_id: "640579c2a154db64e6ad4c1ea08bb7605f0ea8ae",
          name: "051-100",
          parent_file_id: "640579bf61226b12aaa543018397324bab37ad0a",
        },
        {
          file_id: "640579c56be2a8445e524c2ebd78f9aa8c5da2ec",
          name: "101-150",
          parent_file_id: "640579bf61226b12aaa543018397324bab37ad0a",
        },
        {
          file_id: "640579c8da6fee6f91884e468e3e1b713da21b23",
          name: "151-167",
          parent_file_id: "640579bf61226b12aaa543018397324bab37ad0a",
        },
        {
          file_id: "640579c99134af4983c74716a1877f80ee93cd8b",
          name: "001-050",
          parent_file_id: "640579c9867d170ed3b34f58b36456b36ea94cbb",
        },
        {
          file_id: "640579ccaff26da6ab5147c39fd5567058852087",
          name: "051-100",
          parent_file_id: "640579c9867d170ed3b34f58b36456b36ea94cbb",
        },
        {
          file_id: "640579cf6bb0b49bdf2d4989b88aacf1021fd989",
          name: "101-150",
          parent_file_id: "640579c9867d170ed3b34f58b36456b36ea94cbb",
        },
        {
          file_id: "640579d1c3e5b2e6aa4f461084c4ff190a2e7bac",
          name: "151-167",
          parent_file_id: "640579c9867d170ed3b34f58b36456b36ea94cbb",
        },
        {
          file_id: "640579c9867d170ed3b34f58b36456b36ea94cbb",
          name: "字幕",
          parent_file_id: "640579bf61226b12aaa543018397324bab37ad0a",
        },
        {
          file_id: "640579d2c0c78fd58e9b42c097e4296a6eae5f95",
          name: "转存赠送优惠券，购买会员立减！更多资源点击头像订阅",
          parent_file_id: "640579bf61226b12aaa543018397324bab37ad0a",
        },
        {
          file_id: "640579bf61226b12aaa543018397324bab37ad0a",
          name: "犬夜叉 合集",
          parent_file_id: "640579ba5281316059024263986e1fbe83d873a5",
        },
        {
          file_id: "640579bb9a5e3840bf924a84ac8fcfd1caab49ca",
          name: "字幕",
          parent_file_id: "640579bb69b3b6a8365c467b9d71beb45ed7eed4",
        },
        {
          file_id: "640579bd10401501652c4e729c00480f9efb365f",
          name: "转存赠送优惠券，购买会员立减！更多资源点击头像订阅",
          parent_file_id: "640579bb69b3b6a8365c467b9d71beb45ed7eed4",
        },
        {
          file_id: "640579bb69b3b6a8365c467b9d71beb45ed7eed4",
          name: "犬夜叉 完结篇",
          parent_file_id: "640579ba5281316059024263986e1fbe83d873a5",
        },
        {
          file_id: "640579d3b70b603f284b490f937ff9029edc5663",
          name: "转存赠送优惠券，购买会员立减！更多资源点击头像订阅",
          parent_file_id: "640579ba5281316059024263986e1fbe83d873a5",
        },
        {
          file_id: "640579ba5281316059024263986e1fbe83d873a5",
          name: "2000.犬夜叉.167集全+剧场版+OVA+SP+完结篇.1080p",
          parent_file_id: id,
        },
        {
          file_id: id,
          name: "tv",
          parent_file_id: "root",
        },
      ]
        .map((i) => JSON.stringify(i))
        .sort()
    );
  });
});
