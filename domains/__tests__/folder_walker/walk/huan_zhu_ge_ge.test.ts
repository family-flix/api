/**
 * __root/name1/name1.e01.mp4@@正常4
 * __root/name1/name1.s01.e01.mp4@@正常10
 * __root/name1/e01.mp4__@@正常2
 * @example
 * 还珠格格
 *  还珠格格 三部全 1080p+4K
 *    还珠格格3
 *      还珠格格3.E01.mkv
 *    还珠格格3 4k
 *      还珠格格3天上人间.E01.4K.mkv
 *    还珠格格2
 *      还珠格格2.Princess.Pearl.II.E01.1080p.mkv
 *    还珠格格1 4K 国语中字
 *      4K
 *        E01.mkv
 *      1080p
 *        还珠格格.Princess.Pearl.E01.1080p.mkv
 * @result
 * 还珠格格
 *  S03
 *    E01
 *    E01
 *  S02
 *    E01
 *  S01
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
import { data, id } from "@/domains/__tests__/mock/huan_zhu_ge_ge";

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
  test("还珠格格", async () => {
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
    expect(handle_error).toBeCalledTimes(1);
    expect(handle_warning).toBeCalledTimes(0);
    expect(handle_folder).toBeCalledTimes(9);
    expect(handle_episode).toBeCalledTimes(15);
    /** --------- 查看 episode --------- */
    const episodes_resp = await store.find_episodes();
    expect(episodes_resp.error).toBe(null);
    if (episodes_resp.error) {
      return;
    }
    expect(episodes_resp.data.length).toBe(15);
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
        file_id: "63dc95e161f5dacb385f478aa6b43872fe58240c",
        parent_file_id: "63dc95de798e476c41764ab5b999fc26b7d98fcb",
        file_name: "还珠格格3.E40.DVDRip.x264.AC3-CMCT.mkv",
        season: "S03",
        episode: "E40",
      },
      {
        file_id: "63dc95dfda89d139db7c4b039059af188e0a804f",
        parent_file_id: "63dc95de798e476c41764ab5b999fc26b7d98fcb",
        file_name: "还珠格格3.E39.DVDRip.x264.AC3-CMCT.mkv",
        season: "S03",
        episode: "E39",
      },
      {
        file_id: "63dc95e107652b135d4046899ab81a91ec033ba2",
        parent_file_id: "63dc95de798e476c41764ab5b999fc26b7d98fcb",
        file_name: "还珠格格3.E38.DVDRip.x264.AC3-CMCT.mkv",
        season: "S03",
        episode: "E38",
      },
      {
        file_id: "63dc95e91eed28af9ace419191837b4f7c170153",
        parent_file_id: "63dc95e588dd2b58cdd941829352d333c389f996",
        file_name: "还珠格格3天上人间 第03集 4K.mp4",
        season: "S03",
        episode: "E03",
      },
      {
        file_id: "63dc95e94f9cfe4758a14557bc888d841cb6e9c4",
        parent_file_id: "63dc95e588dd2b58cdd941829352d333c389f996",
        file_name: "还珠格格3天上人间 第02集 4K.mp4",
        season: "S03",
        episode: "E02",
      },
      {
        file_id: "63dc95e9bcc29a22e32641b29aa36f026dc55353",
        parent_file_id: "63dc95e588dd2b58cdd941829352d333c389f996",
        file_name: "还珠格格3天上人间 第01集 4K.mp4",
        season: "S03",
        episode: "E01",
      },
      {
        file_id: "63dc95ddd4b0f3cb459f472e883de557512db2a5",
        parent_file_id: "63dc95dcc5ecf4dcd26943098daaa41a7c47401f",
        file_name: "还珠格格2.Princess.Pearl.II.E03.1080P.H265.AAC-DHTCLUB.mp4",
        season: "S02",
        episode: "E03",
      },
      {
        file_id: "63dc95de5c38ca15c5254f929d11224165499fc4",
        parent_file_id: "63dc95dcc5ecf4dcd26943098daaa41a7c47401f",
        file_name: "还珠格格2.Princess.Pearl.II.E02.1080P.H265.AAC-DHTCLUB.mp4",
        season: "S02",
        episode: "E02",
      },
      {
        file_id: "63dc95deae8651ae50fc4278be89f77e5276d11a",
        parent_file_id: "63dc95dcc5ecf4dcd26943098daaa41a7c47401f",
        file_name: "还珠格格2.Princess.Pearl.II.E01.1080P.H265.AAC-DHTCLUB.mp4",
        season: "S02",
        episode: "E01",
      },
      {
        file_id: "63dc95e276e7eff6dcb94f3ba84d750225bf1458",
        parent_file_id: "63dc95e131e61bd2bf8d408cae00fc023a8543aa",
        file_name: "03.ts",
        season: "S01",
        episode: "E03",
      },
      {
        file_id: "63dc95e29a4d10f5adad4979acadad3107d0ebab",
        parent_file_id: "63dc95e131e61bd2bf8d408cae00fc023a8543aa",
        file_name: "02.ts",
        season: "S01",
        episode: "E02",
      },
      {
        file_id: "63dc95e337f90d9c14d1491190d7496a3c20327d",
        parent_file_id: "63dc95e131e61bd2bf8d408cae00fc023a8543aa",
        file_name: "01.ts",
        season: "S01",
        episode: "E01",
      },
      {
        file_id: "63dc95e37af6a1a1df454efd99c4d32d5fc354e3",
        parent_file_id: "63dc95e3892e8e3a7e70416eabf85b58e27ba311",
        file_name: "还珠格格1.Princess.Pearl.E03.1080P.H265.AAC-DHTCLUB.mp4",
        season: "S01",
        episode: "E03",
      },
      {
        file_id: "63dc95e4fd64396388024aa58d27d4743905e85b",
        parent_file_id: "63dc95e3892e8e3a7e70416eabf85b58e27ba311",
        file_name: "还珠格格1.Princess.Pearl.E02.1080P.H265.AAC-DHTCLUB.mp4",
        season: "S01",
        episode: "E02",
      },
      {
        file_id: "63dc95e43302735d34f94385853cd0c83c043c14",
        parent_file_id: "63dc95e3892e8e3a7e70416eabf85b58e27ba311",
        file_name: "还珠格格1.Princess.Pearl.E01.1080P.H265.AAC-DHTCLUB.mp4",
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
        name: "还珠格格",
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
        file_id: "63dc95dca1651dfc477b4ec3ac982fdca57b4e07",
        parent_file_id: id,
        name: "还珠格格",
      },
      {
        file_id: "63dc95dca420ee3f96274babaa357a6625ee40f5",
        parent_file_id: "63dc95dca1651dfc477b4ec3ac982fdca57b4e07",
        name: "还珠格格.三部全.1080P+4K",
      },
      {
        file_id: "63dc95dcc5ecf4dcd26943098daaa41a7c47401f",
        parent_file_id: "63dc95dca420ee3f96274babaa357a6625ee40f5",
        name: "还珠格格2 1080P 国语中字",
      },
      {
        file_id: "63dc95de798e476c41764ab5b999fc26b7d98fcb",
        parent_file_id: "63dc95dca420ee3f96274babaa357a6625ee40f5",
        name: "还珠格格3.2003.40集特别版+6部MV .繁体中字 无台标水印版",
      },
      {
        file_id: "63dc95e131e61bd2bf8d408cae00fc023a8543aa",
        parent_file_id: "63dc95e178c4dcb44ff34f4086fc799c4a204d50",
        name: "4K版",
      },
      {
        file_id: "63dc95e178c4dcb44ff34f4086fc799c4a204d50",
        parent_file_id: "63dc95dca420ee3f96274babaa357a6625ee40f5",
        name: "还珠格格1 1080P 4K 国语中字",
      },
      {
        file_id: "63dc95e3892e8e3a7e70416eabf85b58e27ba311",
        parent_file_id: "63dc95e178c4dcb44ff34f4086fc799c4a204d50",
        name: "1080版",
      },
      {
        file_id: "63dc95e588dd2b58cdd941829352d333c389f996",
        parent_file_id: "63dc95dca420ee3f96274babaa357a6625ee40f5",
        name: "还珠格格3 4k 2003",
      },
      {
        file_id: id,
        parent_file_id: "root",
        name: "tv",
      },
    ]);
  });
});
