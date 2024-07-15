import {
  DataStore,
  MediaCountryRecord,
  MediaGenreRecord,
  MediaProfileRecord,
  MediaRecord,
} from "@/domains/store/types";
import { Member } from "@/domains/user/member";
import { MediaTypes, SubtitleFileTypes, SubtitleLanguageMap } from "@/constants/index";
import { Result } from "@/domains/result/index";

import {
  find_missing_episodes,
  fix_episode_group_by_missing_episodes,
  format_episode,
  fix_missing_episodes,
  split_count_into_ranges,
} from "./utils";

const TheEpisodeCountPerGroup = 20;

export class Media {
  static async Get(values: { id?: string; type: MediaTypes; member: Member; store: DataStore }) {
    const { id, type, member, store } = values;
    if (!id) {
      return Result.Err(type === MediaTypes.Season ? "缺少季 id" : "缺少电影 id");
    }
    const media = await store.prisma.media.findFirst({
      where: {
        id,
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
      return Result.Err(type === MediaTypes.Season ? "没有匹配的季" : "没有匹配的电影");
    }
    return Result.Ok(
      new Media({
        id,
        type,
        profile: media,
        member,
        store,
      })
    );
  }

  id: string;
  type: MediaTypes;
  profile: MediaRecord & {
    profile: MediaProfileRecord & {
      genres: MediaGenreRecord[];
      origin_country: MediaCountryRecord[];
    };
  };

  member: Member;
  store: DataStore;

  constructor(props: {
    id: string;
    type: MediaTypes;
    profile: MediaRecord & {
      profile: MediaProfileRecord & {
        genres: MediaGenreRecord[];
        origin_country: MediaCountryRecord[];
      };
    };
    member: Member;
    store: DataStore;
  }) {
    const { id, type, profile, member, store } = props;

    this.id = id;
    this.type = type;
    this.profile = profile;
    this.member = member;
    this.store = store;
  }
  /** 获取电视剧及当前播放剧集信息 */
  async fetch_playing_info() {
    const media_id = this.id;
    const member = this.member;
    const history = await this.store.prisma.play_history_v2.findFirst({
      where: {
        media_id: media_id,
        member_id: member.id,
      },
      include: {
        media_source: {
          include: {
            profile: true,
            subtitles: true,
            files: {
              orderBy: {
                created: "desc",
              },
            },
          },
        },
      },
    });
    const latest_source = await this.store.prisma.media_source.findFirst({
      where: {
        media_id: media_id,
      },
      include: {
        profile: true,
      },
      orderBy: {
        profile: {
          order: "desc",
        },
      },
    });
    if (!latest_source) {
      return Result.Err("没有找到剧集");
    }
    const groups = split_count_into_ranges(TheEpisodeCountPerGroup, latest_source.profile.order);
    const { sources: media_sources, cur_source } = await (async () => {
      if (!history) {
        const range = groups[0];
        const sources = await this.store.prisma.media_source.findMany({
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
            media_id,
          },
          include: {
            profile: true,
            subtitles: true,
            files: {
              include: { drive: true },
              orderBy: {
                created: "desc",
              },
            },
          },
          take: TheEpisodeCountPerGroup,
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
                files: sources[0].files.map((f) => {
                  const { id, name, file_name } = f;
                  return {
                    id,
                    name,
                    file_name,
                  };
                }),
                order: sources[0].profile.order,
              }
            : null,
        };
      }
      const { current_time, thumbnail_path, file_id, media_source } = history;
      const group_index = groups.findIndex((range) => {
        return range[0] <= media_source.profile.order && media_source.profile.order <= range[1];
      });
      const range = groups[group_index === -1 ? 0 : group_index];
      const sources = await this.store.prisma.media_source.findMany({
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
            orderBy: {
              created: "desc",
            },
          },
        },
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
          files: media_source.files.map((f) => {
            const { id, name, file_name } = f;
            return {
              id,
              name,
              file_name,
            };
          }),
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
    const { name, original_name, overview, poster_path, air_date, source_count, vote_average, genres, origin_country } =
      this.profile.profile;
    const episode_orders = await this.store.prisma.media_source.findMany({
      select: {
        profile: {
          select: {
            order: true,
          },
        },
      },
      where: {
        media_id,
      },
      orderBy: {
        profile: {
          order: "asc",
        },
      },
    });
    const cur_episode_orders = episode_orders.map((e) => e.profile.order);
    const missing_episodes = find_missing_episodes({
      count: latest_source.profile.order,
      episode_orders: cur_episode_orders,
    });
    // console.log('before fix_episode_group_by_missing_episodes', groups);
    const episode_ranges = fix_episode_group_by_missing_episodes({
      groups,
      missing_episodes,
    });
    const sources = media_sources.map((episode) => format_episode(episode, media_id));
    const episodes =
      sources.length === TheEpisodeCountPerGroup
        ? sources
        : fix_missing_episodes({
            missing_episodes,
            episodes: sources,
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
      sources: episodes,
      source_groups: episode_ranges.map((v) => {
        const [start, end] = v;
        return {
          start,
          end,
        };
      }),
    };
    return Result.Ok(data);
  }
  async fetch_episodes_by_range(opt: { start: number; end: number }) {
    const { start, end } = opt;
    const latest_source = await this.store.prisma.media_source.findFirst({
      where: {
        media_id: this.id,
      },
      include: {
        profile: true,
      },
      orderBy: {
        profile: {
          order: "desc",
        },
      },
    });
    if (!latest_source) {
      return Result.Err("没有找到剧集");
    }
    // 找出指定范围内关联了视频源的剧集
    const media_sources = await this.store.prisma.media_source.findMany({
      where: {
        files: {
          some: {},
        },
        profile: {
          order: {
            gte: start,
            lte: end,
          },
        },
        media_id: this.id,
      },
      include: {
        profile: true,
        subtitles: true,
        files: {
          include: { drive: true },
        },
      },
      orderBy: {
        profile: {
          order: "asc",
        },
      },
    });
    // 范围内剧集，不关心是否关联了视频源
    const episode_orders = await this.store.prisma.media_source.findMany({
      select: {
        profile: {
          select: {
            order: true,
          },
        },
      },
      where: {
        profile: {
          order: {
            gte: start,
            lte: end,
          },
        },
        media_id: this.id,
      },
      orderBy: {
        profile: {
          order: "asc",
        },
      },
    });
    const cur_sources = media_sources.map((episode) => format_episode(episode, this.id));
    const all_episode_orders = episode_orders.map((e) => e.profile.order);
    const missing_episodes = find_missing_episodes({
      count: latest_source.profile.order,
      start,
      end,
      episode_orders: all_episode_orders,
    });
    const episodes =
      cur_sources.length === TheEpisodeCountPerGroup
        ? cur_sources
        : fix_missing_episodes({
            missing_episodes,
            episodes: cur_sources,
          });
    return Result.Ok(episodes);
  }
  async fetch_episodes_by_next_marker(opt: {
    next_marker: string;
    page_size: number;
    with_subtitle?: boolean;
    with_file?: boolean;
  }) {
    const { next_marker, page_size, with_file, with_subtitle } = opt;
    const latest_source = await this.store.prisma.media_source.findFirst({
      where: {
        media_id: this.id,
      },
      include: {
        profile: true,
      },
      orderBy: {
        profile: {
          order: "desc",
        },
      },
    });
    if (!latest_source) {
      return Result.Err("没有找到剧集");
    }
    const where = {
      files: {
        some: {},
      },
      media_id: this.id,
    };
    const count = await this.store.prisma.media_source.count({ where });
    const result = await this.store.list_with_cursor({
      fetch: (extra) => {
        return this.store.prisma.media_source.findMany({
          where,
          include: {
            profile: true,
            subtitles: with_subtitle,
            files: with_file
              ? {
                  include: { drive: true },
                }
              : false,
          },
          orderBy: {
            profile: {
              order: "asc",
            },
          },
          ...extra,
        });
      },
      page_size,
      next_marker,
    });
    const episode_orders = await this.store.prisma.media_source.findMany({
      select: {
        profile: {
          select: {
            order: true,
          },
        },
      },
      where: {
        media_id: this.id,
      },
    });
    const media_sources = result.list;
    const sources = media_sources.map((episode) => format_episode(episode, this.id));
    const cur_episode_orders = episode_orders.map((e) => e.profile.order);
    const missing_episodes = find_missing_episodes({
      count: latest_source.profile.order,
      episode_orders: cur_episode_orders,
    });
    const episodes =
      sources.length === TheEpisodeCountPerGroup
        ? sources
        : fix_missing_episodes({
            missing_episodes,
            episodes: sources,
          });
    return Result.Ok({
      list: episodes,
      count,
      next_marker: result.next_marker,
    });
  }
}
