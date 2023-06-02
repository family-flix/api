/**
 * @file 获取 tv 列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { store } from "@/store";
import { BaseApiResp, resultify } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { bytes_to_size } from "@/utils";
import { bind_for_parsed_tv } from "@prisma/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const {
    name,
    page: page_str = "1",
    page_size: page_size_str = "20",
  } = req.query as Partial<{
    name: string;
    page: string;
    page_size: string;
  }>;
  const { authorization } = req.headers;
  const t_resp = await User.New(authorization);
  if (t_resp.error) {
    return e(t_resp);
  }
  const { id: user_id } = t_resp.data;
  const page = Number(page_str);
  const page_size = Number(page_size_str);
  const where: NonNullable<Parameters<typeof store.prisma.tv.findMany>[0]>["where"] = {
    profile: {
      OR: name
        ? [
            {
              name: {
                contains: name,
              },
            },
            {
              original_name: {
                contains: name,
              },
            },
          ]
        : undefined,
    },
    user_id,
  };
  const count = await store.prisma.tv.count({
    where,
  });
  const list = await store.prisma.tv.findMany({
    where,
    include: {
      _count: true,
      profile: true,
      parsed_tvs: {
        include: {
          binds: {
            orderBy: {
              created: "desc",
            },
          },
        },
      },
      episodes: {
        include: {
          profile: true,
          _count: true,
          parsed_episodes: {
            select: {
              file_id: true,
              file_name: true,
              size: true,
            },
          },
        },
        orderBy: {
          episode_number: "desc",
        },
      },
      // seasons: {
      //   include: {
      //     profile: true,
      //     parsed_season: true,
      //   },
      //   orderBy: {
      //     season_number: "desc",
      //   },
      // },
    },
    orderBy: {
      profile: { first_air_date: "desc" },
    },
    skip: (page - 1) * page_size,
    take: page_size,
  });
  const data = {
    total: count,
    no_more: list.length + (page - 1) * page_size >= count,
    list: list.map((tv) => {
      const {
        id,
        profile,
        // seasons,
        episodes,
        parsed_tvs,
        _count,
      } = tv;
      const {
        name,
        original_name,
        overview,
        poster_path,
        first_air_date,
        popularity,
        episode_count,
        season_count,
        in_production,
      } = profile;
      const binds = parsed_tvs
        .filter((parsed_tv) => {
          const { binds } = parsed_tv;
          return !!binds;
        })
        .reduce((total, cur) => {
          return total.concat(cur.binds);
        }, [] as bind_for_parsed_tv[])
        .map((bind) => {
          const { id, url, file_id, name, invalid } = bind;
          return {
            id,
            url,
            file_id,
            file_name: name,
            invalid,
          };
        });
      const incomplete = episode_count !== 0 && episode_count !== _count.episodes;
      const episode_sources = episodes
        .map((episode) => {
          return episode._count.parsed_episodes;
        })
        .reduce((total, cur) => {
          return total + cur;
        }, 0);
      // const tips: { text: string[] }[] = [];
      const tips: string[] = [];
      // if (binds.length === 0 && incomplete) {
      //   tips.push(`该电视剧集数不全且缺少可同步的分享资源(${_count.episodes}/${episode_count})`);
      // }
      const valid_bind = (() => {
        if (binds.length === 0) {
          return null;
        }
        const valid_task = binds.find((b) => !b.invalid);
        if (!valid_task) {
          return null;
        }
        return {
          id: valid_task.id,
        };
      })();
      if (binds.length !== 0 && valid_bind === null) {
        tips.push("更新已失效");
      }
      const need_bind = (() => {
        if (!incomplete) {
          return false;
        }
        if (in_production && binds.length === 0) {
          return true;
        }
        if (valid_bind === null) {
          return true;
        }
        return false;
      })();
      if (in_production && incomplete && binds.length === 0) {
        tips.push("未完结但缺少同步任务");
      }
      if (!in_production && incomplete) {
        tips.push(`已完结但集数不完整，总集数 ${episode_count}，当前集数 ${_count.episodes}`);
      }
      const size_count = episodes
        .map((episode) => {
          return episode.parsed_episodes
            .map(({ size }) => {
              return size || 0;
            })
            .reduce((total, cur) => {
              return total + cur;
            }, 0);
        })
        .reduce((total, cur) => {
          return total + cur;
        }, 0);
      return {
        id,
        name,
        original_name,
        overview,
        poster_path,
        first_air_date,
        popularity,
        episode_count,
        season_count,
        cur_episode_count: _count.episodes,
        cur_season_count: _count.seasons,
        episode_sources,
        size_count,
        size_count_text: bytes_to_size(size_count),
        incomplete,
        need_bind,
        sync_task: incomplete && valid_bind ? valid_bind : null,
        tips,
      };
    }),
  };
  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
