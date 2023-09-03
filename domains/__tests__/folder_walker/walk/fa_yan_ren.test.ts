/**
 * __root/name1/e01.mp4__@@正常1
 */
import { describe, test, expect, vi, beforeEach } from "vitest";

import { FolderWalker } from "@/domains/walker";
import { Folder } from "@/domains/folder";
import {
  fetch_files_factory,
  add_parsed_infos_when_walk,
  adding_file_safely,
} from "@/domains/walker/utils";
import { data, id } from "@/mock/fa_yan_ren";

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
  test("法言人", async () => {
    const walker = new FolderWalker();
    const handle_error = vi.fn((v) => v);
    const handle_warning = vi.fn((v) => v);
    const handle_folder = vi.fn((v) => v);
    const handle_episode = vi.fn((v) => v);
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
    const resp = await walker.run(folder);
    /** ---------------------- 开始断言 ------------------ */
    expect(resp.error).toBe(null);
    if (resp.error) {
      return;
    }
    expect(handle_error).toBeCalledTimes(0);
    expect(handle_warning).toBeCalledTimes(0);
    expect(handle_folder).toBeCalledTimes(3);
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
        file_id: "6434c120f234d7515ae743808a5a4444c29ce8bf",
        file_name: "01 国语.mp4",
        parent_file_id: "6434c120d87e5240793b44b0b1b3a7a4f3e32ea3",
        season: "S01",
        episode: "E01",
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
        name: "法言人",
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
    expect(folders_resp.data.length).toBe(3);
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
          file_id: "6434c120f234d7515ae743808a5a4444c29ce8bf",
          name: "01 国语.mp4",
          parent_file_id: "6434c120d87e5240793b44b0b1b3a7a4f3e32ea3",
        },
        {
          file_id: "6434c120d87e5240793b44b0b1b3a7a4f3e32ea3",
          name: "法言人",
          parent_file_id: id,
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
