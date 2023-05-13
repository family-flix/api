require("dotenv").config();

import dayjs from "dayjs";

import { store } from "@/store";

async function main() {
  const users_res = await store.find_users();
  if (users_res.error) {
    console.log("[ERROR]find users failed", users_res.error.message);
    return;
  }
  for (let i = 0; i < users_res.data.length; i += 1) {
    const user = users_res.data[i];
    const { id: user_id } = user;
    const drives_resp = await store.find_aliyun_drives({ user_id });
    if (drives_resp.error) {
      console.log("[ERROR]find drives failed", drives_resp.error.message);
      continue;
    }
    const drives = drives_resp.data;
    for (let j = 0; j < drives.length; j += 1) {
      const drive = drives[j];
      const { id: drive_id } = drive;
      const latest_folder_res = await store.operation.get<{
        name: string;
        updated: string;
      }>(
        `SELECT updated,name FROM tmp_folder WHERE drive_id = '${drive_id}' ORDER BY updated DESC`
      );
      if (latest_folder_res.error) {
        console.log(latest_folder_res.error.message);
        continue;
      }
      if (!latest_folder_res.data) {
        continue;
      }
      const latest_folder = latest_folder_res.data;
      console.log(
        user.username + "'drive",
        drive.user_name,
        "latest folder",
        latest_folder.name,
        "is updated at",
        dayjs(latest_folder.updated).format("YYYY/MM/DD HH:mm:ss")
      );
      const latest_analysis = drive.latest_analysis;
      if (latest_analysis) {
        console.log(
          "the drive latest analysis at",
          dayjs(latest_analysis).format("YYYY/MM/DD HH:mm:ss")
        );
      } else {
        console.log("the drive latest analysis is empty");
      }
      if (
        latest_analysis &&
        dayjs(latest_folder.updated).isBefore(dayjs(latest_analysis))
      ) {
        console.log(user.username + "'drive", drive.user_name, "skip analysis");
        continue;
      }
      console.log(user.username + "'drive", drive.user_name, "need analysis");
    }
  }
}

main();
