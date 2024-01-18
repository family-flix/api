import { CollectionTypes } from "@/constants";
import { Application } from "@/domains/application";
import { DoubanClient } from "@/domains/media_profile/douban";
import { MediaProfileRecord } from "@/domains/store/types";
import { walk_model_with_cursor } from "@/domains/store/utils";

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
  console.log("Start");
  const client = new DoubanClient({
    token: "",
  });

  const list = await store.prisma.media_profile.findMany({
    include: {
      series: true,
    },
    orderBy: {
      air_date: "desc",
    },
    take: 10,
  });
  for (let i = 0; i < list.length; i += 1) {
    await (async () => {
      const data = list[i];
      const { id, name, original_name, air_date, series } = data;
      console.log(name, original_name, air_date);
      const r = await client.search(name);
      if (r.error) {
        console.log(r.error.message);
        return;
      }
      const profile = r.data;
      console.log(profile);
    })();
  }
  await walk_model_with_cursor({
    fn(extra) {
      return store.prisma.media_profile.findMany({
        where: {
          type: CollectionTypes.Manually,
        },
        include: {
          series: true,
        },
        ...extra,
      });
    },
    async handler(data, index) {
      const { id, name, series } = data;
      const tips: string[] = [];
      await (async () => {
        const media_name = series ? [series.name, data.order].filter(Boolean).join("") : name;
        const normalize_name = media_name.replace(/ {0,1}第([0-9]{1,})季/, "$1");
        if (series) {
          if (!name.includes(series.name)) {
            tips.push(`季名称 '${name}' 没有包含电视剧名称 '${series.name}'`);
          }
        }
        const r = await client.search(normalize_name);
        if (r.error) {
          // console.log(normalize_name, "search media failed because ", r.error.message);
          // await store.prisma.media_profile.update({
          //   where: {
          //     id,
          //   },
          //   data: {},
          // });
          tips.push(`无法根据名称 '${normalize_name}' 搜索到结果，原因 ${r.error.message}`);
          return;
        }
        const matched = (() => {
          let matched = r.data.list.find((media) => {
            const n = media.name.trim();
            if (normalize_name === n && data.air_date === media.air_date) {
              return true;
            }
            return false;
          });
          if (matched) {
            return matched;
          }
          matched = r.data.list.find((media) => {
            const n = media.name.trim();
            if (normalize_name === n) {
              return true;
            }
            return false;
          });
          if (matched) {
            return matched;
          }
          return null;
        })();
        if (!matched) {
          tips.push(`根据名称 '${normalize_name}' 搜索到结果，但是没有找到完美匹配的记录`);
          return;
        }
        const profile_r = await client.fetch_media_profile(matched.id);
        if (profile_r.error) {
          tips.push(`获取详情失败，因为 ${profile_r.error.message}`);
          return;
        }
        const profile = profile_r.data;
        const persons = [
          ...profile.actors.map((actor) => {
            return {
              ...actor,
              role: "star",
            };
          }),
          ...profile.director.map((actor) => {
            return {
              ...actor,
              role: "director",
            };
          }),
          ...profile.author.map((actor) => {
            return {
              ...actor,
              role: "scriptwriter",
            };
          }),
        ];
        for (let i = 0; i < persons.length; i += 1) {
          const person = persons[i];
          const e = await store.prisma.person_profile.findFirst({
            where: {
              id: person.id,
            },
          });
          if (!e) {
            await store.prisma.person_profile.create({
              data: {
                id: person.id,
                name: person.name,
                douban_id: person.id,
              },
            });
          }
        }
        for (let i = 0; i < persons.length; i += 1) {
          const person = persons[i];
          await (async () => {
            const e = await store.prisma.person_in_media.findFirst({
              where: {
                id: person.id,
                name: person.name,
                order: person.order,
                known_for_department: person.role,
                media_id: id,
              },
            });
            if (!e) {
              await store.prisma.person_in_media.create({
                data: {
                  id: person.id,
                  name,
                  order: person.order,
                  known_for_department: person.role,
                  media_id: id,
                  profile_id: person.id,
                },
              });
              return;
            }
          })();
        }
        const payload: Partial<MediaProfileRecord> = {
          douban_id: String(profile.id),
        };
        if (profile.air_date && data.air_date !== profile.air_date) {
          payload.air_date = profile.air_date;
        }
        if (profile.source_count && data.source_count !== profile.source_count) {
          payload.source_count = profile.source_count;
        }
        await store.prisma.media_profile.update({
          where: {
            id,
          },
          data: payload,
        });
      })();
      if (tips.length !== 0) {
        await store.prisma.media_profile.update({
          where: {
            id,
          },
          data: {
            tips: tips.join("\n"),
          },
        });
      }
    },
  });
  console.log("Success");
}

main();
