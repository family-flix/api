/**
 * @file 将解析到的电视剧/电影详情，保存到数据库
 * 主要是处理重复添加和更新
 */

import { BaseDomain, Handler } from "@/domains/base";
import { MediaProfileInDrive, SearchedEpisode } from "@/domains/walker/index";
import { MediaProfileClient } from "@/domains/media_profile/index";
import { format_season_name } from "@/domains/media_profile/utils";
import { DataStore } from "@/domains/store/types";
import { MediaSearcher } from "@/domains/searcher/v2";
import { User } from "@/domains/user/index";
import { FileManage } from "@/domains/uploader/index";
import { Drive } from "@/domains/drive/v2";
import { ArticleLineNode } from "@/domains/article/index";
import { Result } from "@/domains/result/index";
import { MediaTypes } from "@/constants/index";

enum Events {
  AddTV,
  // AddSeason,
  AddEpisode,
  AddMovie,
  Print,
}
type TheTypesOfEvents = {
  [Events.AddTV]: SearchedEpisode["tv"];
  [Events.AddEpisode]: SearchedEpisode["episode"] & SearchedEpisode["tv"];
  [Events.AddMovie]: void;
  [Events.Print]: ArticleLineNode;
};
type MediaProfileProcessorProps = {
  task_id?: string;
  /** TMDB token */
  token: string;
  /** 资源目录 */
  assets: string;
  searcher: MediaSearcher;
  user: User;
  drive: Drive;
  store: DataStore;
  on_print?: (node: ArticleLineNode) => void;
};

export class MediaProfileProcessor extends BaseDomain<TheTypesOfEvents> {
  static New(props: MediaProfileProcessorProps) {
    const { user, drive, store } = props;
    if (!store) {
      return Result.Err("缺少数据库实例");
    }
    if (!user) {
      return Result.Err("缺少用户 id");
    }
    if (!drive) {
      return Result.Err("缺少云盘 id");
    }
    return Result.Ok(new MediaProfileProcessor(props));
  }

  assets: string;

  user: User;
  drive: Drive;
  searcher: MediaSearcher;
  client: MediaProfileClient;
  store: DataStore;

  constructor(options: Partial<{}> & MediaProfileProcessorProps) {
    super();

    const { token, assets, searcher, user, drive, store, on_print } = options;
    this.assets = assets;
    this.store = store;
    this.searcher = searcher;
    this.user = user;
    this.drive = drive;
    this.client = new MediaProfileClient({
      token,
      store,
      uploader: new FileManage({ root: assets }),
    });
    if (on_print) {
      this.on_print(on_print);
    }
  }

