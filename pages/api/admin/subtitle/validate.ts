/**
 * @file 校验传入的字幕文件名是否合法
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { parse_filename_for_video } from "@/utils/parse_filename_for_video";
import {
  EpisodeRecord,
  ParsedEpisodeRecord,
  SeasonRecord,
  TVProfileRecord,
  TVProfileWhereInput,
  TVRecord,
} from "@/domains/store/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { tv_id, filenames } = req.body as Partial<{ tv_id: string; filenames: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!filenames) {
    return e(Result.Err("缺少字幕文件名"));
  }
  if (filenames.length === 0) {
    return e(Result.Err("缺少字幕文件名"));
  }
  // if (!tv_id) {
  //   return e(Result.Err("缺少电视剧 id"));
  // }
  // const tv = await store.prisma.tv.findFirst({
  //   where: {
  //     id: tv_id,
  //     user_id: user.id,
  //   },
  //   include: {
  //     seasons: {
  //       include: {
  //         profile: true,
  //       },
  //     },
  //     episodes: {
  //       include: {
  //         profile: true,
  //         parsed_episodes: {
  //           include: {
  //             drive: true,
  //           },
  //         },
  //       },
  //     },
  //   },
  // });
  // if (!tv) {
  //   return e(Result.Err("没有匹配的电视剧记录"));
  // }
  const result: {
    filename: string;
    season_text?: string;
    season: null | {
      id: string;
      name: string;
    };
    episode_text?: string;
    episode: null | {
      id: string;
      name: string;
    };
    language?: string;
  }[] = [];
  // const tvs: (TVRecord & { profile: TVProfileRecord })[] = [];
  const tvs: Record<
    string,
    {
      id: string;
      name: string | null;
      original_name: string | null;
      poster_path: string | null;
      seasons: SeasonRecord[];
      episodes: (EpisodeRecord & { parsed_episodes: ParsedEpisodeRecord[] })[];
    }
  > = {};
  const filename_rules = user.get_filename_rules();
  let outer_drives_map: Record<string, { id: string }> = {};
  for (let i = 0; i < filenames.length; i += 1) {
    await (async () => {
      const filename = filenames[i];
      const {
        name,
        original_name,
        subtitle_lang,
        episode: episode_text,
        season: season_text,
      } = parse_filename_for_video(
        filename,
        ["name", "original_name", "season", "episode", "subtitle_lang"],
        filename_rules
      );
      if (!name && !original_name) {
        result.push({
          filename,
          season: null,
          season_text,
          episode: null,
          episode_text,
          language: subtitle_lang,
        });
        return;
      }
      const k = [name, original_name].filter(Boolean).join("/");
      const tv = await (async () => {
        if (tvs[k]) {
          return tvs[k];
        }
        let queries: TVProfileWhereInput[] = [];
        if (name) {
          queries = queries.concat({
            OR: [
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
            ],
          });
        }
        if (original_name) {
          queries = queries.concat({
            OR: [
              {
                name: {
                  contains: original_name,
                },
              },
              {
                original_name: {
                  contains: original_name,
                },
              },
            ],
          });
        }
        const r = await store.prisma.tv.findMany({
          where: {
            profile: {
              OR: queries,
            },
            user_id: user.id,
          },
          include: {
            profile: true,
            seasons: true,
            episodes: {
              include: {
                parsed_episodes: true,
              },
            },
          },
        });
        if (r.length === 0) {
          return null;
        }
        const t = r[0];
        return {
          id: t.id,
          name: t.profile.name,
          original_name: t.profile.original_name,
          poster_path: t.profile.poster_path,
          seasons: t.seasons,
          episodes: t.episodes,
        };
      })();
      if (!tv) {
        return;
      }
      tvs[k] = tv;
      const matched_season = tv.seasons.find((season) => {
        if (season_text && season.season_text === season_text) {
          return true;
        }
        const a = season.season_text.match(/[0-9]{1,}/);
        const b = season_text.match(/[0-9]{1,}/);
        if (!a || !b) {
          return false;
        }
        if (parseInt(a[0]) === parseInt(b[0])) {
          return true;
        }
        return false;
      });
      const matched_episode = tv.episodes.find((episode) => {
        if (episode.episode_text === episode_text) {
          return true;
        }
        const a = episode.episode_text.match(/[0-9]{1,}/);
        const b = episode_text.match(/[0-9]{1,}/);
        if (!a || !b) {
          return false;
        }
        if (parseInt(a[0]) === parseInt(b[0])) {
          return true;
        }
        return false;
      });
      // console.log(matched_episode?.parsed_episodes);
      const drive_map: Record<string, { id: string }> = (() => {
        if (!matched_episode) {
          return {};
        }
        const { parsed_episodes: sources } = matched_episode;
        return sources
          .map((source) => {
            const { drive_id } = source;
            return {
              [drive_id]: {
                id: drive_id,
              },
            };
          })
          .reduce((total, cur) => {
            return {
              ...total,
              ...cur,
            };
          }, {});
      })();
      outer_drives_map = {
        ...outer_drives_map,
        ...drive_map,
      };
      result.push({
        filename,
        season: matched_season
          ? {
              id: matched_season.id,
              name: matched_season.season_text,
            }
          : null,
        season_text,
        episode: matched_episode
          ? {
              id: matched_episode.id,
              name: matched_episode.episode_text,
            }
          : null,
        episode_text,
        language: subtitle_lang,
      });
    })();
  }
  const data = {
    files: result,
    tvs: Object.values(tvs),
    drives: Object.values(outer_drives_map),
  };
  res.status(200).json({ code: 0, msg: "", data });
}
