/**
 *  __root/name1/name1.s01.e01.mp4@@正常10
 * @example
 * 老友记S03.Friends.1996.1080p
 *   Friends.S03E01.1080p
 * 老友记S02.Friends.1996.1080p
 *   Friends.S02E01.1080p
 * 老友记S01.Friends.1996.1080p
 *   Friends.S01E01.1080p
 * @result
 * 老友记S03
 *  S03
 *    E01
 *  S02
 *    E01
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
import { data, id } from "@/domains/__tests__/mock/friends";

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
  test("Friends", async () => {
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
    expect(handle_warning).toBeCalledTimes(0);
    expect(handle_folder).toBeCalledTimes(5);
    expect(handle_episode).toBeCalledTimes(8);
    /** --------- 查看 episode --------- */
    const episodes_resp = await store.find_episodes();
    expect(episodes_resp.error).toBe(null);
    if (episodes_resp.error) {
      return;
    }
    expect(episodes_resp.data.length).toBe(8);
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
        file_id: "63db45194a1430d186a7452c956ebc287df559c3",
        file_name:
          "Friends.S10E17E18.2003.1080p.Blu-ray.x265.AC3￡cXcY@FRDS.mkv",
        parent_file_id: "63db4515fad420351d6f41d9b41adf897a15346b",
        season: "S10",
        episode: "E17E18",
      },
      {
        file_id: "63db4516e69b4a9ef3c245aea5126337021363a1",
        file_name: "Friends.S10E16.2003.1080p.Blu-ray.x265.AC3￡cXcY@FRDS.mkv",
        parent_file_id: "63db4515fad420351d6f41d9b41adf897a15346b",
        season: "S10",
        episode: "E16",
      },
      {
        file_id: "63db451a9d572cb6599646efbf74b9a384b52666",
        file_name:
          "Friends.S09E23E24.2002.1080p.Blu-ray.x265.AC3￡cXcY@FRDS.mkv",
        parent_file_id: "63db45159897d19c898447dbba27149857d3c3ef",
        season: "S09",
        episode: "E23E24",
      },
      {
        file_id: "63db451a84beba3104a149248424b061aba4963f",
        file_name: "Friends.S09E22.2002.1080p.Blu-ray.x265.AC3￡cXcY@FRDS.mkv",
        parent_file_id: "63db45159897d19c898447dbba27149857d3c3ef",
        season: "S09",
        episode: "E22",
      },
      {
        file_id: "63db4517b4906baf649a426ba77d0d34b83df4cb",
        file_name: "Friends.S08E24.2001.1080p.Blu-ray.x265.AC3￡cXcY@FRDS.mkv",
        parent_file_id: "63db451553377f3ba41f45a7a20be71ac73332b7",
        season: "S08",
        episode: "E24",
      },
      {
        file_id: "63db4517caeb16a315e34e819ad3491193f5eec1",
        file_name: "Friends.S08E23.2001.1080p.Blu-ray.x265.AC3￡cXcY@FRDS.mkv",
        parent_file_id: "63db451553377f3ba41f45a7a20be71ac73332b7",
        season: "S08",
        episode: "E23",
      },
      {
        file_id: "63db4517292e86ce9c9f4863af74bf9ce93266ae",
        file_name: "Friends.S07E24.2000.1080p.Blu-ray.x265.AC3￡cXcY@FRDS.mkv",
        parent_file_id: "63db4515c9703ac4ee2e477ab5af29285febd20e",
        season: "S07",
        episode: "E24",
      },
      {
        file_id: "63db4517e2139536c83247309b1dc907aea8c634",
        file_name: "Friends.S07E23.2000.1080p.Blu-ray.x265.AC3￡cXcY@FRDS.mkv",
        parent_file_id: "63db4515c9703ac4ee2e477ab5af29285febd20e",
        season: "S07",
        episode: "E23",
      },
    ]);
    /** --------- 查看 season --------- */
    const season_resp = await store.find_seasons();
    expect(season_resp.error).toBe(null);
    if (season_resp.error) {
      return;
    }
    expect(season_resp.data.length).toBe(4);
    expect(season_resp.data.map((s) => s.season)).toStrictEqual([
      "S10",
      "S09",
      "S08",
      "S07",
    ]);
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
        name: "老友记S10",
        original_name: "Friends",
      },
    ]);
    /** --------- 查看文件夹 --------- */
    const folders_resp = await store.find_files({
      drive_id: fake_extra.drive_id,
    });
    expect(folders_resp.error).toBe(null);
    if (folders_resp.error) {
      return;
    }
    expect(folders_resp.data.length).toBe(5);
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
        file_id: id,
        name: "tv",
        parent_file_id: "root",
      },
      {
        file_id: "63db4515fad420351d6f41d9b41adf897a15346b",
        name: "老友记S10.Friends.2003.1080p.Blu-ray.x265.AC3￡cXcY@FRDS",
        parent_file_id: id,
      },
      {
        file_id: "63db45159897d19c898447dbba27149857d3c3ef",
        name: "老友记S09.Friends.2002.1080p.Blu-ray.x265.AC3￡cXcY@FRDS",
        parent_file_id: id,
      },
      {
        file_id: "63db451553377f3ba41f45a7a20be71ac73332b7",
        name: "老友记S08.Friends.2001.1080p.Blu-ray.x265.AC3￡cXcY@FRDS",
        parent_file_id: id,
      },
      {
        file_id: "63db4515c9703ac4ee2e477ab5af29285febd20e",
        name: "老友记S07.Friends.2000.1080p.Blu-ray.x265.AC3￡cXcY@FRDS",
        parent_file_id: id,
      },
    ]);
  });
});
