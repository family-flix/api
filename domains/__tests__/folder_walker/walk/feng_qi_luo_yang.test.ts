/**
 * __root/name1/name1.e01.mp4@@正常4
 * @example
 * 风起洛阳
 *  风起洛阳 4K 内嵌简中
 *    风起洛阳.E01.4K.mkv
 *  风起洛阳 4K 内封简中
 *    风起洛阳.E01.4K.mkv
 *  4K原版
 *    风起洛阳.6.7.Feng.Qi.Luo.Yang.2160p
 *      风起洛阳.Feng.Qi.Luo.Yang.2160p.E01
 * @result
 * 风起洛阳
 *  S01
 *    E01
 *    E01
 *    E01
 */

import { describe, test, expect, vi, afterEach, beforeEach } from "vitest";

import { FolderWalker } from "@/domains/walker";
import { AliyunDriveFolder } from "@/domains/folder";
import {
  fetch_files_factory,
  add_parsed_infos_when_walk,
  adding_file_safely,
} from "@/domains/walker/utils";
import { data, id } from "@/domains/__tests__/mock/feng_qi_luo_yang";

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

  test("风起洛阳", async () => {
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
      adding_file_safely(folder, fake_extra, store);
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
    expect(handle_error).toBeCalledTimes(4);
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
        file_id: "63dc92574d1be66e11084a7da470eba75dba1774",
        parent_file_id: "63dc9253daef7f6bc0554df9bb5d46739ceca658",
        file_name: "风起洛阳.EP03.4K.去片头片尾.mp4",
        season: "S01",
        episode: "E03",
      },
      {
        file_id: "63dc9257296dee72476f4cbdaac323a2e4790af7",
        parent_file_id: "63dc9253daef7f6bc0554df9bb5d46739ceca658",
        file_name: "风起洛阳.EP02.4K.去片头片尾.mp4",
        season: "S01",
        episode: "E02",
      },
      {
        file_id: "63dc925780793a7c20ac4b47804087ceb79b228b",
        parent_file_id: "63dc9253daef7f6bc0554df9bb5d46739ceca658",
        file_name: "风起洛阳.EP01.4K.去片头片尾.mp4",
        season: "S01",
        episode: "E01",
      },
      {
        file_id: "63dc925954fe57ee553d49b9a625ffa2b1b74e8a",
        parent_file_id: "63dc9257e9c46c1af4cc495a83e9b4bb8f493bd6",
        file_name: "风起洛阳.EP03.4K.内封简中.去片头片尾.mp4",
        season: "S01",
        episode: "E03",
      },
      {
        file_id: "63dc9259e5df2830749043469c2b7bb0fed4271c",
        parent_file_id: "63dc9257e9c46c1af4cc495a83e9b4bb8f493bd6",
        file_name: "风起洛阳.EP02.4K.内封简中.去片头片尾.mp4",
        season: "S01",
        episode: "E02",
      },
      {
        file_id: "63dc9259d9511397d6dd4fa1b9ffa9e16ddfc335",
        parent_file_id: "63dc9257e9c46c1af4cc495a83e9b4bb8f493bd6",
        file_name: "风起洛阳.EP01.4K.内封简中.去片头片尾.mp4",
        season: "S01",
        episode: "E01",
      },
      {
        file_id: "63dc925e9a089839f7d441318f19eea10089584d",
        parent_file_id: "63dc925a9a61f36aa68044ebb0d4b1133cba85d1",
        file_name:
          "风起洛阳.Feng.Qi.Luo.Yang.2021.E03.2160p.WEB-DL.H265.DDP5.1-OurTV.mkv",
        season: "S01",
        episode: "E03",
      },
      {
        file_id: "63dc925f87e88050a99b403f93b18ab4794cab23",
        parent_file_id: "63dc925a9a61f36aa68044ebb0d4b1133cba85d1",
        file_name:
          "风起洛阳.Feng.Qi.Luo.Yang.2021.E02.2160p.WEB-DL.H265.DDP5.1-OurTV.mkv",
        season: "S01",
        episode: "E02",
      },
      {
        file_id: "63dc925f39a2d687f26b40b4b99540960aadccf7",
        parent_file_id: "63dc925a9a61f36aa68044ebb0d4b1133cba85d1",
        file_name:
          "风起洛阳.Feng.Qi.Luo.Yang.2021.E01.2160p.WEB-DL.H265.DDP5.1-OurTV.mkv",
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
        name: "风起洛阳",
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
        file_id: "63dc92539788b08e681d487fa9eda32cbb165ab9",
        parent_file_id: "tv",
        name: "风起洛阳.4K.2021.去片头片尾+原版",
      },
      {
        file_id: "63dc9253daef7f6bc0554df9bb5d46739ceca658",
        parent_file_id: "63dc92539788b08e681d487fa9eda32cbb165ab9",
        name: "风起洛阳.4K.2021.去片头片尾.内嵌简中",
      },
      {
        file_id: "63dc9257e9c46c1af4cc495a83e9b4bb8f493bd6",
        parent_file_id: "63dc92539788b08e681d487fa9eda32cbb165ab9",
        name: "风起洛阳.4K.2021.去片头片尾.内封简中",
      },
      {
        file_id: "63dc925a9a61f36aa68044ebb0d4b1133cba85d1",
        parent_file_id: "63dc925afa832733bb5f4f33a116163dce6eb37b",
        name: "风起洛阳.6.7.Feng.Qi.Luo.Yang.EP01-39.2021.2160p.WEB-DL.H265.DDP5.1-OurTV",
      },
      {
        file_id: "63dc925afa832733bb5f4f33a116163dce6eb37b",
        parent_file_id: "63dc92539788b08e681d487fa9eda32cbb165ab9",
        name: "4K原版",
      },
      {
        file_id: id,
        parent_file_id: "root",
        name: "tv",
      },
    ]);
  });
});
