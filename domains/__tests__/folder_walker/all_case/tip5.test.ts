/**
 * __root/name2/s02/name1.s01.e01.mp4@@需要提示5
 */
import { describe, test, expect, vi, afterEach } from "vitest";

import { FolderWalker } from "@/domains/walker";
import {
  fetch_files_factory,
  adding_episode_when_walk,
  adding_file_when_walk,
} from "@/domains/walker/utils";
import { AliyunDriveFolder } from "@/domains/aliyundrive/folder";
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
  test("tip5", async () => {
    const { user_id, drive_id } = {
      user_id: "123",
      drive_id: "123",
    };
    const id = "tv";
    const data = {
      file_id: id,
      name: "tv",
      parent_file_id: "root",
      type: "folder",
      items: [
        {
          file_id: "名称二",
          name: "名称二",
          parent_file_id: id,
          type: "folder",
          items: [
            {
              file_id: "S02",
              name: "S02",
              parent_file_id: "名称二",
              type: "folder",
              items: [
                {
                  file_id: "E01",
                  name: "名称.S01.E01.mkv",
                  parent_file_id: "S02",
                },
              ],
            },
          ],
        },
      ],
    };
    const detector = new FolderWalker();
    detector.on_file = async (folder) => {
      await adding_file_when_walk(folder, { user_id, drive_id }, store);
    };
    const handle_err = vi.fn((v) => v);
    const handle_warning = vi.fn((v) => v);
    detector.on_error = handle_err;
    detector.on_warning = handle_warning;
    detector.on_episode = async (tasks) => {
      await adding_episode_when_walk(
        tasks,
        {
          user_id,
          drive_id,
        },
        store
      );
    };
    const folder = new AliyunDriveFolder("tv", {
      client: fetch_files_factory({
        tree: data,
      }),
    });
    await folder.profile();
    const r1 = await detector.detect(folder);
    expect(r1.error).toBe(null);
    if (r1.error) {
      return;
    }
    expect(handle_err).toBeCalledTimes(0);
    expect(handle_warning).toBeCalledTimes(1);
    expect(handle_warning).toHaveNthReturnedWith(1, {
      file_id: "E01",
      name: "名称.S01.E01.mkv",
      parent_paths: "tv/名称二/S02",
      _position: "tip5",
    });
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
        parent_file_id: "S02",
        season: "S01",
        episode: "E01",
      },
    ]);
    const season_resp = await store.find_seasons();
    expect(season_resp.error).toBe(null);
    if (season_resp.error) {
      return;
    }
    expect(season_resp.data.length).toBe(1);
    expect(season_resp.data.map((s) => s.season)).toStrictEqual(["S01"]);
    const tvs_resp = await store.find_maybe_tvs();
    expect(tvs_resp.error).toBe(null);
    if (tvs_resp.error) {
      return;
    }
    expect(tvs_resp.data.length).toBe(1);
    expect(tvs_resp.data.map((t) => t.name)).toStrictEqual(["名称"]);
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
          file_id: "名称二",
          name: "名称二",
          parent_file_id: "tv",
        },
        {
          file_id: "S02",
          name: "S02",
          parent_file_id: "名称二",
        },
        {
          file_id: "E01",
          name: "名称.S01.E01.mkv",
          parent_file_id: "S02",
        },
      ])
    );
  });
});
