/**
 * @file 创建登录二维码
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import dayjs from "dayjs";

import { store, BaseApiResp } from "@/store/index";
import { Result } from "@/types/index";
import { response_error_factory } from "@/utils/server";
import { r_id } from "@/utils/index";
import { AuthCodeStep } from "@/constants/index";

export default async function v2_wechat_auth_code_create(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const administrator = await store.prisma.user.findFirst({});
  if (!administrator) {
    return e(Result.Err("系统异常"));
  }
  const created = await store.prisma.auth_qrcode.create({
    data: {
      id: r_id(),
      step: AuthCodeStep.Pending,
      expires: dayjs().add(3, "minute").toISOString(),
      user_id: administrator.id,
    },
  });
  return res.status(200).json({
    code: 0,
    msg: "",
    data: {
      step: created.step,
      code: created.id,
    },
  });
}
