require("dotenv").config();

import CronJob from "cron";
import dayjs from "dayjs";

import { store } from "@/store";

// import { ping_drive_status } from "./ping_drive_status";

(() => {
  // 每 2s 执行一次
  //   new CronJob.CronJob(
  //     "*/2 * * * * *",
  //     async () => {
  //       console.log(
  //         "执行任务 at */2 * * * * *",
  //         dayjs().format("YYYY/MM/DD HH:mm:ss")
  //       );
  //       ping_drive_status(store);
  //     },
  //     null,
  //     true,
  //     "Asia/Shanghai"
  //   );

  new CronJob.CronJob(
    "0 */2 * * * *",
    async () => {
      console.log(
        "执行任务 at 0 */2 * * * *",
        dayjs().format("YYYY/MM/DD HH:mm:ss")
      );
      // ping_drive_status(store);
    },
    null,
    true,
    "Asia/Shanghai"
  );
})();
