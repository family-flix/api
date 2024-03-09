/**
 * @file 国漫
 */
import path from "path";
import os from "os";

import { describe, expect, test } from "vitest";

import { FileType } from "@/constants";

import { LocalFileDriveClient } from "../index";

describe("本地云盘", () => {
  test("fetch_parent_paths 1", async () => {
    const client = new LocalFileDriveClient({
      unique_id: "/",
    });
    const r = await client.fetch_parent_paths("/root/project1/sub1/medias/file.js", FileType.File);
    expect(r.error).toBe(null);
    if (r.error) {
      return;
    }
    expect(r.data).toStrictEqual([
      {
        file_id: "/",
        name: "",
        parent_file_id: "root",
        type: "folder",
      },
      {
        file_id: "/root",
        name: "root",
        parent_file_id: "/",
        type: "folder",
      },
      {
        file_id: "/root/project1",
        name: "project1",
        parent_file_id: "/root",
        type: "folder",
      },
      {
        file_id: "/root/project1/sub1",
        name: "sub1",
        parent_file_id: "/root/project1",
        type: "folder",
      },
      {
        file_id: "/root/project1/sub1/medias",
        name: "medias",
        parent_file_id: "/root/project1/sub1",
        type: "folder",
      },
      {
        file_id: "/root/project1/sub1/medias/file.js",
        name: "file.js",
        parent_file_id: "/root/project1/sub1/medias",
        type: "file",
      },
    ]);
  });

  test("fetch_parent_paths 2", async () => {
    const client = new LocalFileDriveClient({
      unique_id: path.resolve(os.homedir(), "Documents/workspaces/medias"),
    });
    const r = await client.fetch_parent_paths(
      path.resolve(os.homedir(), "Documents/workspaces/medias/请回答1988 (2015)"),
      FileType.Folder
    );
    expect(r.error).toBe(null);
    if (r.error) {
      return;
    }
    expect(r.data).toStrictEqual([
      {
        file_id: path.resolve(os.homedir(), "Documents/workspaces/medias"),
        name: "medias",
        parent_file_id: "root",
        type: "folder",
      },
      {
        file_id: path.resolve(os.homedir(), "Documents/workspaces/medias/请回答1988 (2015)"),
        name: "请回答1988 (2015)",
        parent_file_id: path.resolve(os.homedir(), "Documents/workspaces/medias"),
        type: "folder",
      },
    ]);
  });
});
