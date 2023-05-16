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

import { describe, test, expect, vi, afterEach } from "vitest";

import { FolderWalker } from "@/domains/walker";
import { AliyunDriveFolder } from "@/domains/aliyundrive/folder";
import {
  fetch_files_factory,
  get_tv_profile_with_first_season_by_id,
  adding_episode_when_walk,
  adding_file_when_walk,
} from "@/domains/walker/utils";
import { data, id } from "@/domains/__tests__/mock/feng_qi_luo_yang";
import { store_factory } from "@/store";

import { op } from "../../store";

describe("detect a tv dir", () => {
  const store = store_factory(op);
  const fake_extra = {
    user_id: "123",
    drive_id: "123",
  };
  afterEach(async () => {
    await op.clear_dataset("episode");
    await op.clear_dataset("season");
    await op.clear_dataset("tv");
    await op.clear_dataset("folder");
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
      adding_file_when_walk(folder, fake_extra, store);
    };
    detector.on_episode = async (task) => {
      handle_episode(task);
      adding_episode_when_walk(task, fake_extra, store);
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

    /** --------- 查看 tv --------- */
    const tvs_resp = await store.find_maybe_tvs();
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
    const first_tv = tvs_resp.data[0];
    const profile_res = await get_tv_profile_with_first_season_by_id(
      first_tv.id,
      {
        user_id: "123",
      },
      store
    );
    expect(profile_res.error).toBe(null);
    if (profile_res.error) {
      return;
    }
    expect(profile_res.data).toStrictEqual({
      id: first_tv.id,
      name: "风起洛阳",
      original_name: "",
      overview: "",
      seasons: ["S01"],
      episodes: [
        {
          file_id: "63dc925780793a7c20ac4b47804087ceb79b228b",
          parent_file_id: "63dc9253daef7f6bc0554df9bb5d46739ceca658",
          file_name: "风起洛阳.EP01.4K.去片头片尾.mp4",
          season: "S01",
          episode: "E01",
        },
        {
          file_id: "63dc9257296dee72476f4cbdaac323a2e4790af7",
          parent_file_id: "63dc9253daef7f6bc0554df9bb5d46739ceca658",
          file_name: "风起洛阳.EP02.4K.去片头片尾.mp4",
          season: "S01",
          episode: "E02",
        },
        {
          file_id: "63dc92574d1be66e11084a7da470eba75dba1774",
          parent_file_id: "63dc9253daef7f6bc0554df9bb5d46739ceca658",
          file_name: "风起洛阳.EP03.4K.去片头片尾.mp4",
          season: "S01",
          episode: "E03",
        },
      ],
      first_episode: {
        file_id: "63dc925780793a7c20ac4b47804087ceb79b228b",
        parent_file_id: "63dc9253daef7f6bc0554df9bb5d46739ceca658",
        file_name: "风起洛阳.EP01.4K.去片头片尾.mp4",
        season: "S01",
        episode: "E01",
      },
    });
  });
});
