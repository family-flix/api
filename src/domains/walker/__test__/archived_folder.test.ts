/**
 * @file 测试解析文件夹
 * 参考 src/clients/local/create_mock_files.ts 在本机创建视频文件夹用于测试
 */
import path from "path";
import os from "os";

import { describe, test, expect, vi } from "vitest";

import { FolderWalker } from "@/domains/walker";
import { Folder } from "@/domains/folder";
import { LocalFileDriveClient } from "@/domains/clients/local";

describe("已归档的文件夹", () => {
  test.skip("有多个源的文件夹", async () => {
    const dir = path.resolve(os.homedir(), "Documents/workspaces/medias");
    const r = await LocalFileDriveClient.Get({
      unique_id: dir,
    });
    if (r.error) {
      console.log(r.error.message);
      return;
    }
    const client = r.data;
    const special_folder_name = "请回答1988 (2015)";
    const folder = new Folder(path.resolve(client.root_folder.id, special_folder_name), {
      name: special_folder_name,
      client,
    });
    const episode_handler = vi.fn((v) => v);
    const subtitle_handler = vi.fn((v) => v);
    const walker = new FolderWalker({});
    walker.debug = true;
    walker.on_episode = (v) => {
      const { tv, season, episode } = v;
      // console.log(tv.name || tv.original_name, season.season_text, episode.episode_text);
      return episode_handler(v);
    };
    walker.on_subtitle = (v) => {
      const { file_id, name, episode } = v;
      // console.log("find subtitle", name, "of", episode.name);
      return subtitle_handler(v);
    };
    await walker.run(folder);
    /** ---------------------- 开始断言 ------------------ */
    expect(episode_handler).toBeCalledTimes(40);
    expect(subtitle_handler).toBeCalledTimes(20);
    // console.log(walker.pending_files);
    // expect(walker.pending_files.length).toBe(5);
  });

  test("有多个季的电视剧", async () => {
    const dir = path.resolve(os.homedir(), "Documents/workspaces/medias");
    const r = await LocalFileDriveClient.Get({
      unique_id: dir,
    });
    if (r.error) {
      console.log(r.error.message);
      return;
    }
    const client = r.data;
    const special_folder_name = "德里罪案";
    const folder = new Folder(path.resolve(client.root_folder.id, special_folder_name), {
      name: special_folder_name,
      client,
    });
    const episode_handler = vi.fn((v) => v);
    const profile_handler = vi.fn((v) => v);
    const img_handler = vi.fn((v) => v);
    const subtitle_handler = vi.fn((v) => v);
    const walker = new FolderWalker({});
    walker.on_episode = (v) => {
      const { tv, season, episode } = v;
      // console.log(tv.name || tv.original_name, season.season_text, episode.episode_text);
      return episode_handler(v);
    };
    walker.on_profile = (v) => {
      const { type, name } = v;
      console.log("find profile", v);
      return profile_handler(v);
    };
    walker.on_img = (v) => {
      const { file_id, name, episode } = v;
      console.log("find img", name, "of", episode.name);
      return img_handler(v);
    };
    walker.on_subtitle = (v) => {
      const { file_id, name, episode } = v;
      console.log("find subtitle", name, "of", episode.name);
      return subtitle_handler(v);
    };
    await walker.run(folder);
    /** ---------------------- 开始断言 ------------------ */
    expect(episode_handler).toBeCalledTimes(2);
    expect(subtitle_handler).toBeCalledTimes(0);
    expect(profile_handler).toBeCalledTimes(1);
    // expect(img_handler).toBeCalledTimes(3);
    // expect(walker.pending_files.length).toBe(3);
  });
});
