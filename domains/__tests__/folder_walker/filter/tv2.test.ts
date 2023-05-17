/**
 *
 */

import { describe, test, expect, vi, beforeEach } from "vitest";

import { data, id } from "@/domains/__tests__/mock/tv2";
import { walk_drive } from "@/domains/walker/analysis_aliyun_drive";
import { fetch_files_factory } from "@/domains/walker/utils";

import { test_store as store } from "../../store";
import { simple_folders } from "../../utils";

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
      "async_task",
    ];
    for (let i = 0; i < tables.length; i += 1) {
      const table = tables[i];
      await store.operation.clear_dataset(table);
    }
  });
  test("tv2", async () => {
    const files = [
      {
        name: "tv/鸡毛飞上天.2017.4K.国语内嵌",
        type: "folder",
      },
      {
        name: "tv/风吹半夏[全36集]国语中字.Wild.Bloom.2022.2160p.WEB-DL.H265.DDP5.1/Wild.Bloom.S01E03.2022.2160p.WEB-DL.H265.DDP5.1-BlackTV.mkv",
        type: "file",
      },
    ];
    const adding_res = await store.add_drive({
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
    const r = await walk_drive({
      user_id,
      drive_id,
      client: fetch_files_factory({
        tree: data,
      }),
      store,
      files,
      need_upload_image: false,
      wait_complete: true,
    });
    expect(r.error).toBe(null);
    if (r.error) {
      return;
    }
    /** ---------------------- 开始断言 ------------------ */
    /** --------- 查看 episode --------- */
    const episodes_resp = await store.find_episodes();
    expect(episodes_resp.error).toBe(null);
    if (episodes_resp.error) {
      return;
    }
    expect(episodes_resp.data.length).toBe(4);
    expect(
      episodes_resp.data.map((e) => {
        const { file_id, file_name, parent_file_id, episode, season } = e;
        return {
          file_id,
          file_name,
          parent_file_id,
          episode,
          season,
        };
      })
    ).toStrictEqual([
      {
        file_id: "63db407d1cf4ba38c1404fbbaa33b93dc7ad90c7",
        file_name: "鸡毛飞上天 - S01E03 - 第 3 集.mp4",
        parent_file_id: "63db4079484789bb30a046839df110d89d7aaa93",
        episode: "E03",
        season: "S01",
      },
      {
        file_id: "63db407c2cc2d175e1ba4bac987b3de8af067ea4",
        file_name: "鸡毛飞上天 - S01E02 - 第 2 集.mp4",
        parent_file_id: "63db4079484789bb30a046839df110d89d7aaa93",
        episode: "E02",
        season: "S01",
      },
      {
        file_id: "63db407c3ab9c3eb27ef491586f0537f110d7584",
        file_name: "鸡毛飞上天 - S01E01 - 第1集.mp4",
        parent_file_id: "63db4079484789bb30a046839df110d89d7aaa93",
        episode: "E01",
        season: "S01",
      },
      {
        file_id: "63db41373fd518229f9245db847eb869f4304b7d",
        file_name:
          "Wild.Bloom.S01E03.2022.2160p.WEB-DL.H265.DDP5.1-BlackTV.mkv",
        parent_file_id: "63db4137d5819bd215724ac884cb789d5b6b01ee",
        episode: "E03",
        season: "S01",
      },
    ]);
    /** --------- 查看 season --------- */
    const season_resp = await store.find_seasons();
    expect(season_resp.error).toBe(null);
    if (season_resp.error) {
      return;
    }
    expect(season_resp.data.map((s) => s.season)).toStrictEqual(["S01", "S01"]);
    /** --------- 查看 tv --------- */
    const tvs_resp = await store.find_parsed_tv_list();
    expect(tvs_resp.error).toBe(null);
    if (tvs_resp.error) {
      return;
    }
    expect(
      tvs_resp.data.map((t) => {
        const { name, original_name } = t;
        return {
          name,
          original_name,
        };
      })
    ).toStrictEqual([
      {
        name: "鸡毛飞上天",
        original_name: "",
      },
      {
        name: "风吹半夏",
        original_name: "Wild.Bloom",
      },
    ]);
    /** --------- 查看文件夹 --------- */
    const folders_resp = await store.find_files(
      {
        drive_id,
      },
      {
        sorts: [
          {
            key: "file_id",
            order: "ASC",
          },
        ],
      }
    );
    expect(folders_resp.error).toBe(null);
    if (folders_resp.error) {
      return;
    }
    expect(
      simple_folders(
        folders_resp.data.map((f) => {
          const { file_id, name, parent_file_id } = f;
          return {
            file_id,
            name,
            parent_file_id,
          };
        })
      )
    ).toStrictEqual(
      simple_folders([
        {
          file_id: "63db41373fd518229f9245db847eb869f4304b7d",
          name: "Wild.Bloom.S01E03.2022.2160p.WEB-DL.H265.DDP5.1-BlackTV.mkv",
          parent_file_id: "63db4137d5819bd215724ac884cb789d5b6b01ee",
        },
        {
          file_id: "63db4137d5819bd215724ac884cb789d5b6b01ee",
          name: "风吹半夏[全36集]国语中字.Wild.Bloom.2022.2160p.WEB-DL.H265.DDP5.1",
          parent_file_id: id,
        },
        {
          file_id: "63db407c3ab9c3eb27ef491586f0537f110d7584",
          name: "鸡毛飞上天 - S01E01 - 第1集.mp4",
          parent_file_id: "63db4079484789bb30a046839df110d89d7aaa93",
        },
        {
          file_id: "63db407c2cc2d175e1ba4bac987b3de8af067ea4",
          name: "鸡毛飞上天 - S01E02 - 第 2 集.mp4",
          parent_file_id: "63db4079484789bb30a046839df110d89d7aaa93",
        },
        {
          file_id: "63db407d1cf4ba38c1404fbbaa33b93dc7ad90c7",
          name: "鸡毛飞上天 - S01E03 - 第 3 集.mp4",
          parent_file_id: "63db4079484789bb30a046839df110d89d7aaa93",
        },
        {
          file_id: "63db4079484789bb30a046839df110d89d7aaa93",
          name: "Season 1",
          parent_file_id: "63db4079da90fead1eb34845ae0e1884fa37bf12",
        },
        {
          file_id: "63db4079da90fead1eb34845ae0e1884fa37bf12",
          name: "鸡毛飞上天.2017.4K.国语内嵌",
          parent_file_id: id,
        },
        {
          file_id: id,
          name: "tv",
          parent_file_id: "root",
        },
      ])
    );
  });
});
