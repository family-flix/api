require("dotenv").config();

import { store } from "@/store";

export async function find_same_tvs() {
  const users_res = await store.find_users();
  if (users_res.error) {
    console.log("[ERROR]find users failed", users_res.error.message);
    return;
  }
  for (let i = 0; i < users_res.data.length; i += 1) {
    const user = users_res.data[i];
    const { id: user_id } = user;
    const drives_resp = await store.find_drive_list({ user_id });
    if (drives_resp.error) {
      console.log("[ERROR]find drives failed", drives_resp.error.message);
      continue;
    }
    const drives = drives_resp.data;
    for (let j = 0; j < drives.length; j += 1) {
      const drive = drives[j];
      const { id: drive_id } = drive;
      const resp = await store.operation.all<
        {
          id: string;
          created: string;
          updated: string;
          name: string;
          original_name: string;
          file_id: string;
          file_name: string;
          play_history_id: null | string;
          tv_profile_id: string;
        }[]
      >(
        `SELECT t.*,pp.id AS play_history_id
    FROM tv t
    LEFT JOIN (
      SELECT tv_id, MAX(updated) AS max_updated
      FROM play_progress
      GROUP BY tv_id
    ) pp_latest ON t.id = pp_latest.tv_id
    LEFT JOIN play_progress pp ON pp_latest.tv_id = pp.tv_id AND pp_latest.max_updated = pp.updated
    WHERE tv_profile_id IN (
      SELECT tv_profile_id
      FROM tv
      GROUP BY tv_profile_id HAVING COUNT(*) > 1
    )
    AND t.tv_profile_id != '' AND t.user_id = '${user_id}' AND t.drive_id = '${drive_id}'
    ORDER BY t.updated DESC;`
      );
      if (resp.error) {
        console.log("[ERROR]fetch same tv failed", resp.error.message);
        continue;
      }
      console.log("same tv of", user.username, "at drive", drive.user_name);
      console.log(resp.data);
    }
  }
}

find_same_tvs();
