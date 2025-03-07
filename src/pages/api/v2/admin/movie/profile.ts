/**
 * @file 管理后台/电影详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { DriveRecord, ParsedMediaSourceRecord } from "@/domains/store/types";
import { Result } from "@/domains/result/index";
import { response_error_factory } from "@/utils/server";
import { MediaTypes } from "@/constants/index";

export default async function v2_admin_movie_profile(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { media_id } = req.body as Partial<{ media_id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!media_id) {
    return e(Result.Err("缺少电影 id"));
  }
  const movie = await store.prisma.media.findFirst({
    where: {
      id: media_id,
      type: MediaTypes.Movie,
      user_id: user.id,
    },
    include: {
      profile: {
        include: {
          origin_country: true,
          genres: true,
        },
      },
      media_sources: {
        include: {
          files: {
            include: {
              drive: true,
            },
            orderBy: {
              created: "desc",
            },
          },
        },
      },
    },
  });
  if (movie === null) {
    return e(Result.Err("没有匹配的电影记录"));
  }
  const data = (() => {
    const { id, profile, media_sources } = movie;
    const { name, original_name, overview, air_date, poster_path, backdrop_path, genres, origin_country } = profile;
    const sources = media_sources.reduce((a, source) => {
      return a.concat(source.files);
    }, [] as (ParsedMediaSourceRecord & { drive: DriveRecord })[]);
    return {
      id,
      name: name || original_name,
      overview,
      poster_path,
      backdrop_path,
      air_date,
      origin_country: origin_country.map((country) => country.id),
      genres: genres.map((genre) => {
        return {
          value: genre.id,
          label: genre.id,
        };
      }),
      sources: sources.map((source) => {
        const { id, file_id, file_name, parent_paths, size, drive } = source;
        return {
          id,
          file_id,
          file_name,
          parent_paths,
          size,
          drive: {
            id: drive.id,
            name: drive.name,
            avatar: drive.avatar,
          },
        };
      }),
      profile_id: profile.id,
    };
  })();
  return res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
