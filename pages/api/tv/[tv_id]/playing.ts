/**
 * @file 获取 tv 详情加上当前正在播放的剧集信息
 */
import type { NextApiRequest, NextApiResponse } from "next";

import { Member } from "@/domains/user/member";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { tv_id: id, season_id } = req.query as Partial<{ tv_id: string; season_id: string }>;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!id) {
    return e(Result.Err("缺少电视剧 id"));
  }
  const member = t_res.data;
  const tv = await store.prisma.tv.findFirst({
    where: {
      id,
    },
    include: {
      profile: true,
      play_histories: {
        where: {
          member_id: member.id,
          tv_id: id,
        },
      },
      seasons: {
        include: {
          profile: true,
        },
        orderBy: {
          season_number: "asc",
        },
      },
    },
  });
  if (tv === null) {
    return e(Result.Err("没有匹配的电视剧记录"));
  }
  const { profile, play_histories, seasons } = tv;
  if (seasons.length === 0) {
    return e(Result.Err("该电视剧暂无季信息"));
  }
  const target_season = (() => {
    if (season_id) {
      return {
        id: season_id,
      };
    }
    return seasons[0];
  })();
  const play_history =
    play_histories.find((p) => {
      return p.member_id === member.id && p.tv_id === id;
    }) ?? null;
  const playing_episode = await (async () => {
    if (play_history === null) {
      const episode = await store.prisma.episode.findFirst({
        where: {
          season_id: target_season.id,
          episode_number: {
            not: 0,
          },
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
      });
      if (episode) {
        const r = {
          ...episode,
          current_time: 0,
          thumbnail: null,
        };
        return r;
      }
      return null;
    }
    const { episode_id, current_time, thumbnail, file_id } = play_history;
    if (episode_id === null) {
      return null;
    }
    const episode = await store.prisma.episode.findFirst({
      where: {
        id: episode_id,
      },
      include: {
        profile: true,
        parsed_episodes: {
          include: { drive: true },
        },
      },
    });
    if (!episode) {
      return null;
    }
    const r = {
      ...episode,
      current_time,
      thumbnail,
    };
    return r;
  })();
  const episodes_of_cur_season = await (async () => {
    if (playing_episode === null) {
      return {
        no_more: true,
        list: [],
      };
    }
    const { season_id } = playing_episode;
    const season = await store.prisma.season.findFirst({
      where: {
        id: season_id,
      },
      include: {
        _count: true,
        episodes: {
          where: {
            parsed_episodes: {
              some: {},
            },
          },
          include: {
            profile: true,
            parsed_episodes: true,
          },
          orderBy: {
            episode_number: "asc",
          },
          take: 20,
        },
      },
    });
    if (season === null) {
      return {
        no_more: true,
        list: [],
      };
    }
    const list = season.episodes.map((episode) => {
      const { id, season_text, episode_text, profile, parsed_episodes, season_id } = episode;
      const { name, overview, runtime } = profile;
      return {
        id,
        name,
        overview,
        season_number: season_text,
        episode_number: episode_text,
        season_id,
        runtime,
        sources: parsed_episodes.map((parsed_episode) => {
          const { file_id, file_name, parent_paths } = parsed_episode;
          return {
            id: file_id,
            file_id,
            file_name,
            parent_paths,
          };
        }),
      };
    });
    return {
      no_more: season._count.episodes === list.length,
      list,
    };
  })();
  const { name, original_name, overview, poster_path, vote_average, genres, origin_country } = profile;
  const cur_season = (() => {
    if (playing_episode === null) {
      return null;
    }
    const matched_season = seasons.find((s) => s.id === playing_episode.season_id);
    if (!matched_season) {
      return seasons[0] || null;
    }
    return matched_season;
  })();
  const data = {
    id,
    name: name || original_name,
    overview,
    poster_path,
    genres,
    origin_country,
    vote_average,
    seasons: seasons.map((season) => {
      const { id, season_text, profile } = season;
      const { name, overview, air_date } = profile;
      const { no_more: episode_no_more, list: episodes } =
        cur_season && cur_season.id === id ? episodes_of_cur_season : { no_more: true, list: [] };
      return {
        id,
        name: name || season_text,
        overview,
        air_date,
        episodes,
        episode_no_more,
      };
    }),
    cur_season: (() => {
      if (cur_season === null) {
        return null;
      }
      const { id, season_text, profile } = cur_season;
      return {
        id,
        name: profile.name || season_text,
        overview: profile.overview,
        air_date: profile.air_date,
      };
    })(),
    cur_episode: (() => {
      if (playing_episode === null) {
        return null;
      }
      const { id, season_text, episode_text, profile, parsed_episodes, current_time, season_id, thumbnail } =
        playing_episode;
      const { name, overview, runtime } = profile;
      return {
        id,
        name,
        overview,
        season_number: season_text,
        episode_number: episode_text,
        runtime,
        current_time,
        season_id,
        thumbnail,
        sources: parsed_episodes.map((parsed_episode) => {
          const { file_id, file_name, parent_paths } = parsed_episode;
          return {
            id: file_id,
            file_id,
            file_name,
            parent_paths,
          };
        }),
      };
    })(),
  };
  res.status(200).json({ code: 0, msg: "", data });
}
