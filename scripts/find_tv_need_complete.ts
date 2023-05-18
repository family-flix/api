import chalk from "chalk";

import { walk_table_with_pagination } from "@/domains/walker/utils";
import { RecordCommonPart, TVProfileRecord } from "@/store/types";
import { format_number } from "@/utils";
import { store_factory } from "@/store";

export function find_tv_need_complete(store: ReturnType<typeof store_factory>) {
  walk_table_with_pagination(store.find_tv_profiles_with_pagination, {
    body: {},
    async on_handle(v: TVProfileRecord & RecordCommonPart) {
      const { id, name, original_name } = v;
      console.log("开始处理", chalk.greenBright(name || original_name));
      const season_res = await store.find_season_profile_list({
        tv_profile_id: id,
      });
      if (season_res.error || !season_res.data || season_res.data.length === 0) {
        console.log(name || original_name, "没有任何季，请先获取该电视剧季", season_res.error?.message);
        return;
      }
      const r = await store.find_parsed_tv({ tv_profile_id: id });
      if (r.error || !r.data) {
        console.log("网盘内不存在该电视剧", r.error?.message);
        return;
      }
      const { id: tv_id, user_id } = r.data;
      for (let i = 0; i < season_res.data.length; i += 1) {
        const { id: searched_season_id, name: season_name, episode_count, season_number } = season_res.data[i];
        const season = (() => {
          if (season_number === 0) {
            return season_name;
          }
          return format_number(String(season_number), "S");
        })();
        console.log(chalk.yellowBright(season_name));
        // const r2 = await store.operation.all<EpisodeRecord[]>(
        //   `SELECT * FROM episode e LEFT JOIN tv t ON e.tv_id = t.id WHERE t.tv_profile_id = '${id}' AND e.season = '${season}'`
        // );
        const sql = `SELECT
	(SELECT COUNT(*) FROM episode WHERE tv_id = '${tv_id}' AND season = '${season}') AS total_videos,
	(SELECT COUNT(*) FROM (SELECT DISTINCT SUBSTR(episode, 1, INSTR(episode, 'E') - 1) AS episode_number FROM episode WHERE tv_id = '${tv_id}' AND season = '${season}')) AS total_episodes,
	(SELECT COUNT(*) FROM (SELECT DISTINCT episode FROM episode WHERE tv_id = '${tv_id}' AND season = '${season}')) AS distinct_videos;`;
        const r2 = await store.operation.get<{
          total_videos: number;
          total_episodes: number;
          /** 不重复影片数 */
          distinct_videos: number;
        }>(sql);
        if (r2.error) {
          console.log(r2.error.message);
          continue;
        }
        const existing_res = await store.find_tv_need_complete({
          searched_season_id,
          tv_profile_id: id,
          user_id,
        });
        if (existing_res.error) {
          // console.log(existing_res.error);
          continue;
        }
        const cur_count = r2.data.distinct_videos;
        if (episode_count === cur_count) {
          if (existing_res.data) {
            console.log("被完善");
            await store.delete_tv_need_complete({ id: existing_res.data.id });
          }
          continue;
        }
        console.log("集数不一致，检查是否已存在", episode_count, cur_count);
        if (!existing_res.data) {
          console.log("插入一条新记录");
          await store.add_tv_need_complete({
            tv_profile_id: id,
            searched_season_id,
            episode_count,
            cur_count,
            user_id,
          });
          continue;
        }
        if (existing_res.data.cur_count === cur_count) {
          console.log("没有变化，跳过");
          continue;
        }
        console.log("更新已存在的记录");
        await store.update_tv_need_complete(existing_res.data.id, {
          cur_count,
        });
      }
    },
  });
}
