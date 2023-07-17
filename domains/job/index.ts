import { throttle } from "lodash";
import dayjs from "dayjs";

import { BaseDomain } from "@/domains/base";
import { Article, ArticleLineNode, ArticleTextNode } from "@/domains/article";
import { DatabaseStore } from "@/domains/store";
import { AsyncTaskRecord } from "@/domains/store/types";
import { Result } from "@/types";
import { r_id } from "@/utils";

import { TaskStatus, TaskTypes } from "./constants";

enum Events {}
type TheTypesOfEvents = {};
type JobNewProps = {
  unique_id: string;
  type: TaskTypes;
  desc: string;
  user_id: string;
  store: DatabaseStore;
};
type JobProps = {
  id: string;
  profile: Pick<
    AsyncTaskRecord,
    "unique_id" | "type" | "status" | "created" | "desc" | "user_id" | "output_id" | "error"
  >;
  output: Article;
  store: DatabaseStore;
};

export class Job extends BaseDomain<TheTypesOfEvents> {
  static async Get(body: { id: string; user_id: string; store: DatabaseStore }) {
    const { id, user_id, store } = body;
    const r1 = await store.prisma.async_task.findFirst({
      select: {
        id: true,
        desc: true,
        unique_id: true,
        type: true,
        created: true,
        status: true,
        output: true,
        output_id: true,
        error: true,
      },
      where: {
        id,
        user_id,
      },
    });
    if (!r1) {
      return Result.Err("没有匹配的任务记录");
    }
    const { desc, unique_id, type, created, status, output_id, error } = r1;
    const job = new Job({
      id,
      profile: {
        status,
        desc,
        unique_id,
        type,
        created,
        user_id,
        output_id,
        error,
      },
      output: new Article({}),
      store,
    });
    return Result.Ok(job);
  }

  static async New(body: JobNewProps) {
    const { desc, unique_id, user_id, store } = body;
    const existing = await store.prisma.async_task.findFirst({
      where: {
        unique_id,
        status: TaskStatus.Running,
        user_id,
      },
    });
    if (existing) {
      return Result.Err("有运行中的任务", "40001", { job_id: existing.id });
    }
    const res = await store.prisma.async_task.create({
      data: {
        id: r_id(),
        unique_id,
        desc,
        status: TaskStatus.Running,
        output: {
          create: {
            id: r_id(),
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
    const { id, status, type, output_id, created } = res;
    const output = new Article({});
    const job = new Job({
      id,
      profile: {
        type,
        status,
        desc,
        unique_id,
        created,
        output_id,
        user_id,
        error: null,
      },
      output,
      store,
    });
    return Result.Ok(job);
  }

  id: string;
  output: Article;
  profile: JobProps["profile"];
  store: DatabaseStore;
  // start: number;

  constructor(options: JobProps) {
    super();

    const { id, profile, output, store } = options;
    this.id = id;
    this.output = output;
    this.profile = profile;
    this.store = store;
    // this.start = dayjs().unix();

    this.output.on_write(this.update_content);
  }
  pending_lines = [];
  update_content = throttle(async () => {
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
    content.forEach((c) => {
      const data = {
        output_id: this.profile.output_id,
        content: JSON.stringify(c),
      };
      this.store.add_output_line(data);
    });
  }, 5000);
  /** check need pause the task */
  check_need_pause = throttle(async () => {
    const r = await this.store.find_task({ id: this.id });
    if (r.error) {
      return Result.Ok(false);
    }
    if (!r.data) {
      return Result.Ok(false);
    }
    const { need_stop } = r.data;
    if (need_stop) {
      return Result.Ok(true);
    }
    return Result.Ok(false);
  }, 3000);
  async fetch_profile() {
    const r1 = await this.store.prisma.async_task.findFirst({
      where: {
        id: this.id,
        user_id: this.profile.user_id,
      },
      include: {
        output: {
          include: {
            _count: true,
            lines: {
              take: 20,
              orderBy: {
                created: "asc",
              },
            },
          },
        },
      },
    });
    if (!r1) {
      return Result.Err("没有匹配的任务记录");
    }
    const { desc, unique_id, created, status, output, error } = r1;
    const { lines, _count } = output;
    return Result.Ok({
      status,
      desc,
      unique_id,
      created,
      lines,
      more_line: _count.lines > 20,
      error,
    });
  }
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
        created: 'asc',
      }
    });
    return Result.Ok({
      page,
      page_size,
      total: count,
      no_more: (page - 1) * page_size + list.length >= count,
      list,
    });
  }
  /** pause the task */
  async pause(options: { force?: boolean } = {}) {
    const { force = false } = options;
    const r = await this.store.update_task(this.id, {
      need_stop: 1,
      status: force ? TaskStatus.Paused : undefined,
    });
    const content = this.output
      .write(
        new ArticleLineNode({
          children: [
            new ArticleTextNode({
              text: "主动中止索引任务",
            }),
          ],
        })
      )
      .to_json();
    const output_id = this.profile.output_id;
    await this.store.add_output_line({
      output_id,
      content: JSON.stringify(content),
    });
  }
  /** tag the task is finished */
  async finish() {
    const r = await this.store.update_task(this.id, {
      status: TaskStatus.Finished,
    });
    if (r.error) {
      return Result.Err(r.error);
    }
    const output = await this.store.prisma.output.findUnique({
      where: {
        id: this.profile.output_id,
      },
    });
    if (output === null) {
      return Result.Ok(null);
    }
    return Result.Ok(null);
  }
  async throw(error: Error) {
    const r = await this.store.update_task(this.id, {
      status: TaskStatus.Finished,
      error: error.message,
    });
    if (r.error) {
      return Result.Err(r.error);
    }
    return Result.Ok(null);
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
}
