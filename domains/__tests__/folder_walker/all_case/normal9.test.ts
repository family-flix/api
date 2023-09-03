/**
 * __root/name1/s01/name1.s01.e01.mp4@@正常9
 */
import { describe, test, expect, vi, afterEach } from "vitest";

import { FolderWalker } from "@/domains/walker";
import {
  fetch_files_factory,
  add_parsed_infos_when_walk,
  adding_file_safely,
} from "@/domains/walker/utils";
import { Folder } from "@/domains/folder";
import { store_factory } from "@/store";

import { op } from "../../store";
import { simple_folders } from "../../utils";

describe("detect a tv dir", () => {
  const store = store_factory(op);
  afterEach(async () => {
    await op.clear_dataset("episode");
    await op.clear_dataset("season");
    await op.clear_dataset("tv");
    await op.clear_dataset("folder");
  });
  test("normal9", async () => {
    const { user_id, drive_id } = {
      user_id: "123",
      drive_id: "123",
    };
    const data = {
      file_id: "tv",
      name: "tv",
      parent_file_id: "root",
      type: "folder",
      items: [
        {
          file_id: "名称",
          name: "名称",
          parent_file_id: "tv",
          type: "folder",
          items: [
            {
              file_id: "S01",
              name: "S01",
              parent_file_id: "名称",
              type: "folder",
              items: [
                {
                  file_id: "E01",
                  name: "名称.S01.E01.mkv",
                  parent_file_id: "S01",
                },
              ],
            },
          ],
        },
      ],
    };
    const detector = new FolderWalker();
    detector.on_file = async (folder) => {
      await adding_file_safely(folder, { user_id, drive_id }, store);
    };
    const handle_err = vi.fn();
    const handle_warning = vi.fn();
    detector.on_error = handle_err;
    detector.on_warning = handle_warning;
    detector.on_episode = async (tasks) => {
      await add_parsed_infos_when_walk(
        tasks,
        {
          user_id,
          drive_id,
        },
        store
      );
    };
    const folder = new Folder("tv", {
      client: fetch_files_factory({
        tree: data,
      }),
    });
    await folder.profile();
    const r1 = await detector.run(folder);
    expect(r1.error).toBe(null);
    if (r1.error) {
      return;
    }
    expect(handle_err).toBeCalledTimes(0);
    expect(handle_warning).toBeCalledTimes(0);
    const episodes_resp = await store.find_episodes();
    expect(episodes_resp.error).toBe(null);
    if (episodes_resp.error) {
      return;
    }
    expect(episodes_resp.data.length).toBe(1);
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
        file_id: "E01",
        file_name: "名称.S01.E01.mkv",
        parent_file_id: "S01",
        season: "S01",
        episode: "E01",
      },
    ]);
    const r5 = await store.find_seasons();
    expect(r5.error).toBe(null);
    if (r5.error) {
      return;
    }
    expect(r5.data.length).toBe(1);
    expect(r5.data.map((s) => s.season)).toStrictEqual(["S01"]);
    const tvs_resp = await store.find_parsed_tv_list();
    expect(tvs_resp.error).toBe(null);
    if (tvs_resp.error) {
      return;
    }
    expect(tvs_resp.data.length).toBe(1);
    const folder_resp = await store.find_files({ drive_id });
    expect(folder_resp.error).toBe(null);
    if (folder_resp.error) {
      return;
    }
    expect(folder_resp.data.length).toBe(4);
    expect(
      simple_folders(
        folder_resp.data.map((f) => {
          const { file_id, name, parent_file_id } = f;
          return {
            file_id,
            name,
            parent_file_id,
          };
        })
      )
    ).toStrictEqual(
      simple_folders([
        {
          file_id: "tv",
          name: "tv",
          parent_file_id: "root",
        },
        {
          file_id: "名称",
          name: "名称",
          parent_file_id: "tv",
        },
        {
          file_id: "S01",
          name: "S01",
          parent_file_id: "名称",
        },
        {
          file_id: "E01",
          name: "名称.S01.E01.mkv",
          parent_file_id: "S01",
        },
      ])
    );
  });
});
