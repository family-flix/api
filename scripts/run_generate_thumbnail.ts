import { store } from "@/store";
import { AliyunDriveClient } from "@/domains/aliyundrive";

async function main() {
  const drive = new AliyunDriveClient({ drive_id: "HOuEKtDerEOikQG", store });
  const r = await drive.generate_thumbnail({ file_id: "646b8b7d5c8e8c7e19404780921a8898eac3883e", cur_time: "40000" });
  if (r.error) {
    console.log(r.error.message);
    return;
  }
  console.log(r.data.responseUrl);
}

main();
