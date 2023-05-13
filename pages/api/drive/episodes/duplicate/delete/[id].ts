/**
 * @file 删除播放记录
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp, Result } from "@/types";
import { parse_token, response_error_factory } from "@/utils/backend";
import { AliyunDriveClient } from "@/domains/aliyundrive";
import { store_factory } from "@/store";
import { store } from "@/store";

async function delete_episode_and_file(
  episode: { file_id: string },
  store: ReturnType<typeof store_factory>,
  client: AliyunDriveClient
) {
  const { file_id } = episode;
  // const r1 = await store.delete_episode({
  //   file_id,
  // });
  // if (r1.error) {
  //   return r1;
  // }
  // const r2 = await store.delete_folder({
  //   file_id,
  // });
  // if (r2.error) {
  //   return r2;
  // }
  const r = await client.delete_file(file_id);
  if (r.error) {
    return r;
  }
  return Result.Ok(null);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id, auth = authorization } = req.query as Partial<{
    id: string;
    auth: string;
  }>;
  if (!id) {
    return e("缺少要删除的文件 file_id 参数");
  }
  const t_res = parse_token(auth);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: user_id } = t_res.data;
  const episode_res = await store.find_episode({
    file_id: id,
    user_id,
  });
  if (episode_res.error) {
    return e(episode_res);
  }
  if (!episode_res.data) {
    return e("No matched record of episode");
  }
  const drive = episode_res.data;
  const client = new AliyunDriveClient({
    drive_id: drive.id,
    store,
  });
  const r = await delete_episode_and_file({ file_id: id }, store, client);
  if (r.error) {
    return e(r);
  }
  res.status(200).json({ code: 0, msg: "", data: null });
}
