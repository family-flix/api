import { Drive } from "@/domains/drive";
import { User } from "@/domains/user";
import { Result } from "@/types";
import { describe, it, expect } from "vitest";

import { test_store as store } from "../store";

describe("删除文件夹及子孙文件夹", async () => {
  it("1", async () => {
    await store.prisma.file.deleteMany({});
    const user_res = await (async () => {
      const exiting_res = await User.Existing({ email: "litaowork@aliyun.com" }, store);
      if (exiting_res.data) {
        return Result.Ok(exiting_res.data);
      }
      return User.Add({ email: "litaowork@aliyun.com", password: "Test123456." }, store);
    })();
    expect(user_res.error).toBe(null);
    if (user_res.error) {
      return;
    }
    const user = user_res.data;
    const drive_res = await (async () => {
      const existing_res = await Drive.Existing({ drive_id: 3123 }, store);
      if (existing_res.data) {
        return Result.Ok(existing_res.data);
      }
      return await Drive.Add(
        {
          payload: {
            app_id: "123",
            drive_id: 3123,
            device_id: "123",
            nick_name: "litao",
            user_name: "litao",
            avatar: "",
            refresh_token: "world",
            access_token: "hello",
            aliyun_user_id: "something",
            root_folder_id: "",
          },
          user_id: user.id,
        },
        store,
        {
          skip_ping: true,
        }
      );
    })();

    expect(drive_res.error).toBe(null);
    if (drive_res.error) {
      return;
    }
    const drive = drive_res.data;
    const r = await store.add_file({
      file_id: "01",
      parent_file_id: "root",
      parent_paths: "",
      type: 0,
      size: 0,
      name: "01",
      drive_id: drive.id,
      user_id: user.id,
    });
    expect(r.error).toBe(null);
    if (r.error) {
      return;
    }
    expect(r.data.name).toBe("01");
    const r2 = await store.find_file({
      name: "01",
    });
    expect(r2.error).toBe(null);
    if (r2.error) {
      return;
    }
    expect(r2.data).toBeTruthy();
    if (!r2.data) {
      return;
    }
    const r3 = await store.delete_file({
      name: "01",
    });
    expect(r3.error).toBe(null);
    if (r3.error) {
      return;
    }
    const r4 = await store.find_file({
      name: "01",
    });
    expect(r4.error).toBe(null);
    if (r4.error) {
      return;
    }
    expect(r4.data).toBe(null);
  });
});
