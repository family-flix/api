import os from "os";
import path from "path";

import { describe, it, expect } from "vitest";

import { Application } from "@/domains/application/index";

import { DriveAnalysis } from "@/domains/analysis/v2";
import { Drive } from "@/domains/drive/v2";
import { User } from "@/domains/user/index";
import { DriveTypes } from "@/domains/drive/constants";
import { Job, TaskTypes } from "@/domains/job";
import { Result } from "@/types/index";
import { FileType } from "@/constants/index";

const app = new Application({
  root_path: path.resolve(os.homedir(), "Documents/workspaces/family-flix/test-output"),
  env: process.env as Record<string, string>,
});
const store = app.store;
const dir = path.resolve(os.homedir(), "Documents/workspaces/medias");
async function init() {
  const info = {
    email: "1218@qq.com",
    password: "123Abc.",
  };
  const r0 = await (async () => {
    const r = await User.GetByPassword(info, store);
    if (r.error) {
      if (r.code === 904) {
        // 没有用户
        const rr = await User.Create(info, store);
        if (rr.error) {
          return Result.Err(rr.error.message);
        }
        const user = rr.data;
        return Result.Ok(new User({ id: user.id, token: user.token, store }));
      }
      return Result.Err(r.error.message);
    }
    return Result.Ok(r.data);
  })();
  if (r0.error) {
    return Result.Err(r0.error.message);
  }
  const user = r0.data;
  const r1 = await (async () => {
    const r = await Drive.Get({
      unique_id: dir,
      user,
      store,
    });
    if (r.error) {
      if (r.code === 1004) {
        // 没有云盘
        const r1 = await Drive.Create({
          type: DriveTypes.LocalFolder,
          payload: {
            dir,
          },
          user,
          store,
        });
        if (r1.error) {
          return Result.Err(r1.error.message);
        }
        return Result.Ok(r1.data);
      }
      return Result.Err(r.error.message);
    }
    return Result.Ok(r.data);
  })();
  if (r1.error) {
    return Result.Err(r1.error.message);
  }
  const drive = r1.data;
  if (!drive.has_root_folder()) {
    await drive.set_root_folder({
      root_folder_id: dir,
      root_folder_name: "medias",
    });
  }
  return Result.Ok({
    user,
    drive,
  });
}

describe("filter file", () => {
  it("only process special file", async () => {
    const r = await init();
    if (r.error) {
      console.log("init failed because", r.error.message);
      return;
    }
    const { drive, user } = r.data;
    const job_res = await Job.New({
      desc: "索引云盘文件",
      type: TaskTypes.DriveAnalysis,
      unique_id: drive.id,
      user_id: user.id,
      app,
      store,
    });
    expect(job_res.error).toBe(null);
    if (job_res.error) {
      return;
    }
    const job = job_res.data;
    const r2 = await DriveAnalysis.New({
      unique_id: "",
      extra_scope: [],
      drive,
      store,
      user,
      assets: app.assets,
      on_print(v) {
        job.output.write(v);
      },
      on_error() {
        job.finish();
      },
    });
    expect(r2.error).toBe(null);
    if (r2.error) {
      console.log("create analysis failed, because", r2.error.message);
      return;
    }
    const analysis = r2.data;
    const r3 = await analysis.run2([
      {
        file_id: path.resolve(dir, "请回答1988 (2015)"),
        name: "请回答1988 (2015)",
        type: FileType.Folder,
      },
    ]);
    job.finish();
    if (r3.error) {
      console.log("analysis run failed, because", r3.error.message);
      return;
    }
    const parsed_source_count = await store.prisma.parsed_media_source.count({});
    expect(parsed_source_count).toBe(40);
    console.log("analysis success");
  }, 100000);
});
