import { AliyunDriveClient } from "@/domains/aliyundrive";
import { DatabaseStore } from "@/domains/store";
import { walk_records } from "@/domains/store/utils";
import { Result } from "@/types";
import { parseJSONStr } from "@/utils";

export async function clear_expired_shared_files_in_progress(store: DatabaseStore) {
  const drives = await store.prisma.drive.findMany({});
  if (drives.length === 0) {
    return;
  }
  const drive = drives[0];
  const d_res = await parseJSONStr<{ drive_id: number }>(drive.profile);
  if (d_res.error) {
    return;
  }
  const client_res = await AliyunDriveClient.Get({ drive_id: d_res.data.drive_id, store });
  if (client_res.error) {
    return;
  }
  const client = client_res.data;
  await walk_records(store.prisma.drive, {}, async (drive) => {
    console.log(drive.id);
  });
  // await walk_table_with_pagination<SharedFilesInProgressRecord & RecordCommonPart>(
  //   store.find_shared_files_save_with_pagination,
  //   {
  //     body: {
  //       complete: 0,
  //     },
  //     async on_handle(shared_files) {
  //       const { id, name, url } = shared_files;
  //       const r = await client.fetch_share_profile(url, { force: true });
  //       if (r.error) {
  //         if (["share_link is cancelled by the creator"].includes(r.error.message)) {
  //           console.log(name, "is expired, delete it, reason is", r.error.message);
  //           await store.update_shared_file_save(id, { need_update: 1 });
  //         }
  //       }
  //     },
  //   }
  // );
  return Result.Ok(null);
}
