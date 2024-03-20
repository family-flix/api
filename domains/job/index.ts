import fs from "fs";
import path from "path";

import { throttle } from "lodash";
import dayjs from "dayjs";

import { BaseDomain, Handler } from "@/domains/base";
import { Article, ArticleLineNode, ArticleTextNode } from "@/domains/article/index";
import { Application } from "@/domains/application/index";
import { AsyncTaskRecord, DataStore } from "@/domains/store/types";
import { Result } from "@/types/index";
import { r_id } from "@/utils/index";

import { TaskStatus, TaskTypes } from "./constants";

export * from "./constants";

enum Events {
  StopTask,
}
type TheTypesOfEvents = {
  [Events.StopTask]: void;
};
type JobNewProps = {
  unique_id: string;
  type: TaskTypes;
  desc: string;
  user_id: string;
  store: DataStore;
  app: Application;
  on_print?: () => void;
};
type JobProps = {
  id: string;
  profile: Pick<
    AsyncTaskRecord,
    "unique_id" | "type" | "status" | "desc" | "user_id" | "output_id" | "error" | "created" | "updated"
  >;
  output: Article;
  app: Application;
  store: DataStore;
};
const cached_jobs: Record<string, Job> = {};

export class Job extends BaseDomain<TheTypesOfEvents> {
  static async Get(body: { id: string; user_id: string; app: Application; store: DataStore }) {
    const { id, user_id, app, store } = body;
    if (cached_jobs[id]) {
      return Result.Ok(cached_jobs[id]);
    }
    const r1 = await store.prisma.async_task.findFirst({
      where: {
        id,
        user_id,
      },
    });
    if (!r1) {
      return Result.Err("没有匹配的任务记录");
    }
    const { desc, unique_id, type, status, error, output_id, created, updated } = r1;
    const job = new Job({
      id,
      profile: {
        status,
        desc,
        unique_id,
        type,
        user_id,
        output_id,
        error,
        created,
        updated,
      },
      output: new Article({}),
      app,
      store,
    });
    cached_jobs[id] = job;
    return Result.Ok(job);
  }

  static async New(body: JobNewProps) {
    const { desc, type, unique_id, user_id, app, store } = body;
    const existing = await store.prisma.async_task.findFirst({
      where: {
        type,
        unique_id,
        status: TaskStatus.Running,
        user_id,
      },
    });
    if (existing) {
      return Result.Err("有运行中的任务", "40001", { job_id: existing.id });
    }
    const output_unique_id = r_id();
    const res = await store.prisma.async_task.create({
      data: {
        id: r_id(),
        unique_id,
        desc,
        type,
        status: TaskStatus.Running,
        output: {
          create: {
            id: output_unique_id,
            filepath: `${dayjs().format("YYYYMMDD")}-${output_unique_id}.txt`,
            user_id,
          },
        },
        user: {
          connect: {
            id: user_id,
          },
        },
      },
    });
    const { id, status, type: t, output_id, created, updated } = res;
    const output = new Article({});
    const job = new Job({
      id,
      profile: {
        type: t,
        status,
        desc,
        unique_id,
        output_id,
        user_id,
        error: null,
        created,
        updated,
      },
      output,
      app,
      store,
    });
    cached_jobs[id] = job;
    return Result.Ok(job);
  }

  id: string;
  output: Article;
  profile: JobProps["profile"];
  percent = 0;
  prev_write_time: number;
  timer: null | NodeJS.Timer = null;

  store: DataStore;
  app: Application;

