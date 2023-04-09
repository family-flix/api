/**
 * __root/name1/s01/e01.mp4__@@正常1
 * __root/name1/s01/name1.s01.e01.mp4@@正常9
 * @example
 * 一起同过窗
 *  一起同过窗.1-3季
 *    S03.4K
 *      一起同过窗.第三季.第30集.mkv
 *    S02.1080P
 *      01.mkv
 *    S01.1080P
 *      01.mkv
 * @result
 * 一起同过窗
 *  S01
 *    E01
 *  S02
 *    E01
 *  S03
 *    E01
 */

import { describe, test, expect, vi, afterEach, beforeEach } from "vitest";

import { FolderWalker } from "@/domains/walker";
import { AliyunDriveFolder } from "@/domains/aliyundrive/folder";
import {
  fetch_files_factory,
  adding_episode_when_walk,
  adding_folder_when_walk,
} from "@/domains/walker/utils";
import { data, id } from "@/domains/__tests__/mock/yi_qi_tong_guo_chuang";

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

  test("一起同过窗", async () => {
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
      adding_folder_when_walk(folder, fake_extra, store);
      return;
    };
    detector.on_episode = async (task) => {
      handle_episode(task);
      adding_episode_when_walk(task, fake_extra, store);
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
    expect(handle_folder).toBeCalledTimes(6);
    expect(handle_episode).toBeCalledTimes(9);
    /** --------- 查看 episode --------- */
    const episodes_resp = await store.find_episodes();
    expect(episodes_resp.error).toBe(null);
    if (episodes_resp.error) {
      return;
    }
    expect(episodes_resp.data.length).toBe(9);
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
        file_id: "63dc93ede6c53e5591b545d98bfad3910ebf659d",
        parent_file_id: "63dc93ebc129aad205404dbab639207015391e38",
        file_name: "一起同过窗 第三季 第03集 4K(超高清SDR)(2028388).mp4",
        season: "S03",
        episode: "E03",
      },
      {
        file_id: "63dc93ec3aadcca4fa7c4661b1d3eb4480a032ff",
        parent_file_id: "63dc93ebc129aad205404dbab639207015391e38",
        file_name: "一起同过窗 第三季 第02集 4K(超高清SDR)(2253074).mp4",
        season: "S03",
        episode: "E02",
      },
      {
        file_id: "63dc93eb9c1b8012ba0f46c7815427de8ee4afcd",
        parent_file_id: "63dc93ebc129aad205404dbab639207015391e38",
        file_name: "一起同过窗 第三季 第01集 4K(超高清SDR)(3232008).mp4",
        season: "S03",
        episode: "E01",
      },
      {
        file_id: "63dc93e74da7718ddea24213951331fe6fc8cf21",
        parent_file_id: "63dc93e6e22ee62496634300a94d21c05fd472fe",
        file_name: "03.mp4",
        season: "S02",
        episode: "E03",
      },
      {
        file_id: "63dc93e63de605e042954725a3b0d3de52e3f627",
        parent_file_id: "63dc93e6e22ee62496634300a94d21c05fd472fe",
        file_name: "02.mp4",
        season: "S02",
        episode: "E02",
      },
      {
        file_id: "63dc93e8f13a17d99d624482a3ba920c8f0c52eb",
        parent_file_id: "63dc93e6e22ee62496634300a94d21c05fd472fe",
        file_name: "01.mp4",
        season: "S02",
        episode: "E01",
      },
      {
        file_id: "63dc93e94972fe1f8df24fd9808866d9278642b3",
        parent_file_id: "63dc93e9f51af88ed9654f35b6acb062228b7c89",
        file_name: "03.mp4",
        season: "S01",
        episode: "E03",
      },
      {
        file_id: "63dc93e9431c545334ee4e2d8fd6ec113b797e48",
        parent_file_id: "63dc93e9f51af88ed9654f35b6acb062228b7c89",
        file_name: "02.mp4",
        season: "S01",
        episode: "E02",
      },
      {
        file_id: "63dc93e9fde48c9f635d4f91b76b7f13693d696b",
        parent_file_id: "63dc93e9f51af88ed9654f35b6acb062228b7c89",
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
    expect(season_resp.data.map((s) => s.season)).toStrictEqual([
      "S03",
      "S02",
      "S01",
    ]);
    /** --------- 查看 tv --------- */
    const tvs_resp = await store.find_tvs();
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
        name: "一起同过窗",
        original_name: "",
      },
    ]);
    /** --------- 查看文件夹 --------- */
    const folders_resp = await store.find_folders(
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
    expect(folders_resp.data.length).toBe(6);
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
        file_id: "63dc93e5da813402a2f64ad19357c1d72d56c8ac",
        parent_file_id: id,
        name: "一起同过窗",
      },
      {
        file_id: "63dc93e6b028b330b6df4491b70c26a93b9dbe24",
        parent_file_id: "63dc93e5da813402a2f64ad19357c1d72d56c8ac",
        name: "一起同过窗.1-3季.国语中字",
      },
      {
        file_id: "63dc93e6e22ee62496634300a94d21c05fd472fe",
        parent_file_id: "63dc93e6b028b330b6df4491b70c26a93b9dbe24",
        name: "S02 1080P  (52集)",
      },
      {
        file_id: "63dc93e9f51af88ed9654f35b6acb062228b7c89",
        parent_file_id: "63dc93e6b028b330b6df4491b70c26a93b9dbe24",
        name: "S01 1080P  (34集)",
      },
      {
        file_id: "63dc93ebc129aad205404dbab639207015391e38",
        parent_file_id: "63dc93e6b028b330b6df4491b70c26a93b9dbe24",
        name: "S03 4K (30集)",
      },
      {
        file_id: id,
        parent_file_id: "root",
        name: "tv",
      },
    ]);
  });
});
