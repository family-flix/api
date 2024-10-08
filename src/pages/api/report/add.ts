/**
 * @file 用户反馈问题
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store } from "@/store";
import { Member } from "@/domains/user/member";
import { Notify } from "@/domains/notify";
import { PushClientTypes } from "@/domains/notify/constants";
import { ReportTypes } from "@/constants";
import { response_error_factory } from "@/utils/server";
import { parseJSONStr } from "@/utils";
import { BaseApiResp, Result } from "@/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { type, data } = req.body as Partial<{
    type: number;
    data: string;
  }>;
  const { authorization } = req.headers;
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const member = t_res.data;
  if (type === undefined) {
    return e(Result.Err("缺少问题类型"));
  }
  if (!data) {
    return e(Result.Err("缺少问题内容"));
  }
  const d_res = parseJSONStr<{
    content: string;
    tv_id?: string;
    season_id?: string;
    episode_id?: string;
    movie_id?: string;
  }>(data);
  if (d_res.error) {
    return e(d_res);
  }
  const json = d_res.data;
  const payload = await (() => {
    if (json.tv_id) {
      const d: {
        tv_id: string;
        season_id?: string;
        episode_id?: string;
        data: string;
      } = {
        tv_id: json.tv_id as string,
        data: json.content as string,
      };
      if (json.season_id) {
        d.season_id = json.season_id as string;
        if (json.episode_id) {
          d.episode_id = json.episode_id as string;
        }
      }
      // 电视剧有问题
      return d;
    }
    if (json.movie_id) {
      const d: {
        movie_id: string;
        data: string;
      } = {
        movie_id: json.movie_id as string,
        data: json.content as string,
      };
      // 电影有问题
      return d;
    }
    // 想看/问题反馈
    return {
      data: json.content as string,
    };
  })();
  console.log(payload);
  const r = await store.add_report({
    ...payload,
    type,
    member_id: member.id,
    user_id: member.user.id,
  });
  if (r.error) {
    return e(r);
  }
  async function notify(text: string) {
    if (typeof text !== "string") {
      console.log(`推送消息失败，请传入文本消息，传入了 `, text);
      return;
    }
    const notify_res = await Notify.New({
      type: PushClientTypes.WXPush,
      store,
      token: member.user.settings.wxpush_token,
    });
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
  res.status(200).json({
    code: 0,
    msg: "新增反馈成功",
    data: null,
  });
}
