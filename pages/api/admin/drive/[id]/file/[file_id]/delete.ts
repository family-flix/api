/**
 * @file 阿里云盘 删除指定文件列表
 */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

import { User } from "@/domains/user";
import { Drive } from "@/domains/drive";
import { Job } from "@/domains/job";
import { TaskStatus, TaskTypes } from "@/domains/job/constants";
import {
  ArticleLineNode,
  ArticleListItemNode,
  ArticleListNode,
  ArticleSectionNode,
  ArticleTextNode,
} from "@/domains/article";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";
import { FileType } from "@/constants";
import { FileRecord } from "@/domains/store/types";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id: drive_id, file_id } = req.query as Partial<{
    /** 云盘 id */
    id: string;
    /** 文件 id */
    file_id: string;
  }>;
  if (!drive_id) {
    return e(Result.Err("缺少云盘 id"));
  }
  if (!file_id) {
    return e(Result.Err("缺少文件 id"));
  }
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const user = t_res.data;
  const running_task_res = await store.prisma.async_task.findFirst({
    where: {
      unique_id: drive_id,
      status: TaskStatus.Running,
    },
  });
  if (running_task_res) {
    return e(Result.Err("该文件所在云盘有进行中的任务"));
  }
  const file_res = await store.find_file({
    file_id,
  });
  if (file_res.error) {
    return e(file_res);
  }
  if (!file_res.data) {
    return e(Result.Err("没有匹配的记录"));
  }
  const drive_res = await Drive.Get({ id: drive_id, user_id: user.id, store });
  if (drive_res.error) {
    return e(drive_res.error);
  }
  const drive = drive_res.data;
  const task_res = await Job.New({
    desc: `删除 '${file_res.data.name}'`,
    unique_id: "delete_file",
    type: TaskTypes.DeleteDriveFile,
    user_id: user.id,
    store,
  });
  if (task_res.error) {
    return;
  }
  const task = task_res.data;
  task.output.write(
    new ArticleLineNode({
      children: ["开始删除数据库文件记录"].map((text) => {
        return new ArticleTextNode({ text });
      }),
    })
  );
  async function delete_file_descendants(f: FileRecord) {
    const { file_id, name, type } = f;
    const files_res = await store.find_files({
      parent_file_id: file_id,
    });
    if (files_res.error) {
      return;
    }
    const files = files_res.data;

    task.output.write(
      new ArticleSectionNode({
        children: [
          new ArticleLineNode({
            children: [`文件夹 「${name}」 下有 ${files.length} 个文件夹/文件`].map(
              (text) => new ArticleTextNode({ text })
            ),
          }),
          new ArticleListNode({
            children: files.map((file) => {
              const { name, parent_paths } = file;
              return new ArticleListItemNode({
                children: [`${parent_paths}/${name}`].map((text) => new ArticleTextNode({ text })),
              });
            }),
          }),
        ],
      })
    );
    for (let i = 0; i < files_res.data.length; i += 1) {
      const child = files_res.data[i];
      const { name, parent_paths } = child;
      if (child.type === FileType.Folder) {
        task.output.write(
          new ArticleSectionNode({
            children: [
              new ArticleLineNode({
                children: [`「${parent_paths}/${name}」`, "是文件夹，先删除子文件夹及文件"].map(
                  (text) => new ArticleTextNode({ text })
                ),
              }),
            ],
          })
        );
        await delete_file_descendants(child);
      }
    }
    await store.prisma.file.deleteMany({
      where: {
        file_id: {
          in: files.map((f) => f.file_id),
        },
      },
    });
    task.output.write(
      new ArticleLineNode({
        children: [`删除文件夹 「${name}」 下的所有子文件/文件`].map((text) => new ArticleTextNode({ text })),
      })
    );
    task.output.write(
      new ArticleLineNode({
        children: ["删除关联的同步任务"].map((text) => new ArticleTextNode({ text })),
      })
    );
    const where = {
      file_id: {
        in: files.map((f) => f.file_id),
      },
    };
    const r1 = await store.prisma.bind_for_parsed_tv.findMany({
      where,
    });
    if (r1.length) {
      task.output.write(
        new ArticleSectionNode({
          children: [
            new ArticleListNode({
              children: r1.map(
                (text) =>
                  new ArticleListItemNode({
                    children: [text.name].map((text) => {
                      return new ArticleTextNode({ text });
                    }),
                  })
              ),
            }),
          ],
        })
      );
    }
    await store.prisma.bind_for_parsed_tv.deleteMany({
      where,
    });
    task.output.write(
      new ArticleLineNode({
        children: ["开始删除关联的剧集源"].map((text) => new ArticleTextNode({ text })),
      })
    );
    const r2 = await store.prisma.parsed_episode.findMany({
      where,
    });
    if (r2.length) {
      task.output.write(
        new ArticleSectionNode({
          children: [
            new ArticleListNode({
              children: r2.map(
                (text) =>
                  new ArticleListItemNode({
                    children: [text.name, text.episode_number].map((text) => {
                      return new ArticleTextNode({ text });
                    }),
                  })
              ),
            }),
          ],
        })
      );
    }
    await store.prisma.parsed_episode.deleteMany({
      where,
    });
    task.output.write(
      new ArticleLineNode({
        children: ["开始删除关联的解析季结果"].map((text) => new ArticleTextNode({ text })),
      })
    );
    const r3 = await store.prisma.parsed_season.findMany({
      where,
    });
    if (r3.length) {
      task.output.write(
        new ArticleSectionNode({
          children: [
            new ArticleListNode({
              children: r3.map(
                (text) =>
                  new ArticleListItemNode({
                    children: [text.season_number].map((text) => {
                      return new ArticleTextNode({ text });
                    }),
                  })
              ),
            }),
          ],
        })
      );
    }
    await store.prisma.parsed_season.deleteMany({
      where,
    });
    task.output.write(
      new ArticleLineNode({
        children: ["开始删除关联的解析电视剧结果"].map((text) => new ArticleTextNode({ text })),
      })
    );
    const r4 = await store.prisma.parsed_tv.findMany({
      where,
    });
    if (r4.length) {
      task.output.write(
        new ArticleSectionNode({
          children: [
            new ArticleListNode({
              children: r4.map(
                (text) =>
                  new ArticleListItemNode({
                    children: [text.name || ""].map((text) => {
                      return new ArticleTextNode({ text });
                    }),
                  })
              ),
            }),
          ],
        })
      );
    }
    await store.prisma.parsed_tv.deleteMany({
      where,
    });
    task.output.write(
      new ArticleLineNode({
        children: ["开始删除关联的解析电影结果"].map((text) => new ArticleTextNode({ text })),
      })
    );
    const r5 = await store.prisma.parsed_movie.findMany({
      where,
    });
    if (r5.length) {
      task.output.write(
        new ArticleSectionNode({
          children: [
            new ArticleListNode({
              children: r5.map(
                (text) =>
                  new ArticleListItemNode({
                    children: [text.name].map((text) => {
                      return new ArticleTextNode({ text });
                    }),
                  })
              ),
            }),
          ],
        })
      );
    }
    await store.prisma.parsed_movie.deleteMany({
      where,
    });
  }
  async function run(file: FileRecord) {
    if (file.type === FileType.Folder) {
      await delete_file_descendants(file);
    }
    await store.delete_file({
      file_id,
    });
    task.output.write(
      new ArticleLineNode({
        children: ["所有子文件夹及文件删除完成", " 开始删除文件夹关联的同步任务"].map(
          (text) => new ArticleTextNode({ text })
        ),
      })
    );
    const r1 = await store.find_sync_task_list({
      file_id,
    });
    if (r1.data?.length) {
      task.output.write(
        new ArticleSectionNode({
          children: [
            new ArticleListNode({
              children: r1.data.map(
                (text) =>
                  new ArticleListItemNode({
                    children: [text.name].map((text) => {
                      return new ArticleTextNode({ text });
                    }),
                  })
              ),
            }),
          ],
        })
      );
    }
    await store.prisma.bind_for_parsed_tv.deleteMany({
      where: {
        file_id,
      },
    });
    task.output.write(
      new ArticleLineNode({
        children: ["开始删除关联的剧集源"].map((text) => new ArticleTextNode({ text })),
      })
    );
    const r2 = await store.find_parsed_episode_list({
      file_id,
    });
    if (r2.data?.length) {
      task.output.write(
        new ArticleSectionNode({
          children: [
            new ArticleListNode({
              children: r2.data.map(
                (text) =>
                  new ArticleListItemNode({
                    children: [text.name, text.episode_number].map((text) => {
                      return new ArticleTextNode({ text });
                    }),
                  })
              ),
            }),
          ],
        })
      );
    }
    await store.prisma.parsed_episode.deleteMany({
      where: {
        file_id,
      },
    });
    task.output.write(
      new ArticleLineNode({
        children: ["开始删除关联的解析季结果"].map((text) => new ArticleTextNode({ text })),
      })
    );
    const r3 = await store.find_parsed_season_list({
      file_id,
    });
    if (r3.data?.length) {
      task.output.write(
        new ArticleSectionNode({
          children: [
            new ArticleListNode({
              children: r3.data.map(
                (text) =>
                  new ArticleListItemNode({
                    children: [text.season_number].map((text) => {
                      return new ArticleTextNode({ text });
                    }),
                  })
              ),
            }),
          ],
        })
      );
    }
    await store.prisma.parsed_season.deleteMany({
      where: {
        file_id,
      },
    });
    task.output.write(
      new ArticleLineNode({
        children: ["开始删除关联的解析电视剧结果"].map((text) => new ArticleTextNode({ text })),
      })
    );
    const r4 = await store.find_parsed_tv_list({
      file_id,
    });
    if (r4.data?.length) {
      task.output.write(
        new ArticleSectionNode({
          children: [
            new ArticleListNode({
              children: r4.data.map(
                (text) =>
                  new ArticleListItemNode({
                    children: [text.name || ""].map((text) => {
                      return new ArticleTextNode({ text });
                    }),
                  })
              ),
            }),
          ],
        })
      );
    }
    await store.prisma.parsed_tv.deleteMany({
      where: {
        file_id,
      },
    });
    task.output.write(
      new ArticleLineNode({
        children: ["开始删除关联的解析电影结果"].map((text) => new ArticleTextNode({ text })),
      })
    );
    const r5 = await store.find_parsed_movie_list({
      file_id,
    });
    if (r5.data?.length) {
      task.output.write(
        new ArticleSectionNode({
          children: [
            new ArticleListNode({
              children: r5.data.map(
                (text) =>
                  new ArticleListItemNode({
                    children: [text.name].map((text) => {
                      return new ArticleTextNode({ text });
                    }),
                  })
              ),
            }),
          ],
        })
      );
    }
    await store.prisma.parsed_movie.deleteMany({
      where: {
        file_id,
      },
    });
    task.output.write(
      new ArticleLineNode({
        children: ["开始删除云盘内文件"].map((text) => new ArticleTextNode({ text })),
      })
    );
    const r = await drive.client.delete_file(file.file_id);
    if (r.error) {
      task.throw(r.error);
      return e(r.error);
    }
    task.output.write(
      new ArticleLineNode({
        children: ["完成删除任务"].map((text) => new ArticleTextNode({ text })),
      })
    );
    task.finish();
  }
  run(file_res.data);
  res.status(200).json({
    code: 0,
    msg: "开始删除文件",
    data: {
      job_id: task.id,
    },
  });
}
