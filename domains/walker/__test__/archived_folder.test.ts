import { describe, test, expect, vi } from "vitest";

import { fetch_files_factory } from "@/domains/walker/utils";
import { FolderWalker } from "@/domains/walker";
import { Folder } from "@/domains/folder";

describe("已归档的文件夹", () => {
  test("安乐传", async () => {
    const walker = new FolderWalker({});
    const folder = new Folder("media", {
      client: fetch_files_factory({
        tree: {
          parent_file_id: "root",
          file_id: "media",
          name: "media",
          items: [
            {
              file_id: "1",
              name: "A 安乐传.S01.2023",
              parent_file_id: "media",
              type: "folder",
              items: [
                {
                  file_id: "1_1",
                  name: "A 安乐传.S01E01.2023.mp4",
                  parent_file_id: "1",
                  type: "file",
                },
                {
                  file_id: "1_2",
                  name: "A 安乐传.S01E02.2023.mp4",
                  parent_file_id: "1",
                  type: "file",
                },
              ],
            },
          ],
        },
      }),
    });
    const fn = vi.fn((v) => v);
    walker.on_episode = (v) => {
      return fn(v);
    };
    await walker.run(folder);
    /** ---------------------- 开始断言 ------------------ */
    expect(fn).toBeCalledTimes(2);
    expect(fn.mock.calls[0]).toStrictEqual([
      {
        _position: "normal9",
        tv: {
          name: "安乐传",
          original_name: "",
          file_id: "1",
          file_name: "A 安乐传.S01.2023",
        },
        season: {
          season: "S01",
          file_id: "1",
          file_name: "A 安乐传.S01.2023",
        },
        episode: {
          episode: "E01",
          file_id: "1_1",
          file_name: "A 安乐传.S01E01.2023.mp4",
          parent_file_id: "1",
          parent_ids: "media/1",
          parent_paths: "/A 安乐传.S01.2023",
          size: 0,
        },
      },
    ]);
    expect(fn.mock.calls[1]).toStrictEqual([
      {
        _position: "normal9",
        tv: {
          name: "安乐传",
          original_name: "",
          file_id: "1",
          file_name: "A 安乐传.S01.2023",
        },
        season: {
          season: "S01",
          file_id: "1",
          file_name: "A 安乐传.S01.2023",
        },
        episode: {
          episode: "E02",
          file_id: "1_2",
          file_name: "A 安乐传.S01E02.2023.mp4",
          parent_file_id: "1",
          parent_ids: "media/1",
          parent_paths: "/A 安乐传.S01.2023",
          size: 0,
        },
      },
    ]);
  });
});
