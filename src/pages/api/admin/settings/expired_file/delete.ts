/**
 * @file 删除所有失效的视频文件
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { ModelParam, ModelQuery } from "@/domains/store/types";
import { Drive } from "@/domains/drive";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;

  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const drives = await store.prisma.drive.findMany({
    where: {
      user_id: user.id,
    },
  });

  for (let i = 0; i < drives.length; i += 1) {
    await (async () => {
      const { id: drive_id } = drives[i];
      const drive_res = await Drive.Get({ id: drive_id, user, store });
      if (drive_res.error) {
        return;
      }
      const drive = drive_res.data;

      await (async () => {
        const PAGE_SIZE = 20;
        let next_marker: null | string = null;
        let no_more = false;
        const where: ModelQuery<"parsed_episode"> = {
          episode_id: {
            not: null,
          },
          drive_id,
          user_id: user.id,
        };
        do {
          const list = await store.prisma.parsed_episode.findMany({
            where,
            take: PAGE_SIZE + 1,
            ...(() => {
              const cursor: { id?: string } = {};
              if (next_marker) {
                cursor.id = next_marker;
                return {
                  cursor,
                };
              }
              return {} as ModelParam<typeof store.prisma.parsed_episode.findMany>["cursor"];
            })(),
          });
          no_more = list.length < PAGE_SIZE + 1;
          next_marker = null;
          if (list.length === PAGE_SIZE + 1) {
            const last_record = list[list.length - 1];
            next_marker = last_record.id;
          }
          const correct_list = list.slice(0, PAGE_SIZE);
          for (let i = 0; i < correct_list.length; i += 1) {
            const parsed_episode = correct_list[i];
            const { file_id } = parsed_episode;
            const r = await drive.client.fetch_file(file_id);
            if (!r.error) {
              return;
            }
            await drive.delete_file_in_drive(file_id);
          }
        } while (no_more === false);
      })();

      await (async () => {
        const PAGE_SIZE = 20;
        let next_marker: null | string = null;
        let no_more = false;

        const where: ModelQuery<"parsed_movie"> = {
          movie_id: {
            not: null,
          },
          drive_id,
          user_id: user.id,
        };
        do {
          const list = await store.prisma.parsed_movie.findMany({
            where,
            take: PAGE_SIZE + 1,
            ...(() => {
              const cursor: { id?: string } = {};
              if (next_marker) {
                cursor.id = next_marker;
                return {
                  cursor,
                };
              }
              return {} as ModelParam<typeof store.prisma.parsed_movie.findMany>["cursor"];
            })(),
          });
          no_more = list.length < PAGE_SIZE + 1;
          next_marker = null;
          if (list.length === PAGE_SIZE + 1) {
            const last_record = list[list.length - 1];
            next_marker = last_record.id;
          }
          const correct_list = list.slice(0, PAGE_SIZE);
          for (let i = 0; i < correct_list.length; i += 1) {
            const parsed_episode = correct_list[i];
            const { file_id } = parsed_episode;
            const r = await drive.client.fetch_file(file_id);
            if (!r.error) {
              return;
            }
            await drive.delete_file_in_drive(file_id);
          }
        } while (no_more === false);
      })();
    })();
  }
  res.status(200).json({ code: 0, msg: "", data: null });
}
