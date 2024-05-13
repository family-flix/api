/**
 * @file 获取登录二维码状态
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import dayjs from "dayjs";

import { store, BaseApiResp } from "@/store/index";
import { Member } from "@/domains/user/member";
import { User } from "@/domains/user";
import { Result } from "@/types/index";
import { response_error_factory } from "@/utils/server";
import { r_id } from "@/utils/index";
import { AuthCodeStep } from "@/constants/index";

export default async function v2_wechat_auth_code_check(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { code } = req.body as Partial<{ code: string }>;
  if (!code) {
    return e(Result.Err("缺少 code 参数"));
  }
  const auth_code = await store.prisma.auth_qrcode.findFirst({
    where: {
      id: code,
    },
    include: {
      member: true,
    },
  });
  if (!auth_code) {
    return e(Result.Err("没有匹配的记录"));
  }
  if (auth_code.step === AuthCodeStep.Confirmed) {
    if (!auth_code.member) {
      return e(Result.Err("异常"));
    }
    const t2 = await User.Token({ id: auth_code.member.id });
    if (t2.error) {
      return Result.Err(t2.error);
    }
    const token = t2.data;
    return res.status(200).json({
      code: 0,
      msg: "",
      data: {
        step: auth_code.step,
        id: auth_code.member.id,
        email: auth_code.member.email,
        token,
      },
    });
  }
  return res.status(200).json({
    code: 0,
    msg: "",
    data: {
      step: (() => {
        if (dayjs(auth_code.expires).isBefore(dayjs())) {
          return AuthCodeStep.Expired;
        }
        return auth_code.step;
      })(),
    },
  });
}
