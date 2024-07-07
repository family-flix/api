/**
 * @file 使用二维码登录
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import dayjs from "dayjs";

import { store, BaseApiResp } from "@/store/index";
import { Member } from "@/domains/user/member";
import { User } from "@/domains/user";
import { Result } from "@/domains/result/index";
import { response_error_factory } from "@/utils/server";
import { r_id } from "@/utils/index";
import { AuthCodeStep } from "@/constants/index";

export default async function v2_wechat_auth_code_confirm(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res.error.message);
  }
  const member = t_res.data;
  const { code, status: step } = req.body as Partial<{ code: string; status: AuthCodeStep }>;
  if (!code) {
    return e(Result.Err("缺少 code"));
  }
  if (!step) {
    return e(Result.Err("缺少 status"));
  }
  const auth_code = await store.prisma.auth_qrcode.findFirst({
    where: {
      id: code,
    },
  });
  if (!auth_code) {
    return e(Result.Err("没有匹配的记录"));
  }
  if (dayjs(auth_code.expires).isBefore(dayjs())) {
    return e(Result.Err("二维码已失效"));
  }
  if (step <= auth_code.step) {
    return e(Result.Err("异常操作"));
  }
  if (step === AuthCodeStep.Scanned) {
    await store.prisma.auth_qrcode.update({
      where: {
        id: auth_code.id,
      },
      data: {
        step,
      },
    });
    return res.status(200).json({
      code: 0,
      msg: "",
      data: null,
    });
  }
  if (step === AuthCodeStep.Confirmed) {
    await store.prisma.auth_qrcode.update({
      where: {
        id: auth_code.id,
      },
      data: {
        step,
        member_id: member.id,
      },
    });
    return res.status(200).json({
      code: 0,
      msg: "",
      data: null,
    });
  }
  return e(Result.Err("异常 step 参数"));
}
