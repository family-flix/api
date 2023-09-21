/**
 * @file 校验传入的字幕文件名是否合法
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { parse_filename_for_video } from "@/utils/parse_filename_for_video";
import {
  EpisodeRecord,
  ParsedEpisodeRecord,
  SeasonProfileRecord,
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
      season: null | {
        id: string;
        name: string;
      };
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
      seasons: (SeasonRecord & {
        profile: SeasonProfileRecord;
      })[];
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
        const r = await store.prisma.tv.findFirst({
          where: {
            profile: {
              OR: queries,
            },
            user_id: user.id,
          },
          include: {
            profile: true,
            seasons: {
              include: {
                profile: true,
              },
            },
            episodes: {
              include: {
                parsed_episodes: true,
              },
            },
          },
        });
        if (!r) {
          return null;
        }
        // const t = r[0];
        const t = r;
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
      tvs[k] = {
        ...tv,
      };
      const matched_season = tv.seasons.find((season) => {
        if (season_text && season.season_text === season_text) {
          return true;
        }
        const season_number1 = season.season_text.match(/[0-9]{1,}/);
        const season_number2 = season_text.match(/[0-9]{1,}/);
        if (!season_number1 || !season_number2) {
          return false;
        }
        if (parseInt(season_number1[0]) === parseInt(season_number2[0])) {
          return true;
        }
        return false;
      });
      if (matched_season && matched_season.profile.poster_path) {
        tvs[k] = {
          ...tvs[k],
          poster_path: matched_season.profile.poster_path,
        };
      }
      const matched_episode = tv.episodes.find((episode) => {
        if (episode.episode_text === episode_text && episode.season_text === season_text) {
          return true;
        }
        const episode_number1 = episode.episode_text.match(/[0-9]{1,}/);
        const episode_number2 = episode_text.match(/[0-9]{1,}/);
        const season_number1 = episode.season_text.match(/[0-9]{1,}/);
        const season_number2 = season_text.match(/[0-9]{1,}/);
        if (!episode_number1 || !episode_number2 || !season_number1 || !season_number2) {
          return false;
        }
        if (
          parseInt(episode_number1[0]) === parseInt(episode_number2[0]) &&
          parseInt(season_number1[0]) === parseInt(season_number2[0])
        ) {
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
              season: {
                id: matched_episode.season_id,
                name: matched_episode.season_text,
              },
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
