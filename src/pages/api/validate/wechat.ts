/**
 * @file 微信小程序登录
 */
import axios from "axios";
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { app, store } from "@/store/index";
import { User } from "@/domains/user/index";
import { BaseApiResp, Result } from "@/types/index";
import { AuthenticationProviders } from "@/constants/index";
import { response_error_factory } from "@/utils/server";
import { r_id } from "@/utils/index";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { code } = req.body as Partial<{ code: string }>;
  if (!code) {
    return e(Result.Err("缺少 code"));
  }
  // 如果是多租户，请求中应该传入 admin 信息
  const user = await store.prisma.user.findFirst({});
  if (!user) {
    return e(Result.Err("请先设置管理员"));
  }
  // https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/login/auth.code2Session.html
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${app.env.WEAPP_ID}&secret=${app.env.WEAPP_SECRET}&js_code=${code}&grant_type=authorization_code`;
  const {
    data: { openid, session_key, unionid, errcode, errmsg },
  } = await axios.get(url);
  if (errcode && errcode !== 0) {
    return e(Result.Err(errmsg));
  }
  const authentication = await store.prisma.member_authentication.findFirst({
    where: {
      provider: AuthenticationProviders.Weapp,
      provider_id: openid,
      member: {
        user_id: user.id,
      },
    },
    include: {
      member: {
        include: {
          tokens: {
            take: 1,
          },
        },
      },
    },
  });
  if (authentication) {
    const token_record = authentication.member.tokens[0];
    if (!token_record) {
      const token_res = await User.Token({ id: authentication.member_id });
      if (token_res.error) {
        return e(Result.Err(token_res.error.message));
      }
      await store.prisma.member_token.create({
        data: {
          id: r_id(),
          token: token_res.data,
          used: 0,
          member_id: authentication.member_id,
        },
      });
      const token = token_res.data;
      res.status(200).json({ code: 0, msg: "", data: { id: authentication.member_id, token } });
      return;
    }
    res.status(200).json({ code: 0, msg: "", data: { id: authentication.member_id, token: token_record.token } });
    return;
  }
  const id = r_id();
  const token_res = await User.Token({ id });
  if (token_res.error) {
    return e(Result.Err(token_res.error.message));
  }
  const token = token_res.data;
  await store.prisma.member.create({
    data: {
      id,
      remark: id,
      tokens: {
        create: {
          id: r_id(),
          token,
          used: 0,
        },
      },
      authentications: {
        create: {
          id: r_id(),
          provider: AuthenticationProviders.Weapp,
          provider_id: openid,
        },
      },
      user_id: user.id,
    },
  });
  res.status(200).json({ code: 0, msg: "", data: { id, token: token } });
}
