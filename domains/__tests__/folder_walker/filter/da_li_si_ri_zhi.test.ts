/**
 *
 */
import { describe, test, expect, vi, beforeEach } from "vitest";

import { FolderWalker } from "@/domains/walker";
import { Folder } from "@/domains/folder";
import {
  fetch_files_factory,
  add_parsed_infos_when_walk,
  adding_file_safely,
  need_skip_the_file_when_walk,
} from "@/domains/walker/utils";
import { data, id } from "@/mock/da_li_si_ri_zhi";

import { test_store as store } from "../../store";
import { simple_folders } from "../../utils";

describe("detect a tv dir", () => {
  const fake_extra = {
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
  test("大理寺日志", async () => {
    const walker = new FolderWalker();
    const handle_error = vi.fn((v) => v);
    const handle_warning = vi.fn((v) => v);
    const handle_folder = vi.fn((v) => v);
    const handle_episode = vi.fn((v) => v);
    const added_file =
      "tv/D 大理寺日志2 第二季 (12集持续更新中)(附第1季)/大理寺日志 第一季(12集全)/4K B站logo/第9话 就是你啊-4K 超清.mp4";
    walker.filter = async (file) => {
      return need_skip_the_file_when_walk({
        target_file_name: added_file,
        target_file_type: "file",
        cur_file: file,
      });
    };
    walker.on_error = (file) => {
      handle_error(file);
    };
    walker.on_warning = (file) => {
      handle_warning(file);
    };
    walker.on_file = async (folder) => {
      handle_folder(folder);
      await adding_file_safely(folder, fake_extra, store);
      return;
    };
    walker.on_episode = async (task) => {
      handle_episode(task);
      await add_parsed_infos_when_walk(task, fake_extra, store);
      return;
    };
    const folder = new Folder(id, {
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
    expect(handle_warning).toBeCalledTimes(0);
    expect(handle_folder).toBeCalledTimes(5);
    expect(handle_episode).toBeCalledTimes(1);
    /** --------- 查看 episode --------- */
    const episodes_resp = await store.find_episodes();
    expect(episodes_resp.error).toBe(null);
    if (episodes_resp.error) {
      return;
    }
    expect(episodes_resp.data.length).toBe(1);
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
        file_id: "63db40c08b2bf557177045549f5b9c14b8522d87",
        parent_file_id: "638168b99a1be8000fbb45f2bfde6ef56a484077",
        file_name: "第9话 就是你啊-4K 超清.mp4",
        season: "S01",
        episode: "E09",
      },
    ]);
    /** --------- 查看 season --------- */
    const season_resp = await store.find_seasons();
    expect(season_resp.error).toBe(null);
    if (season_resp.error) {
      return;
    }
    expect(season_resp.data.length).toBe(1);
    expect(season_resp.data.map((s) => s.season)).toStrictEqual(["S01"]);
    /** --------- 查看 tv --------- */
    const tvs_resp = await store.find_parsed_tv_list();
    expect(tvs_resp.error).toBe(null);
    if (tvs_resp.error) {
      return;
    }
    expect(tvs_resp.data.length).toBe(1);
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
        name: "大理寺日志",
        original_name: "",
      },
    ]);
    /** --------- 查看文件夹 --------- */
    const folders_resp = await store.find_files(
      {
        drive_id: fake_extra.drive_id,
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
    expect(folders_resp.data.length).toBe(5);
    expect(
      simple_folders(
        folders_resp.data.map((f) => {
          const { file_id, name, parent_file_id } = f;
          return {
            file_id,
            name,
            parent_file_id,
          };
        })
      )
    ).toStrictEqual(
      simple_folders([
        {
          file_id: "63db40c08b2bf557177045549f5b9c14b8522d87",
          name: "第9话 就是你啊-4K 超清.mp4",
          parent_file_id: "638168b99a1be8000fbb45f2bfde6ef56a484077",
        },
        {
          file_id: "638168b99a1be8000fbb45f2bfde6ef56a484077",
          name: "4K B站logo",
          parent_file_id: "638169ae1c891d9b151d4e429af9385f82f514b2",
        },
        {
          file_id: "638169ae1c891d9b151d4e429af9385f82f514b2",
          name: "大理寺日志 第一季(12集全)",
          parent_file_id: "63db40c072ffe3499ec54805836c601db1c2931b",
        },
        {
          file_id: "63db40c072ffe3499ec54805836c601db1c2931b",
          name: "D 大理寺日志2 第二季 (12集持续更新中)(附第1季)",
          parent_file_id: "tv",
        },
        {
          file_id: id,
          name: "tv",
          parent_file_id: "root",
        },
      ])
    );
  });
});
