/**
 * @file 回复用户反馈或问题
 */
import dayjs from "dayjs";
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { Result } from "@/domains/result/index";
import { response_error_factory } from "@/utils/server";
import { r_id } from "@/utils/index";

export default async function v2_admin_report_reply(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id, content, media_id } = req.body as Partial<{ id: string; content: string; media_id: string }>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  if (!id) {
    return e(Result.Err("缺少反馈 id"));
  }
  const report = await store.prisma.report_v2.findFirst({
    where: {
      id,
      user_id: user.id,
    },
  });
  if (!report) {
    return e(Result.Err("没有匹配的反馈记录"));
  }
  if (!content) {
    return e(Result.Err("缺少回复内容"));
  }
  const unique_id = [report.id, content].join("/");
  const existing = await store.prisma.member_notification.findFirst({
    where: {
      unique_id,
      member_id: report.member_id,
    },
  });
  if (existing) {
    return e(Result.Err("该问题已有相同回复"));
  }
  await store.prisma.report_v2.update({
    where: {
      id: report.id,
    },
    data: {
      updated: dayjs().toISOString(),
      answer: content,
      reply_media_id: media_id,
    },
  });
  const media_profile = await (async () => {
    if (!media_id) {
      return null;
    }
    const media = await store.prisma.media.findFirst({
      where: {
        id: media_id,
        user_id: user.id,
      },
      include: {
        profile: true,
      },
    });
    if (!media) {
      return null;
    }
    return {
      id: media.id,
      type: media.type,
      name: media.profile.name,
      poster_path: media.profile.poster_path,
    };
  })();
  await store.prisma.member_notification.create({
    data: {
      id: r_id(),
      unique_id,
      content: JSON.stringify({
        media: media_profile,
        msg: content,
      }),
      type: 1,
      status: 1,
      is_delete: 0,
      member_id: report.member_id,
    },
  });
  return res.status(200).json({ code: 0, msg: "", data: null });
}
