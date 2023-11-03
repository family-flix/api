import CronJob from "cron";
import dayjs from "dayjs";

import { Application } from "@/domains/application";
import { ScheduleTask } from "@/domains/schedule";

import { notice_push_deer } from "../notice";

/**
 * 理解方式就是，每秒，都会检查是否要执行对应任务
 * 第一个数字是「秒」，如果为 *，表示 0-60 任一数字，那检查时，当前为 23 秒，0-60秒 满足条件，执行
 * 第二个数字是「分」，如果为 *，表示 0-60 任一数字，那检查时，当前为 1 分，0-60分 满足条件，执行
 * 其他数字同理，依次为 小时、
 */

(() => {
  const OUTPUT_PATH = process.env.OUTPUT_PATH;
  //   const DATABASE_PATH = "file://$OUTPUT_PATH/data/family-flix.db?connection_limit=1";
  if (!OUTPUT_PATH) {
    console.error("缺少数据库文件路径");
    return;
  }

  const app = new Application({
    root_path: OUTPUT_PATH,
  });
  const store = app.store;
  const schedule = new ScheduleTask({ app, store });

  //   new CronJob.CronJob(
  //     "0 */5 * * * *",
  //     async () => {
  //       console.log("执行任务 at 0 */5 * * * *", dayjs().format("YYYY/MM/DD HH:mm:ss"));
  //       ping_drive_status(store);
  //     },
  //     null,
  //     true,
  //     "Asia/Shanghai"
  //   );

  // 0秒0分*小时（每个小时） 执行一次
  // new CronJob.CronJob(
  //   "0 0 * * * *",
  //   async () => {

  //   },
  //   null,
  //   true,
  //   "Asia/Shanghai"
  // );

  // 0秒30分*小时（每个小时的30分时） 执行一次
  new CronJob.CronJob(
    "0 30 8-23 * * *",
    async () => {
      console.log("执行任务 at 0 30 * * * *", dayjs().format("YYYY/MM/DD HH:mm:ss"));
      await schedule.run_sync_task_list();
      // notice_push_deer({
      //   title: "资源同步",
      //   markdown: "执行了一次资源同步任务",
      // });
      await schedule.update_daily_updated();
      // const invalid_sync_task_list = await schedule.fetch_expired_sync_task_list();
      // notice_push_deer({
      //   title: "有资源失效了",
      //   markdown: [
      //     ...invalid_sync_task_list.list
      //       .map((task) => {
      //         return task.name;
      //       })
      //       .join("\n"),
      //     "",
      //     "等更多",
      //   ].join("\r\n"),
      // });
    },
    null,
    true,
    "Asia/Shanghai"
  );

  // new CronJob.CronJob(
  //   "0 50 * * * *",
  //   async () => {
  //     console.log(
  //       "执行任务 at 0 50 * * * *",
  //       dayjs().format("YYYY/MM/DD HH:mm:ss")
  //     );
  //     find_tv_need_complete(store);
  //   },
  //   null,
  //   true,
  //   "Asia/Shanghai"
  // );

  new CronJob.CronJob("0 0 2 * * *", async () => {
    console.log("执行任务 at 0 0 3 * * *", dayjs().format("YYYY/MM/DD HH:mm:ss"));
    await schedule.refresh_media_profile_list();
    notice_push_deer({
      title: "影视剧刷新",
      markdown: "执行了一次影视剧刷新任务",
    });
  });

  // 0秒0分8时（每天8点时）执行一次
  new CronJob.CronJob(
    "0 0 8 * * *",
    async () => {
      console.log("执行任务 at 0 0 8 * * *", dayjs().format("YYYY/MM/DD HH:mm:ss"));
      const r = await schedule.check_in();
      notice_push_deer({
        title: "云盘签到",
        markdown: r
          .map((tip) => {
            const { name, text } = tip;
            return [name, "", ...text].join("\n");
          })
          .join("\r\n"),
      });
    },
    null,
    true,
    "Asia/Shanghai"
  );

  new CronJob.CronJob(
    "0 0 20 * * *",
    async () => {
      console.log("执行任务 at 0 0 20 * * *", dayjs().format("YYYY/MM/DD HH:mm:ss"));
      const r = await schedule.check_in();
      notice_push_deer({
        title: "云盘签到",
        markdown: r
          .map((tip) => {
            const { name, text } = tip;
            return [name, "", ...text].join("\n");
          })
          .join("\r\n"),
      });
    },
    null,
    true,
    "Asia/Shanghai"
  );
  console.log("\nThe Cron jobs is running");
})();
