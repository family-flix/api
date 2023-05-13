require("dotenv").config();

import CronJob from "cron";
import dayjs from "dayjs";

import { store } from "@/store";

import { check_in } from "./check_in";
import {
  check_tv_in_progress_is_completed,
  patch_shared_files,
} from "./patch_tv_in_progress";
import { ping_drive_status } from "./ping_drive_status";
import { walk_added_files } from "./walk_added_files";
import { clear_expired_shared_files_in_progress } from "./clear_expired_shared_files_in_progress";
import { find_tv_need_complete } from "./find_tv_need_complete";

/**
 * 理解方式就是，每秒，都会检查是否要执行对应任务
 * 第一个数字是「秒」，如果为 *，表示 0-60 任一数字，那检查时，当前为 23 秒，0-60秒 满足条件，执行
 * 第二个数字是「分」，如果为 *，表示 0-60 任一数字，那检查时，当前为 1 分，0-60分 满足条件，执行
 * 其他数字同理，依次为 小时、
 */

(() => {
  new CronJob.CronJob(
    "0 */5 * * * *",
    async () => {
      console.log(
        "执行任务 at 0 */5 * * * *",
        dayjs().format("YYYY/MM/DD HH:mm:ss")
      );
      ping_drive_status(store);
    },
    null,
    true,
    "Asia/Shanghai"
  );
  // 0秒0分*小时 执行一次
  new CronJob.CronJob(
    "0 0 * * * *",
    async () => {
      console.log(
        "执行任务 at 0 0 * * * *",
        dayjs().format("YYYY/MM/DD HH:mm:ss")
      );
      patch_shared_files(store);
      check_tv_in_progress_is_completed(store);
    },
    null,
    true,
    "Asia/Shanghai"
  );
  // 每个小时的 30分时 执行
  new CronJob.CronJob(
    "0 30 * * * *",
    async () => {
      console.log(
        "执行任务 at 0 30 * * * *",
        dayjs().format("YYYY/MM/DD HH:mm:ss")
      );
      clear_expired_shared_files_in_progress(store);
      walk_added_files(store);
    },
    null,
    true,
    "Asia/Shanghai"
  );
  new CronJob.CronJob(
    "0 50 * * * *",
    async () => {
      console.log(
        "执行任务 at 0 50 * * * *",
        dayjs().format("YYYY/MM/DD HH:mm:ss")
      );
      find_tv_need_complete(store);
    },
    null,
    true,
    "Asia/Shanghai"
  );

  // 每天8点执行
  new CronJob.CronJob(
    "0 0 8 * * *",
    () => {
      console.log(
        "执行任务 at 0 0 8 * * *",
        dayjs().format("YYYY/MM/DD HH:mm:ss")
      );
      check_in(store);
    },
    null,
    true,
    "Asia/Shanghai"
  );
  // 每天 20:00 执行
  new CronJob.CronJob(
    "0 0 20 * * *",
    () => {
      console.log(
        "执行任务 at 0 0 20 * * *",
        dayjs().format("YYYY/MM/DD HH:mm:ss")
      );
      check_in(store);
    },
    null,
    true,
    "Asia/Shanghai"
  );
  console.log("\nThe Cron jobs is running");
})();
