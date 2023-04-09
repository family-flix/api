/**
 * @file 对云盘文件进行分析
 * 包含哪些影视剧
 */
import {
  fetch_async_task,
  PartialAsyncTask,
} from "@/domains/async_task/services";
import { noop } from "@/utils";
import { copy } from "@/utils/front_end";

import {
  analysis_aliyun_drive,
  export_aliyun_drive,
  merge_same_tv_for_aliyun_drive,
  refresh_aliyun_drive,
  update_aliyun_drive,
} from "./services";

export class Drive {
  id: string;
  timer: NodeJS.Timer | null = null;
  values: Record<string, unknown> = {};
  on_error_notice: (msg: string) => void = noop;
  on_notice: (msg: string) => void = noop;
  on_success: (d: PartialAsyncTask) => void = noop;

  constructor(options: { id: string }) {
    this.id = options.id;
  }

  async start_scrape() {
    if (this.timer) {
      return this.notice_error("索引正在进行中...");
    }
    const resp = await analysis_aliyun_drive({ aliyun_drive_id: this.id });
    if (resp.error) {
      return this.notice_error(resp.error.message);
    }
    const { async_task_id } = resp.data;
    this.timer = setInterval(async () => {
      const r = await fetch_async_task(async_task_id);
      if (r.error) {
        this.notice_error(r.error.message);
        if (this.timer) {
          clearTimeout(this.timer);
        }
        return;
      }
      if (r.data.status !== "Finished") {
        return;
      }
      this.notice("索引完成");
      this.on_success(r.data);
      if (this.timer) {
        clearInterval(this.timer);
      }
    }, 3000);
  }

  async merge() {
    const r = await merge_same_tv_for_aliyun_drive({
      aliyun_drive_id: this.id,
    });
    if (r.error) {
      this.on_error_notice(r.error.message);
      return;
    }
    this.notice("合并完成");
  }

  async export() {
    const r = await export_aliyun_drive({ aliyun_drive_id: this.id });
    if (r.error) {
      this.on_error_notice(r.error.message);
      return;
    }
    copy(JSON.stringify(r.data));
    this.notice("复制成功");
  }

  async update() {
    const r = await update_aliyun_drive(this.id, this.values);
    this.values = {};
    if (r.error) {
      this.notice_error(r.error.message);
      return;
    }
    this.notice("更新云盘信息成功");
  }

  async refresh() {
    const r = await refresh_aliyun_drive({ aliyun_drive_id: this.id });
    if (r.error) {
      this.notice_error(r.error.message);
      return;
    }
    this.notice("刷新成功");
  }

  set_root_folder_id(id: string) {
    this.values.root_folder_id = id;
  }

  notice(msg: string) {
    this.on_notice(msg);
  }
  notice_error(msg: string) {
    this.on_error_notice(msg);
  }
}
