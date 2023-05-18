require("dotenv").config();
import { describe, test, expect, vi, afterEach } from "vitest";

import {
  fetch_files_factory,
  add_parsed_infos_when_walk,
  adding_file_when_walk,
} from "@/domains/walker/utils";
import { FolderWalker } from "@/domains/walker";
import { AliyunDriveFolder } from "@/domains/aliyundrive/folder";
import { data, id } from "@/domains/__tests__/mock/quan_ye_cha";

import { test_store } from "../../store";

describe("detect a tv dir", () => {
  const { user_id, drive_id } = {
    user_id: "123",
    drive_id: "123",
  };
  afterEach(async () => {
    const tables = ["aliyun_drive", "episode", "season", "tv", "folder"];
    for (let i = 0; i < tables.length; i += 1) {
      const table = tables[i];
      await test_store.operation.clear_dataset(table);
    }
  });
  test("犬夜叉", async () => {
    const walker = new FolderWalker();
    const handle_error = vi.fn((v) => v);
    const handle_warning = vi.fn((v) => v);
    const handle_folder = vi.fn((v) => v);
    const handle_episode = vi.fn((v) => v);
    walker.filter = async (options) => {
      const { type, name, parent_paths } = options;
      const target_folder =
        "tv/2000.犬夜叉.167集全+剧场版+OVA+SP+完结篇.1080p/犬夜叉 SP";
      const paths = target_folder.split("/");
      if (type === "folder") {
        if (paths.includes(name)) {
          return false;
        }
        if (parent_paths.includes(target_folder)) {
          return false;
        }
      }
      if (type === "file") {
        return false;
      }
      return true;
    };
    walker.on_error = (file) => {
      handle_error(file);
    };
    walker.on_warning = (file) => {
      handle_warning(file);
    };
    walker.on_file = async (folder) => {
      handle_folder(folder);
      await adding_file_when_walk(folder, { user_id, drive_id }, test_store);
    };
    walker.on_episode = async (task) => {
      handle_episode(task);
      add_parsed_infos_when_walk(task, { user_id, drive_id }, test_store);
    };
    const folder = new AliyunDriveFolder(id, {
      client: fetch_files_factory({
        tree: data,
      }),
    });
    await folder.profile();
    const resp = await walker.detect(folder);
    /** ---------------------- 开始断言 ------------------ */
    expect(resp.error).toBe(null);
    if (resp.error) {
      return;
    }
    expect(handle_error).toBeCalledTimes(0);
    expect(handle_warning).toBeCalledTimes(1);
    expect(handle_folder).toBeCalledTimes(4);
    expect(handle_episode).toBeCalledTimes(3);
    /** --------- 查看 episode --------- */
    const episodes_resp = await test_store.find_episodes();
    expect(episodes_resp.error).toBe(null);
    if (episodes_resp.error) {
      return;
    }
    expect(episodes_resp.data.length).toBe(3);
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
        file_id: "640579d308230270fc4c41439698c0fd97ae710b",
        file_name: "[犬夜叉][豪華絢爛][06][只有一個約定].mp4",
        parent_file_id: "640579d2953d300180284176937880f5b109315e",
        season: "SP",
        episode: "E06",
      },
      {
        file_id: "640579d35322d70e97d54f0ab1ec6834dff6a47c",
        file_name: "[犬夜叉][豪華絢爛][05][無休的亂世].mp4",
        parent_file_id: "640579d2953d300180284176937880f5b109315e",
        season: "SP",
        episode: "E05",
      },
      {
        file_id: "640579d30b8942c057d34827ae32477c5ad79231",
        file_name: "[犬夜叉][豪華絢爛][04][黑暗盡頭的幻影].mp4",
        parent_file_id: "640579d2953d300180284176937880f5b109315e",
        season: "SP",
        episode: "E04",
      },
    ]);
    /** --------- 查看 season --------- */
    const season_resp = await test_store.find_seasons();
    expect(season_resp.error).toBe(null);
    if (season_resp.error) {
      return;
    }
    expect(season_resp.data.map((s) => s.season)).toStrictEqual(["SP"]);
    /** --------- 查看 tv --------- */
    const tvs_resp = await test_store.find_parsed_tv_list();
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
    const folders_resp = await test_store.find_files(
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
