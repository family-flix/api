/**
 * 文件夹名字改了，导致一直转存新的文件夹
 */
import { describe, test, expect } from "vitest";

// import { fetch_files_factory } from "@/domains/walker/utils";
import { data, id } from "~/mock/da_song_shao_nian_zhi2";
import { data as updated_data } from "~/mock1/aaa";
// import { data as updated_data } from "~/mock/da_song_shao_nian_zhi2.updated";
import { FolderDiffer } from "@/domains/folder_differ";
import { Folder } from "@/domains/folder";
import { MockFileClient } from "@/domains/clients/json";
import { patch_drive_file } from "@/domains/clients/utils";

describe("detect a tv dir", () => {
  test("大宋少年志", async () => {
    const prev_folder = new Folder(id, {
      client: new MockFileClient({
        data: patch_drive_file(data),
      }),
    });
    await prev_folder.profile();
    const folder = new Folder(id, {
      client: new MockFileClient({
        data: patch_drive_file(updated_data),
      }),
    });
    await folder.profile();
    const differ = new FolderDiffer({
      prev_folder,
      folder,
      unique_key: "name",
    });
    await differ.run();
    expect(differ.effects.length).toBe(2);
    differ.effects.map((e) => {
      console.log(e.payload.name);
      console.log(e.payload.parents);
    });
  });
});
