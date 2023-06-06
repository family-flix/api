import { AliyunDriveClient } from "@/domains/aliyundrive";
import { store } from "@/store";

(async () => {
  const drive_id = 123;
  const client_res = await AliyunDriveClient.Get({ drive_id, store });
  if (client_res.error) {
    return;
  }
  const client = client_res.data;
  const resp = await client.fetch_video_preview_info("63dc96fafb3667cd553f430b93bd9c21ab36fe03");
  if (resp.error) {
    console.log(resp.error.message);
    return;
  }
  console.log(resp.data);
})();
