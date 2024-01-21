/**
 * @file 获取季/电影详情加上当前正在播放的剧集信息
 */
import type { NextApiRequest, NextApiResponse } from "next";

import { Member } from "@/domains/user/member";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { MediaTypes, SubtitleFileTypes, SubtitleLanguageMap } from "@/constants";
import {
  MediaSourceProfileRecord,
  MediaSourceRecord,
  ParsedMediaSourceRecord,
  SubtitleRecord,
} from "@/domains/store/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { media_id, type = MediaTypes.Season } = req.body as Partial<{ media_id: string; type: MediaTypes }>;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  if (!media_id) {
    return e(Result.Err(type === MediaTypes.Season ? "缺少季 id" : "缺少电影 id"));
  }
  const media = await store.prisma.media.findFirst({
    where: {
      id: media_id,
      type,
      user_id: member.user.id,
    },
    include: {
      profile: {
        include: {
          origin_country: true,
          genres: true,
        },
      },
    },
  });
  if (media === null) {
    return e(Result.Err(type === MediaTypes.Season ? "没有匹配的季" : "没有匹配的电影"));
  }
  const history = await store.prisma.play_history_v2.findFirst({
    where: {
      media_id: media_id,
      member_id: member.id,
    },
    include: {
      media_source: {
        include: {
          profile: true,
          subtitles: true,
          files: true,
        },
      },
    },
  });
  const { sources: media_sources, cur_source } = await (async () => {
    if (!history) {
      const sources = await store.prisma.media_source.findMany({
        where: {
          files: {
            some: {},
          },
          media_id,
        },
        include: {
          profile: true,
          subtitles: true,
          files: {
            include: { drive: true },
          },
        },
        take: 20,
        orderBy: {
          profile: {
            order: "asc",
          },
        },
      });
      return {
        sources,
        cur_source: sources[0]
          ? {
              id: sources[0].id,
              cur_source_file_id: sources[0].files?.[0]?.id || null,
              current_time: 0,
              thumbnail_path: sources[0].profile.still_path,
              index: 0,
              subtitles: sources[0].subtitles.map((subtitle) => {
                const { id, name, language, unique_id } = subtitle;
                return {
                  id,
                  type: SubtitleFileTypes.LocalFile,
                  name,
                  language: SubtitleLanguageMap[language as "chi"] || [],
                  url: unique_id,
                };
              }),
              files: sources[0].files,
              order: sources[0].profile.order,
            }
          : null,
      };
    }
    const { current_time, thumbnail_path, file_id, media_source } = history;
    const range = get_episodes_range(media_source.profile.order);
    const sources = await store.prisma.media_source.findMany({
      where: {
        files: {
          some: {},
        },
        profile: {
          order: {
            gte: range[0],
            lte: range[1],
          },
        },
        media_id: history.media_id,
      },
      include: {
        profile: true,
        subtitles: true,
        files: {
          include: { drive: true },
        },
      },
      // skip: range[0],
      // take: 20,
      orderBy: {
        profile: {
          order: "asc",
        },
      },
    });
    return {
      sources,
      cur_source: {
        id: media_source.id,
        cur_source_file_id: file_id,
        current_time,
        thumbnail_path,
        index: sources.findIndex((s) => s.id === media_source.id),
        files: media_source.files,
        subtitles: media_source.subtitles.map((subtitle) => {
          const { id, name, language, unique_id } = subtitle;
          return {
            id,
            type: SubtitleFileTypes.LocalFile,
            name,
            language: SubtitleLanguageMap[language as "chi"] || [],
            url: unique_id,
          };
        }),
        order: media_source.profile.order,
      },
    };
  })();
  const cur_source_count = await store.prisma.media_source.count({
    where: {
      media_id: media.id,
    },
  });
  const { name, original_name, overview, poster_path, air_date, source_count, vote_average, genres, origin_country } =
    media.profile;
  const episode_orders = await store.prisma.media_source.findMany({
    select: {
      profile: {
        select: {
          order: true,
        },
      },
    },
    where: {
      media_id: media.id,
    },
  });
  const groups = split_count_into_ranges(20, cur_source_count);
  const cur_episode_orders = episode_orders.map((e) => e.profile.order);
  const missing_episodes = find_missing_episodes({
    count: source_count,
    episode_orders: cur_episode_orders,
  });
  const episode_ranges = fix_episode_group_by_missing_episodes({
    groups,
    missing_episodes,
  });
  const sources = media_sources.map((episode) => {
    return format_episode(episode, media_id);
  });
  const data = {
    id: media_id,
    name: name || original_name,
    overview,
    poster_path,
    air_date,
    source_count,
    vote_average,
    cur_source,
    genres: genres.map((genre) => {
      const { id, text } = genre;
      return {
        value: id,
        label: text,
      };
    }),
    origin_country: origin_country.map((country) => {
      return country.id;
    }),
    sources,
    source_groups: episode_ranges.map((v) => {
      const [start, end] = v;
      return {
        start,
        end,
      };
    }),
  };
  res.status(200).json({ code: 0, msg: "", data });
}

