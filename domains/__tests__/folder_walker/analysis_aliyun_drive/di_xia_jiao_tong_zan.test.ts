require("dotenv").config();
import { describe, test, expect, beforeEach } from "vitest";

import { fetch_files_factory } from "@/domains/walker/utils";
import { data, id } from "@/domains/__tests__/mock/di_xia_jiao_tong_zan";
import { analysis_aliyun_drive } from "@/domains/walker/analysis_aliyun_drive";

import { test_store as store } from "../../store";

describe("detect a tv dir", () => {
  const { user_id, drive_id } = {
    user_id: "123",
    drive_id: "123",
  };
  beforeEach(async () => {
    const tables = [
      "aliyun_drive",
      "episode",
      "season",
      "tv",
      "folder",
      "searched_tv",
      "async_task",
    ];
    for (let i = 0; i < tables.length; i += 1) {
      const table = tables[i];
      await store.operation.clear_dataset(table);
    }
  });
  test("地下交通站", async () => {
    const adding_res = await store.add_aliyun_drive({
      id: drive_id,
      name: "",
      nick_name: "",
      user_name: "",
      device_id: "",
      user_id,
      drive_id: "",
      app_id: "",
      aliyun_user_id: "",
      avatar: "",
      root_folder_id: id,
    });
    expect(adding_res.error).toBe(null);
    if (adding_res.error) {
      return;
    }
    const r = await analysis_aliyun_drive({
      user_id,
      drive_id,
      client: fetch_files_factory({
        tree: data,
      }),
      store,
      need_upload_image: false,
      wait_complete: true,
    });
    expect(r.error).toBe(null);
    if (r.error) {
      return;
    }
    /** ---------------------- 开始断言 ------------------ */
    /** --------- 查看索引到的影视剧信息 --------- */
    const searched_tv_res = await store.find_searched_tvs({});
    expect(searched_tv_res.error).toBe(null);
    if (searched_tv_res.error) {
      return;
    }
    expect(searched_tv_res.data.length).toBe(1);
    expect(
      searched_tv_res.data.map((f) => {
        const { name } = f;
        return {
          name,
        };
      })
    ).toStrictEqual([
      {
        name: "地下交通站",
      },
    ]);
    /** --------- 查看 tv --------- */
    const tvs_resp = await store.find_tvs();
    expect(tvs_resp.error).toBe(null);
    if (tvs_resp.error) {
      return;
    }
    expect(tvs_resp.data.length).toBe(1);
    expect(
      tvs_resp.data.map((t) => {
        const { name, original_name, searched_tv_id } = t;
        return {
          name,
          original_name,
          searched_tv_id: !!searched_tv_id,
        };
      })
    ).toStrictEqual([
      {
        name: "地下交通站",
        original_name: "",
        searched_tv_id: true,
      },
    ]);
  });
});
