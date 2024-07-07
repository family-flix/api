/**
 * @file 扩容码
 */
import { Application } from "@/domains/application";
import { ScheduleTask } from "@/domains/schedule/v2";
import { DriveTypes } from "@/domains/drive/constants";
import { AliyunDriveClient } from "@/domains/clients/alipan";

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
    const client = drive.client;
    if (drive.type !== DriveTypes.AliyunBackupDrive) {
      return;
    }
    console.log(drive.name);
    if (!(client instanceof AliyunDriveClient)) {
      return;
    }
    const r = await client.receive_awards_form_code("");
    if (r.error) {
      console.log(r.error.message);
      return;
    }
    console.log("领取成功");
  });
}

walk_drive();
