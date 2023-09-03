/**
 * @file 回复用户反馈或问题
 */
import dayjs from "dayjs";
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { ReportTypes } from "@/constants";
import { parseJSONStr, r_id } from "@/utils";

type AnswerPayload = Partial<{
  content: string;
  season: {
    id: string;
    tv_id: string;
    name: string;
    poster_path: string;
  };
  movie: {
    id: string;
    name: string;
    poster_path: string;
  };
}>;

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.query as Partial<{ id: string }>;
  const { content, season, movie } = req.body as Partial<AnswerPayload>;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!id) {
    return e(Result.Err("缺少反馈 id"));
  }
  const user = t_res.data;
  const report = await store.prisma.report.findFirst({
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
  const answer: AnswerPayload = {
    content,
  };
  if (movie) {
    answer.movie = movie;
  }
  if (season) {
    answer.season = season;
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
  await store.prisma.report.update({
    where: {
      id: report.id,
    },
    data: {
      updated: dayjs().toISOString(),
      answer: JSON.stringify(answer),
    },
  });
  await store.prisma.member_notification.create({
    data: {
      id: r_id(),
      unique_id,
      content: JSON.stringify({
        movie,
        season,
        msg: content,
      }),
      type: 1,
      status: 1,
      is_delete: 0,
      member_id: report.member_id,
    },
  });
  res.status(200).json({ code: 0, msg: "", data: null });
}
