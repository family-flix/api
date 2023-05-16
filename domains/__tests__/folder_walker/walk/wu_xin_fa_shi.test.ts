/**
 * __root/name1/s01/name1.s01.e01.mp4@@正常9
 * @example
 * 无心法师
 *  无心法师.1-3
 *    无心法师第3季
 *      无心法师3.E01
 *    无心法师第2季
 *      无心法师2.Wuxin.The.Monster.Killer.Season.2.E01
 *    无心法师第1季
 *      无心法师.第一季.Wuxin：The.Monster.Killer.S01E01
 * @result
 */

import { describe, test, expect, vi, afterEach, beforeEach } from "vitest";

import { FolderWalker } from "@/domains/walker";
import { AliyunDriveFolder } from "@/domains/aliyundrive/folder";
import {
  fetch_files_factory,
  adding_episode_when_walk,
  adding_file_when_walk,
} from "@/domains/walker/utils";
import { data, id } from "@/domains/__tests__/mock/wu_xin_fa_shi";

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

  test("无心法师", async () => {
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
        file_id: "63dc94832e0bd47e77fb4dcdbe2efbcbc12baf2b",
        parent_file_id: "63dc94823a937f0e86d04079b5e8c05468e568b8",
        file_name: "无心法师3.E03.2020.WEB-DL.2160p(4K).H265.AAC-Amber.mp4",
        season: "S03",
        episode: "E03",
      },
      {
        file_id: "63dc948330f8b07104d9435080f91f793f7b6032",
        parent_file_id: "63dc94823a937f0e86d04079b5e8c05468e568b8",
        file_name: "无心法师3.E02.2020.WEB-DL.2160p(4K).H265.AAC-Amber.mp4",
        season: "S03",
        episode: "E02",
      },
      {
        file_id: "63dc9482d600e0e38f8a423598605da5f9866fab",
        parent_file_id: "63dc94823a937f0e86d04079b5e8c05468e568b8",
        file_name: "无心法师3.E01.2020.WEB-DL.2160p(4K).H265.AAC-Amber.mp4",
        season: "S03",
        episode: "E01",
      },
      {
        file_id: "63dc94828a8bd670a54245558a680b85916cc3a2",
        parent_file_id: "63dc94802650e115fe9740cb943131f4205dba13",
        file_name:
          "无心法师2.Wuxin.The.Monster.Killer.Season.2.EP03.WEB-DL.4K.2160P-DHTCLUB.mkv",
        season: "S02",
        episode: "E03",
      },
      {
        file_id: "63dc9480b63c44d092d74ba7b53195e3053ccc7d",
        parent_file_id: "63dc94802650e115fe9740cb943131f4205dba13",
        file_name:
          "无心法师2.Wuxin.The.Monster.Killer.Season.2.EP02.WEB-DL.4K.2160P-DHTCLUB.mkv",
        season: "S02",
        episode: "E02",
      },
      {
        file_id: "63dc948154867bf2a9db4213ac149a3cd3769b2c",
        parent_file_id: "63dc94802650e115fe9740cb943131f4205dba13",
        file_name:
          "无心法师2.Wuxin.The.Monster.Killer.Season.2.EP01.WEB-DL.4K.2160P-DHTCLUB.mkv",
        season: "S02",
        episode: "E01",
      },
      {
        file_id: "63dc947f59675554b3314169a912d465e958a820",
        parent_file_id: "63dc947feaa52110afae48c8bd4149b503101ddc",
        file_name:
          "无心法师.第一季.Wuxin：The.Monster.Killer.S01E03.2015.1080p.WEB-DL.x264.AAC-HeiGuo.mp4",
        season: "S01",
        episode: "E03",
      },
      {
        file_id: "63dc947f7333ba2cc9c249baaf602298e7f22371",
        parent_file_id: "63dc947feaa52110afae48c8bd4149b503101ddc",
        file_name:
          "无心法师.第一季.Wuxin：The.Monster.Killer.S01E02.2015.1080p.WEB-DL.x264.AAC-HeiGuo.mp4",
        season: "S01",
        episode: "E02",
      },
      {
        file_id: "63dc947f6e0ac526fece4d949fd1e156d42de59f",
        parent_file_id: "63dc947feaa52110afae48c8bd4149b503101ddc",
        file_name:
          "无心法师.第一季.Wuxin：The.Monster.Killer.S01E01.2015.1080p.WEB-DL.x264.AAC-HeiGuo.mp4",
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
    const tvs_resp = await store.find_maybe_tvs();
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
        name: "无心法师",
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
        file_id: "63dc947efb67a1c74018416cbcff45c3e137fa6e",
        parent_file_id: id,
        name: "无心法师",
      },
      {
        file_id: "63dc947f9293e5b9ef574239b2fb30a2bba983a1",
        parent_file_id: "63dc947efb67a1c74018416cbcff45c3e137fa6e",
        name: "无心法师.1-3[1.1080P；2、3.4k]",
      },
      {
        file_id: "63dc947feaa52110afae48c8bd4149b503101ddc",
        parent_file_id: "63dc947f9293e5b9ef574239b2fb30a2bba983a1",
        name: "无心法师第1季",
      },
      {
        file_id: "63dc94802650e115fe9740cb943131f4205dba13",
        parent_file_id: "63dc947f9293e5b9ef574239b2fb30a2bba983a1",
        name: "无心法师第2季",
      },
      {
        file_id: "63dc94823a937f0e86d04079b5e8c05468e568b8",
        parent_file_id: "63dc947f9293e5b9ef574239b2fb30a2bba983a1",
        name: "无心法师第3季",
      },
      {
        file_id: id,
        parent_file_id: "root",
        name: "tv",
      },
    ]);
  });
});
