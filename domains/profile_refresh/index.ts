import { Handler } from "mitt";

import { BaseDomain } from "@/domains/base";
import { DatabaseStore } from "@/domains/store";
import { ModelQuery, TVProfileRecord, TVRecord } from "@/domains/store/types";
import { TMDBClient } from "@/domains/tmdb";
import { ArticleLineNode, ArticleSectionNode, ArticleTextNode } from "@/domains/article";
import { User } from "@/domains/user";
import { MediaSearcher } from "@/domains/searcher";
import { season_to_num } from "@/utils";

import { check_season_profile_need_refresh, check_tv_profile_need_refresh } from "./utils";
import { Result } from "@/types";

enum Events {
  Print,
  Finish,
}
type TheTypesOfEvents = {
  [Events.Print]: ArticleLineNode | ArticleSectionNode;
  [Events.Finish]: void;
};
type ProfileRefreshProps = {
  user: User;
  searcher: MediaSearcher;
  store: DatabaseStore;
  tmdb_token: string;
  on_print?: (node: ArticleLineNode | ArticleSectionNode) => void;
  on_finish?: () => void;
};
export class ProfileRefresh extends BaseDomain<TheTypesOfEvents> {
  user: ProfileRefreshProps["user"];
  searcher: ProfileRefreshProps["searcher"];
  client: TMDBClient;
  store: ProfileRefreshProps["store"];
  //   on_print: ProfileRefreshProps["on_print"];

  constructor(props: ProfileRefreshProps) {
    super();

    const { user, tmdb_token, searcher, store, on_print, on_finish } = props;
    this.store = store;
    this.user = user;
    this.searcher = searcher;
    this.client = new TMDBClient({ token: tmdb_token });
    if (on_print) {
      this.on_print(on_print);
    }
    if (on_finish) {
      this.on_finish(on_finish);
    }
  }

  async run() {
    const page_size = 20;
    let page = 1;
    let no_more = false;
    const where: ModelQuery<typeof this.store.prisma.tv.findMany>["where"] = {};
    const count = await this.store.prisma.tv.count({
      where,
    });
    do {
      const list = await this.store.prisma.tv.findMany({
        where,
        include: {
          profile: true,
        },
        skip: (page - 1) * page_size,
        take: page_size,
      });
      no_more = list.length + (page - 1) * page_size >= count;
      page += 1;
      for (let i = 0; i < list.length; i += 1) {
        const tv = list[i];
        await this.refresh_tv_profile(tv);
      }
    } while (no_more === false);
    this.emit(Events.Finish);
  }

  async refresh_tv_profile(tv: TVRecord & { profile: TVProfileRecord }, extra?: { tmdb_id: number }) {
    const { name, original_name, tmdb_id } = tv.profile;
    const new_profile_res = await this.client.fetch_tv_profile(extra ? extra.tmdb_id : tmdb_id);
    if (new_profile_res.error) {
      return Result.Err(new_profile_res.error);
    }
    const new_profile = new_profile_res.data;
    const profile = await this.searcher.normalize_tv_profile(
      {
        tmdb_id: extra ? extra.tmdb_id : tmdb_id,
      },
      new_profile
    );
    // @ts-ignore
    const diff = check_tv_profile_need_refresh(tv.profile, profile);
    // console.log(tv.profile, profile);
    if (diff) {
      this.emit(
        Events.Print,
        new ArticleSectionNode({
          children: [
            new ArticleLineNode({
              children: [name || original_name, "需要更新"].map((text) => {
                return new ArticleTextNode({ text: text! });
              }),
            }),
            new ArticleLineNode({
              children: Object.keys(diff).map((k) => {
                // @ts-ignore
                const prev_text = tv.profile[k];
                // @ts-ignore
                const latest_text = diff[k];
                return new ArticleTextNode({ text: `${k} 从 ${prev_text} 更新为 ${latest_text}` });
              }),
            }),
          ],
        })
      );
      await this.store.prisma.tv_profile.update({
        where: {
          id: tv.profile.id,
        },
        data: diff,
      });
    }
    const { seasons: new_seasons } = new_profile;
    const seasons = await this.store.prisma.season.findMany({
      where: {
        tv_id: tv.id,
        user_id: this.user.id,
      },
      include: {
        profile: true,
      },
    });
    for (let j = 0; j < seasons.length; j += 1) {
      const season = seasons[j];
      const { season_number } = season;
      const s_n = season_to_num(season_number);
      await (async () => {
        const new_season_profile = new_seasons.find((s) => {
          return s.season_number === s_n;
        });
        if (!new_season_profile) {
          this.emit(
            Events.Print,
            new ArticleSectionNode({
              children: [
                new ArticleLineNode({
                  children: [season.profile.name, s_n.toString(), "没有找到新的季详情"].map((text) => {
                    return new ArticleTextNode({ text: text! });
                  }),
                }),
              ],
            })
          );
          return;
        }
        const profile = await this.searcher.normalize_season_profile(new_season_profile, season.profile);
        const diff = check_season_profile_need_refresh(season.profile, profile);
        // console.log(new_season_profile, season.profile, profile, diff);
        if (!diff) {
          this.emit(
            Events.Print,
            new ArticleSectionNode({
              children: [
                new ArticleLineNode({
                  children: [season.profile.name, "没有变化的内容"].map((text) => {
                    return new ArticleTextNode({ text: text! });
                  }),
                }),
              ],
            })
          );
          return;
        }
        const prefix = [name || original_name, season_number].join("-");
        this.emit(
          Events.Print,
          new ArticleSectionNode({
            children: [
              new ArticleLineNode({
                children: [prefix, "需要更新"].map((text) => {
                  return new ArticleTextNode({ text: text! });
                }),
              }),
              new ArticleLineNode({
                children: Object.keys(diff).map((k) => {
                  // @ts-ignore
                  const prev_text = tv.profile[k];
                  // @ts-ignore
                  const latest_text = diff[k];
                  return new ArticleTextNode({ text: `${k} 从 ${prev_text} 更新为 ${latest_text}` });
                }),
              }),
            ],
          })
        );
        await this.store.prisma.season_profile.update({
          where: {
            id: season.profile.id,
          },
          data: diff,
        });
      })();
    }
    return Result.Ok(null);
  }

  on_print(handler: Handler<TheTypesOfEvents[Events.Print]>) {
    return this.on(Events.Print, handler);
  }
  on_finish(handler: Handler<TheTypesOfEvents[Events.Finish]>) {
    return this.on(Events.Finish, handler);
  }
}