  /**
   * 处理 Walker 吐出的 parsed 信息
   * 创建不重复的 parsed_tv、parsed_season 和 parsed_episode
   */
  async run(data: MediaProfileInDrive) {
    const { type, name } = data;
    const store = this.store;
    const prefix = name;
    function log(...args: unknown[]) {
      // if (!tv.name.includes("夏日")) {
      //   return;
      // }
      // console.log(...args);
    }
    if (type === MediaTypes.Season) {
      const { tmdb_id } = data;
      // console.log("before media_series_profile.findFirst", tmdb_id);
      const existing_series_profile = await store.prisma.media_series_profile.findFirst({
        where: {
          tmdb_id,
        },
        include: {
          media_profiles: true,
        },
      });
      if (!existing_series_profile) {
        /**
         * ----------------------------------------
         * 详情不存在，新增电视剧、季详情记录
         * ----------------------------------------
         */
        const {
          id,
          name,
          original_name,
          overview,
          poster_path,
          first_air_date,
          backdrop_path,
          seasons,
          number_of_seasons,
        } = data;
        const processed_seasons = [];
        for (let i = 0; i < seasons.length; i += 1) {
          const season = seasons[i];
          const { season_number, air_date, vote_average, episode_count, episodes } = season;
          processed_seasons.push({
            id: season.id,
            name: format_season_name(season.name, { name }),
            overview: season.overview,
            poster_path: season.poster_path
              ? await this.client.download_image_with_client({
                  file_id: season.poster_path.file_id,
                  key: season.id ? season.id.replace("/", "_") : undefined,
                  parent_dir: "poster",
                  client: this.drive.client,
                })
              : null,
            backdrop_path: season.backdrop_path
              ? await this.client.download_image_with_client({
                  file_id: season.backdrop_path.file_id,
                  key: season.id ? season.id.replace("/", "_") : undefined,
                  parent_dir: "backdrop",
                  client: this.drive.client,
                })
              : null,
            season_number,
            episode_count,
            air_date,
            vote_average,
            episodes,
          });
        }
        const r = await this.client.create_series_profile({
          id,
          name,
          original_name,
          overview,
          poster_path: poster_path
            ? await this.client.download_image_with_client({
                file_id: poster_path.file_id,
                key: id ? id.replace("/", "_") : undefined,
                parent_dir: "poster",
                client: this.drive.client,
              })
            : null,
          backdrop_path: backdrop_path
            ? await this.client.download_image_with_client({
                file_id: backdrop_path.file_id,
                key: id ? id.replace("/", "_") : undefined,
                parent_dir: "backdrop",
                client: this.drive.client,
              })
            : null,
          first_air_date,
          seasons: processed_seasons,
          number_of_seasons,
          number_of_episodes: 0,
          next_episode_to_air: null,
          vote_average: 0,
          genres: [],
          origin_country: [],
          popularity: 0,
          in_production: false,
          tmdb_id,
          type: "tv",
          source: "tmdb",
        });
        if (r.error) {
          return Result.Err(r.error.message);
        }
        const created = r.data;
        for (let i = 0; i < processed_seasons.length; i += 1) {
          await (async () => {
            const season = processed_seasons[i];
            const matched = created.media_profiles.find((s) => {
              return s.order === season.season_number;
            });
            if (!matched) {
              return;
            }
            const media = await this.searcher.get_season_media_record_by_profile({ id: season.id, name: season.name });
            const processed_episodes = [];
            for (let i = 0; i < season.episodes.length; i += 1) {
              const {
                id,
                name,
                overview,
                still_path,
                episode_number,
                air_date,
                runtime,
                season_number,
                relative_source_id,
                subtitle_files,
              } = season.episodes[i];
              processed_episodes.push({
                id,
                name,
                overview,
                still_path: still_path
                  ? await this.client.download_image_with_client({
                      file_id: still_path.file_id,
                      parent_dir: "thumbnail",
                      client: this.drive.client,
                    })
                  : null,
                episode_number,
                season_number,
                air_date,
                runtime,
                relative_source_id,
                subtitle_files,
              });
            }
            await this.client.apply_episodes(processed_episodes, {
              tv_id: created.id,
              season_number: season.season_number,
              season_id: matched.id,
            });
            for (let i = 0; i < processed_episodes.length; i += 1) {
              await (async () => {
                const { id, subtitle_files, relative_source_id } = processed_episodes[i];
                const media_source = await this.searcher.get_season_media_source_record_by_profile(
                  {
                    id,
                  },
                  { id: media.id, name: season.name }
                );
                const parsed_source = await this.store.prisma.parsed_media_source.findFirst({
                  where: {
                    file_id: relative_source_id,
                  },
                });
                if (!parsed_source) {
                  return;
                }
                await this.store.prisma.parsed_media_source.update({
                  where: {
                    id: parsed_source.id,
                  },
                  data: {
                    media_source_id: media_source.id,
                  },
                });
              })();
            }
          })();
        }
        return Result.Ok(created);
      }
      const { seasons } = data;
      for (let i = 0; i < seasons.length; i += 1) {
        const season = seasons[i];
        const media = await this.searcher.get_season_media_record_by_profile({ id: season.id, name: season.name });
        for (let j = 0; j < season.episodes.length; j += 1) {
          await (async () => {
            const { id, subtitle_files, relative_source_id } = season.episodes[j];
            const media_source = await this.searcher.get_season_media_source_record_by_profile(
              {
                id,
              },
              { id: media.id, name: season.name }
            );
            const parsed_source = await this.store.prisma.parsed_media_source.findFirst({
              where: {
                file_id: relative_source_id,
              },
            });
            if (!parsed_source) {
              return;
            }
            await this.store.prisma.parsed_media_source.update({
              where: {
                id: parsed_source.id,
              },
              data: {
                media_source_id: media_source.id,
              },
            });
          })();
        }
      }
      // console.log("media_profile run finish");
      return Result.Ok(existing_series_profile);
    }
    if (type === MediaTypes.Movie) {
      const { tmdb_id } = data;
      const existing_series_profile = await store.prisma.media_profile.findFirst({
        where: {
          id: String(tmdb_id),
        },
      });
      if (!existing_series_profile) {
        const { id, name, original_name, overview, poster_path, backdrop_path, runtime, air_date, origin_country } =
          data;
        const created = await this.client.create_movie_profile({
          id: Number(id),
          name,
          original_name,
          overview,
          poster_path: poster_path
            ? await this.client.download_image_with_client({
                file_id: poster_path.file_id,
                key: id ? id.replace("/", "_") : undefined,
                parent_dir: "poster",
                client: this.drive.client,
              })
            : null,
          backdrop_path: backdrop_path
            ? await this.client.download_image_with_client({
                file_id: backdrop_path.file_id,
                key: id ? id.replace("/", "_") : undefined,
                parent_dir: "backdrop",
                client: this.drive.client,
              })
            : null,
          air_date,
          runtime,
          origin_country,
          status: "",
          vote_average: 0,
          popularity: 0,
          genres: [],
          tmdb_id,
        });
        return Result.Ok(created);
      }
      // return Result.Ok(existing_series_profile);
    }
    return Result.Err(`未知的 type 值 '${type}'`);
  }

  on_add_tv(handler: Handler<TheTypesOfEvents[Events.AddTV]>) {
    return this.on(Events.AddTV, handler);
  }
  // on_add_season(handler: Handler<TheTypesOfEvents[Events.AddSeason]>) {
  //   return this.on(Events.AddSeason, handler);
  // }
  on_add_episode(handler: Handler<TheTypesOfEvents[Events.AddEpisode]>) {
    return this.on(Events.AddEpisode, handler);
  }
  on_print(handler: Handler<TheTypesOfEvents[Events.Print]>) {
    return this.on(Events.Print, handler);
  }
}
