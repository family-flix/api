import dayjs from "dayjs";

import { DatabaseStore } from "@/domains/store";
import { User } from "@/domains/user";
import { walk_model_with_cursor } from "@/domains/store/utils";
import { ModelQuery } from "@/domains/store/types";
import { r_id } from "@/utils";

export async function main(values: { store: DatabaseStore }) {
  const { store } = values;

  const users = await store.prisma.user.findMany({});
  for (let i = 0; i < users.length; i += 1) {
    await (async () => {
      const { id } = users[i];
      const t_res = await User.Get({ id }, store);
      if (t_res.error) {
        return;
      }
      const user = t_res.data;
      await walk_model_with_cursor({
        fn: (extra) => {
          return store.prisma.season.findMany({
            where: {
              tv: {
                profile: {
                  in_production: 0,
                },
              },
              user_id: user.id,
            },
            include: {
              _count: true,
              profile: true,
            },
            orderBy: {
              profile: {
                air_date: "asc",
              },
            },
            ...extra,
          });
        },
        handler: async (data, index) => {
          const season = data;
          const where: ModelQuery<"episode"> = {
            parsed_episodes: {
              some: {},
            },
            season_id: season.id,
          };
          const cur_episode_count = await store.prisma.episode.count({
            where,
          });
          const latest_episode = await store.prisma.episode.findFirst({
            where,
            orderBy: {
              episode_number: "desc",
            },
          });
          const existing = await store.prisma.incomplete_tv.findFirst({
            where: {
              season_id: season.id,
            },
          });
          if (!latest_episode) {
            return;
          }
          const { episode_count } = season.profile;
          if (episode_count === cur_episode_count) {
            if (existing) {
              await store.prisma.incomplete_tv.delete({
                where: {
                  id: existing.id,
                },
              });
            }
            return;
          }
          const error_tip = (() => {
            if (latest_episode.episode_number === cur_episode_count) {
              return "剧集不全";
            }
            return "剧集不全且不连续";
          })();
          if (!existing) {
            await store.prisma.incomplete_tv.create({
              data: {
                id: r_id(),
                episode_count,
                cur_count: cur_episode_count,
                text: error_tip,
                season_id: season.id,
                user_id: user.id,
              },
            });
            return;
          }
          await store.prisma.incomplete_tv.update({
            where: {
              id: existing.id,
            },
            data: {
              episode_count,
              cur_count: cur_episode_count,
              text: error_tip,
            },
          });
        },
      });
    })();
  }
}
