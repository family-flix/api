require("dotenv").config();
import { walk_table_with_pagination } from "@/domains/walker/utils";
import { store_factory } from "@/store";
import { store } from "@/store";
import { EpisodeRecord, RecordCommonPart } from "@/store/types";

async function main() {
  const { find_episodes_with_pagination } = store_factory(store.operation);
  walk_table_with_pagination(find_episodes_with_pagination, {
    body: {},
    async on_handle(v: EpisodeRecord & RecordCommonPart) {
      const {
        id,
        // @ts-ignore
        season_id,
        season,
      } = v;
      if (season_id && !season) {
        console.log("update");
        const r = await store.find_season({ id: season_id });
        if (r.data) {
          await store.update_episode(id, { season: r.data.season });
        }
      }
    },
  });
}

main();
