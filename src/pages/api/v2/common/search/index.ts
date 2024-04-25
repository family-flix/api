/**
 * @file
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { ModelQuery } from "@/domains/store/types";
import { response_error_factory } from "@/utils/server";
import { MediaTypes } from "@/constants/index";

export default async function v2_media_profile_search(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    keyword,
    type,
    page_size,
    next_marker = "",
  } = req.body as Partial<{
    keyword: string;
    type: MediaTypes;
    next_marker: string;
    page_size: number;
  }>;

  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const queries: NonNullable<ModelQuery<"media_profile">>[] = [];
  if (keyword) {
    queries.push({
      OR: [
        {
          name: {
            contains: keyword,
          },
        },
        {
          original_name: {
            contains: keyword,
          },
        },
      ],
    });
  }
  const where: ModelQuery<"media_profile"> = {};
  if (type) {
    where.type = type;
  }
  if (queries.length !== 0) {
    where.AND = queries;
  }
  const count = await store.prisma.media_profile.count({ where });
  const result = await store.list_with_cursor({
    fetch: (args) => {
      return store.prisma.media_profile.findMany({
        where,
        include: {
          source_profiles: {
            orderBy: {
              order: "asc",
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
  return res.status(200).json({
    code: 0,
    msg: "",
    data: {
      total: count,
      list: result.list.map((profile) => {
        const {
          id,
          type,
          name,
          original_name,
          order,
          poster_path,
          air_date,
          tmdb_id,
          genres,
          origin_country,
          source_profiles,
        } = profile;
        return {
          id,
          type,
          unique_id: tmdb_id,
          name,
          original_name,
          order,
          poster_path,
          air_date,
          genres: genres.map((genre) => {
            const { id, text } = genre;
            return {
              id,
              text,
            };
          }),
          origin_country: origin_country.map((country) => {
            return country.id;
          }),
          sources: source_profiles.map((source_profile) => {
            const { id, type, tmdb_id, name, original_name, overview, still_path, air_date, order } = source_profile;
            return {
              id,
              type,
              unique_id: tmdb_id,
              name,
              original_name,
              overview,
              order,
              air_date,
              still_path,
            };
          }),
        };
      }),
    },
  });
}
