/**
 * @file 管理后台/电视剧详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { tv_id: id, season_id } = req.body as Partial<{ tv_id: string; season_id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!id) {
    return e(Result.Err("缺少电视剧 id"));
  }
  const tv = await store.prisma.tv.findFirst({
    where: {
      id,
      user_id: user.id,
    },
    include: {
      _count: true,
      profile: true,
      // parsed_tvs: {
      //   orderBy: {
      //     name: "asc",
      //   },
      // },
      // play_histories: {
      //   include: {
      //     episode: true,
      //     member: true,
      //   },
      // },
      seasons: {
        include: {
          profile: true,
        },
        orderBy: {
          season_number: "asc",
        },
      },
      // episodes: {
      //   include: {
      //     parsed_episodes: true,
      //   },
      // },
    },
  });
  if (tv === null) {
    return e(Result.Err("没有匹配的电视剧记录"));
  }
  const { profile, seasons, _count } = tv;
  const cur_season = (() => {
    if (season_id) {
      const matched = seasons.find((s) => s.id === season_id);
      if (matched) {
        return matched;
      }
    }
    return seasons[0];
  })();
  if (!cur_season) {
    return e(Result.Err("没有匹配的季"));
  }
  const data = await (async () => {
    const poster_path = cur_season.profile.poster_path;
    const source_size_count = 0;
    // const source_size_count = (() => {
    //   let size_count = 0;
    //   const parsed_episodes = episodes.reduce((total, cur) => {
    //     return total.concat(cur.parsed_episodes);
    //   }, [] as ParsedEpisodeRecord[]);
    //   for (let i = 0; i < parsed_episodes.length; i += 1) {
    //     const parsed_episode = parsed_episodes[i];
    //     const { size } = parsed_episode;
    //     size_count += size ?? 0;
    //   }
    //   return size_count;
    // })();
    const {
      name,
      original_name,
      overview,
      // poster_path,
      backdrop_path,
      original_language,
      first_air_date,
      episode_count,
      unique_id,
    } = profile;
    const incomplete = episode_count !== 0 && episode_count !== _count.episodes;
    return {
      id,
      name: name || original_name,
      overview,
      poster_path: poster_path || profile.poster_path,
      backdrop_path,
      original_language,
      first_air_date,
      tmdb_id: unique_id,
      size_count: source_size_count,
      incomplete,
      seasons: seasons.map((season) => {
        const { id, season_number, season_text, profile } = season;
        const { name, overview } = profile;
        return {
          id,
          name,
          season_number,
          season_text,
          overview,
        };
      }),
      cur_season: {
        id: cur_season.id,
        name: cur_season.profile.name,
        season_number: cur_season.season_number,
        season_text: cur_season.season_text,
      },
      cur_season_episodes: await (async () => {
        if (!cur_season) {
          return [];
        }
        const episodes = await store.prisma.episode.findMany({
          where: {
            tv_id: id,
            season_id: cur_season.id,
            user_id: user.id,
          },
          include: {
            profile: true,
            parsed_episodes: {
              include: {
                drive: true,
              },
            },
          },
          orderBy: {
            episode_number: "asc",
          },
          take: 20,
        });
        return episodes.map((episode) => {
          const { id, episode_text, profile, parsed_episodes } = episode;
          return {
            id,
            name: profile.name,
            overview: profile.overview,
            runtime: profile.runtime,
            episode_number: episode_text,
            first_air_date: profile.air_date,
            sources: parsed_episodes.map((source) => {
              const { id, file_id, file_name, parent_paths, size, drive } = source;
              return {
                id,
                file_id,
                file_name,
                parent_paths,
                size,
                drive: {
                  id: drive.id,
                  name: drive.name,
                  avatar: drive.avatar,
                },
              };
            }),
          };
        });
      })(),
      // parsed_tvs,
      // play_histories,
    };
  })();

  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
