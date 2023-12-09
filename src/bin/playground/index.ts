import { Application } from "@/domains/application";
import { ScheduleTask } from "@/domains/schedule";
import { parse_argv } from "@/utils/server";

/**
 * yarn vite-node playground.ts -- -- -a 1 -b
 * { a: '1', b: true }
 */

async function main() {
  const args = process.argv.slice(2);
  const OUTPUT_PATH = process.env.OUTPUT_PATH;
  if (!OUTPUT_PATH) {
    console.error("缺少数据库文件路径");
    return;
  }
  const app = new Application({
    root_path: OUTPUT_PATH,
  });
  const store = app.store;
  const schedule = new ScheduleTask({ app, store });
  const options = parse_argv(args);
  const { action } = options as { action: string };
  if (!action) {
    console.error("未知的参数，请使用 --action xxx 来执行该脚本");
    return;
  }
  const actions = {
    find_duplicated_medias: schedule.find_duplicated_medias,
    find_media_errors: schedule.find_media_errors,
    run_sync_task_list: schedule.run_sync_task_list,
    update_daily_updated: schedule.update_daily_updated,
    update_stats: schedule.update_stats,
    check_in: schedule.check_in,
    refresh_media_profile_list: schedule.refresh_media_profile_list,
  };
  const allow_actions = Object.keys(actions);
  if (!allow_actions.includes(action)) {
    return;
  }
  const a = action as keyof typeof actions;
  const fn = schedule[a];
  if (typeof fn !== "function") {
    return;
  }
  await fn();
}

main();
