/**
 * __root/name1/s01/e01.mp4__@@正常1
 * @example
 * 地下交通站
 *  第一部
 *    S01.mkv
 *  第二部
 *    S01.mkv
 * @result
 * 地下交通站
 *  S01
 *    E01
 *  S02
 *    E01
 */

import { describe, test, expect, vi, afterEach, beforeEach } from "vitest";

import { FolderWalker } from "@/domains/walker";
import { AliyunDriveFolder } from "@/domains/folder";
import {
  fetch_files_factory,
  add_parsed_infos_when_walk,
  adding_file_when_walk,
} from "@/domains/walker/utils";
import { data, id } from "@/domains/__tests__/mock/di_xia_jiao_tong_zan";

import { test_store as store } from "../../store";

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
  test("第九节课", async () => {
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
      adding_file_when_walk(folder, fake_extra, store);
      return;
    };
    detector.on_episode = async (task) => {
      handle_episode(task);
      add_parsed_infos_when_walk(task, fake_extra, store);
      return;
    };
    const folder = new AliyunDriveFolder(id, {
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
    expect(handle_error).toBeCalledTimes(0);
    expect(handle_warning).toBeCalledTimes(0);
    expect(handle_folder).toBeCalledTimes(4);
    expect(handle_episode).toBeCalledTimes(6);
    /** --------- 查看 episode --------- */
    const episodes_resp = await store.find_episodes();
    expect(episodes_resp.error).toBe(null);
    if (episodes_resp.error) {
      return;
    }
    expect(episodes_resp.data.length).toBe(6);
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
        file_id: "63dc96e769c826a161f245d5bfc8556114bd76aa",
        parent_file_id: "63dc96e6996d910562324661b461a912d93aa5f8",
        file_name: "03.MP4",
        season: "S02",
        episode: "E03",
      },
      {
        file_id: "63dc96e7610d64e0d3cd45179bd13af123a31bfc",
        parent_file_id: "63dc96e6996d910562324661b461a912d93aa5f8",
        file_name: "02.MP4",
        season: "S02",
        episode: "E02",
      },
      {
        file_id: "63dc96e8069afc0927dc49b0822c30f8a1323836",
        parent_file_id: "63dc96e6996d910562324661b461a912d93aa5f8",
        file_name: "01.MP4",
        season: "S02",
        episode: "E01",
      },
      {
        file_id: "63dc96e511368ec9c0c74a79b3329865de571a53",
        parent_file_id: "63dc96e5f974dcba936a487cb6e0db604faca24d",
        file_name: "03.mp4",
        season: "S01",
        episode: "E03",
      },
      {
        file_id: "63dc96e61ece0af538fa4bb1a47706e42a5cba0c",
        parent_file_id: "63dc96e5f974dcba936a487cb6e0db604faca24d",
        file_name: "02.mp4",
        season: "S01",
        episode: "E02",
      },
      {
        file_id: "63dc96e61827299db3484a5ca93cb4af0e6c6443",
        parent_file_id: "63dc96e5f974dcba936a487cb6e0db604faca24d",
        file_name: "01.mp4",
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
    expect(season_resp.data.length).toBe(2);
    expect(season_resp.data.map((s) => s.season)).toStrictEqual(["S02", "S01"]);
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
        name: "地下交通站",
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
    expect(folders_resp.data.length).toBe(4);
    expect(
      folders_resp.data.map((f) => {
        const { file_id, name, parent_file_id } = f;
        return {
          file_id,
          name,
          parent_file_id,
        };
      })
    ).toStrictEqual([
      {
        file_id: "63dc96e57059b5f24bc347c1b273b675be4ca910",
        parent_file_id: "tv",
        name: "地下交通站1-2季",
      },
      {
        file_id: "63dc96e5f974dcba936a487cb6e0db604faca24d",
        parent_file_id: "63dc96e57059b5f24bc347c1b273b675be4ca910",
        name: "第一部",
      },
      {
        file_id: "63dc96e6996d910562324661b461a912d93aa5f8",
        parent_file_id: "63dc96e57059b5f24bc347c1b273b675be4ca910",
        name: "第二部",
      },
      {
        file_id: id,
        parent_file_id: "root",
        name: "tv",
      },
    ]);
  });
});
