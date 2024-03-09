import { AliyunDriveClient } from "@/domains/clients/alipan/index";
import { Application } from "@/domains/application/index";
import { padding_zero, sleep } from "@/utils";

(async () => {
  const OUTPUT_PATH = process.env.OUTPUT_PATH;
  if (!OUTPUT_PATH) {
    console.error("缺少数据库文件路径");
    return;
  }
  const app = new Application({
    root_path: OUTPUT_PATH,
  });
  const store = app.store;
  const original_drive_res = await AliyunDriveClient.Get({ unique_id: "625667282", store });
  if (original_drive_res.error) {
    console.log(original_drive_res.error.message);
    return;
  }
  const drive = original_drive_res.data;
  for (let i = 1; i < 500; i += 1) {
    await sleep(1000);
    await drive.create_folder({
      parent_file_id: "64fdacfd58f642b7914e4b22bb6bb26f6cdb4a2d",
      name: `240124${padding_zero(i + 1)}`,
    });
  }
})();

function upload() {
  // const existing = await original_client.existing(
  //   "65a39f93f0f55618c47a441aa406f59c5efd9e75",
  //   [
  //     "2006.地球脉动.1-2季",
  //     "地球脉动第2季",
  //     "地球脉动第二季",
  //     "Planet.Earth.II.S01E01.2160p.UHD.BluRay.HDR.DTS-HD.MA5.1.x265-ULTRAHDCLUB.mkv",
  //   ].join("/")
  // );
  // console.log(existing);
  // await original_client.upload(video_filepath, {
  //   name: ["Planet.Earth.II.S01E02.2160p.UHD.BluRay.HDR.DTS-HD.MA5.1.x265-ULTRAHDCLUB.mkv"].join("/"),
  //   parent_file_id: "65a49ebae33fc9fe9f554362aa556130b4887ba8",
  // });
}
function rename() {
  // 01 65a4e6ebada209e63e964b2088ea2173e95a864c
  // 02 65a4e6f152a77e3053624decb1c0f816fa12f304
  // const r = await original_client.rename_file("65a4e6f152a77e3053624decb1c0f816fa12f304", "test01.mkv", {
  //   check_name_mode: "ignore",
  // });
  // if (r.error) {
  //   console.log(r.error.message);
  //   return;
  // }
}
