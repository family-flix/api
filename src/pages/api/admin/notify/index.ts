/**
 * @file 给指定成员发送通知。如果未指定成员，则群发给所有用户
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import dayjs from "dayjs";

import { User } from "@/domains/user";
import { ModelQuery } from "@/domains/store/types";
import { walk_model_with_cursor } from "@/domains/store/utils";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";
import { r_id } from "@/utils";
import { MemberNotifyTypes } from "@/constants";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { content, member_ids } = req.body as Partial<{ member_ids: string[]; content: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  await walk_model_with_cursor({
    fn: (args) => {
      const where: ModelQuery<"member"> = {
        disabled: 0,
        user_id: user.id,
      };
      if (member_ids && member_ids.length) {
        where.id = {
          in: member_ids,
        };
      }
      return store.prisma.member.findMany({
        where,
        ...args,
      });
    },
    page_size: 20,
    async handler(data) {
      await store.prisma.member_notification.create({
        data: {
          id: r_id(),
          unique_id: dayjs().unix().toString(),
          content: JSON.stringify({
            msg: content,
          }),
          type: MemberNotifyTypes.Common,
          status: 1,
          is_delete: 0,
          member_id: data.id,
        },
      });
    },
  });
  res.status(200).json({ code: 0, msg: "推送成功", data: null });
}
