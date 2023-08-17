/**
 * 文件夹名字改了，导致一直转存新的文件夹
 */
import { describe, test, expect } from "vitest";

import { fetch_files_factory } from "@/domains/walker/utils";
import { data, id } from "@/mock/gong_su";
import { data as updated_data } from "@/mock/gong_su.updated";
import { FolderDiffer } from "@/domains/folder_differ";
import { Folder } from "@/domains/folder";

describe("detect a tv dir", () => {
  test("公诉", async () => {
    const prev_folder = new Folder(id, {
      client: fetch_files_factory({
        tree: data,
      }),
    });
    await prev_folder.profile();
    const folder = new Folder(id, {
      client: fetch_files_factory({
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
    expect(differ.effects.length).toBe(3);
    differ.effects.map((e) => {
      console.log(e.payload.name);
      console.log(e.payload.parents);
    });
  });
});
