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
    // parsed_tvs: {
    //   every: {
    //     bind: null,
    //   },
    // },
    user_id,
  };
  const count_resp = await resultify(store.prisma.tv.count.bind(store.prisma.tv))({
    where,
  });
  if (count_resp.error) {
    return e(count_resp);
  }
  const resp = await store.prisma.tv.findMany({
    where,
    // select: {
    //   episodes: {
    //     select: {
    //       parsed_episodes: {
    //         select: {
    //           size: true,
    //         }
    //       }
    //     }
    //   },
    // },
    include: {
      _count: true,
      profile: true,
      parsed_tvs: {
        include: {
          bind: true,
        },
      },
      episodes: {
        include: {
          profile: true,
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
    total: count_resp.data,
    no_more: (() => {
      if (page * page_size >= count_resp.data) {
        return true;
      }
      return false;
    })(),
    list: resp.map((tv) => {
      const {
        id,
        profile,
        // seasons,
        episodes,
        parsed_tvs,
        _count,
      } = tv;
      const { name, original_name, overview, poster_path, first_air_date, episode_count, season_count } = profile;
      const binds = parsed_tvs
        .filter((parsed_tv) => {
          const { bind } = parsed_tv;
          return !!bind;
        })
        .map((parsed_tv) => {
          const { id, url, file_id, name } = parsed_tv.bind!;
          return {
            id,
            url,
            file_id,
            file_name: name,
          };
        });
      const incomplete = episode_count !== 0 && episode_count !== _count.episodes;
      const tips: { text: string[] }[] = [];
      if (binds.length === 0 && incomplete) {
        tips.push({
          text: ["该电视剧集数不全且缺少可同步的分享资源"],
        });
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
        episode_count,
        season_count,
        cur_episode_count: _count.episodes,
        cur_season_count: _count.seasons,
        size_count,
        size_count_text: bytes_to_size(size_count),
        // episodes: episodes.map((episode) => {
        //   const { profile, parsed_episodes } = episode;
        //   return {
        //     id: episode.id,
        //     name: profile.name,
        //     sources: parsed_episodes.map((source) => {
        //       const { file_id, file_name, size } = source;
        //       return {
        //         id: file_id,
        //         file_id,
        //         file_name,
        //         size,
        //         size_text: bytes_to_size(size ?? 0),
        //       };
        //     }),
        //   };
        // }),
        incomplete,
        tips,
        // _count,
        // seasons: seasons.map((s) => {
        //   const {
        //     id,
        //     profile: { name, overview, episode_count },
        //   } = s;
        //   return {
        //     id,
        //     name,
        //     overview,
        //     episode_count,
        //   };
        // }),
        // episodes: episodes.map((e) => {
        //   const {
        //     id,
        //     episode_number,
        //     profile: { name, overview },
        //     parsed_episodes,
        //   } = e;
        //   return {
        //     id,
        //     name,
        //     overview,
        //     episode_number,
        //     sources: parsed_episodes.map((source) => {
        //       const { id, file_id, file_name } = source;
        //       return {
        //         id,
        //         file_id,
        //         file_name,
        //       };
        //     }),
        //   };
        // }),
      };
    }),
  };
  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
