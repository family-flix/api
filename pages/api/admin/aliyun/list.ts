/**
 * @file 以阿里云盘角度，返回列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store } from "@/store/index";
import { User } from "@/domains/user/index";
import { DriveWhereInput } from "@/domains/store/types";
import { AliyunDriveProfile } from "@/domains/clients/alipan/types";
import { BaseApiResp } from "@/types/index";
import { response_error_factory } from "@/utils/server";
import { to_number } from "@/utils/primitive";
import { parseJSONStr } from "@/utils/index";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const {
    name,
    page: page_str,
    page_size: page_size_str,
  } = req.query as Partial<{
    name: string;
    page: string;
    page_size: string;
  }>;
  const { authorization } = req.headers;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const { id: user_id } = user;
  const page = to_number(page_str, 1);
  const page_size = to_number(page_size_str, 20);
  let queries: DriveWhereInput[] = [];
  if (name) {
    queries = queries.concat({
      OR: [
        {
          profile: {
            contains: name,
          },
        },
      ],
    });
  }
  const where: NonNullable<Parameters<typeof store.prisma.drive.findMany>[0]>["where"] = {
    user_id,
  };
  if (queries.length !== 0) {
    where.AND = queries;
  }
  const count = await store.prisma.drive.count({
    where,
  });
  const list = await store.prisma.drive.findMany({
    where,
    include: {
      drive_token: true,
    },
    orderBy: {
      created: "desc",
    },
    skip: (page - 1) * page_size,
    take: page_size,
  });
  const data = {
    total: count,
    page,
    page_size,
    no_more: list.length + (page - 1) * page_size >= count,
    list: list.map((drive) => {
      const { name, unique_id, profile, drive_token } = drive;
      const data = {
        id: unique_id,
        name,
      };
      const profile_res = parseJSONStr<AliyunDriveProfile>(profile);
      if (profile_res.data) {
        const { nick_name, user_name, avatar, app_id, user_id, device_id, resource_drive_id } = profile_res.data;
        Object.assign(data, {
          nick_name,
          user_name,
          avatar,
          app_id,
          user_id,
          device_id,
          resource_drive_id,
        });
      }
      if (drive_token) {
        const token_res = parseJSONStr<{ access_token: string; refresh_token: string }>(drive_token.data);
        if (token_res.data) {
          const { access_token, refresh_token } = token_res.data;
          Object.assign(data, {
            access_token,
            refresh_token,
          });
        }
      }
      return data;
    }),
  };
  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
