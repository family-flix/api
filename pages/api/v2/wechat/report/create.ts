/**
 * @file 用户反馈问题
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { Member } from "@/domains/user/member";
import { Notify } from "@/domains/notify";
import { ReportTypes } from "@/constants";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/server";
import { r_id } from "@/utils";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { type, data, media_id, media_source_id } = req.body as Partial<{
    type: number;
    data: string;
    media_id: string;
    media_source_id: string;
  }>;
  const { authorization } = req.headers;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  if (!type) {
    return e(Result.Err("缺少问题类型"));
  }
  if (!data) {
    return e(Result.Err("缺少问题描述"));
  }
  async function notify(text: string) {
    if (typeof text !== "string") {
      console.log(`推送消息失败，请传入文本消息，传入了 `, text);
      return;
    }
    const notify_res = await Notify.New({ type: 1, store, token: member.user.settings.push_deer_token });
    if (notify_res.error) {
      console.log(`推送消息 '${text}' 失败`, notify_res.error.message);
      return;
    }
    const notify = notify_res.data;
    const r = await notify.send({
      text,
    });
    if (r.error) {
      console.log("推送失败", r.error.message);
    }
  }
  notify(
    (() => {
      if (type === ReportTypes.Movie) {
        return "电影问题反馈";
      }
      if (type === ReportTypes.TV) {
        return "电视剧问题反馈";
      }
      if (type === ReportTypes.Question) {
        return "问题反馈";
      }
      if (type === ReportTypes.Want) {
        return "想看电视剧/电影";
      }
      return "未知反馈";
    })()
  );
  if (media_id && media_source_id) {
    // 1. 影视剧存在问题
    const existing = await store.prisma.report_v2.findFirst({
      where: {
        type,
        data,
        media_id,
        media_source_id,
        member_id: member.id,
        user_id: member.user.id,
      },
    });
    if (existing) {
      return e(Result.Err("已经提交过该内容了"));
    }
    const r = await store.prisma.report_v2.create({
      data: {
        id: r_id(),
        type,
        data,
        media_id,
        media_source_id,
        member_id: member.id,
        user_id: member.user.id,
      },
    });
    res.status(200).json({
      code: 0,
      msg: "新增反馈成功",
      data: null,
    });
    return;
  }
  if (media_id) {
    // 1. 影视剧存在问题
    const existing = await store.prisma.report_v2.findFirst({
      where: {
        type,
        data,
        media_id,
        member_id: member.id,
        user_id: member.user.id,
      },
    });
    if (existing) {
      return e(Result.Err("已经提交过该内容了"));
    }
    const r = await store.prisma.report_v2.create({
      data: {
        id: r_id(),
        type,
        data,
        media_id,
        member_id: member.id,
        user_id: member.user.id,
      },
    });
    res.status(200).json({
      code: 0,
      msg: "新增反馈成功",
      data: null,
    });
    return;
  }
  // 2. 意见/反馈/想看
  const existing = await store.prisma.report_v2.findFirst({
    where: {
      type,
      data,
      member_id: member.id,
      user_id: member.user.id,
    },
  });
  if (existing) {
    return e(Result.Err("已经提交过该内容了"));
  }
  const r = await store.prisma.report_v2.create({
    data: {
      id: r_id(),
      type,
      data,
      member_id: member.id,
      user_id: member.user.id,
    },
  });
  res.status(200).json({
    code: 0,
    msg: "新增反馈成功",
    data: null,
  });
}
