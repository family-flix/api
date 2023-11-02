/**
 * @file 更新电视频道列表
 */
import axios from "axios";
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/server";
import { r_id } from "@/utils";
import { store } from "@/store";

function fetchTVLiveChannels(data: string) {
  const lines = data.split("\n");
  const groups: Record<
    string,
    {
      group_name: string;
      name: string;
      logo: string;
      url: string;
    }[]
  > = {};
  for (let i = 1; i < lines.length; i += 2) {
    (() => {
      const live_url = lines[i + 1];
      if (!live_url || !live_url.startsWith("http")) {
        return;
      }
      const line = lines[i];
      const channel = parse_M3U_info_line(line);
      if (channel === null) {
        return;
      }
      const { group_title, tvg_name, tvg_logo } = channel;
      groups[group_title] = groups[group_title] || [];
      groups[group_title].push({
        group_name: group_title,
        name: tvg_name,
        logo: tvg_logo,
        url: live_url,
      });
    })();
  }
  const channels = Object.keys(groups)
    .map((k) => {
      return groups[k];
    })
    .reduce((total, cur) => {
      return total.concat(cur);
    }, []);
  return channels;
}

function parse_M3U_info_line(line: string) {
  const match = line.match(
    /#EXTINF:(-?\d+)\s*tvg-id="([^"]*)"\s*tvg-name="([^"]*)"\s*tvg-logo="([^"]*)"\s*group-title="([^"]*)",(.*)/
  );
  if (!match) {
    return null;
  }
  const info: {
    duration: number;
    tvg_id: string;
    tvg_name: string;
    tvg_logo: string;
    group_title: string;
    description: string;
  } = {
    duration: parseInt(match[1]),
    tvg_id: match[2],
    tvg_name: match[3],
    tvg_logo: match[4],
    group_title: match[5],
    description: match[6],
  };
  return info;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { url } = req.body as Partial<{
    url: string;
  }>;
  const { authorization } = req.headers;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const source_url = "https://live.fanmingming.com/tv/m3u/global.m3u";
  const r = await axios.get<string>(url || source_url);
  const { data } = r;
  const channels = fetchTVLiveChannels(data);
  for (let i = 0; i < channels.length; i += 1) {
    await (async () => {
      const { name, group_name, logo, url } = channels[i];
      const existing = await store.prisma.tv_live.findFirst({
        where: {
          url,
          user_id: user.id,
        },
      });
      if (existing) {
        await store.prisma.tv_live.update({
          where: {
            id: existing.id,
          },
          data: {
            name,
            group_name,
            logo,
            order: i,
          },
        });
        return;
      }
      await store.prisma.tv_live.create({
        data: {
          id: r_id(),
          name,
          group_name,
          logo,
          url,
          order: i,
          user_id: user.id,
        },
      });
    })();
  }
  res.status(200).json({
    code: 0,
    msg: "更新成功",
    data: null,
  });
}
