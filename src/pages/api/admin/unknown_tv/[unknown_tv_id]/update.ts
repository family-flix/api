/**
 * @file 修改未识别电视剧文件夹名称，并重新索引
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { app, store } from "@/store/index";
import { User } from "@/domains/user";
import { MediaSearcher } from "@/domains/searcher";
import { Job, TaskTypes } from "@/domains/job";
import { ParsedTVRecord } from "@/domains/store/types";
import { walk_model_with_cursor } from "@/domains/store/utils";
import { DriveAnalysis } from "@/domains/analysis";
import { Drive } from "@/domains/drive/index";
import { response_error_factory } from "@/utils/server";
import { BaseApiResp, Result } from "@/types";
import { parse_filename_for_video } from "@/utils/parse_filename_for_video";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id } = req.body as Partial<{ id: string }>;
  const { name } = req.body as { name: string };
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  if (!id) {
    return e(Result.Err("缺少电视剧 id"));
  }
  if (!name) {
    return e(Result.Err("缺少新文件夹名称"));
  }
  const user = t_res.data;
  const { id: user_id, settings } = user;
  if (!settings.tmdb_token) {
    return e(Result.Err("缺少 TMDB_TOKEN"));
  }
  const parsed_tv = await store.prisma.parsed_tv.findFirst({
    where: {
      id,
      user_id,
    },
  });
  if (!parsed_tv) {
    return e(Result.Err("没有匹配的电视剧记录"));
  }
  const { drive_id } = parsed_tv;
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  const job_res = await Job.New({
    desc: "更新未识别电视剧文件夹名称并重新索引",
    unique_id: "update_movie_and_season",
    type: TaskTypes.RefreshMedia,
    user_id: user.id,
    app,
    store,
  });
  if (job_res.error) {
    return e(job_res);
  }
  const job = job_res.data;
  async function run(parsed_tv: ParsedTVRecord) {
    if (!parsed_tv.file_id) {
      job.finish();
      return Result.Err("该记录非文件夹，请更新对应剧集名称");
    }
    const parse_info = parse_filename_for_video(
      name,
      ["name", "original_name", "season", "episode"],
      user.get_filename_rules()
    );
    const updated_parsed_tv = await store.prisma.parsed_tv.update({
      where: {
        id: parsed_tv.id,
      },
      data: {
        name: parse_info.name,
        original_name: parse_info.original_name,
        file_name: name,
      },
    });
    await store.prisma.file.updateMany({
      where: {
        file_id: parsed_tv.file_id,
      },
      data: {
        name,
      },
    });
    if (!parse_info.episode) {
      // 从电视剧变成电影了
      await store.prisma.parsed_tv.deleteMany({
        where: {
          id: parsed_tv.id,
          user_id: user.id,
        },
      });
      await store.prisma.parsed_season.deleteMany({
        where: {
          parsed_tv_id: parsed_tv.id,
          user_id: user.id,
        },
      });
      await store.prisma.parsed_episode.deleteMany({
        where: {
          parsed_tv_id: parsed_tv.id,
          user_id: user.id,
        },
      });
      const analysis_res = await DriveAnalysis.New({
        user,
        drive,
        assets: app.assets,
        store,
        on_print(v) {
          job.output.write(v);
        },
      });
      if (analysis_res.error) {
        job.finish();
        job.output.write_line(["初始化云盘索引失败", analysis_res.error.message]);
        return;
      }
      const analysis = analysis_res.data;
      await analysis.run([
        {
          name: [drive.profile.root_folder_name, parsed_tv.file_name].join("/"),
          type: "folder",
        },
      ]);
      job.finish();
      return;
    }
    const search_res = await MediaSearcher.New({
      user,
      drive,
      assets: app.assets,
      store,
    });
    if (search_res.error) {
      job.output.write_line(["初始化搜索器失败", search_res.error.message]);
      job.finish();
      return;
    }
    const searcher = search_res.data;
    await searcher.process_parsed_tv({ parsed_tv: updated_parsed_tv });
    await walk_model_with_cursor({
      fn: (args) => {
        return store.prisma.parsed_season.findMany({
          where: {
            parsed_tv_id: updated_parsed_tv.id,
          },
          include: {
            parsed_tv: {
              include: {
                tv: {
                  include: {
                    profile: true,
                  },
                },
              },
            },
          },
          orderBy: {
            parsed_tv: {
              name: "desc",
            },
          },
          ...args,
        });
      },
      handler: async (parsed_season, i) => {
        const { parsed_tv } = parsed_season;
        job.output.write_line([`第${i + 1}个`]);
        const r = await searcher.process_parsed_season({ parsed_tv, parsed_season }, { force: true });
        if (r.error) {
          job.output.write_line(["添加电视剧季详情失败", "  ", r.error.message]);
          return;
        }
      },
    });
    await walk_model_with_cursor({
      fn: (args) => {
        return store.prisma.parsed_episode.findMany({
          where: {
            parsed_tv_id: updated_parsed_tv.id,
          },
          include: {
            parsed_tv: {
              include: {
                tv: {
                  include: {
                    profile: true,
                  },
                },
              },
            },
          },
          orderBy: {
            parsed_tv: {
              name: "desc",
            },
          },
          ...args,
        });
      },
      handler: async (parsed_episode, i) => {
        const { parsed_tv } = parsed_episode;
        job.output.write_line([`第${i + 1}个`]);
        const r = await searcher.process_parsed_episode({ parsed_tv, parsed_episode }, { force: true });
        if (r.error) {
          job.output.write_line(["添加电视剧剧集详情失败", "  ", r.error.message]);
          return;
        }
      },
    });
    job.output.write_line(["完成"]);
    job.finish();
  }
  run(parsed_tv);
  res.status(200).json({
    code: 0,
    msg: "开始更新",
    data: {
      job_id: job.id,
    },
  });
}
