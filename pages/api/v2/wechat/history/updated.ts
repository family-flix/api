/**
 * @file 观看记录中有更新的
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store } from "@/store/index";
import { Member } from "@/domains/user/member";
import { BaseApiResp } from "@/types/index";
import { response_error_factory } from "@/utils/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { next_marker = "", page_size = 20 } = req.body as Partial<{ next_marker: string; page_size: number }>;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  //   const r: {
  //     id: string;
  //     text: string;
  //     duration: number;
  //     current_time: number;
  //     thumbnail_path: string;
  //     file_id: string;
  //     media_id: string;
  //     media_source_id: string;
  //     member_id: string;
  //     profile_name: string;
  //     profile_poster_path: string;
  //     latest_episode_order: number;
  //   }[] = await store.prisma.$queryRaw`
  // SELECT DISTINCT m1.*, m4.id AS profile_id, m4.name AS profile_name, m4.poster_path AS profile_poster_path, latest_media_source.latest_episode_order
  // FROM PlayHistoryV2 m1
  // JOIN (
  //   SELECT
  //       m2.id as media_id,
  //       MAX(m3.created) AS max_media_source_created,
  //       m2.profile_id,
  //       m3.episode_order as latest_episode_order
  //   FROM
  //       Media m2
  //   JOIN (
  //     SELECT mm3.*, mm4.\`order\` AS episode_order
  //     FROM MediaSource mm3
  //     JOIN MediaSourceProfile mm4 ON mm3.profile_id = mm4.id
  //   ) m3 ON m2.id = m3.media_id
  //   GROUP BY
  //       m2.id
  // ) latest_media_source
  // ON m1.media_id = latest_media_source.media_id
  // JOIN MediaProfile m4 ON latest_media_source.profile_id = m4.id
  // WHERE m1.member_id = '${member.id}' AND m1.updated < latest_media_source.max_media_source_created
  // ORDER BY m1.updated DESC
  // LIMIT 10;
  // `;
  const r: {
    id: string;
    name: string;
    poster_path: string;
    updated: string;
    latest_episode_order: number;
    latest_episode_name: number;
  }[] = await store.prisma.$queryRaw`
SELECT
    Media.id AS id,
    COUNT(MediaSource.media_id) AS count,
    MediaProfile.name AS name,
    MediaProfile.poster_path AS poster_path,
    PlayHistoryV2.updated AS updated,
    MAX(MediaSourceProfile.\'order\') AS latest_episode_order,
    MediaSourceProfile.name AS latest_episode_name
FROM MediaSource
JOIN Media ON Media.id = MediaSource.media_id
JOIN MediaSourceProfile ON MediaSource.profile_id = MediaSourceProfile.id
JOIN MediaProfile ON Media.profile_id = MediaProfile.id
JOIN PlayHistoryV2 ON PlayHistoryV2.media_id = Media.id
WHERE Media.id = PlayHistoryV2.media_id AND MediaSource.created > PlayHistoryV2.updated AND PlayHistoryV2.member_id = ${
    member.id
  } AND PlayHistoryV2.updated > ((strftime('%s', 'now') * 1000) - (60 * 60 * 24 * 60 * 1000))
GROUP BY MediaSource.media_id
ORDER BY PlayHistoryV2.updated DESC, MediaSourceProfile.\'order\' DESC
LIMIT ${page_size + 1}
`;

  // const data = await client.$queryRaw`
  // SELECT
  //     Media.id AS id,
  //     MediaProfile.name AS name,
  //     MediaSourceProfile.name AS episode_name,
  //     MediaSourceProfile.\'order\',
  //     MediaSource.created
  // FROM MediaSource
  // JOIN Media ON Media.id = MediaSource.media_id
  // JOIN PlayHistoryV2 ON PlayHistoryV2.media_id = Media.id
  // JOIN MediaSourceProfile ON MediaSource.profile_id = MediaSourceProfile.id
  // JOIN MediaProfile ON MediaProfile.id = MediaSourceProfile.media_profile_id
  // WHERE MediaSource.created > PlayHistoryV2.updated
  // GROUP BY MediaProfile.id
  // ORDER BY PlayHistoryV2.updated DESC, MediaSourceProfile.\'order\' DESC
  // LIMIT 10
  // `;
  // console.log(data)

  // const data1 = await client.$queryRaw`
  // SELECT MediaSource.media_id, MediaSource.id, Media.text AS name, MAX(MediaSourceProfile.\'order\') AS latest_episode_order
  // FROM MediaSource
  // JOIN Media ON Media.id = MediaSource.media_id
  // JOIN MediaSourceProfile ON MediaSource.profile_id = MediaSourceProfile.id
  // JOIN PlayHistoryV2 ON PlayHistoryV2.media_id = Media.id
  // WHERE Media.id = PlayHistoryV2.media_id AND MediaSource.created > PlayHistoryV2.updated
  // GROUP BY MediaSource.media_id
  // ORDER BY PlayHistoryV2.updated DESC, MediaSourceProfile.\'order\' DESC
  // LIMIT 20
  // `
  const data = {
    list: r.map((media) => {
      const { id, name, poster_path, latest_episode_order, latest_episode_name, updated } = media;
      return {
        id,
        name,
        poster_path,
        latest_episode_order: Number(latest_episode_order),
        latest_episode_name,
        updated,
      };
    }),
    next_marker: "",
    no_more: true,
    page_size,
  };
  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
