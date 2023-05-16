/**
 * @file 获取 tv 列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { store } from "@/store";
import { log } from "@/logger/log";
import { BaseApiResp, resultify } from "@/types";
import { response_error_factory } from "@/utils/backend";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const {
    name,
    page = "1",
    pageSize: page_size = "20",
  } = req.query as Partial<{
    name: string;
    page: string;
    pageSize: string;
  }>;
  const { authorization } = req.headers;
  const t_resp = await User.New(authorization);
  if (t_resp.error) {
    return e(t_resp);
  }
  // console.log("[API]tv/list - token", t_resp.data);
  const { id: user_id } = t_resp.data;
  const number_page = Number(page);
  const number_size = Number(page_size);
  // const fields =
  //   "tv.id,searched_tv.name,searched_tv.original_name,searched_tv.overview,searched_tv.poster_path,searched_tv.first_air_date";
  // let simple_sql = `SELECT ${fields} FROM tv LEFT JOIN searched_tv ON tv.searched_tv_id = searched_tv.id WHERE ${condition} ORDER BY searched_tv.first_air_date DESC`;
  // let sql = `SELECT ${fields} FROM tv LEFT JOIN searched_tv ON tv.searched_tv_id = searched_tv.id WHERE ${condition} AND searched_tv.name ${`%${name}%`} OR searched_tv.original_name ${`%${name}%`} ORDER BY searched_tv.first_air_date DESC`;
  // sql += ` LIMIT ${(number_page - 1) * number_size}, ${number_size}`;
  // simple_sql += ` LIMIT ${(number_page - 1) * number_size}, ${number_size}`;
  // sql += ";";
  // simple_sql += ";";
  // const running_sql = name ? sql : simple_sql;
  // log(`fetch tv list ->`, running_sql);
  // const resp = await all<
  //   {
  //     id: string;
  //     name: string;
  //     original_name: string;
  //     overview: string;
  //     poster_path: string;
  //   }[]
  // >(running_sql);
  const count_resp = await resultify(
    store.prisma.tV.count.bind(store.prisma.tV)
  )({
    // 连接条件
    where: {
      user_id,
      // hidden: 0,
      searched_tv_id: {
        not: null,
      },
      searched_tv: {
        OR: name
          ? [
              {
                name: {
                  contains: name,
                },
              },
              {
                original_name: {
                  contains: name,
                },
              },
            ]
          : undefined,
      },
    },
  });
  if (count_resp.error) {
    console.log(count_resp.error);
    return e(count_resp);
  }
  const resp = await resultify(store.prisma.tV.findMany.bind(store.prisma.tV))({
    select: {
      // 将 fields 参数中的字段都包含进来
      // 这里假设 fields 是一个包含字段名的字符串数组
      id: true,
      name: true,
      searched_tv: {
        select: {
          name: true,
          original_name: true,
          overview: true,
          poster_path: true,
          first_air_date: true,
        },
      },
    },
    // 连接条件
    where: {
      user_id,
      // hidden: 0,
      searched_tv_id: {
        not: null,
      },
      searched_tv: {
        OR: name
          ? [
              {
                name: {
                  contains: name,
                },
              },
              {
                original_name: {
                  contains: name,
                },
              },
            ]
          : undefined,
      },
    },
    // 排序
    orderBy: {
      searched_tv: { first_air_date: "desc" },
    },
    // 分页
    skip: (number_page - 1) * number_size,
    take: number_size,
  });
  if (resp.error) {
    return e(resp);
  }
  const data = {
    total: count_resp.data,
    no_more: (() => {
      if (number_page * number_size >= count_resp.data) {
        return true;
      }
      return false;
    })(),
    list: resp.data.map((tv) => {
      const { id, searched_tv } = tv;
      const { name, original_name, overview, poster_path, first_air_date } =
        searched_tv;
      return {
        id,
        name,
        original_name,
        overview,
        poster_path,
        first_air_date,
      };
    }),
  };
  res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
