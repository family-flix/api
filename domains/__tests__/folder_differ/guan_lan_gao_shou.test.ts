require("dotenv").config();
import { describe, test, expect } from "vitest";

import {
  fetch_files_factory,
  need_skip_the_file_when_walk,
} from "@/domains/walker/utils";
import { data, id } from "@/mock/guan_lan_gao_shou";
import { data as updated_data } from "@/mock/guan_lan_gao_shou.updated";
import { FolderDiffer } from "@/domains/folder_differ";
import { Folder } from "@/domains/folder";

describe("detect a tv dir", () => {
  test("灌篮高手", async () => {
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
      unique_key: "file_id",
      filter(file) {
        const need_skip = need_skip_the_file_when_walk({
          target_file_name:
            "tv/1993.灌篮高手.102集收藏版+剧场版+漫画+SP.1080p/灌篮高手 合集",
          target_file_type: "folder",
          cur_file: {
            ...file,
            name: file.name,
            parent_paths: file.parent_paths,
          },
        });
        if (need_skip) {
          return false;
        }
        return true;
      },
    });
    await differ.run();
    // console.log(differ.effects);
    differ.effects.map((e) => {
      console.log(e.payload.name);
      console.log(e.payload.parents.map((f) => f.name).join("/"));
    });
    expect(differ.effects.length).toBe(3);
  });
});
