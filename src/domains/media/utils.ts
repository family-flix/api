import {
  MediaSourceProfileRecord,
  MediaSourceRecord,
  ParsedMediaSourceRecord,
  SubtitleRecord,
} from "@/domains/store/types";
import { SubtitleLanguageMap } from "@/constants";

/**
 * @deprecated
 */
export function get_episodes_range(order: number, step = 20) {
  const start = Math.floor(order / step) * step;
  return [start + 1, start + step];
}
export function split_count_into_ranges(num: number, count: number): [number, number][] {
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
export function format_episode(
  episode: MediaSourceRecord & {
    profile: MediaSourceProfileRecord;
    files: ParsedMediaSourceRecord[];
    subtitles: SubtitleRecord[];
  },
  media_id: string
) {
  // if (episode === null) {
  //   return null;
  // }
  const { id, profile, files = [], subtitles = [] } = episode;
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

export function fix_episode_group_by_missing_episodes(values: {
  missing_episodes: number[];
  groups: [number, number][];
}) {
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

export function find_missing_episodes(values: { count: number; episode_orders: number[] }) {
  const { count, episode_orders } = values;
  const missing_episodes: number[] = [];
  for (let i = 1; i <= count; i++) {
    if (!episode_orders.includes(i)) {
      missing_episodes.push(i);
    }
  }
  return missing_episodes;
}

export function fix_missing_episodes(values: {
  missing_episodes: number[];
  episodes: ReturnType<typeof format_episode>[];
}) {
  const { missing_episodes, episodes } = values;
  const missing = [...missing_episodes];
  const sources = [...episodes];

  // const first_source = sources[0];
  // const last_source = sources[sources.length - 1];
  const missing_order = missing;
  const min_missing_order = Math.min(...missing_order);
  const max_missing_order = Math.max(...missing_order);

  const existing_orders = sources.map((s) => s.order);
  const start_order = Math.min(...existing_orders, min_missing_order);
  const end_order = Math.max(...existing_orders, max_missing_order);

  // const min_order = first_source.order;
  const result = [];

  let cur_order = start_order;

  while (cur_order <= end_order) {
    const existing = sources.find((s) => s.order === cur_order);
    result.push(
      existing || {
        id: "",
        media_id: "",
        name: "",
        overview: "",
        order: cur_order,
        still_path: "",
        runtime: null,
        sources: [],
        subtitles: [],
      }
    );
    cur_order += 1;
  }
  return result;
}
