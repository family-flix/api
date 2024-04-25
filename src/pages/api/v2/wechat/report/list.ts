/**
 * @file 用户反馈问题
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { Member } from "@/domains/user/member";
import { MediaTypes } from "@/constants/index";
import { response_error_factory } from "@/utils/server";
import { ModelQuery } from "@/domains/store/types";

export default async function v2_wechat_report_list(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const {
    status,
    type,
    page_size,
    next_marker = "",
  } = req.body as Partial<{
    status: number;
    type: number;
    data: string;
    next_marker: string;
    page_size: number;
  }>;
  const { authorization } = req.headers;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  const where: NonNullable<ModelQuery<"report_v2">> = {
    hidden: 0,
    member_id: member.id,
  };
  if (status !== undefined) {
    where.status = status;
  }
  if (type !== undefined) {
    where.type = type;
  }
  const result = await store.list_with_cursor({
    fetch(extra) {
      return store.prisma.report_v2.findMany({
        where,
        include: {
          media: {
            include: {
              profile: true,
            },
          },
          media_source: {
            include: {
              profile: true,
            },
          },
          member: true,
        },
        orderBy: {
          created: "desc",
        },
        ...extra,
      });
    },
    page_size,
    next_marker,
  });
  const data = {
    list: result.list.map((report) => {
      const { id, type, answer, member, media, media_source, data, created } = report;
      return {
        id,
        type,
        data,
        media: ((): null | {} => {
          if (media) {
            if (media_source) {
              return {
                type: media.type,
                name: media.profile.name,
                poster_path: media.profile.poster_path,
                episode_text:
                  media.type === MediaTypes.Season
                    ? `${media_source.profile.order} ${media_source.profile.name}`
                    : null,
              };
            }
            return {
              type: media.type,
              name: media.profile.name,
              poster_path: media.profile.poster_path,
              episode_text: null,
            };
          }
          return null;
        })(),
        answer,
        member: {
          id: member.id,
          name: member.remark,
        },
        created,
      };
    }),
    next_marker: result.next_marker,
  };
  return res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