function get_episodes_range(order: number, step = 20) {
  const start = Math.floor(order / step) * step;
  return [start + 1, start + step];
}
function split_count_into_ranges(num: number, count: number): [number, number][] {
  if (count <= 0) {
    return [];
  }
  const ranges: [number, number][] = [];
  let start = 1;
  let end = 1;
  while (start <= count) {
    end = Math.min(start + num - 1, count);
    ranges.push([start, end]);
    start = end + 1;
  }
  if (ranges.length === 0) {
    return [];
  }
  const last_range = ranges[ranges.length - 1];
  const diff = last_range[1] - last_range[0] + 1;
  if (ranges.length > 1 && diff < 5) {
    const last_second_range = ranges[ranges.length - 2];
    return [...ranges.slice(0, ranges.length - 2), [last_second_range[0], last_second_range[1] + diff]];
  }
  return ranges;
}
function format_episode(
  episode: MediaSourceRecord & {
    profile: MediaSourceProfileRecord;
    files: ParsedMediaSourceRecord[];
    subtitles: SubtitleRecord[];
  },
  media_id: string
) {
  if (episode === null) {
    return null;
  }
  const { id, profile, files, subtitles } = episode;
  const { name, overview, order, runtime, still_path } = profile;
  return {
    id,
    name,
    overview,
    order,
    runtime,
    media_id,
    still_path,
    sources: files.map((parsed_episode) => {
      const { id, file_name, parent_paths } = parsed_episode;
      return {
        id,
        file_name,
        parent_paths,
      };
    }),
    subtitles: subtitles.map((subtitle) => {
      const { id, type, name, language, unique_id } = subtitle;
      return {
        id,
        type,
        name,
        language: SubtitleLanguageMap[language as "chi"] || [],
        url: unique_id,
      };
    }),
  };
}

function fix_episode_group_by_missing_episodes(values: { missing_episodes: number[]; groups: [number, number][] }) {
  const { groups, missing_episodes } = values;
  const updated_groups: [number?, number?][] = [];
  if (missing_episodes.length === 0) {
    return groups;
  }
  for (let i = 0; i < groups.length; i += 1) {
    let [start, end] = groups[i];
    const range: number[] = [];
    for (let i = start; i < end + 1; i += 1) {
      if (!missing_episodes.includes(i)) {
        range.push(i);
      }
    }
    if (range.length === 0) {
      updated_groups.push([]);
      continue;
    }
    updated_groups.push([range[0], range[range.length - 1]]);
  }
  return updated_groups;
}

function find_missing_episodes(values: { count: number; episode_orders: number[] }) {
  const { count, episode_orders } = values;
  const missing_episodes: number[] = [];
  for (let i = 1; i <= count; i++) {
    if (!episode_orders.includes(i)) {
      missing_episodes.push(i);
    }
  }
  return missing_episodes;
}
