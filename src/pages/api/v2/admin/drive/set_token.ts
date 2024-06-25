/**
 * @file 设置指定云盘的 refresh_token
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { Drive } from "@/domains/drive/index";
import { Result } from "@/domains/result/index";
import { response_error_factory } from "@/utils/server";
import { parseJSONStr } from "@/utils/index";

export default async function v2_admin_drive_set_token(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id: drive_id, refresh_token } = req.body as Partial<{ id: string; refresh_token: string }>;
  const t = await User.New(authorization, store);
  if (t.error) {
    return e(t);
  }
  const user = t.data;
  if (!drive_id) {
    return e(Result.Err("缺少云盘 id"));
  }
  if (!refresh_token) {
    return e(Result.Err("缺少 refresh_token"));
  }
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  const drive_token_res = await store.find_aliyun_drive_token({
    id: drive.profile.token_id,
  });
  if (drive_token_res.error) {
    return e(drive_token_res);
  }
  const drive_token = drive_token_res.data;
  if (!drive_token) {
    return e(Result.Err("该云盘没有 token 记录"));
  }
  const prev_token_res = parseJSONStr(drive_token.data);
  if (prev_token_res.error) {
    return e(prev_token_res);
  }
  const r2 = await store.update_aliyun_drive_token(drive_token.id, {
    data: JSON.stringify({
      ...prev_token_res.data,
      refresh_token,
    }),
  });
  if (r2.error) {
    return e(r2);
  }
  return res.status(200).json({ code: 0, msg: "修改 refresh_token 成功", data: null });
}
