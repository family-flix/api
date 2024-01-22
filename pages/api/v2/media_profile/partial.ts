/**
 * @file
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import dayjs from "dayjs";

import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import {
  MediaOriginCountries,
  MediaTypes,
  MovieMediaOriginCountryTextMap,
  SeasonMediaOriginCountryTextMap,
} from "@/constants";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { media_profile_id } = req.body as Partial<{
    media_profile_id: string;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!media_profile_id) {
    return e(Result.Err("缺少 id"));
  }
  const media_profile = await store.prisma.media_profile.findFirst({
    where: {
      id: media_profile_id,
    },
    include: {
      series: true,
      genres: true,
      origin_country: true,
      source_profiles: true,
      persons: {
        include: {
          profile: true,
        },
      },
    },
  });
  if (!media_profile) {
    return e(Result.Err("没有匹配记录"));
  }
  const {
    id,
    type,
    name,
    original_name,
    poster_path,
    overview,
    air_date,
    order,
    source_count,
    source_profiles,
    series,
    persons,
    genres,
    origin_country,
    vote_average,
  } = media_profile;
  const data = {
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
  res.status(200).json({ code: 0, msg: "", data });
}
