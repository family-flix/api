/**
 * @file 国漫
 */
import { describe, expect, test } from "vitest";
import dayjs from "dayjs";

import { ResourceSyncTask } from "@/domains/resource_sync_task/v2";
import { User } from "@/domains/user";
import { DatabaseStore } from "@/domains/store";
import { FakeDatabaseStore } from "@/domains/store/fake";
import { AliyunShareResourceClient } from "@/domains/clients/aliyun_resource";
import { AliyunDriveClient } from "@/domains/clients/alipan";
import { LocalFileDriveClient } from "@/domains/clients/local";
import { ResourceSyncTaskStatus } from "@/constants";

describe("资源同步", () => {
  test("在根目录有更新", async () => {
    const store = new FakeDatabaseStore();
    const user = new User({ id: "", token: "", store });
    const resource_client = new LocalFileDriveClient({
      unique_id: "",
    });
    const drive_client = new LocalFileDriveClient({
      unique_id: "",
    });
    const task = new ResourceSyncTask({
      profile: {
        created: dayjs().toDate(),
        updated: dayjs().toDate(),
        id: "",
        name: "测试同步资源",
        url: "",
        pwd: null,
        file_id: "",
        file_id_link_resource: "",
        file_name_link_resource: "",
        invalid: 0,
        status: ResourceSyncTaskStatus.WorkInProgress,
        user_id: user.id,
        media_id: "",
        drive_id: "",
      },
      assets: "",
      resource_client,
      drive_client,
      user,
      store,
    });
    const r = await task.run();
    expect(r.error).toBe(null);
    if (r.error) {
      return;
    }
  });
  test("在多个、多层级文件夹有更新", () => {});
  test("没有更新", () => {});
});
