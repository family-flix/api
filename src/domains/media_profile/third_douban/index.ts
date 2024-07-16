/**
 * @file 三方提供的，稳定的豆瓣 API
 */
import { Result } from "@/domains/result/index";
import { HttpClientCore } from "@/domains/http_client/index";
import { connect } from "@/domains/http_client/provider.axios";
import { RequestCore } from "@/domains/request";
import { request_factory } from "@/domains/request/utils";

import { RequestCommonPart } from "./services";

export function ThirdDoubanClient(options: { debug?: boolean; hostname: string; token: string }) {
  const { debug, hostname, token } = options;
  const client = new HttpClientCore({ timeout: 12000 });
  connect(client);

  const request = request_factory({
    // debug: true,
    hostnames: {
      prod: hostname,
    },
    headers: {
      token,
    },
    process(v: Result<{ code: number; msg: string; data: unknown }>) {
      if (v.error) {
        return Result.Err(v.error.message);
      }
      const { code, msg, data } = v.data;
      if (code !== 0) {
        return Result.Err(msg);
      }
      return Result.Ok(data);
    },
  });
  function search(values: { keyword: string }) {
    const { keyword } = values;
    return request.get<{
      list: {
        id: number;
        name: string;
        origin_name: string;
        overview: null;
        poster_path: string;
        air_date: string;
        vote_average: number;
        type: "movie" | "tv";
        genres: {
          value: number;
          label: string;
        }[];
      }[];
    }>(`/api/v1/douban/search?keyword=${keyword}`);
  }
  function fetch_media_profile(values: { id: string }) {
    const { id } = values;
    return request.get<{
      id: string;
      type: "movie" | "tv";
      name: string;
      original_name: string;
      air_date: string;
      overview: string;
      source_count: number;
      alias: string;
      actors: {
        id: string;
        name: string;
        order: number;
      }[];
      director: {
        id: string;
        name: string;
        order: number;
      }[];
      author: {
        id: string;
        name: string;
        order: number;
      }[];
      vote_average: number;
      genres: {
        id: number;
        text: string;
      }[];
      origin_country: string;
      imdb: string;
    }>(`/api/v1/douban/profile?id=${id}`);
  }
  function fetch_media_rank(values: { type: "movie" | "tv" }) {
    return request.get<{
      list: {
        name: string;
        /** 序号 */
        order: number;
        /** 豆瓣评分 */
        rate: number | null;
        extra_text: string | null;
        /** 豆瓣 id */
        douban_id: string | null;
      }[];
    }>("/api/v1/media_rank", {
      source: 1,
      type: values.type,
    });
  }
  const $search = new RequestCore(search, { client });
  const $profile = new RequestCore(fetch_media_profile, { client });
  const $rank = new RequestCore(fetch_media_rank, { client });

  return {
    async search(keyword: string) {
      const r = await $search.run({ keyword });
      if (r.error) {
        return Result.Err(r.error.message);
      }
      return Result.Ok(r.data);
    },
    async fetch_media_profile(id: number | string, query: RequestCommonPart = {}) {
      if (id === undefined) {
        return Result.Err("请传入电视剧 id");
      }
      const r = await $profile.run({ id: String(id) });
      if (r.error) {
        return Result.Err(r.error.message);
      }
      return Result.Ok(r.data);
    },
    async fetch_media_rank(values: { type: "movie" | "tv" }) {
      const r = await $rank.run({ type: values.type });
      if (r.error) {
        return Result.Err(r.error.message);
      }
      if (r.data === null) {
        return Result.Err('没有数据');
      }
      return Result.Ok(r.data);
    },
  };
}
