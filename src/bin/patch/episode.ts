require("dotenv").config();

import { DatabaseStore } from "@/domains/store";
import { walk_model_with_cursor } from "@/domains/store/utils";
import { store } from "@/store";

function walk_episodes(store: DatabaseStore) {
  walk_model_with_cursor({
    fn(extra) {
      return store.prisma.episode.findMany({
        where: {},
        include: {
          profile: true,
        },
        ...extra,
      });
    },
    async handler(data, index, finish) {
      if (data.episode_number !== 0) {
        return;
      }
      if (data.profile.episode_number === null) {
        return;
      }
      if (data.profile.episode_number === 0) {
        return;
      }
      await store.prisma.episode.update({
        where: {
          id: data.id,
        },
        data: {
          episode_number: data.profile.episode_number,
        },
      });
    },
  });
}

walk_episodes(store);
