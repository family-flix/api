/**
 * @file 管理后台/删除指定电视剧
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { Drive } from "@/domains/drive";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id, include_file } = req.query as Partial<{
    id: string;
    /** 同时删除云盘内剧集文件 */
    include_file: string;
  }>;
  if (!id) {
    return e("缺少电视剧 id");
  }
  const t_res = await User.New(authorization, store);
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

  const episode_where: NonNullable<Parameters<typeof store.prisma.episode.findMany>[number]>["where"] = {
    tv_id: tv.id,
    user_id,
  };
  const episode_count = await store.prisma.episode.count({ where: episode_where });
  do {
    const list = await store.prisma.episode.findMany({
      where: episode_where,
      include: {
        parsed_episodes: true,
        play_histories: true,
      },
      skip: (page - 1) * page_size,
      take: page_size,
    });
    no_more = list.length + (page - 1) * page_size >= episode_count;
    page += 1;
    for (let i = 0; i < list.length; i += 1) {
      const episode = list[i];
      const { parsed_episodes, play_histories } = episode;
      for (let j = 0; j < parsed_episodes.length; j += 1) {
        const parsed_episode = parsed_episodes[j];
        const { drive_id, file_id } = parsed_episode;
        const drive_res = await Drive.Get({ id: drive_id, user_id, store });
        if (drive_res.error) {
          continue;
        }
        if (include_file) {
          const client = drive_res.data.client;
          const r = await client.to_trash(file_id);
          if (r.error) {
            has_error = true;
            continue;
          }
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
      const r = await store.delete_episode({ id: episode.id });
      console.log("store.delete_episode", r.error);
    }
  } while (no_more === false);

  if (has_error) {
    return e(Result.Err("删除过程出现错误，请重新删除"));
  }

  page = 1;
  no_more = false;
  const season_where: NonNullable<Parameters<typeof store.prisma.season.findMany>[number]>["where"] = {
    tv_id: tv.id,
    user_id,
  };
  const season_count = await store.prisma.season.count({ where: season_where });
  do {
    const list = await store.prisma.season.findMany({
      where: season_where,
      include: {
        parsed_season: true,
      },
      skip: (page - 1) * page_size,
      take: page_size,
    });
    no_more = list.length + (page - 1) * page_size >= season_count;
    page += 1;
    for (let i = 0; i < list.length; i += 1) {
      const season = list[i];
      const { parsed_season: parsed_seasons } = season;
      for (let j = 0; j < parsed_seasons.length; j += 1) {
        const parsed_season = parsed_seasons[j];
        const { drive_id, file_id } = parsed_season;
        if (file_id) {
          const drive_res = await Drive.Get({ id: drive_id, user_id, store });
          if (drive_res.error) {
            continue;
          }
          if (include_file) {
            const client = drive_res.data.client;
            const r = await client.to_trash(file_id);
            if (r.error) {
              has_error = true;
              continue;
            }
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
      await store.prisma.episode.deleteMany({
        where: {
          season_id: season.id,
        },
      });
      await store.prisma.parsed_episode.deleteMany({
        where: {
          parsed_season: {
            season_id: season.id,
          },
        },
      });
      await store.prisma.parsed_season.deleteMany({
        where: {
          season_id: season.id,
        },
      });
      const r = await store.delete_season({ id: season.id });
      console.log("store.delete_season", r.error);
    }
  } while (no_more === false);

  if (has_error) {
    return e(Result.Err("删除过程出现错误，请重新删除"));
  }

  page = 1;
  no_more = false;

  const tv_where: NonNullable<Parameters<typeof store.prisma.parsed_tv.findMany>[number]>["where"] = {
    tv_id: tv.id,
    user_id,
  };
  const tv_count = await store.prisma.parsed_tv.count({ where: tv_where });
  // console.log("parsed_tv_count", tv_count);
  do {
    const list = await store.prisma.parsed_tv.findMany({
      where: tv_where,
      skip: (page - 1) * page_size,
      take: page_size,
    });
    no_more = list.length + (page - 1) * page_size >= tv_count;
    page += 1;
    for (let i = 0; i < list.length; i += 1) {
      const parsed_tv = list[i];
      const { drive_id, file_id } = parsed_tv;
      if (file_id) {
        const drive_res = await Drive.Get({ id: drive_id, user_id, store });
        if (drive_res.error) {
          continue;
        }
        if (include_file) {
          const client = drive_res.data.client;
          const r = await client.to_trash(file_id);
          if (r.error) {
            has_error = true;
            continue;
          }
        }
        await store.delete_file({ file_id });
      }
      if (has_error) {
        continue;
      }
      const r = await store.delete_parsed_tv({ id: parsed_tv.id });
      // console.log("store.delete_parsed_tv", r.error);
    }
  } while (no_more === false);
  if (has_error) {
    return e(Result.Err("删除过程出现错误，请重新删除"));
  }
  await store.prisma.tv.delete({
    where: {
      id,
    },
  });
  res.status(200).json({
    code: 0,
    msg: "删除成功",
    data: null,
  });
}
