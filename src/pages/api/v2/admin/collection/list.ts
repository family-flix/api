/**
 * @file 管理后台/获取集合列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { store, BaseApiResp } from "@/store/index";
import { User } from "@/domains/user/index";
import { ModelQuery } from "@/domains/store/types";
import { response_error_factory } from "@/utils/server";
import { parseJSONStr } from "@/utils/index";
import { CollectionTypes } from "@/constants/index";

export default async function v2_admin_collection_list(
  req: NextApiRequest,
  res: NextApiResponse<BaseApiResp<unknown>>
) {
  const e = response_error_factory(res);
  const {
    type = CollectionTypes.Manually,
    name,
    next_marker = "",
    page_size,
  } = req.body as Partial<{
    type: number;
    name: string;
    next_marker: string;
    page_size: number;
  }>;
  const { authorization } = req.headers;
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  let queries: NonNullable<ModelQuery<"collection_v2">>[] = [];
  if (name) {
    queries = queries.concat({
      OR: [
        {
          title: {
            contains: name,
          },
        },
      ],
    });
  }
  const where: ModelQuery<"collection_v2"> = {
    type,
    user_id: user.id,
  };
  if (queries.length !== 0) {
    where.AND = queries;
  }
  const count = await store.prisma.collection_v2.count({
    where,
  });
  const result = await store.list_with_cursor({
    fetch: (args) => {
      return store.prisma.collection_v2.findMany({
        where,
        include: {
          medias: {
            include: {
              profile: true,
            },
          },
        },
        orderBy: [
          {
            sort: "desc",
          },
          {
            created: "desc",
          },
        ],
        ...args,
      });
    },
    page_size,
    next_marker,
  });
  const data = {
    total: count,
    page_size,
    list: result.list.map((collection) => {
      const { id, title, desc, extra = "{}", medias } = collection;
      const r = parseJSONStr<{ orders: Record<string, number> }>(extra);
      return {
        id,
        title,
        desc,
        medias: medias
          .map((season) => {
            const { id, type, profile } = season;
            const { name, poster_path, air_date } = profile;
            return {
              id,
              type,
              name,
              poster_path,
              air_date,
              order: (() => {
                if (r.error) {
                  return 9999;
                }
                const orders = r.data.orders;
                if (orders[id] !== undefined) {
                  return orders[id];
                }
                return 9999;
              })(),
            };
          })
          .sort((a, b) => a.order - b.order),
      };
    }),
  };
  return res.status(200).json({
    code: 0,
    msg: "",
    data,
  });
}
