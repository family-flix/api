/**
 * @todo
 * 1、prev_files 远比 cur_files 多的情况，因为 cur_files 会有一些无关文件，过滤后数量少于 prev_files，但两个的文件其实是完全相同的
 * 2、一个文件夹内，存在多个同名子文件夹的情况，prev_files 和 cur_files 都有同名
 */

import { describe, it, expect } from "vitest";

import { AliyunDriveFolder } from "@/domains/folder";
import { fetch_files_factory } from "@/domains/walker/utils";

import { DiffTypes, FolderDiffer } from "../../folder_differ";

describe("compare two folder", () => {
  it("adding", async () => {
    const prev_tree = {
      file_id: "1",
      parent_file_id: "root",
      name: "1",
      type: "folder",
      items: [
        {
          file_id: "1_1",
          parent_file_id: "1",
          name: "1_1",
          type: "folder",
        },
        {
          file_id: "1_2",
          parent_file_id: "1",
          name: "1_2.mp4",
          type: "file",
        },
        {
          file_id: "1_3",
          parent_file_id: "1",
          name: "1_3.mp4",
          type: "file",
        },
      ],
    };
    const cur_tree = {
      file_id: "1",
      parent_file_id: "root",
      name: "1",
      type: "folder",
      items: [
        {
          file_id: "1_1",
          parent_file_id: "1",
          name: "1_1_updated",
          type: "folder",
        },
        {
          file_id: "1_2",
          parent_file_id: "1",
          name: "1_2.mp4",
          type: "file",
        },
        {
          file_id: "1_3",
          parent_file_id: "1",
          name: "1_3.mp4",
          type: "file",
        },
        {
          file_id: "1_4",
          parent_file_id: "1",
          name: "1_4.mp4",
          type: "file",
        },
      ],
    };
    const folder1 = new AliyunDriveFolder("1", {
      name: "1",
      client: fetch_files_factory({ tree: cur_tree }),
    });
    const folder2 = new AliyunDriveFolder("1", {
      name: "1",
      client: fetch_files_factory({ tree: prev_tree }),
    });
    const differ = new FolderDiffer({
      folder: folder1,
      prev_folder: folder2,
      unique_key: "name",
    });
    await differ.run();
    expect(differ.effects.length).toBe(3);
    expect(differ.effects).toStrictEqual([
      {
        type: DiffTypes.Deleting,
        payload: {
          file_id: "1_1",
          parent_file_id: "1",
          name: "1_1",
          type: "folder",
          context: [
            {
              file_id: "1",
              name: "1",
            },
          ],
        },
      },
      {
        type: DiffTypes.Adding,
        payload: {
          file_id: "1_1",
          parent_file_id: "1",
          name: "1_1_updated",
          type: "folder",
          context: [
            {
              file_id: "1",
              name: "1",
            },
          ],
        },
      },
      {
        type: DiffTypes.Adding,
        payload: {
          file_id: "1_4",
          parent_file_id: "1",
          name: "1_4.mp4",
          type: "file",
          context: [
            {
              file_id: "1",
              name: "1",
            },
          ],
        },
      },
    ]);
  });

  it("the cur has two page", async () => {
    const prev_tree = {
      file_id: "1",
      parent_file_id: "root",
      name: "1",
      type: "folder",
      items: [
        {
          file_id: "1_1",
          parent_file_id: "1",
          name: "1_1",
          type: "folder",
          context: [
            {
              file_id: "1",
              name: "1",
            },
          ],
        },
        {
          file_id: "1_2",
          parent_file_id: "1",
          name: "1_2.mp4",
          type: "file",
          context: [
            {
              file_id: "1",
              name: "1",
            },
          ],
        },
        {
          file_id: "1_3",
          parent_file_id: "1",
          name: "1_3.mp4",
          type: "file",
          context: [
            {
              file_id: "1",
              name: "1",
            },
          ],
        },
      ],
    };
    const cur_tree = {
      file_id: "1",
      parent_file_id: "root",
      name: "1",
      type: "folder",
      items: [
        {
          file_id: "1_1",
          parent_file_id: "1",
          name: "1_1_updated",
          type: "folder",
        },
        {
          file_id: "1_2",
          parent_file_id: "1",
          name: "1_2.mp4",
          type: "file",
        },
        {
          file_id: "1_3",
          parent_file_id: "1",
          name: "1_3.mp4",
          type: "file",
        },
        {
          file_id: "1_4",
          parent_file_id: "1",
          name: "1_4.mp4",
          type: "file",
        },
        {
          file_id: "1_5",
          parent_file_id: "1",
          name: "1_5.mp4",
          type: "file",
        },
        {
          file_id: "1_6",
          parent_file_id: "1",
          name: "1_6.mp4",
          type: "file",
        },
      ],
    };
    const folder1 = new AliyunDriveFolder("1", {
      name: "1",
      client: fetch_files_factory({ size: 5, tree: cur_tree }),
    });
    const folder2 = new AliyunDriveFolder("1", {
      name: "1",
      client: fetch_files_factory({ size: 5, tree: prev_tree }),
    });
    const differ = new FolderDiffer({
      folder: folder1,
      prev_folder: folder2,
      unique_key: "name",
    });
    await differ.run();
    expect(differ.effects.length).toBe(5);
    expect(differ.effects).toStrictEqual([
      {
        type: DiffTypes.Adding,
        payload: {
          file_id: "1_1",
          parent_file_id: "1",
          name: "1_1_updated",
          type: "folder",
          context: [
            {
              file_id: "1",
              name: "1",
            },
          ],
        },
      },
      {
        type: DiffTypes.Adding,
        payload: {
          file_id: "1_4",
          parent_file_id: "1",
          name: "1_4.mp4",
          type: "file",
          context: [
            {
              file_id: "1",
              name: "1",
            },
          ],
        },
      },
      {
        type: DiffTypes.Adding,
        payload: {
          file_id: "1_5",
          parent_file_id: "1",
          name: "1_5.mp4",
          type: "file",
          context: [
            {
              file_id: "1",
              name: "1",
            },
          ],
        },
      },
      {
        type: DiffTypes.Adding,
        payload: {
          file_id: "1_6",
          parent_file_id: "1",
          name: "1_6.mp4",
          type: "file",
          context: [
            {
              file_id: "1",
              name: "1",
            },
          ],
        },
      },
      {
        type: DiffTypes.Deleting,
        payload: {
          file_id: "1_1",
          parent_file_id: "1",
          name: "1_1",
          type: "folder",
          context: [
            {
              file_id: "1",
              name: "1",
            },
          ],
        },
      },
    ]);
  });
});
