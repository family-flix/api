/**
 * @file 获取本地索引到的影视剧详情列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { app, store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { ModelQuery } from "@/domains/store/types";
import { MediaProfileClient } from "@/domains/media_profile";
import {
  MediaOriginCountries,
  MediaTypes,
  MovieMediaOriginCountryTextMap,
  SeasonMediaOriginCountryTextMap,
} from "@/constants/index";
import { response_error_factory } from "@/utils/server";

export default async function v2_media_profile_list(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    type,
    name,
    series_id,
    next_marker = "",
    page_size = 20,
  } = req.body as Partial<{
    type: MediaTypes;
    name: string;
    series_id: string;
    next_marker: string;
    page_size: number;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const where: ModelQuery<"media_profile"> = {};
  if (type) {
    where.type = type;
  }
  if (name) {
    where.OR = [
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
      {
        alias: {
          contains: name,
        },
      },
      {
        series: {
          name: {
            contains: name,
          },
        },
      },
      {
        series: {
          original_name: {
            contains: name,
          },
        },
      },
      {
        series: {
          alias: {
            contains: name,
          },
        },
      },
    ];
  }
  if (series_id) {
    where.series_id = series_id;
    const series = await store.prisma.media_series_profile.findFirst({
      where: {
        id: series_id,
      },
    });
    if (!series) {
      const profile_client_res = await MediaProfileClient.New({
        token: user.settings.tmdb_token,
        assets: app.assets,
        store,
      });
      const profile_client = profile_client_res.data;
      if (profile_client) {
        await profile_client.cache_tv_profile({ id: series_id });
      }
    }
  }
  const count = await store.prisma.media_profile.count({ where });
  const result = await store.list_with_cursor({
    fetch: (args) => {
      return store.prisma.media_profile.findMany({
        where,
        include: {
          source_profiles: true,
          series: true,
          persons: {
            include: {
              profile: true,
            },
          },
          genres: true,
          origin_country: true,
        },
        orderBy: {
          air_date: "desc",
        },
        ...args,
      });
    },
    page_size,
    next_marker,
  });
  const data = {
    list: result.list.map((media_profile) => {
      const {
        id,
        type,
        name,
        original_name,
        poster_path,
        overview,
        air_date,
        order,
        vote_average,
        source_count,
        source_profiles,
        series,
        persons,
        genres,
        origin_country,
      } = media_profile;
      return {
        id,
        type,
        name,
        original_name: name === original_name ? null : original_name,
        poster_path,
        overview,
        air_date,
        vote_average,
        source_count,
        order,
        series: (() => {
          if (!series) {
            return null;
          }
          const { name, original_name, poster_path } = series;
          return {
            name,
            original_name,
            poster_path,
          };
        })(),
        episodes: source_profiles.map((source_profile) => {
          const { id, name, order } = source_profile;
          return {
            id,
            name,
            order,
          };
        }),
        persons: persons
          .map((person) => {
            const { known_for_department, profile, order } = person;
            return {
              id: profile.id,
              name: profile.name,
              role: known_for_department,
              order,
            };
          })
          .sort((a, b) => {
            const map: Record<string, number> = {
              star: 1,
              director: 2,
              scriptwriter: 3,
            };
            if (a.role && b.role) {
              return map[a.role] - map[b.role];
            }
            return a.order - b.order;
          }),
        genres: genres.map((g) => {
          return g.text;
        }),
        origin_country: origin_country
          .map((g) => {
            if (type === MediaTypes.Movie) {
              return MovieMediaOriginCountryTextMap[g.id as MediaOriginCountries];
            }
            if (type === MediaTypes.Season) {
              return SeasonMediaOriginCountryTextMap[g.id as MediaOriginCountries];
            }
            return null;
          })
          .filter(Boolean),
      };
    }),
    next_marker: result.next_marker,
    total: count,
  };
  return res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
