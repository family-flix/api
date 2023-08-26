/**
 * @file 用户反馈问题
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { Member } from "@/domains/user/member";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { parseJSONStr } from "@/utils";
import { store } from "@/store";
import { Notify } from "@/domains/notify";
import { ReportTypes } from "@/constants";

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
  const d_res = await parseJSONStr(data);
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
  const r = await store.add_report({
    ...payload,
    type,
    answer: "",
    member_id: member.id,
    user_id: member.user.id,
  });
  if (r.error) {
    return e(r);
  }
  async function notify(text: string) {
    const notify_res = await Notify.New({ type: 1, store, token: member.user.settings.push_deer_token });
    const notify = notify_res.data;
    if (notify) {
      notify.send({
        text,
      });
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
