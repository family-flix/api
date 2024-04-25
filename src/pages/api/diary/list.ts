/**
 * @file 使用游标而非分页的列表接口
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { Member } from "@/domains/user/member";
import { ModelQuery } from "@/domains/store/types";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { MediaTypes } from "@/constants";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { next_marker = "", page_size } = req.body as Partial<{
    next_marker: string;
    page_size: number;
  }>;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  const where: ModelQuery<"member_diary"> = {
    member_id: member.id,
  };
  const data = await store.list_with_cursor({
    fetch: (args) => {
      return store.prisma.member_diary.findMany({
        where,
        // include: {
        //   media_source: {
        //     include: {
        //       media: {
        //         include: {
        //           profile: true,
        //         },
        //       },
        //     },
        //   },
        // },
        orderBy: {
          created: "desc",
        },
        ...args,
      });
    },
    page_size,
    next_marker,
  });
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      next_marker: data.next_marker,
      list: data.list.map((diary) => {
        const { id, day, content, created } = diary;
        return {
          id,
          day,
          content,
          profile: (() => {
            // if (episode) {
            //   const { season } = episode;
            //   const { tv, profile, season_text } = season;
            //   return {
            //     name: tv.profile.name,
            //     original_name: tv.profile.original_name,
            //     poster_path: profile.poster_path || tv.profile.poster_path,
            //     type: MediaTypes.Season,
            //     tv_id: tv.id,
            //     season_id: season.id,
            //     season_text,
            //     season_number: profile.season_number,
            //     episode_number: episode.episode_number,
            //     episode_text: episode.episode_text,
            //     air_date: profile.air_date,
            //   };
            // }
            // if (movie) {
            //   const { profile } = movie;
            //   return {
            //     name: profile.name,
            //     original_name: profile.original_name,
            //     poster_path: profile.poster_path,
            //     type: MediaTypes.Movie,
            //     movie_id: movie.id,
            //     air_date: profile.air_date,
            //   };
            // }
            return null;
          })(),
          created,
        };
      }),
    },
  });
}
