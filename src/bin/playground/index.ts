import { Application } from "@/domains/application";
import { ScheduleTask } from "@/domains/schedule";
import { DriveTypes } from "@/domains/drive/constants";
import { normalize_partial_tv } from "@/domains/media_thumbnail/utils";

async function main() {
  const OUTPUT_PATH = process.env.OUTPUT_PATH;
  if (!OUTPUT_PATH) {
    console.error("缺少数据库文件路径");
    return;
  }
  const app = new Application({
    root_path: OUTPUT_PATH,
  });
  const store = app.store;
  const schedule = new ScheduleTask({ app, store });

  const page = 1;
  const page_size = 10;
  const list = await store.prisma.season.findMany({
    where: {
      AND: [
        {
          tv: {
            profile: {
              name: {
                contains: "狂赌之渊",
              },
            },
          },
        },
        {
          episodes: {
            every: {
              parsed_episodes: {
                some: {},
              },
            },
          },
        },
      ],
    },
    include: {
      _count: true,
      profile: true,
      sync_tasks: true,
      tv: {
        include: {
          _count: true,
          profile: true,
        },
      },
      episodes: {
        where: {
          parsed_episodes: {
            some: {},
          },
        },
        include: {
          profile: true,
          _count: true,
        },
        orderBy: {
          episode_number: "desc",
        },
      },
      parsed_episodes: true,
    },
    orderBy: {
      profile: { air_date: "desc" },
    },
    skip: (page - 1) * page_size,
    take: page_size,
  });
  console.log(
    list.map((season) => {
      const { id, season_text, profile, tv, sync_tasks, _count } = season;
      const { air_date, episode_count } = profile;
      const incomplete = episode_count !== 0 && episode_count !== _count.episodes;
      const { name, original_name, overview, poster_path, popularity, need_bind, sync_task, valid_bind, binds } =
        normalize_partial_tv({
          ...tv,
          sync_tasks,
        });
      const tips: string[] = [];
      if (binds.length !== 0 && valid_bind === null && tv.profile.in_production) {
        tips.push("更新任务已失效");
      }
      if (tv.profile.in_production && incomplete && binds.length === 0) {
        tips.push("未完结但缺少更新任务");
      }
      if (!tv.profile.in_production && incomplete) {
        tips.push(`已完结但集数不完整，总集数 ${episode_count}，当前集数 ${_count.episodes}`);
      }
      return {
        id,
        tv_id: tv.id,
        name: name || original_name,
        original_name,
        overview,
        season_number: season_text,
        season_text,
        poster_path: profile.poster_path || poster_path,
        first_air_date: air_date,
        popularity,
        cur_episode_count: _count.episodes,
        episode_count,
        incomplete,
        need_bind,
        sync_task,
        tips,
      };
    })
  );
}

main();
