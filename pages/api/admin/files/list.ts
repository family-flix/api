/**
 * @file 列出所有文件
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { User } from "@/domains/user";
import { bytes_to_size } from "@/utils";
import { FileType } from "@/constants";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { page: page_str = "1", page_size: page_size_str = "20" } = req.query as Partial<{
    page: string;
    page_size: string;
  }>;

  const t_res = await User.New(authorization);
  if (t_res.error) {
    return e(t_res);
  }

  const { id: user_id } = t_res.data;
  const page = Number(page_str);
  const page_size = Number(page_size_str);

  const episode_files = await store.prisma.parsed_episode.findMany({
    select: {
      file_id: true,
    },
  });
  const season_files = await store.prisma.parsed_season.findMany({
    where: {
      file_id: { not: null },
    },
    select: {
      file_id: true,
    },
  });
  const tv_files = await store.prisma.parsed_tv.findMany({
    where: {
      file_id: { not: null },
    },
    select: {
      file_id: true,
    },
  });
  const episode_file_ids = episode_files.map((item) => item.file_id);
  const season_file_ids = season_files.map((item) => item.file_id!);
  const tv_file_ids = tv_files.map((item) => item.file_id!);

  const where: NonNullable<Parameters<typeof store.prisma.file.findMany>[0]>["where"] = {
    // 没有被 parsed_episode、parsed_season 和 parsed_tv 关联的 file
    NOT: {
      file_id: {
        in: episode_file_ids.concat(season_file_ids).concat(tv_file_ids),
      },
    },
    type: FileType.File,
    user_id,
  };
  const list = await store.prisma.file.findMany({
    where,
    skip: (page - 1) * page_size,
    take: page_size,
    orderBy: {
      size: "desc",
    },
  });
  const count = await store.prisma.file.count({
    where: { user_id },
  });
  res.status(200).json({
    code: 0,
    msg: "",
    data: {
      total: count,
      list: list.map((file) => {
        const { id, file_id, name, parent_paths, size } = file;
        return {
          id,
          file_id,
          name,
          parent_paths,
          size,
          size_text: bytes_to_size(size || 0),
        };
      }),
      page,
      page_size,
      no_more: list.length + (page - 1) * page_size >= count,
    },
  });
}
