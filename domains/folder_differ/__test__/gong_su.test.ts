import { describe, test, expect } from "vitest";

import { data, id } from "@/mock/gong_su";
import { data as updated_data } from "@/mock/gong_su.updated";
import { FolderDiffer } from "@/domains/folder_differ";
import { Folder } from "@/domains/folder";
import { MockFileClient } from "@/domains/clients/json";
import { patch_drive_file } from "@/domains/clients/utils";

describe("detect a tv dir", () => {
  test("公诉", async () => {
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
    expect(differ.effects.length).toBe(3);
    differ.effects.map((e) => {
      console.log(e.payload.name);
      console.log(e.payload.parents);
    });
  });
});
