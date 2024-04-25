/**
 * @file 管理后台/季详情
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { Result } from "@/types/index";
import { response_error_factory } from "@/utils/server";
import { MediaTypes } from "@/constants/index";

export default async function v2_admin_season_profile(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { season_id } = req.body as Partial<{ season_id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!season_id) {
    return e(Result.Err("缺少电视剧 id"));
  }
  const season = await store.prisma.media.findFirst({
    where: {
      id: season_id,
      type: MediaTypes.Season,
      user_id: user.id,
    },
    include: {
      _count: true,
      media_sources: {
        include: {
          profile: true,
          files: {
            include: {
              drive: true,
            },
            orderBy: {
              created: "asc",
            },
          },
        },
        orderBy: {
          profile: {
            order: "asc",
          },
        },
      },
      profile: {
        include: {
          series: true,
          origin_country: true,
          genres: true,
        },
      },
    },
  });
  if (season === null) {
    return e(Result.Err("没有匹配的电视剧记录"));
  }
  const other_seasons = await store.prisma.media.findMany({
    where: {
      id: {
        not: season.id,
      },
      profile: {
        series_id: season.profile.series_id,
      },
      user_id: user.id,
    },
    include: {
      profile: true,
    },
    orderBy: {
      profile: {
        order: "asc",
      },
    },
  });
  const profile = season.profile;
  const episodes = season.media_sources;
  const data = await (async () => {
    const { name, original_name, overview, backdrop_path, air_date, origin_country, genres } = profile;
    return {
      id: season_id,
      name: name || original_name,
      overview,
      poster_path: (() => {
        if (profile.poster_path) {
          return profile.poster_path;
        }
        if (profile.series) {
          return profile.series.poster_path;
        }
        return null;
      })(),
      backdrop_path,
      air_date,
      size_count: 0,
      origin_country: origin_country.map((country) => country.id),
      genres: genres.map((genre) => {
        return {
          value: genre.id,
          label: genre.id,
        };
      }),
      series: other_seasons.map((media) => {
        const { id } = media;
        const { name, poster_path, overview, air_date, order } = media.profile;
        return {
          id,
          name,
          poster_path,
          overview,
          air_date,
          season_number: order,
        };
      }),
      episodes: (() => {
        return episodes.map((episode) => {
          const { id, profile, files } = episode;
          return {
            id,
            name: profile.name,
            overview: profile.overview,
            runtime: profile.runtime,
            episode_number: profile.order,
            air_date: profile.air_date,
            sources: files.map((file) => {
              const { id, file_id, file_name, parent_paths, size, drive, created } = file;
              return {
                id,
                file_id,
                file_name,
                parent_paths,
                size,
                created,
                drive: {
                  id: drive.id,
                  name: drive.name,
                  avatar: drive.avatar,
                },
              };
            }),
          };
        });
      })(),
    };
  })();
  return res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
