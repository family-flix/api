/**
 * @file 管理后台/删除指定电视剧
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { User } from "@/domains/user";
import { AliyunDriveClient } from "@/domains/aliyundrive";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  if (!id) {
    return e("缺少电视剧 id");
  }
  const t_res = await User.New(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const tv_res = await store.find_tv({
    id,
    user_id,
  });
  if (tv_res.error) {
    return e(tv_res);
  }
  const tv = tv_res.data;
  if (tv === null) {
    return e("没有匹配的电视剧记录");
  }

  let has_error = false;
  let page = 1;
  let no_more = false;
  const page_size = 20;

  do {
    const list = await store.prisma.episode.findMany({
      where: {
        tv_id: tv.id,
        user_id,
      },
      include: {
        parsed_episodes: true,
        play_histories: true,
      },
      skip: (page - 1) * page_size,
      take: page_size,
    });
    console.log("删除", list.length, "个剧集");
    no_more = list.length === 0;
    page += 1;
    for (let i = 0; i < list.length; i += 1) {
      const episode = list[i];
      const { parsed_episodes, play_histories } = episode;
      for (let j = 0; j < parsed_episodes.length; j += 1) {
        const parsed_episode = parsed_episodes[j];
        const { drive_id, file_id, file_name } = parsed_episode;
        const client = new AliyunDriveClient({ drive_id, store });
        console.log("删除文件", file_name);
        const r = await client.delete_file(file_id);
        if (r.error) {
          has_error = true;
          continue;
        }
        await store.delete_file({ file_id });
        await store.delete_parsed_episode({ id: parsed_episode.id });
      }
      if (has_error) {
        continue;
      }
      for (let j = 0; j < play_histories.length; j += 1) {
        const history = play_histories[j];
        const { id } = history;
        await store.delete_history({ id });
      }
      await store.delete_episode({ id: episode.id });
    }
  } while (no_more === false);

  page = 1;
  no_more = false;
  do {
    const list = await store.prisma.season.findMany({
      where: {
        tv_id: tv.id,
        user_id,
      },
      include: {
        parsed_season: true,
      },
      skip: (page - 1) * page_size,
      take: page_size,
    });
    console.log("删除", list.length, "个季");
    no_more = list.length === 0;
    page += 1;
    for (let i = 0; i < list.length; i += 1) {
      const season = list[i];
      const { parsed_season: parsed_seasons } = season;
      for (let j = 0; j < parsed_seasons.length; j += 1) {
        const parsed_season = parsed_seasons[j];
        const { drive_id, file_id, file_name } = parsed_season;
        if (file_id) {
          const client = new AliyunDriveClient({ drive_id, store });
          console.log("删除文件", file_name);
          const r = await client.delete_file(file_id);
          if (r.error) {
            has_error = true;
            continue;
          }
          await store.delete_file({ file_id });
        }
        if (has_error) {
          continue;
        }
        await store.delete_parsed_season({ id: parsed_season.id });
      }
      if (has_error) {
        continue;
      }
      await store.delete_season({ id: season.id });
    }
  } while (no_more === false);

  page = 1;
  no_more = false;
  do {
    const list = await store.prisma.parsed_tv.findMany({
      where: {
        tv_id: tv.id,
        user_id,
      },
      include: {
        bind: true,
      },
      skip: (page - 1) * page_size,
      take: page_size,
    });
    console.log("删除", list.length, "个电视剧文件夹");
    no_more = list.length === 0;
    page += 1;
    for (let i = 0; i < list.length; i += 1) {
      const parsed_tv = list[i];
      const { drive_id, file_id, file_name } = parsed_tv;
      if (file_id) {
        const client = new AliyunDriveClient({ drive_id, store });
        console.log("删除文件", file_name);
        const r = await client.delete_file(file_id);
        if (r.error) {
          has_error = true;
          continue;
        }
        await store.delete_file({ file_id });
      }
      if (has_error) {
        continue;
      }
      await store.delete_parsed_tv({ id: parsed_tv.id });
    }
  } while (no_more === false);

  if (has_error) {
    return e("删除过程出现错误，请重新删除");
  }
  await store.prisma.tv.delete({
    where: {
      id,
    },
  });
  res.status(200).json({
    code: 0,
    msg: "",
    data: null,
  });
}
