/**
 * __root/name1/name1.e01.mp4@@正常4
 * __root/name1/s01/s01.e01.mp4@@正常6
 * __root/name1/s01/name1.s01.e01.mp4@@正常9
 * @example
 * 青春校园剧
 *  毛骗1-3季
 *    毛骗3
 *      S03E01.mkv
 *    毛骗2
 *      S02E01.mkv
 *    毛骗1
 *      毛骗.SE01.01.mkv
 *    城市的边缘
 *      城市的边缘.E01.mkv
 * @result
 * 毛骗
 *  S01
 *    E01
 *  S02
 *    E01
 *  S03
 *    E01
 * 城市的边缘
 *  S01
 *    E01
 */

import { describe, test, expect, vi, afterEach, beforeEach } from "vitest";

import { FolderWalker } from "@/domains/walker";
import { Folder } from "@/domains/folder";
import {
  fetch_files_factory,
  add_parsed_infos_when_walk,
  adding_file_safely,
} from "@/domains/walker/utils";
import { data, id } from "@/mock/mao_pian";

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
  test("毛骗", async () => {
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
    const folder = new Folder(id, {
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
    expect(handle_folder).toBeCalledTimes(7);
    expect(handle_episode).toBeCalledTimes(12);
    /** --------- 查看 episode --------- */
    const episodes_resp = await store.find_episodes();
    expect(episodes_resp.error).toBe(null);
    if (episodes_resp.error) {
      return;
    }
    expect(episodes_resp.data.length).toBe(12);
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
        file_id: "63dc96f252556eecbd564d1b9be5230708d51b75",
        parent_file_id: "63dc96f2856c18bea2be4ba983e54db1c2bca8d4",
        file_name: "S03E03.mp4",
        season: "S03",
        episode: "E03",
      },
      {
        file_id: "63dc96f20ada7573b2594200822dd1045c948618",
        parent_file_id: "63dc96f2856c18bea2be4ba983e54db1c2bca8d4",
        file_name: "S03E02.mp4",
        season: "S03",
        episode: "E02",
      },
      {
        file_id: "63dc96f2ccd7dd305b9647a7855374e8cde049f6",
        parent_file_id: "63dc96f2856c18bea2be4ba983e54db1c2bca8d4",
        file_name: "S03E01.mp4",
        season: "S03",
        episode: "E01",
      },
      {
        file_id: "63dc96f3411a1bb83ae04be4a7d3b3436f543806",
        parent_file_id: "63dc96f3cf0e9bc51c9b460fb0f6d8bd7e0b3395",
        file_name: "S02E03.mp4",
        season: "S02",
        episode: "E03",
      },
      {
        file_id: "63dc96f30dee7aaf3e2048b4b68f11a0a3505740",
        parent_file_id: "63dc96f3cf0e9bc51c9b460fb0f6d8bd7e0b3395",
        file_name: "S02E02.mp4",
        season: "S02",
        episode: "E02",
      },
      {
        file_id: "63dc96f372cd445adb324a8f950ddc231553ce44",
        parent_file_id: "63dc96f3cf0e9bc51c9b460fb0f6d8bd7e0b3395",
        file_name: "S02E01.mp4",
        season: "S02",
        episode: "E01",
      },
      {
        file_id: "63dc96f13dd55851e0ba4c14bdef9c69fc811f89",
        parent_file_id: "63dc96f0e8dc8a19ae8b4f9292291f58ff29b39d",
        file_name: "毛骗.SE01.03.mp4",
        season: "S01",
        episode: "E03",
      },
      {
        file_id: "63dc96f04c538dea5ff14a26927c3906fbf75ddd",
        parent_file_id: "63dc96f0e8dc8a19ae8b4f9292291f58ff29b39d",
        file_name: "毛骗.SE01.02.mp4",
        season: "S01",
        episode: "E02",
      },
      {
        file_id: "63dc96f00bb19add8dcd44f8b854980e42e7ce03",
        parent_file_id: "63dc96f0e8dc8a19ae8b4f9292291f58ff29b39d",
        file_name: "毛骗.SE01.01.mp4",
        season: "S01",
        episode: "E01",
      },
      {
        file_id: "63dc96f0b485c85d1fb84cc1a0d05074bdc7db56",
        parent_file_id: "63dc96ef18a51e853c1f4b81a83da362fa18aab6",
        file_name: "城市的边缘 第03集 蓝光(1080P).mp4",
        season: "S01",
        episode: "E03",
      },
      {
        file_id: "63dc96f0edbc09a4e94942f4b1dd443cce99674e",
        parent_file_id: "63dc96ef18a51e853c1f4b81a83da362fa18aab6",
        file_name: "城市的边缘 第02集 蓝光(1080P).mp4",
        season: "S01",
        episode: "E02",
      },
      {
        file_id: "63dc96f0db3aaf4ad89f41779cbc7acbe149bca0",
        parent_file_id: "63dc96ef18a51e853c1f4b81a83da362fa18aab6",
        file_name: "城市的边缘 第01集 蓝光(1080P).mp4",
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
      "S01",
    ]);
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
        name: "毛骗",
        original_name: "",
      },
      {
        name: "城市的边缘",
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
    expect(folders_resp.data.length).toBe(7);
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
        file_id: "63dc96e88b079658f3814a248c23108418728260",
        parent_file_id: id,
        name: "青春校园剧（各种经典—满满的都是回忆）",
      },
      {
        file_id: "63dc96ef072a573e3d3f4d33830cf672104e9922",
        parent_file_id: "63dc96e88b079658f3814a248c23108418728260",
        name: "毛骗1-3季",
      },
      {
        file_id: "63dc96ef18a51e853c1f4b81a83da362fa18aab6",
        parent_file_id: "63dc96ef072a573e3d3f4d33830cf672104e9922",
        name: "城市的边缘（毛骗那些人的新剧）",
      },
      {
        file_id: "63dc96f0e8dc8a19ae8b4f9292291f58ff29b39d",
        parent_file_id: "63dc96ef072a573e3d3f4d33830cf672104e9922",
        name: "毛骗1 全20集（1080p）",
      },
      {
        file_id: "63dc96f2856c18bea2be4ba983e54db1c2bca8d4",
        parent_file_id: "63dc96ef072a573e3d3f4d33830cf672104e9922",
        name: "毛骗3 全11集 （720p）",
      },
      {
        file_id: "63dc96f3cf0e9bc51c9b460fb0f6d8bd7e0b3395",
        parent_file_id: "63dc96ef072a573e3d3f4d33830cf672104e9922",
        name: "毛骗2 全14集 （720p）",
      },
      {
        file_id: id,
        parent_file_id: "root",
        name: "tv",
      },
    ]);
  });
});