  constructor(props: JobProps) {
    super();

    const { id, profile, output, app, store } = props;
    this.id = id;
    this.output = output;
    this.profile = profile;
    this.store = store;
    this.app = app;
    this.prev_write_time = dayjs().valueOf();
    this.output.on_write(this.update_content);
  }
  pending_lines = [];
  update_content_force = async () => {
    this.prev_write_time = dayjs().valueOf();
    const content = this.output.to_json();
    this.output.clear();
    if (content.length === 0) {
      return;
    }
    const output = await this.store.prisma.output.findUnique({
      where: {
        id: this.profile.output_id,
      },
    });
    if (output === null) {
      return;
    }
    const { filepath } = output;
    if (!filepath) {
      return;
    }
    const log_filepath = path.resolve(this.app.root_path, "logs", filepath);
    fs.appendFileSync(
      log_filepath,
      [
        "",
        ...content.map((c) => {
          return JSON.stringify(c);
        }),
      ].join("\n")
    );
  };
  update_content = throttle(this.update_content_force, 5000);
  update_percent = throttle(async (percent: number) => {
    console.log("[DOMAIN]job/index - update_percent", `${(percent * 100).toFixed(2)}%`);
    await this.store.prisma.async_task.update({
      where: {
        id: this.id,
      },
      data: {
        percent,
        updated: dayjs().toISOString(),
      },
    });
  }, 5000);
  check_need_pause = throttle(async () => {
    const r = await this.store.prisma.async_task.findFirst({
      where: {
        id: this.id,
      },
    });
    if (!r) {
      return Result.Ok(false);
    }
    const { need_stop } = r;
    if (need_stop) {
      return Result.Ok(true);
    }
    return Result.Ok(false);
  }, 3000);
  async fetch_profile(with_log: boolean = true) {
    const r1 = await this.store.prisma.async_task.findFirst({
      where: {
        id: this.id,
        user_id: this.profile.user_id,
      },
      include: {
        output: true,
      },
    });
    if (!r1) {
      return Result.Err("没有匹配的任务记录");
    }
    const { id, desc, status, percent, output, error, created, updated } = r1;
    const { filepath } = output;
    if (!filepath) {
      return Result.Ok({
        id,
        status,
        desc,
        lines: [],
        percent,
        more_line: false,
        error,
        created,
        updated,
        output_id: output.id,
      });
    }
    if (!with_log) {
      return Result.Ok({
        id,
        status,
        desc,
        // unique_id,
        lines: [],
        percent,
        more_line: false,
        error,
        output_id: output.id,
        created,
        updated,
      });
    }
    let content = "";
    try {
      const p = path.resolve(this.app.root_path, "logs", filepath);
      content = fs.readFileSync(p, "utf-8");
    } catch (err) {
      // ...
    }
    return Result.Ok({
      id,
      status,
      desc,
      // unique_id,
      lines: content.split("\n").filter(Boolean),
      percent,
      more_line: false,
      error,
      output_id: output.id,
      created,
      updated,
    });
  }
  /**
   * @deprecated
   */
  async fetch_lines_of_output(params: { page: number; page_size: number }) {
    const { page, page_size } = params;
    const where: NonNullable<Parameters<typeof this.store.prisma.output_line.findMany>[number]>["where"] = {
      output_id: this.profile.output_id,
    };
    const count = await this.store.prisma.output_line.count({ where });
    const list = await this.store.prisma.output_line.findMany({
      where,
      take: page_size,
      skip: (page - 1) * page_size,
      orderBy: {
        created: "asc",
      },
    });
    return Result.Ok({
      page,
      page_size,
      total: count,
      no_more: (page - 1) * page_size + list.length >= count,
      list,
    });
  }
  /**
   * 主动终止任务
   */
  async pause(options: { force?: boolean } = {}) {
    const { force = false } = options;
    const r = await this.store.prisma.async_task.findFirst({
      where: {
        id: this.id,
      },
    });
    if (!r) {
      return Result.Err("记录不存在");
    }
    if (r.status !== TaskStatus.Running) {
      return Result.Err("该任务非运行中状态");
    }
    await this.store.prisma.async_task.update({
      where: {
        id: this.id,
      },
      data: {
        need_stop: 1,
        status: force ? TaskStatus.Paused : undefined,
      },
    });
    setTimeout(async () => {
      const r = await this.store.prisma.async_task.update({
        where: {
          id: this.id,
        },
        data: {
          status: TaskStatus.Finished,
        },
      });
    }, 10 * 1000);
    const output = await this.store.prisma.output.findUnique({
      where: {
        id: this.profile.output_id,
      },
    });
    this.emit(Events.StopTask);
    if (output) {
      const { filepath } = output;
      if (filepath) {
        const log_filepath = path.resolve(this.app.root_path, "logs", filepath);
        fs.appendFileSync(
          log_filepath,
          [
            "",
            [
              new ArticleLineNode({
                children: [
                  new ArticleTextNode({
                    text: "主动中止索引任务",
                  }),
                ],
              }).to_json(),
            ].map((c) => {
              return JSON.stringify(c);
            }),
          ].join("\n")
        );
      }
    }
    return Result.Ok(null);
  }
  /** mark the task is finished */
  async finish() {
    await this.update_content_force();
    await this.store.prisma.async_task.update({
      where: {
        id: this.id,
      },
      data: {
        need_stop: 0,
        status: TaskStatus.Finished,
      },
    });
    // const output = await this.store.prisma.output.findUnique({
    //   where: {
    //     id: this.profile.output_id,
    //   },
    // });
    // if (output === null) {
    //   return Result.Ok(null);
    // }
    // return Result.Ok(null);
  }
  async throw(error: Error) {
    this.output.write(
      new ArticleLineNode({
        children: [
          new ArticleTextNode({
            text: error.message,
          }),
        ],
      })
    );
    this.update_content_force();
    await this.store.prisma.async_task.update({
      where: {
        id: this.id,
      },
      data: {
        updated: dayjs().toISOString(),
        status: TaskStatus.Finished,
        error: error.message,
      },
    });
    return Result.Ok(null);
  }
  update(body: Partial<{ percent: number; desc: string }>) {
    this.store.prisma.async_task.update({
      where: {
        id: this.id,
      },
      data: body,
    });
  }
  is_to_long() {
    const { status, created } = this.profile;
    if (status === TaskStatus.Running && dayjs(created).add(50, "minute").isBefore(dayjs())) {
      // this.pause({ force: true });
      // return Result.Ok("任务耗时过长，自动中止");
      return true;
    }
    return false;
  }
  is_expected_break() {
    const { status, updated } = this.profile;
    if (status === TaskStatus.Running && dayjs(updated).add(30, "seconds").isBefore(dayjs())) {
      return true;
    }
    return false;
  }

  on_pause(handler: Handler<TheTypesOfEvents[Events.StopTask]>) {
    const handler1 = async () => {
      // console.log("[DOMAIN]job/index - check need stop");
      const r = await this.store.prisma.async_task.findFirst({
        where: {
          id: this.id,
        },
      });
      if (!r) {
        return Result.Err("记录不存在");
      }
      // console.log("[DOMAIN]job/index - before TaskStatus.Paused", r.status);
      if (r.need_stop) {
        this.emit(Events.StopTask);
        this.app.clearInterval(handler1);
      }
      if ([TaskStatus.Paused, TaskStatus.Finished].includes(r.status)) {
        this.app.clearInterval(handler1);
      }
      return Result.Ok(null);
    };
    this.app.startInterval(handler1, 5000);
    return this.on(Events.StopTask, handler);
  }
}
