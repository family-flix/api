/**
 * __root/name1/s02/name1.s01.e01.mp4@@需要提示3
 * __root/name2/s01/name1.s01.e01.mp4@@需要提示4
 * @example
 * 魔幻手机.1+2.1080p
 *  魔幻手机2：傻妞归来
 *    Season01
 *      魔幻手机2:傻妞归来.S01S01.mkv
 *  魔幻手机
 *    Season01
 *      Magic.Mobile.Phone.S01E01.1080p.mkv
 * @result
 * 魔幻手机2:傻妞归来
 *  S01
 *    E01
 * Magic.Mobile.Phone
 *  S01
 *    E01
 */
import { describe, test, expect, vi, afterEach, beforeEach } from "vitest";

import { FolderWalker } from "@/domains/walker";
import { AliyunDriveFolder } from "@/domains/aliyundrive/folder";
import {
  fetch_files_factory,
  create_parsed_episode_and_parsed_tv,
  adding_file_when_walk,
} from "@/domains/walker/utils";
import { data, id } from "@/domains/__tests__/mock/magic_mobile_phone";

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

  test("魔幻手机", async () => {
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
      create_parsed_episode_and_parsed_tv(task, fake_extra, store);
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
    expect(handle_warning).toBeCalledTimes(6);
    expect(handle_folder).toBeCalledTimes(6);
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
        file_id: "63db41f73be0751bf4b64f65a3d94b36e3940614",
        parent_file_id: "63db41f0d70ce97d94224161b0177e33f77500fd",
        file_name: "魔幻手机2傻妞归来.S01E03.1080P.WEB-DL.mp4",
        season: "S02",
        episode: "E03",
      },
      {
        file_id: "63db41f74f9a22c94fcc4a6bb10f2ca075ecfe08",
        parent_file_id: "63db41f0d70ce97d94224161b0177e33f77500fd",
        file_name: "魔幻手机2傻妞归来.S01E02.1080P.WEB-DL.mp4",
        season: "S02",
        episode: "E02",
      },
      {
        file_id: "63db41f6953be29c35b04928aba681d7cd602f89",
        parent_file_id: "63db41f0d70ce97d94224161b0177e33f77500fd",
        file_name: "魔幻手机2傻妞归来.S01E01.1080P.WEB-DL.mp4",
        season: "S02",
        episode: "E01",
      },
      {
        file_id: "63db4201f8e472eac78d47719d9090b58921b81d",
        parent_file_id: "63db41fa388c89c629b646199b3fb79fc960fffa",
        file_name:
          "Magic.Mobile.Phone.2008.S01E03.WEB-DL.1080p.H265.AAC-HotWEB.mp4",
        season: "S01",
        episode: "E03",
      },
      {
        file_id: "63db4201e859d61670c0466e85b799535b6d07b1",
        parent_file_id: "63db41fa388c89c629b646199b3fb79fc960fffa",
        file_name:
          "Magic.Mobile.Phone.2008.S01E02.WEB-DL.1080p.H265.AAC-HotWEB.mp4",
        season: "S01",
        episode: "E02",
      },
      {
        file_id: "63db420016e5c61c224f4cfca5f353b9b67bffbb",
        parent_file_id: "63db41fa388c89c629b646199b3fb79fc960fffa",
        file_name:
          "Magic.Mobile.Phone.2008.S01E01.WEB-DL.1080p.H265.AAC-HotWEB.mp4",
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
    expect(season_resp.data.map((s) => s.season)).toStrictEqual(["S02", "S01"]);
    /** --------- 查看 tv --------- */
    const tvs_resp = await store.find_parsed_tv_list();
    expect(tvs_resp.error).toBe(null);
    if (tvs_resp.error) {
      return;
    }
    expect(tvs_resp.data.length).toBe(2);
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
        name: "魔幻手机",
        original_name: "",
      },
      {
        name: "",
        original_name: "Magic.Mobile.Phone",
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
        file_id: "63db41efa25d5811df8f4b2aa362ab828c007eb6",
        parent_file_id: id,
        name: "魔幻手机.1+2.1080P.国语中字",
      },
      {
        file_id: "63db41f031ab0c953644441ab9a17ce7bb15b87d",
        parent_file_id: "63db41efa25d5811df8f4b2aa362ab828c007eb6",
        name: "M 魔幻手机2：傻妞归来 (2014)",
      },
      {
        file_id: "63db41f0d70ce97d94224161b0177e33f77500fd",
        parent_file_id: "63db41f031ab0c953644441ab9a17ce7bb15b87d",
        name: "Season 1",
      },
      {
        file_id: "63db41fa388c89c629b646199b3fb79fc960fffa",
        parent_file_id: "63db41faef6e2397c93d417492847f038fab64f2",
        name: "Season 1",
      },
      {
        file_id: "63db41faef6e2397c93d417492847f038fab64f2",
        parent_file_id: "63db41efa25d5811df8f4b2aa362ab828c007eb6",
        name: "M 魔幻手机 (2008)",
      },
      {
        file_id: id,
        parent_file_id: "root",
        name: "tv",
      },
    ]);
  });
});
