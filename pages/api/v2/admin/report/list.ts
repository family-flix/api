/**
 * @file 获取用户反馈的问题列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { ModelQuery } from "@/domains/store/types";
import { MediaTypes, ReportTypes } from "@/constants";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { type, page_size = 20 } = req.body as Partial<{
    type: ReportTypes;
    next_marker: string;
    page_size: number;
  }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const where: ModelQuery<"report_v2"> = {
    user_id: user.id,
  };
  if (type) {
    where.type = type;
  }
  const count = await store.prisma.report_v2.count({ where });
  const result = await store.list_with_cursor({
    fetch: (args) => {
      return store.prisma.report_v2.findMany({
        where,
        include: {
          media_source: {
            include: {
              profile: true,
              media: {
                include: {
                  profile: true,
                },
              },
            },
          },
          member: true,
        },
        orderBy: {
          created: "desc",
        },
        ...args,
      });
    },
  });
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      page_size,
      total: count,
      list: result.list.map((report) => {
        const { id, type, answer, member, media_source, data, created } = report;
        return {
          id,
          type,
          data,
          media: (() => {
            if (!media_source) {
              return null;
            }
            const {
              type,
              profile: media_source_profile,
              media: { profile: media_profile },
            } = media_source;
            return {
              type,
              name: media_profile.name,
              poster_path: media_profile.poster_path,
              episode_text:
                type === MediaTypes.Season ? `${media_source_profile.order} ${media_source_profile.name}` : null,
            };
          })(),
          answer,
          member: {
            id: member.id,
            name: member.remark,
          },
          created,
        };
      }),
    },
  });
}
