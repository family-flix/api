/**
 * @file 获取 季 列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { Member } from "@/domains/user/member";
import { response_error_factory } from "@/utils/server";
import { MediaProfileWhereInput } from "@/domains/store/types";
import { MediaTypes } from "@/constants/index";

export default async function v2_wechat_season_list(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const {
    type,
    name,
    genres,
    language,
    next_marker = "",
    page_size,
  } = req.body as Partial<{
    name: string;
    genres: string;
    language: string;
    next_marker: string;
    page_size: number;
    type: MediaTypes;
  }>;
  const { authorization } = req.headers;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  let queries: MediaProfileWhereInput[] = [];
  if (type) {
    if ([MediaTypes.Season, MediaTypes.Movie].includes(type)) {
      queries.push({ type });
    }
  }
  if (name) {
    queries = queries.concat({
      OR: [
        {
          name: {
            contains: name,
          },
        },
        {
          NOT: [{ original_name: null }],
          original_name: {
            contains: name,
          },
        },
      ],
    });
  }
  if (genres) {
    // queries = queries.concat({
    //   OR: genres.split("|").map((g) => {
    //     return {
    //       genres: {
    //         contains: g,
    //       },
    //     };
    //   }),
    // });
  }
  if (language) {
    // queries = queries.concat({
    //   OR: language.split("|").map((g) => {
    //     return {
    //       origin_country: {
    //         contains: g,
    //       },
    //     };
    //   }),
    // });
  }
  const where: NonNullable<Parameters<typeof store.prisma.media.findMany>[0]>["where"] = {
    media_sources: {
      some: {
        files: {
          some: {},
        },
      },
    },
    user_id: member.user.id,
  };
  if (queries.length !== 0) {
    where.profile = {
      AND: queries,
    };
  }
  const count = await store.prisma.media.count({
    where,
  });
  const payload = await store.list_with_cursor({
    fetch: (args) => {
      return store.prisma.media.findMany({
        where,
        include: {
          _count: true,
          profile: {
            include: {
              genres: true,
              origin_country: true,
            },
            // include: {
            // persons: {
            //   take: 5,
            //   include: {
            //     profile: true,
            //   },
            //   orderBy: {
            //     order: "asc",
            //   },
            // },
            // },
          },
        },
        orderBy: {
          profile: { air_date: "desc" },
        },
        ...args,
      });
    },
    page_size,
    next_marker,
  });
  const data = {
    total: count,
    list: payload.list.map((media) => {
      const { id, type, profile, _count } = media;
      const { name, poster_path, air_date, source_count, order, vote_average, genres, origin_country } = profile;
      return {
        id,
        type,
        name,
        season_number: order,
        episode_count: source_count,
        cur_episode_count: _count.media_sources,
        poster_path,
        air_date,
        origin_country: origin_country.map((country) => country.id),
        genres: genres.map((genre) => {
          return {
            value: genre.id,
            label: genre.id,
          };
        }),
        vote_average,
        actors: [],
        // actors: profile.persons.map((p) => {
        //   const { profile } = p;
        //   return {
        //     id: profile.id,
        //     name: profile.name,
        //     avatar: profile.profile_path,
        //   };
        // }),
      };
    }),
    page_size,
    next_marker: payload.next_marker,
  };
  return res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
