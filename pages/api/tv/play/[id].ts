/**
 * @file 获取 tv 详情加上当前正在播放的剧集信息
 */
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { Member } from "@/domains/user/member";
import { episode, episode_profile, parsed_episode } from "@prisma/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  if (!id) {
    return e("缺少电视剧 id");
  }
  const t_res = await Member.New(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: member_id } = t_res.data;
  const tv = await store.prisma.tv.findFirst({
    where: {
      id,
    },
    include: {
      profile: true,
      play_history: true,
      // episodes: {
      //   include: {
      //     profile: true,
      //     parsed_episodes: true,
      //   },
      //   orderBy: {
      //     episode_number: "asc",
      //   },
      //   skip: 0,
      //   take: 1,
      // },
      seasons: {
        include: {
          profile: true,
        },
        orderBy: {
          season_number: "asc",
        },
        skip: 0,
        take: 100,
      },
    },
  });
  if (tv === null) {
    return e("没有匹配的电视剧记录");
  }
  const { profile, play_history, seasons } = tv;
  if (seasons.length === 0) {
    return e("该电视剧没有季列表");
  }
  const min_season = seasons[0];
  const playing_episode = await (async () => {
    if (play_history === null) {
      const episode = await store.prisma.episode.findFirst({
        where: {
          season_id: min_season.id,
        },
        include: {
          profile: true,
          parsed_episodes: true,
        },
        orderBy: {
          episode_number: "asc",
        },
      });
      if (episode) {
        const r = {
          ...episode,
          current_time: 0,
        };
        return r;
      }
      return null;
    }
    const { episode_id, current_time } = play_history;
    if (episode_id === null) {
      return null;
    }
    const episode = await store.prisma.episode.findFirst({
      where: {
        id: episode_id,
      },
      include: {
        profile: true,
        parsed_episodes: true,
      },
    });
    if (!episode) {
      return null;
    }
    const r = {
      ...episode,
      current_time,
    };
    return r;
  })();
  // const cur_episode = (() => {
  //   if (playing_episode !== null) {
  //     return playing_episode;
  //   }
  //   if (episodes.length === 0) {
  //     return null;
  //   }
  //   return {
  //     ...episodes[0],
  //     current_time: 0,
  //   };
  // })();
  const episodes_of_cur_season = await (async () => {
    if (playing_episode === null) {
      return [];
    }
    const { season_id } = playing_episode;
    const season = await store.prisma.season.findFirst({
      where: {
        id: season_id,
      },
      include: {
        episodes: {
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
      return [];
    }
    return season.episodes.map((episode) => {
      const { id, season_number, episode_number, profile, parsed_episodes, season_id } = episode;
      const { name, overview } = profile;
      return {
        id,
        name,
        overview,
        season_number,
        episode_number,
        season_id,
        sources: parsed_episodes.map((parsed_episode) => {
          const { file_id, file_name } = parsed_episode;
          return {
            id: file_id,
            file_id,
            file_name,
          };
        }),
      };
    });
  })();

  const { name, original_name, overview, poster_path, popularity } = profile;
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
    popularity,
    seasons: seasons.map((season) => {
      const { id, season_number, profile } = season;
      const { name, overview, air_date } = profile;
      return {
        id,
        name: name || season_number,
        overview,
        air_date,
        episodes: cur_season && cur_season.id === id ? episodes_of_cur_season : [],
      };
    }),
    cur_season: (() => {
      if (cur_season === null) {
        return null;
      }
      const { id, season_number, profile } = cur_season;
      return {
        id,
        name: profile.name || season_number,
        overview: profile.overview,
        air_date: profile.air_date,
      };
    })(),
    cur_episode: (() => {
      if (playing_episode === null) {
        return null;
      }
      const { id, season_number, episode_number, profile, parsed_episodes, current_time, season_id } = playing_episode;
      const { name, overview } = profile;
      return {
        id,
        name,
        overview,
        season_number,
        episode_number,
        current_time,
        season_id,
        sources: parsed_episodes.map((parsed_episode) => {
          const { file_id, file_name } = parsed_episode;
          return {
            id: file_id,
            file_id,
            file_name,
          };
        }),
      };
    })(),
  };
  res.status(200).json({ code: 0, msg: "", data });
}
