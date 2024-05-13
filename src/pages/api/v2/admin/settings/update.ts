/**
 * @file 更新用户配置信息
 */
import Joi from "joi";
import dayjs from "dayjs";
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User, UserSettings } from "@/domains/user";
import { response_error_factory } from "@/utils/server";
import { Result, resultify } from "@/types/index";

const schema = Joi.object({
  push_deer_token: Joi.string().allow(""),
  extra_filename_rules: Joi.string().allow(""),
  ignore_files_when_sync: Joi.string().allow(""),
  max_size_when_sync: Joi.number().allow(""),
  can_register: Joi.bool().optional(),
  no_need_invitation_code: Joi.bool().optional(),
});

export default async function v2_admin_settings_update(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const updated_settings = req.body as Partial<UserSettings>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const r = await resultify(schema.validateAsync.bind(schema))(updated_settings);
  if (r.error) {
    return e(Result.Err(r.error.message));
  }
  await store.prisma.settings.update({
    where: {
      user_id: user.id,
    },
    data: {
      updated: dayjs().toISOString(),
      detail: JSON.stringify({
        ...user.settings,
        ...updated_settings,
      }),
    },
  });
  return res.status(200).json({ code: 0, msg: "更新成功", data: null });
}
