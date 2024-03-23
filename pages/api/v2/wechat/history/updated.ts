/**
 * @file 观看记录中有更新的
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store } from "@/store/index";
import { Member } from "@/domains/user/member";
import { BaseApiResp } from "@/types/index";
import { response_error_factory } from "@/utils/server";
import { MediaTypes } from "@/constants/index";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { page = 1, page_size = 20 } = req.body as Partial<{ page: number; page_size: number }>;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  const r: {
    id: string;
    name: string;
    poster_path: string;
    updated: string;
    cur_episode_order: number;
    cur_episode_name: number;
    thumbnail_path: string;
    latest_episode_order: number;
    latest_episode_name: number;
    latest_episode_created: string;
  }[] = await store.prisma.$queryRaw`
SELECT
    Media.id AS id,
    MediaProfile.name AS name,
    MediaProfile.poster_path AS poster_path,
    CurEpisode.cur_order AS cur_episode_order,
    CurEpisode.cur_name AS cur_episode_name,
    PlayHistoryV2.updated AS updated,
    PlayHistoryV2.thumbnail_path AS thumbnail_path,
    MediaSource.created AS latest_episode_created,
    MAX(MediaSourceProfile.\'order\') AS latest_episode_order,
    MediaSourceProfile.name AS latest_episode_name
FROM MediaSource
JOIN Media ON Media.id = MediaSource.media_id
JOIN MediaSourceProfile ON MediaSource.profile_id = MediaSourceProfile.id
JOIN MediaProfile ON Media.profile_id = MediaProfile.id
JOIN PlayHistoryV2 ON PlayHistoryV2.media_id = Media.id
JOIN (
  SELECT
    MediaSourceProfile.\'order\' AS cur_order,
    MediaSourceProfile.name AS cur_name,
    PlayHistoryV2.id AS history_id
  FROM MediaSource
  JOIN MediaSourceProfile ON MediaSource.profile_id = MediaSourceProfile.id
  JOIN PlayHistoryV2 ON PlayHistoryV2.media_source_id = MediaSource.id
) CurEpisode ON PlayHistoryV2.id = CurEpisode.history_id
WHERE Media.id = PlayHistoryV2.media_id AND Media.type = ${MediaTypes.Season} AND MediaSource.created > PlayHistoryV2.updated AND PlayHistoryV2.member_id = ${member.id}
GROUP BY MediaSource.media_id
ORDER BY MediaSource.created DESC
LIMIT ${page_size} OFFSET ${(page - 1) * page_size}
`;
  const data = {
    list: r.map((media) => {
      const {
        id,
        name,
        poster_path,
        cur_episode_name,
        cur_episode_order,
        thumbnail_path,
        latest_episode_order,
        latest_episode_name,
        latest_episode_created,
        updated,
      } = media;
      return {
        id,
        name,
        poster_path,
        cur_episode_name,
        cur_episode_order: Number(cur_episode_order),
        updated,
        thumbnail_path,
        latest_episode_order: Number(latest_episode_order),
        latest_episode_name,
        latest_episode_created,
      };
    }),
    no_more: r.length < page_size,
    page,
    page_size,
  };
  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
