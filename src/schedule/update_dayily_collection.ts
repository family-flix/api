import dayjs from "dayjs";

import { DatabaseStore } from "@/domains/store";
import { User } from "@/domains/user";
import { CollectionTypes, MediaProfileSourceTypes, MediaTypes } from "@/constants";
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
      const dailyUpdateCollection = await (async () => {
        const r = await store.prisma.collection.findFirst({
          where: {
            type: CollectionTypes.DailyUpdate,
            user_id: user.id,
          },
        });
        if (!r) {
          return store.prisma.collection.create({
            data: {
              id: r_id(),
              title: "今日更新",
              type: CollectionTypes.DailyUpdate,
              user_id: user.id,
            },
          });
        }
        return r;
      })();
      const range = [dayjs().startOf("day").toISOString(), dayjs().endOf("day").toISOString()];
      const episodes = await store.prisma.episode.findMany({
        where: {
          created: {
            gte: range[0],
            lt: range[1],
          },
          season: {
            profile: {
              source: {
                not: MediaProfileSourceTypes.Other,
              },
            },
          },
          user_id: user.id,
        },
        include: {
          season: {
            include: {
              profile: true,
            },
          },
          tv: {
            include: {
              profile: true,
            },
          },
        },
        distinct: ["season_id"],
        take: 20,
        orderBy: [
          {
            created: "desc",
          },
        ],
      });
      const movies = await store.prisma.movie.findMany({
        where: {
          parsed_movies: {
            some: {},
          },
          user_id: user.id,
          created: {
            gte: range[0],
            lt: range[1],
          },
        },
        include: {
          profile: true,
        },
        orderBy: [
          {
            created: "desc",
          },
        ],
        take: 20,
      });
      type MediaPayload = {
        id: string;
        type: MediaTypes;
        name: string;
        poster_path: string;
        air_date: string;
        tv_id?: string;
        season_text?: string;
        text: string | null;
        created: number;
      };
      const season_medias: MediaPayload[] = [];
      const movie_media: MediaPayload[] = [];
      for (let i = 0; i < episodes.length; i += 1) {
        await (async () => {
          const episode = episodes[i];
          const { tv, season } = episode;
          const latest_episode = await store.prisma.episode.findFirst({
            where: {
              season_id: season.id,
              parsed_episodes: {
                some: {},
              },
            },
            orderBy: {
              episode_number: "desc",
            },
            take: 1,
          });
          if (!latest_episode) {
            return;
          }
          const media = {
            id: season.id,
            type: MediaTypes.Season,
            tv_id: tv.id,
            name: tv.profile.name,
            season_text: season.season_text,
            poster_path: season.profile.poster_path || tv.profile.poster_path,
            air_date: dayjs(season.profile.air_date).format("YYYY/MM/DD"),
            text: await (async () => {
              const episode_count = await store.prisma.episode.count({
                where: {
                  season_id: season.id,
                  parsed_episodes: {
                    some: {},
                  },
                },
              });
              if (season.profile.episode_count === episode_count) {
                return `全${season.profile.episode_count}集`;
              }
              if (episode_count === latest_episode.episode_number) {
                return `更新至${latest_episode.episode_number}集`;
              }
              return `收录${episode_count}集`;
            })(),
            created: dayjs(latest_episode.created).unix(),
          } as MediaPayload;
          season_medias.push(media);
        })();
      }
      for (let i = 0; i < movies.length; i += 1) {
        await (async () => {
          const movie = movies[i];
          const { id, profile, created } = movie;
          const media = {
            id,
            type: MediaTypes.Movie,
            name: profile.name,
            poster_path: profile.poster_path,
            air_date: dayjs(profile.air_date).format("YYYY/MM/DD"),
            text: null,
            created: dayjs(created).unix(),
          } as MediaPayload;
          movie_media.push(media);
        })();
      }
      //       const medias = [...episode_medias, ...movie_media].sort((a, b) => {
      //         return b.created - a.created;
      //       });
      await store.prisma.collection.update({
        where: {
          id: dailyUpdateCollection.id,
        },
        data: {
          seasons: {
            connect: season_medias.map((season) => {
              return {
                id: season.id,
              };
            }),
          },
          movies: {
            connect: movie_media.map((movie) => {
              return {
                id: movie.id,
              };
            }),
          },
        },
      });
    })();
  }
}
