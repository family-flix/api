require("dotenv").config();
import dayjs from "dayjs";

import { app, store } from "@/store/index";
import { MediaThumbnail } from "@/domains/media_thumbnail/index";
import { Drive } from "@/domains/drive/v2";

async function main() {
  // const upload = new ImageUploader();
  // const r = await upload.download(
  //   // "https://cdn.weipaitang.com/static/202306013b6c982e-518a-982e518a-574c-e37d8d8b577a-W750H1800",
  //   "https://cn-beijing-data.aliyundrive.net/6VB8kcQ9%2F254244%2F646b45b9b9a0198985f6480bbd8733601f2a91e1%2F646b45b92db154e23348474b90c6160600e7a351?security-token=CAIS%2BgF1q6Ft5B2yfSjIr5f4McOHnLVP%2F6zeSVPU03U2R8NW2ILKrDz2IHFPeHJrBeAYt%2FoxmW1X5vwSlq5rR4QAXlDfNWLxYgu4qFHPWZHInuDox55m4cTXNAr%2BIhr%2F29CoEIedZdjBe%2FCrRknZnytou9XTfimjWFrXWv%2Fgy%2BQQDLItUxK%2FcCBNCfpPOwJms7V6D3bKMuu3OROY6Qi5TmgQ41Uh1jgjtPzkkpfFtkGF1GeXkLFF%2B97DRbG%2FdNRpMZtFVNO44fd7bKKp0lQLukMWr%2Fwq3PIdp2ma447NWQlLnzyCMvvJ9OVDFyN0aKEnH7J%2Bq%2FzxhTPrMnpkSlacGoABZXEFZo93TG2bRyYBDNTy9%2FuyaGUEWraZUxmayPPaLwyu5mVe86URmX8puC67IHbnlGL1Tf6IiG4sEafa56joconQHrbQpGN3dBUcyIDFNcHvreGuvro1BxE1YvMnulPeKDKNiDk4fHRIkEiWlBwtX%2B9RlKy7PTuNl2y%2B5s4Lnyk%3D&x-oss-access-key-id=STS.NTMzy3qjnHn5Kue7ucKLz7GaN&x-oss-expires=1685631423&x-oss-process=video%2Fsnapshot%2Ct_120000%2Cf_jpg%2Cw_480%2Car_auto%2Cm_fast&x-oss-signature=VlhVW2rTO%2F0lTD3aVWaRnEer8gCwQfCqMVqe9QelfJk%3D&x-oss-signature-version=OSS2",
  //   path.resolve(process.env.PUBLIC_PATH, "aaa.jpg")
  // );
  // if (r.error) {
  //   return;
  // }
  // console.log(r.data);
  // const tv_res = await TV.New({ assets: process.env.PUBLIC_PATH });
  // if (tv_res.error) {
  //   return;
  // }
  // const tv = tv_res.data;
  // const curTime = 718.909723;
  // const r = await tv.snapshot_media({
  //   file_id: "646b8b7deb2a23432cc74528a4eb97ef158a94d4",
  //   cur_time: curTime,
  //   drive_id: "HOuEKtDerEOikQG",
  //   store,
  // });
  // if (r.error) {
  //   console.log(r.error.message);
  //   return;
  // }
  // const { img_path } = r.data;
  // console.log(img_path, formatVideoTime(curTime));
  // console.log(r.data);
  // const drive = new AliyunDriveClient({ drive_id: "HOuEKtDerEOikQG", store });
  // const client_res = await AliyunBackupDriveClient.Get({ drive_id: "123", store });
  // if (client_res.error) {
  //   return;
  // }
  // const client = client_res.data;
  // const r = await client.generate_thumbnail({
  //   file_id: "646b8b7db3824acadb704145ad76010b63f0c525",
  //   cur_time: "715030",
  // });
  // if (r.error) {
  //   console.log(r.error.message);
  //   return;
  // }
  // console.log(r.data);
  const tv_res = await MediaThumbnail.New({
    assets: app.assets,
  });
  if (tv_res.error) {
    return;
  }
  const drive_res = await Drive.Get({ id: "622310670", store });
  if (drive_res.error) {
    return;
  }
  const drive = drive_res.data;
  const tv = tv_res.data;
  const r = await tv.snapshot_media({
    file_id: "65157e1ee9c1491a8a894b79a0ee42b21eb5185d",
    cur_time: 83.771793,
    filename(time: string) {
      return dayjs().unix().toString();
    },
    drive,
    store,
  });
  if (r.error) {
    console.log(r.error.message);
    return;
  }
  console.log(r.data);
}

main();
