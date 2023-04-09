/**
 * @file 对分享的文件进行分析
 * 包含哪些影视剧、是否重复、库内是否有重复影片
 */
import {
  complete_async_task,
  fetch_async_task_profile,
  fetch_async_task,
  start_shared_files_analysis_task,
  TaskResultOfSharedTV,
} from "./services";

export class SharedFilesAnalysis {
  timer: NodeJS.Timer | null = null;
  on_error_notice?: (msg: string) => void;
  on_notice?: (msg: string) => void;
  on_success?: (data: TaskResultOfSharedTV) => void;

  async profile(id: string) {
    const r2 = await fetch_async_task_profile(id);
    if (r2.error) {
      this.notice_error(r2.error.message);
      return;
    }
    if (this.on_success) {
      this.on_success(r2.data);
    }
  }

  async start(url: string) {
    if (this.timer) {
      return this.notice_error("Task is running");
    }
    const resp = await start_shared_files_analysis_task(url);
    if (resp.error) {
      return this.notice_error(resp.error.message);
    }
    const { async_task_id } = resp.data;
    this.timer = setInterval(async () => {
      const r = await fetch_async_task(async_task_id);
      if (r.error) {
        this.notice_error(r.error.message);
        return;
      }
      if (r.data.status !== "Finished") {
        return;
      }
      this.notice("Task completed");
      const r2 = await fetch_async_task_profile(async_task_id);
      if (r2.error) {
        this.notice_error(r2.error.message);
        if (this.timer) {
          clearInterval(this.timer);
        }
        return;
      }
      if (this.on_success) {
        this.on_success(r2.data);
      }
      if (this.timer) {
        clearInterval(this.timer);
      }
    }, 3000);
  }

  async save(task: TaskResultOfSharedTV["list"][0], drive_id?: string) {
    const { async_task_id, id, folder_id, in_same_root_folder } = task;
    if (!in_same_root_folder) {
      this.notice_error("the episodes not in same root folder, can't save");
      return;
    }
    const resp = await complete_async_task(async_task_id, {
      action: "save",
      drive_id,
      folder_id,
      tv_id: id,
    });
    if (resp.error) {
      this.notice_error(resp.error.message);
      return;
    }
    this.notice("save completed");
  }
  async drop(task: TaskResultOfSharedTV["list"][0]) {
    const { async_task_id, id, folder_id } = task;
    const resp = await complete_async_task(async_task_id, {
      action: "drop",
      folder_id,
      tv_id: id,
    });
    if (resp.error) {
      this.notice_error(resp.error.message);
      return;
    }
    this.notice("drop completed");
  }

  notice(msg: string) {
    if (this.on_notice) {
      this.on_notice(msg);
    }
  }
  notice_error(msg: string) {
    if (this.on_error_notice) {
      this.on_error_notice(msg);
    }
    // alert(msg);
  }
}
