/**
 * __root/name1/s01/e01.mp4__@@正常1
 * __root/name1/s01/name1.s01.e01.mp4@@正常9
 * @example
 * 中餐厅
 *  前5季
 *    S01
 *      正片
 *        01.mkv
 * @result
 * 中餐厅
 *  S01
 *    E01
 */

import { describe, test, expect, vi, afterEach, beforeEach } from "vitest";

import { FolderWalker } from "@/domains/walker";
import { Folder } from "@/domains/folder";
import { fetch_files_factory, add_parsed_infos_when_walk, adding_file_safely } from "@/domains/walker/utils";
// import { data, id } from "@/mock";

import { test_store as store } from "../../store";

const id = "media";
const data = {
  file_id: id,
  parent_file_id: "root",
  name: "media",
  type: "folder",
  items: [
    {
      file_id: "root_1",
      parent_file_id: id,
      name: "Z 中餐厅 第七季 [2023][附前6季][持续更新中]",
      type: "folder",
      items: [
        {
          file_id: "root_1_1",
          parent_file_id: "root_1",
          name: "前5季",
          type: "folder",
          items: [
            {
              file_id: "root_1_1_1",
              parent_file_id: "root_1_1",
              name: "S01 第一季",
              type: "folder",
              items: [
                {
                  file_id: "root_1_1_1_1",
                  parent_file_id: "root_1_1_1",
                  name: "正片",
                  type: "folder",
                  items: [
                    {
                      file_id: "root_1_1_1_1_1",
                      parent_file_id: "root_1_1_1_1",
                      name: "第11期：中餐厅答谢宴_Tacit0924.mp4",
                      type: "file",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

describe("detect a tv dir", () => {
  //   const fake_extra = {
  //     user_id: "123",
  //     drive_id: "123",
  //   };
  //   beforeEach(async () => {
  //     const tables = ["episode", "season", "tv", "folder"];
  //     for (let i = 0; i < tables.length; i += 1) {
  //       const table = tables[i];
  //       await store.operation.clear_dataset(table);
  //     }
  //   });

  test("一起同过窗", async () => {
    const detector = new FolderWalker({});
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
      //       console.log(folder);
      handle_folder(folder);
      return;
    };
    detector.on_episode = async (task) => {
        //     console.log(task);
      handle_episode(task);
      return;
    };
    const folder = new Folder(id, {
      client: fetch_files_factory({
        tree: data,
      }),
    });
    await folder.profile();
    const resp = await detector.run(folder);
    /** ---------------------- 开始断言 ------------------ */
    expect(resp.error).toBe(null);
    if (resp.error) {
      return;
    }
    expect(handle_error).toBeCalledTimes(0);
    expect(handle_warning).toBeCalledTimes(0);
    expect(handle_folder).toBeCalledTimes(6);
    expect(handle_episode).toBeCalledTimes(1);
  });
});
