import { Application } from "@/domains/application";
import { DoubanClient } from "@/domains/media_profile/douban";
import { MediaProfileRecord } from "@/domains/store/types";
import { walk_model_with_cursor } from "@/domains/store/utils";
import { r_id } from "@/utils";

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
  await walk_model_with_cursor({
    fn(extra) {
      return store.prisma.media_profile.findMany({
        where: {
          douban_id: null,
          order: {
            not: 0,
          },
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
        const media_name = series ? [series.name, data.order !== 1 ? data.order : null].filter(Boolean).join("") : name;
        const normalize_name = media_name.replace(/ {0,1}第([0-9]{1,})季/, "$1");
        console.log(media_name);
        if (series) {
          if (!name.includes(series.name)) {
            const tip = `季名称 '${name}' 没有包含电视剧名称 '${series.name}'`;
            tips.push(tip);
          }
        }
        try {
          const r = await client.search(normalize_name);
          if (r.error) {
            const tip = `无法根据名称 '${normalize_name}' 搜索到结果，原因 ${r.error.message}`;
            tips.push(tip);
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
            const tip = `根据名称 '${normalize_name}' 搜索到结果，但是没有找到完美匹配的记录`;
            tips.push(tip);
            return;
          }
          const profile_r = await client.fetch_media_profile(matched.id, {});
          if (profile_r.error) {
            const tip = `获取详情失败，因为 ${profile_r.error.message}`;
            tips.push(tip);
            return;
          }
          const profile = profile_r.data;
          for (let i = 0; i < profile.genres.length; i += 1) {
            const { id, text } = profile.genres[i];
            const e = await store.prisma.media_genre.findFirst({
              where: {
                id,
              },
            });
            if (!e) {
              await store.prisma.media_genre.create({
                data: {
                  id,
                  text,
                },
              });
            }
          }
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
                  name: person.name,
                  order: person.order,
                  known_for_department: person.role,
                  media_id: id,
                  profile_id: String(person.id),
                },
              });
              if (!e) {
                await store.prisma.person_in_media.create({
                  data: {
                    id: r_id(),
                    name: person.name,
                    order: person.order,
                    known_for_department: person.role,
                    media_id: id,
                    profile_id: String(person.id),
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
          if (profile.vote_average && data.vote_average !== profile.vote_average) {
            payload.vote_average = profile.vote_average;
          }
          console.log("add douban_id for media ", name, profile.genres);
          await store.prisma.media_profile.update({
            where: {
              id,
            },
            data: {
              ...payload,
              genres: {
                set: profile.genres.map((g) => {
                  return {
                    id: g.id,
                  };
                }),
              },
            },
          });
        } catch (err) {
          const e = err as Error;
          const tip = e.message;
          console.log(tip);
          tips.push(tip);
        }
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
