import { AliyunDriveClient } from "@/domains/aliyundrive";
import { find_duplicate_episodes } from "@/domains/walker/utils";
import { store_factory } from "@/store";
import { Result } from "@/types";

async function delete_episode_and_file(
  episode: { file_id: string },
  client: AliyunDriveClient
) {
  const { file_id } = episode;
  const r = await client.delete_file(file_id);
  if (r.error) {
    return r;
  }
  return Result.Ok(null);
}

/**
 * @file 删除重复的影片
 */
export async function delete_duplicate_episode(
  store: ReturnType<typeof store_factory>
) {
  const drives_res = await store.find_aliyun_drives();
  if (drives_res.error) {
    console.log(drives_res.error.message);
    return;
  }
  const drives = drives_res.data;
  for (let i = 0; i < drives.length; i += 1) {
    const { user_id, id: drive_id } = drives[i];
    const client = new AliyunDriveClient({ drive_id, store });
    const r = await find_duplicate_episodes({ user_id, drive_id }, store);
    if (r.error) {
      continue;
    }
    const episodes = r.data;
    const total = Object.keys(episodes)
      .map((k) => {
        return episodes[k];
      })
      .reduce((total, cur) => {
        return total.concat(...cur);
      }, []);
    for (let i = 0; i < total.length; i += 1) {
      const episode = total[i];
      // console.log("check need delete file", episode.file_name);
      if (episode.first || episode.has_play) {
        continue;
      }
      console.log("confirm delete file", episode.file_id, episode.file_name);
      const r = await delete_episode_and_file(
        { file_id: episode.file_id },
        client
      );
      if (r.error) {
        console.log(
          "delete file",
          episode.file_name,
          "failed, because",
          r.error.message
        );
        return;
      }
      console.log("delete file", episode.file_name, "success");
    }
  }
}
