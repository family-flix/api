require("dotenv").config();
import { describe, test, expect } from "vitest";
import chalk from "chalk";

import {
  fetch_files_factory,
  need_skip_the_file_when_walk,
} from "@/domains/walker/utils";
import { data, id } from "@/mock/xu_ni_chun_feng_ye_ma";
import { data as updated_data } from "@/mock/xu_ni_chun_feng_ye_ma.update";
import { DiffTypes, FolderDiffer } from "@/domains/folder_differ";
import { Folder } from "@/domains/folder";

describe("detect a tv dir", () => {
  test("许你春风野马", async () => {
    const prev_folder = new Folder(id, {
      name: "tv",
      client: fetch_files_factory({
        size: 20,
        tree: data,
      }),
    });
    const folder = new Folder(id, {
      name: "tv",
      client: fetch_files_factory({
        size: 20,
        tree: updated_data,
      }),
    });
    const differ = new FolderDiffer({
      prev_folder,
      folder,
      unique_key: "name",
    });
    await differ.run();
    // console.log(differ.effects);
    differ.effects.map((e) => {
      // const tip =
      //   chalk.greenBright(e.payload.name) +
      //   " at " +
      //   chalk.yellowBright(e.payload.context.map((f) => f.name).join("/"));
      // if (e.type === DiffTypes.Adding) {
      //   console.log(chalk.redBright("新增"), tip);
      // }
      // if (e.type === DiffTypes.Deleting) {
      //   console.log(chalk.redBright("删除"), tip);
      // }
    });
    expect(differ.effects.length).toBe(4);
  });
});
