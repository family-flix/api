/**
 * 子文件夹的文件名和外面的相同，导致判断是新增的子文件夹的文件，后面又发现存在，就删除了
 */
require("dotenv").config();
import { describe, test, expect } from "vitest";

import { fetch_files_factory } from "@/domains/walker/utils";
import { data, id } from "@/domains/__tests__/mock/feng_yu_song_chun_gui";
import { data as updated_data } from "@/domains/__tests__/mock/feng_yu_song_chun_gui.updated";
import { FolderDiffer } from "@/domains/folder_differ";
import { AliyunDriveFolder } from "@/domains/aliyundrive/folder";

import { simple_folders } from "../utils";

describe("detect a tv dir", () => {
  test("风雨送春归", async () => {
    const prev_folder = new AliyunDriveFolder(id, {
      client: fetch_files_factory({
        size: 20,
        tree: data,
      }),
    });
    await prev_folder.profile();
    const folder = new AliyunDriveFolder(id, {
      client: fetch_files_factory({
        size: 20,
        tree: updated_data,
      }),
    });
    await folder.profile();
    const differ = new FolderDiffer({
      prev_folder,
      folder,
      unique_key: "name",
    });
    await differ.run();
    expect(differ.effects.length).toBe(1);
    expect(
      simple_folders(
        differ.effects.map((e) => {
          const {
            type,
            payload: { file_id, parent_file_id, name },
          } = e;
          console.log(file_id, parent_file_id, name);
          return {
            type,
            payload: {
              file_id,
              name,
              parent_file_id,
            },
          };
        })
      )
    ).toStrictEqual(
      simple_folders([
        {
          type: 0,
          payload: {
            file_id: "63dc925f39a2d687f26b40b4b99540960aadccf7",
            name: "04.mp4",
            parent_file_id: "63dc9253daef7f6bc0554df9bb5d46739ceca658",
          },
        },
      ])
    );
  });
});
