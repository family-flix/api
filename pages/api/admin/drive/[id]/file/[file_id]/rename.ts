/**
 * @file
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { Drive } from "@/domains/drive";
import { FileType } from "@/constants";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id, file_id } = req.query as Partial<{ id: string; file_id: string }>;
  const { name } = req.body as Partial<{ name: string }>;
  if (!id) {
    return e(Result.Err("缺少云盘 id"));
  }
  if (!file_id) {
    return e(Result.Err("缺少文件 file_id"));
  }
  if (!name) {
    return e(Result.Err("缺少新的文件名"));
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const file_res = await store.find_file({
    file_id,
    user_id: user.id,
  });
  if (file_res.error) {
    return e(file_res);
  }
  const file = file_res.data;
  if (!file) {
    return e(Result.Err("没有匹配的记录"));
  }
  const drive_res = await Drive.Get({ id, user_id: user.id, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  const r = await drive.client.rename_file(file_id, name);
  if (r.error) {
    return e(r);
  }
  (async () => {
    const file_res = await store.find_file({
      file_id,
      user_id: user.id,
    });
    if (file_res.error) {
      return;
    }
    const file = file_res.data;
    if (!file) {
      return;
    }
    await store.update_file(file.id, {
      name,
    });
    const { type, parent_paths } = file;
    if (type === FileType.File) {
      const parsed_episode_res = await store.find_parsed_episode({
        file_id,
        user_id: user.id,
      });
      const parsed_episode = parsed_episode_res.data;
      if (parsed_episode) {
        await store.delete_parsed_episode({
          id: parsed_episode.id,
        });
        await store.add_tmp_file({
          name,
          parent_paths,
          user_id: user.id,
        });
        return;
      }
      const parsed_movie_res = await store.find_parsed_movie({
        file_id,
        user_id: user.id,
      });
      const parsed_movie = parsed_movie_res.data;
      if (parsed_movie) {
        await store.delete_parsed_movie({
          id: parsed_movie.id,
        });
        await store.add_tmp_file({
          name,
          parent_paths,
          user_id: user.id,
        });
        return;
      }
    }
    if (type === FileType.Folder) {
      //       const parsed_season_res = await store.find_parsed_season({
      //         file_id,
      //         season_id: null,
      //         user_id: user.id,
      //       });
      //       const parsed_season = parsed_season_res.data;
      //       if (parsed_season) {
      //         await store.delete_parsed_season({
      //           id: parsed_season.id,
      //         });
      //         return;
      //       }
      const parsed_tv_res = await store.find_parsed_tv({
        file_id,
        user_id: user.id,
      });
      const parsed_tv = parsed_tv_res.data;
      if (parsed_tv) {
        if (!parsed_tv.tv_id) {
          await store.delete_parsed_tv({
            id: parsed_tv.id,
          });
        }
        await store.add_tmp_file({
          name,
          parent_paths,
          user_id: user.id,
        });
        return;
      }
    }
  })();
  res.status(200).json({ code: 0, msg: "重命名成功", data: null });
}
