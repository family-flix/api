/**
 * @file 新增或更新影片播放记录
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { Member } from "@/domains/user/member";
import { AliyunDriveClient } from "@/domains/aliyundrive";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const {
    tv_id,
    episode_id,
    file_id,
    current_time: original_cur_time = 0,
    duration = 0,
  } = req.body as Partial<{
    tv_id: string;
    episode_id: string;
    /** 剧集可能有多个源，这里还要传入具体播放的是哪个源 */
    file_id: string;
    current_time: number;
    duration: number;
  }>;
  if (!tv_id) {
    return e("缺少电视剧 id");
  }
  if (!episode_id) {
    return e("缺少影片 id");
  }
  const t_res = await Member.New(authorization);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: member_id } = t_res.data;
  const cur_time = format_number_with_3decimals(original_cur_time);
  // const client = new AliyunDriveClient({ drive_id, store });
  // const thumbnail =
  // const existing_history_res = await store.find_history({});
  const existing_history = await store.prisma.play_history.findFirst({
    where: {
      tv_id,
      // 这里不能传 episode_id，当前是 E01，更新成 E02 时，用 E02 去找就有问题
      // episode_id,
      member_id,
    },
    include: {
      episode: {
        include: {
          parsed_episodes: true,
        },
      },
    },
  });
  // if (existing_history_res.error) {
  //   return e(existing_history_res);
  // }
  if (!existing_history) {
    const file_res = await store.find_file({
      file_id,
    });
    if (file_res.error) {
      return e(file_res);
    }
    const file = file_res.data;
    if (!file) {
      return e("没有匹配的视频源");
    }
    const { drive_id } = file;
    const thumbnail = await (async () => {
      if (!file_id) {
        return Result.Ok(null);
      }
      const client = new AliyunDriveClient({ drive_id, store });
      const thumbnail_res = await client.generate_thumbnail({ file_id, cur_time: cur_time.replace(".", "") });
      if (thumbnail_res.error) {
        return Result.Ok(null);
      }
      return Result.Ok(thumbnail_res.data.responseUrl);
    })();
    if (thumbnail.error) {
      return e(thumbnail);
    }
    const adding_res = await store.add_history({
      tv_id,
      episode_id,
      current_time: parseFloat(cur_time),
      duration,
      member_id,
      file_id: file_id ?? null,
      thumbnail: thumbnail.data ?? null,
    });
    if (adding_res.error) {
      return e(adding_res);
    }
    return res.status(200).json({
      code: 0,
      msg: "",
      data: null,
    });
  }
  const file_res = await store.find_file({
    file_id,
  });
  if (file_res.error) {
    return e(file_res);
  }
  const file = file_res.data;
  if (!file) {
    return e("没有匹配的视频源");
  }
  const { drive_id } = file;
  const thumbnail = await (async () => {
    if (!file_id) {
      return Result.Ok(null);
    }
    const client = new AliyunDriveClient({ drive_id, store });
    const thumbnail_res = await client.generate_thumbnail({ file_id, cur_time: cur_time.replace(".", "") });
    if (thumbnail_res.error) {
      return Result.Ok(null);
    }
    return Result.Ok(thumbnail_res.data.responseUrl);
  })();
  if (thumbnail.error) {
    return e(thumbnail);
  }
  const update_res = await store.update_history(existing_history.id, {
    episode_id,
    current_time: parseFloat(cur_time),
    duration,
    file_id: file_id ?? null,
    thumbnail: thumbnail.data ?? null,
  });
  if (update_res.error) {
    return e(update_res);
  }
  res.status(200).json({
    code: 0,
    msg: "",
    data: null,
  });
}

function format_number_with_3decimals(number: number) {
  // 将数字转换为字符串
  let numberString = number.toString();

  // 检查小数部分
  let decimalIndex = numberString.indexOf(".");
  let decimalPart = "";
  if (decimalIndex !== -1) {
    decimalPart = numberString.substring(decimalIndex + 1);
  }

  // 如果小数部分为空，则补充3个0
  if (decimalPart === "") {
    decimalPart = "000";
  }

  // 如果小数部分超过3位，则截取前3位
  if (decimalPart.length > 3) {
    decimalPart = decimalPart.substring(0, 3);
  }

  // 补充缺少的0
  while (decimalPart.length < 3) {
    decimalPart += "0";
  }

  // 构建最终结果
  let result = numberString;
  if (decimalIndex === -1) {
    result += ".";
  }
  result += decimalPart;

  return result;
}
