require("dotenv").config();
import { describe, test, expect, vi, afterEach, beforeEach } from "vitest";

import {
  fetch_files_factory,
  find_folders_and_recommended_path_in_special_season,
  get_tv_profile_with_first_season_by_id,
} from "@/domains/walker/utils";
import { data, id } from "@/domains/__tests__/mock/quan_ye_cha";
import { analysis_aliyun_drive } from "@/domains/walker/analysis_aliyun_drive";

import { test_store as store } from "../../store";
import { simple_folders } from "../../utils";

describe("detect a tv dir", () => {
  const { user_id, drive_id } = {
    user_id: "123",
    drive_id: "123",
  };
  beforeEach(async () => {
    const tables = [
      "aliyun_drive",
      "episode",
      "season",
      "tv",
      "folder",
      "searched_tv",
      "async_task",
    ];
    for (let i = 0; i < tables.length; i += 1) {
      const table = tables[i];
      await store.operation.clear_dataset(table);
    }
  });
  test("犬夜叉", async () => {
    const adding_res = await store.add_aliyun_drive({
      id: drive_id,
      name: "",
      nick_name: "",
      user_name: "",
      device_id: "",
      user_id,
      drive_id: "",
      app_id: "",
      aliyun_user_id: "",
      avatar: "",
      root_folder_id: id,
    });
    expect(adding_res.error).toBe(null);
    if (adding_res.error) {
      return;
    }
    const r = await analysis_aliyun_drive({
      user_id,
      drive_id,
      client: fetch_files_factory({
        tree: data,
      }),
      store,
      need_upload_image: false,
      wait_complete: true,
    });
    expect(r.error).toBe(null);
    if (r.error) {
      return;
    }
    /** ---------------------- 开始断言 ------------------ */
    /** --------- 查看索引到的影视剧信息 --------- */
    const searched_tv_res = await store.find_searched_tvs({});
    expect(searched_tv_res.error).toBe(null);
    if (searched_tv_res.error) {
      return;
    }
    expect(searched_tv_res.data.length).toBe(1);
    expect(
      searched_tv_res.data.map((f) => {
        const { name } = f;
        return {
          name,
        };
      })
    ).toStrictEqual([
      {
        name: "犬夜叉",
      },
    ]);
    /** --------- 查看 tv --------- */
    const tvs_resp = await store.find_tvs();
    expect(tvs_resp.error).toBe(null);
    if (tvs_resp.error) {
      return;
    }
    expect(
      tvs_resp.data.map((t) => {
        const { name, original_name, searched_tv_id } = t;
        return {
          name,
          original_name,
          searched_tv_id: !!searched_tv_id,
        };
      })
    ).toStrictEqual([
      {
        name: "犬夜叉",
        original_name: "",
        searched_tv_id: true,
      },
    ]);
    const profile_res = await get_tv_profile_with_first_season_by_id(
      tvs_resp.data[0].id,
      {
        user_id,
      },
      store
    );
    expect(profile_res.error).toBe(null);
    expect(profile_res.data).toBeTruthy();
    if (profile_res.error || !profile_res.data) {
      return;
    }
    const { name, original_name, seasons, first_episode, folders } =
      profile_res.data;
    expect(folders.length).toBe(4);
    const folder1 = simple_folders(
      folders.map((f) => {
        return {
          ...f,
          episodes: f.episodes.map((e) => {
            const { file_id, season, file_name } = e;
            return {
              file_id,
              file_name,
              season,
            };
          }),
        };
      })
    );
    const folder2 = simple_folders([
      {
        parent_paths:
          "tv/2000.犬夜叉.167集全+剧场版+OVA+SP+完结篇.1080p/犬夜叉 合集/001-050",
        episodes: [
          {
            file_id: "640579c04d5afe3a6151418289731f423cb22be6",
            file_name:
              "犬夜叉 - 本篇 - 第050话：あの颜が心から消えない（不灭的脸）；640×480P.mkv",
            season: "S01",
          },
        ],
      },
      {
        parent_paths:
          "tv/2000.犬夜叉.167集全+剧场版+OVA+SP+完结篇.1080p/犬夜叉 合集/051-100",
        episodes: [
          {
            file_id: "640579c342a82c9f74284312a4e06ec1eafdc7af",
            file_name:
              "犬夜叉 - 本篇 - 第098话：洞窟には桔梗とかごめの二人だけ桔梗与戈薇！（洞窟中的单独相处！）；640×480P.mkv",
            season: "S01",
          },
          {
            file_id: "640579c35a57320e5a7a4838ae649b6e9c5913be",
            file_name:
              "犬夜叉 - 本篇 - 第099话：钢牙と杀生丸 危険な遭遇（钢牙与杀生丸！危险的遭遇！）；640×480P.mkv",
            season: "S01",
          },
          {
            file_id: "640579c4de492a72f093429fa19f515a7ad5173a",
            file_name:
              "犬夜叉 - 本篇 - 第100话：悪梦の真実 叹きの森の戦い（噩梦般的真实！叹息之森的战斗！）；640×480P.mkv",
            season: "S01",
          },
        ],
      },
      {
        parent_paths:
          "tv/2000.犬夜叉.167集全+剧场版+OVA+SP+完结篇.1080p/犬夜叉 合集/101-150",
        episodes: [
          {
            file_id: "640579c86b602caad0634cc5ba1ba9e316bd108e",
            file_name:
              "犬夜叉 - 本篇 - 第147-148话：犬夜叉スペシャル めぐり逢う前の运命恋歌（相逢前的命运恋歌-前后篇）；640×480P.mkv",
            season: "S01",
          },
          {
            file_id: "640579c819ebc0512bef49d69838df2e8fd634a6",
            file_name:
              "犬夜叉 - 本篇 - 第149话：波乱を呼ぶ一本の矢（在风波中呼啸而至的孤矢）；640×480P.mkv",
            season: "S01",
          },
          {
            file_id: "640579c8d566a1cbc82a4b94b9c101a0fcd53d37",
            file_name:
              "犬夜叉 - 本篇 - 第150话：圣者を导く不思议な光（圣者所引导的不思议之光）；640×480P.mkv",
            season: "S01",
          },
        ],
      },
      {
        parent_paths:
          "tv/2000.犬夜叉.167集全+剧场版+OVA+SP+完结篇.1080p/犬夜叉 合集/151-167",
        episodes: [
          {
            file_id: "640579c90ab545bac5fd4a38afa0c2b172c77b99",
            file_name:
              "犬夜叉 - 本篇 - 第164话：最强の敌 宿り蛹七宝（最强之敌！寄生蛹•七宝）；640×480P.mkv",
            season: "S01",
          },
          {
            file_id: "640579c8a4c2a5403aa24835b3774338f9657d47",
            file_name:
              "犬夜叉 - 本篇 - 第165话：奈落を倒す最大の手がかり（打倒奈落最大的线索）；640×480P.mkv",
            season: "S01",
          },
          {
            file_id: "640579c96eba9b81e8214a7ea56453ebca97556f",
            file_name:
              "犬夜叉 - 本篇 - 第166-167话：最终话-二人の绊 四魂のかけらを使え！（两人的羁绊 使用四魂碎片吧！-前后篇）；640×480P.mkv",
            season: "S01",
          },
        ],
      },
    ]);
    expect({
      name,
      original_name,
      seasons,
      first_episode: {
        file_id: first_episode?.file_id,
        file_name: first_episode?.file_name,
        season: first_episode?.season,
      },
      folders: folder1,
    }).toStrictEqual({
      name: "犬夜叉",
      original_name: "犬夜叉",
      seasons: ["S01", "SP", "完结篇"],
      first_episode: {
        file_id: "640579c04d5afe3a6151418289731f423cb22be6",
        file_name:
          "犬夜叉 - 本篇 - 第050话：あの颜が心から消えない（不灭的脸）；640×480P.mkv",
        season: "S01",
      },
      folders: folder2,
    });
    // 指定 season
    const season2_res =
      await find_folders_and_recommended_path_in_special_season(
        tvs_resp.data[0].id,
        "完结篇",
        store
      );
    expect(season2_res.error).toBe(null);
    if (season2_res.error) {
      return;
    }
    const season2 = Object.keys(season2_res.data.episodes).map((paths) => {
      return {
        parent_paths: paths,
        episodes: season2_res.data.episodes[paths].map((e) => {
          const { file_id, file_name, season } = e;
          return {
            file_id,
            file_name,
            season,
          };
        }),
      };
    });
    expect(season2).toStrictEqual([
      {
        parent_paths:
          "tv/2000.犬夜叉.167集全+剧场版+OVA+SP+完结篇.1080p/犬夜叉 完结篇",
        episodes: [
          {
            file_id: "640579be00cf81252f424e72864857ee34a5805e",
            file_name:
              "犬夜叉 - 完结篇 - 第24话：奈落 儚き望み（ 奈落 虚幻的愿望）；1920×1080P.mkv",
            season: "完结篇",
          },
          {
            file_id: "640579bd9f64cecfe7ca4bdcae6ee1f34a51fdc3",
            file_name:
              "犬夜叉 - 完结篇 - 第25话：届かぬ想い（无法传达的思念）；1920×1080P.mkv",
            season: "完结篇",
          },
          {
            file_id: "640579bd986fe513a3ab4e8b9cc750e836aa2411",
            file_name:
              "犬夜叉 - 完结篇 - 第26话：明日へ（ 迈向明日）；1920×1080P.mkv",
            season: "完结篇",
          },
        ],
      },
    ]);
    // season3
    const season3_res =
      await find_folders_and_recommended_path_in_special_season(
        tvs_resp.data[0].id,
        "SP",
        store
      );
    expect(season3_res.error).toBe(null);
    if (season3_res.error) {
      return;
    }
    const season3 = Object.keys(season3_res.data.episodes).map((paths) => {
      return {
        parent_paths: paths,
        episodes: season3_res.data.episodes[paths].map((e) => {
          const { file_id, file_name, season } = e;
          return {
            file_id,
            file_name,
            season,
          };
        }),
      };
    });
    expect(season3).toStrictEqual([
      {
        parent_paths:
          "tv/2000.犬夜叉.167集全+剧场版+OVA+SP+完结篇.1080p/犬夜叉 SP",
        episodes: [
          {
            file_id: "640579d30b8942c057d34827ae32477c5ad79231",
            file_name: "[犬夜叉][豪華絢爛][04][黑暗盡頭的幻影].mp4",
            season: "SP",
          },
          {
            file_id: "640579d35322d70e97d54f0ab1ec6834dff6a47c",
            file_name: "[犬夜叉][豪華絢爛][05][無休的亂世].mp4",
            season: "SP",
          },
          {
            file_id: "640579d308230270fc4c41439698c0fd97ae710b",
            file_name: "[犬夜叉][豪華絢爛][06][只有一個約定].mp4",
            season: "SP",
          },
        ],
      },
    ]);
  });
});
