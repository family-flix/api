require("dotenv").config();
import { describe, test, expect } from "vitest";

import { fetch_files_factory } from "@/domains/walker/utils";
import { data, id } from "@/mock/feng_qi_luo_yang";
import { data as updated_data } from "@/mock/feng_qi_luo_yang.updated";
import { FolderDiffer } from "@/domains/folder_differ";
import { Folder } from "@/domains/folder";

describe("detect a tv dir", () => {
  test("风起洛阳", async () => {
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
