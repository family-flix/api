import { ModelParam, ModelQuery } from "@/domains/store/types";
import { store } from "@/store";

async function main() {
  // console.log("[DOMAIN]searcher/index - process_parsed_episode_list", scope, this.force);
  // let page = 1;
  // let no_more = false;
  const PAGE_SIZE = 20;
  const user_id = "c983KOZIgUtKheH";
  const drive_id = "WHFIiV9ILBmwaAK";
  const scope = [{ name: "无间" }];
  // console.log("[DOMAIN]searcher/index - process_parsed_episode_list", scope, this.force);
  let next_marker: string | null = null;
  let no_more = false;

  const where: ModelQuery<"parsed_episode"> = {
    // episode_id: null,
    // can_search: force ? undefined : 1,
    user_id,
    drive_id,
  };
  if (drive_id) {
    where.drive_id = drive_id;
  }
  if (scope && scope.length && scope.length <= 10) {
    let queries: NonNullable<ModelQuery<"parsed_episode">>[] = scope.map((s) => {
      const { name } = s;
      return {
        file_name: {
          contains: name,
        },
      };
    });
    queries = queries.concat(
      scope.map((s) => {
        const { name } = s;
        return {
          parent_paths: {
            contains: name,
          },
        };
      })
    );
    where.OR = queries;
  }
  // console.log("[DOMAIN]searcher/index - process_parsed_episode_list where is", JSON.stringify(where, null, 2));
  const count = await store.prisma.parsed_episode.count({ where });
  console.log("[DOMAIN]Searcher - process_parsed_episode_list", count);
  do {
    type ParsedEpisodeInput = ModelParam<typeof store.prisma.parsed_episode.findMany>;

    const list = await store.prisma.parsed_episode.findMany({
      where,
      include: {
        parsed_tv: true,
        parsed_season: true,
      },
      take: PAGE_SIZE + 1,
      // skip: (() => {
      //   if (next_marker) {
      //     return 1;
      //   }
      //   return 0;
      // })(),
      orderBy: [
        {
          parsed_tv: {
            name: "desc",
          },
        },
      ],
      ...(() => {
        const cursor: { id?: string } = {};
        if (next_marker) {
          cursor.id = next_marker;
          return {
            cursor,
          };
        }
        return {} as ParsedEpisodeInput["cursor"];
      })(),
    });
    // console.log("找到", parsed_episode_list.length, "个需要添加的剧集", where);
    // no_more = parsed_episode_list.length + (page - 1) * PAGE_SIZE >= count;
    no_more = list.length < PAGE_SIZE + 1;
    next_marker = null;
    if (list.length === PAGE_SIZE + 1) {
      const last_record = list[list.length - 1];
      next_marker = last_record.id;
    }
    const correct_list = list.slice(0, PAGE_SIZE);
    console.log("找到", list.length, "个需要添加的剧集", where, no_more);
    // page += 1;
    for (let i = 0; i < correct_list.length; i += 1) {
      const parsed_episode = correct_list[i];
      const { parsed_tv, parsed_season, season_number, episode_number } = parsed_episode;
      // console.log(parsed_episode);
      const { name, original_name, correct_name } = parsed_tv;
      const prefix = correct_name || name || original_name;
      // this.emit(
      //   Events.Print,
      //   new ArticleLineNode({
      //     children: [`[${prefix}/${season_number}/${episode_number}]`, " 准备添加剧集信息"].map((text) => {
      //       return new ArticleTextNode({ text });
      //     }),
      //   })
      // );
      console.log(`[${prefix}/${season_number}/${episode_number}]`, "准备添加剧集信息");
      if (parsed_episode.episode_id) {
        await store.prisma.parsed_episode.update({
          where: {
            id: parsed_episode.id,
          },
          data: {
            episode_id: null,
          },
        });
      }
      // const r = await this.process_parsed_episode({
      //   parsed_tv,
      //   parsed_season,
      //   parsed_episode,
      // });
      // if (r.error) {
      //   this.emit(
      //     Events.Print,
      //     new ArticleLineNode({
      //       children: [`[${prefix}/${season_number}/${episode_number}]`, "添加剧集详情失败", r.error.message].map(
      //         (text) => {
      //           return new ArticleTextNode({ text });
      //         }
      //       ),
      //     })
      //   );
      // }
    }
  } while (no_more === false);
}

main();
