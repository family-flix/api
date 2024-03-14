import CronJob from "cron";
import dayjs from "dayjs";

import { Application } from "@/domains/application";
import { ScheduleTask } from "@/domains/schedule/v2";

import { notice_push_deer } from "../notice";

/**
 * 理解方式就是，每秒，都会检查是否要执行对应任务
 * 第一个数字是「秒」，如果为 *，表示 0-60 任一数字，那检查时，当前为 23 秒，0-60秒 满足条件，执行
 * 第二个数字是「分」，如果为 *，表示 0-60 任一数字，那检查时，当前为 1 分，0-60分 满足条件，执行
 * 其他数字同理，依次为 小时、
 */

(async () => {
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

  // const start = dayjs("2024/02/01");
  // const end = dayjs("2024/03/08");

  // let cur = start.clone();
  // const dates = [];
  // while (cur.isBefore(end)) {
  //   dates.push(cur.format("YYYY-MM-DD"));
  //   cur = cur.add(1, "day");
  // }
  // for (let i = 0; i < dates.length; i += 1) {
  //   const date = dates[i];
  //   await schedule.fetch_added_files_daily(date);
  // }

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

  // new CronJob.CronJob(
  //   "0 0 8-23 * * *",
  //   async () => {
  //     console.log("执行任务 at 0 0 8-23 * * *", dayjs().format("YYYY/MM/DD HH:mm:ss"));
  //     notice_push_deer({
  //       title: "资源同步",
  //       markdown: "更新了失效的资源",
  //     });
  //   },
  //   null,
  //   true,
  //   "Asia/Shanghai"
  // );
  new CronJob.CronJob(
    "0 15 8-23 * * *",
    async () => {
      console.log("执行任务 at 0 15 8-23 * * *", dayjs().format("YYYY/MM/DD HH:mm:ss"));
      // await schedule.update_sync_task_resources(
      //   "https://docs.qq.com/dop-api/opendoc?u=&id=DQmx1WEdTRXpGeEZ6&normal=1&outformat=1&noEscape=1&commandsFormat=1&preview_token=&doc_chunk_flag=1"
      // );
      // await schedule.run_sync_task_list();
      // await schedule.update_daily_updated();
      // await schedule.find_media_and_media_source_errors();
      // await schedule.update_stats();
    },
    null,
    true,
    "Asia/Shanghai"
  );
  // new CronJob.CronJob(
  //   "0 50 8-23 * * *",
  //   async () => {
  //     console.log("执行任务 at 0 50 8-23 * * *", dayjs().format("YYYY/MM/DD HH:mm:ss"));
  //   },
  //   null,
  //   true,
  //   "Asia/Shanghai"
  // );
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
  // 0秒0分8时（每天8点时）执行一次
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
  new CronJob.CronJob(
    "0 30 23 * * *",
    async () => {
      console.log("执行任务 at 0 0 23 * * *", dayjs().format("YYYY/MM/DD HH:mm:ss"));
      // await schedule.archive_daily_update_collection();
      // notice_push_deer({
      //   title: "归档",
      //   markdown: "归档了当天更新",
      // });
    },
    null,
    true,
    "Asia/Shanghai"
  );
  new CronJob.CronJob(
    "0 0 2 * * *",
    async () => {
      console.log("执行任务 at 0 0 2 * * *", dayjs().format("YYYY/MM/DD HH:mm:ss"));
      await schedule.update_media_profile_with_douban();
      notice_push_deer({
        title: "影视剧刷新",
        markdown: "执行了一次影视剧刷新任务",
      });
    },
    null,
    true,
    "Asia/Shanghai"
  );
  new CronJob.CronJob(
    "0 0 3 * * *",
    async () => {
      console.log("执行任务 at 0 0 3 * * *", dayjs().format("YYYY/MM/DD HH:mm:ss"));
      await schedule.clear_expired_parsed_source();
    },
    null,
    true,
    "Asia/Shanghai"
  );
  console.log("\nThe Cron jobs is running");
})();
