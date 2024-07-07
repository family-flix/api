/**
 * @file 领取签到奖励
 */
import { Application } from "@/domains/application";
import { ScheduleTask } from "@/domains/schedule/v2";
import { AliyunDriveClient } from "@/domains/clients/alipan";
import { DriveTypes } from "@/domains/drive/constants";

async function walk_drive() {
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
  await schedule.walk_drive(async (drive, user) => {
    if (drive.type !== DriveTypes.AliyunBackupDrive) {
      return;
    }
    console.log(drive.name);
    const c = drive.client;
    if (!(c instanceof AliyunDriveClient)) {
      return;
    }
    const r = await c.fetch_rewards();
    if (r.error) {
      console.log(["获取奖励失败，因为", r.error.message].join(" "));
      return;
    }
    for (let i = 0; i < r.data.length; i += 1) {
      await (async () => {
        const { day, rewardAmount } = r.data[i];
        console.log([`领取第 ${day} 天奖励`].join(" "));
        const r2 = await c.receive_reward(day);
        if (r2.error) {
          console.log([`领取第 ${day} 天奖励失败，因为`, r2.error.message].join(" "));
          return;
        }
        console.log([`领取第 ${day} 天奖励`, r2.data.name, `${rewardAmount}个`, "成功"].join(" "));
      })();
    }

    console.log("领取成功");
  });
}

walk_drive();
