import { AliyunBackupDriveClient } from "@/domains/aliyundrive";
import { store } from "@/store";

(async () => {
  const drive_id = "282300452";
  const client_res = await AliyunBackupDriveClient.Get({ drive_id, store });
  if (client_res.error) {
    console.log(client_res.error.message);
    return;
  }
  const client = client_res.data;
  const resp = await client.fetch_video_preview_info("64d44330c225577be32f4e4884debd723612986b");
  if (resp.error) {
    console.log(resp.error.message);
    return;
  }
  console.log(resp.data);
})();
