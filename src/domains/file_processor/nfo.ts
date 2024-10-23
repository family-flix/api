import { parseStringPromise } from "xml2js";

import { BaseDomain } from "@/domains/base";
import { ArticleLineNode } from "@/domains/article/index";
import { DriveClient } from "@/domains/clients/types";
import { Result, resultify } from "@/domains/result/index";
import { parse_filename_for_video } from "@/utils/parse_filename_for_video";
import { MutableRecordV2 } from "@/types";

enum Events {
  AddMovie,
  Print,
}
type TheTypesOfEvents = {
  [Events.AddMovie]: { name: string; original_name: string | null };
  [Events.Print]: ArticleLineNode;
};
export enum MediaProfileTypesFromNFOFile {
  Series,
  Season,
  Episode,
  Movie,
}
type MediaProfileFromNFOFile = MutableRecordV2<{
  [MediaProfileTypesFromNFOFile.Series]: {
    name: string;
    original_name: string | null;
    overview: string | null;
    poster_path: string | null;
    backdrop_path: string | null;
    air_date: string | null;
    tmdb_id: string | null;
    imdb_id: string | null;
    tvdb_id: string | null;
  };
  [MediaProfileTypesFromNFOFile.Season]: {
    name: string;
    original_name: string | null;
    overview: string | null;
    poster_path: string | null;
    air_date: string | null;
    rating: number | null;
    order: number | null;
  };
  [MediaProfileTypesFromNFOFile.Episode]: {
    name: string;
    overview: string | null;
    still_path: string | null;
    air_date: string | null;
    order: number | null;
    runtime: number | null;
    season: number | null;
    original_filename: string | null;
    imdbid: string | null;
    tvdbid: string | null;
  };
  [MediaProfileTypesFromNFOFile.Movie]: {
    name: string;
    original_name: string | null;
    overview: string | null;
    poster_path: string | null;
    backdrop_path: string | null;
    air_date: string | null;
    runtime: number | null;
    original_filename: string | null;
    tmdb_id: string | null;
    imdb_id: string | null;
    tvdb_id: string | null;
  };
}>;
type TVShowProfilePayload = {
  tvshow: {
    plot: string[];
    outline: string[];
    lockdata: string[];
    dateadded: string[];
    title: string[];
    originaltitle: string[];
    rating: string[];
    year: string[];
    mpaa: string[];
    imdb_id: string[];
    tvdbid: string[];
    tmdbid: string[];
    uniqueid: {
      _: string;
      $: {
        type: string;
      };
    }[];
    premiered: string[];
    releasedate: string[];
    runtime: string[];
    genre: string[];
    country: string[];
    studio: string[];
    tag: string[];
    art: {
      poster: string[];
      fanart: string[];
    }[];
    actor: {
      name: string[];
      role: string[];
      type: string[];
      sortorder: string[];
      thumb: string[];
    }[];
    id: string[];
    episodeguide: {
      url: {
        _: string;
        $: {
          cache: string;
        };
      }[];
    }[];
    season: string[];
    episode: string[];
    status: string[];
  };
};
type SeasonProfilePayload = {
  season: {
    plot: string[];
    outline: string[];
    lockdata: string[];
    dateadded: string[];
    title: string[];
    writer: string[];
    credits: string[];
    year: string[];
    sorttitle: string[];
    premiered: string[];
    releasedate: string[];
    art: {
      poster: string[];
    }[];
    actor: {
      name: string[];
      role: string[];
      type: string[];
      thumb: string[];
    }[];
    seasonnumber: string[];
  };
};
type EpisodeProfilePayload = {
  episodedetails: {
    plot: string[];
    outline: string[];
    lockdata: string[];
    dateadded: string[];
    title: string[];
    director: string[];
    rating: string[];
    year: string[];
    imdbid: string[];
    tvdbid: string[];
    runtime: string[];
    genre: string[];
    uniqueid: {
      _: string;
      $: {
        type: string;
      };
    }[];
    episode: string[];
    season: string[];
    aired: string[];
    fileinfo: {
      streamdetails: {
        video: {
          codec: string[];
          micodec: string[];
          bitrate: string[];
          width: string[];
          height: string[];
          aspect: string[];
          aspectratio: string[];
          framerate: string[];
          scantype: string[];
          default: string[];
          forced: string[];
          duration: string[];
          durationinseconds: string[];
        }[];
        audio: {
          codec: string[];
          micodec: string[];
          bitrate: string[];
          language: string[];
          scantype: string[];
          channels: string[];
          samplingrate: string[];
          default: string[];
          forced: string[];
        }[];
        subtitle: {
          codec: string[];
          micodec: string[];
          language: string[];
          scantype: string[];
          default: string[];
          forced: string[];
        }[];
      }[];
    }[];
    original_filename: string | null;
  };
};

type MovieProfilePayload = {
  movie: {
    title: string;
    originaltitle: string;
    sorttitle: string;
    epbookmark: string;
    year: number;
    ratings: {
      rating: {
        default: boolean;
        max: number;
        name: string;
        value: number;
        votes: number;
      };
    };
    userrating: number;
    top250: number;
    set: string;
    plot: string;
    outline: string;
    tagline: string;
    runtime: number;
    thumb: {
      aspect: "poster" | "landscape";
      url: string;
    };
    fanart: {
      thumb: string;
    };
    mpaa: string;
    certification: string;
    id: string;
    tmdbid: number;
    uniqueid: {
      default: boolean;
      type: string;
      value: string;
    };
    country: string;
    status: string;
    code: string;
    premiered: string;
    watched: boolean;
    playcount: number;
    lastplayed: string;
    genre: string[];
    studio: string;
    credits: { tmdbid: string };
    director: { tmdbid: string };
    actor: {
      name: string;
      role: string;
      thumb: string;
      profile: string;
      tmdbid: number;
    }[];
    trailer: string;
    languages: string[];
    dateadded: string;
    fileinfo: {
      streamdetails: {
        video: {
          codec: string;
          aspect: string;
          width: number;
          height: number;
          durationinseconds: number;
          stereomode: string;
        };
        audio: {
          codec: string;
          language: string;
          channels: number;
        }[];
      };
    };
    source: string;
    edition: string;
    original_filename: string;
    user_note: string;
  };
};
type NfoFileProcessorProps = {
  file_id: string;
  client: DriveClient;
};
export class NfoFileProcessor extends BaseDomain<TheTypesOfEvents> {
  file_id: string;

  client: DriveClient;

  constructor(props: Partial<{ _name: string }> & NfoFileProcessorProps) {
    super(props);

    const { file_id, client } = props;

    this.file_id = file_id;
    this.client = client;
  }

  async fetch_content() {
    // console.log("fetch content", this.file_id);
    const r = await this.client.fetch_content(this.file_id);
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const content = r.data.content;
    return Result.Ok(content);
  }
  async parse(name: string, content: string): Promise<Result<MediaProfileFromNFOFile>> {
    if (!content) {
      return Result.Err(`'${name}' 内容为空`);
    }
    const r = await resultify(parseStringPromise)(content);
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const data = r.data;
    if (this.is_series(name) && data.tvshow) {
      // 电视剧详情
      const {
        title,
        originaltitle,
        plot,
        outline,
        rating,
        year,
        uniqueid = [],
        genre,
        country,
        releasedate,
        tmdbid,
        tvdbid,
        imdb_id: imdbid,
      } = data.tvshow as TVShowProfilePayload["tvshow"];
      const tmdb_id = (() => {
        if (tmdbid?.[0]) {
          return tmdbid[0];
        }
        const matched = uniqueid.find((t) => t.$.type === "Tmdb");
        if (!matched) {
          return null;
        }
        return matched["_"];
      })();
      const imdb_id = (() => {
        if (imdbid?.[0]) {
          return imdbid[0];
        }
        const matched = uniqueid.find((t) => t.$.type === "Imdb");
        if (!matched) {
          return null;
        }
        return matched["_"];
      })();
      const tvdb_id = (() => {
        if (tvdbid?.[0]) {
          return tvdbid[0];
        }
        const matched = uniqueid.find((t) => t.$.type === "Tvdb");
        if (!matched) {
          return null;
        }
        return matched["_"];
      })();
      return Result.Ok({
        type: MediaProfileTypesFromNFOFile.Series,
        name: title[0],
        original_name: originaltitle?.[0],
        overview: plot?.[0] || outline?.[0],
        poster_path: null,
        backdrop_path: null,
        air_date: releasedate?.[0],
        vote_average: rating?.[0],
        genres: [],
        origin_country: country ? [country[0]] : [],
        order: null,
        tmdb_id,
        imdb_id,
        tvdb_id,
      });
    }
    if (this.is_season(name) && data.season) {
      const { title, plot, outline, seasonnumber, year, releasedate } = data.season as SeasonProfilePayload["season"];
      return Result.Ok({
        type: MediaProfileTypesFromNFOFile.Season,
        name: title[0],
        original_name: null,
        overview: plot?.[0] || outline?.[0],
        poster_path: null,
        backdrop_path: null,
        air_date: releasedate ? releasedate[0] : null,
        rating: null,
        order: seasonnumber ? Number(seasonnumber[0]) : null,
      });
    }
    if (this.is_episode(name) && data.episodedetails) {
      const { title, plot, outline, aired, episode, runtime, season, imdbid, tvdbid, original_filename } =
        data.episodedetails as EpisodeProfilePayload["episodedetails"];
      return Result.Ok({
        type: MediaProfileTypesFromNFOFile.Episode,
        name: title?.[0],
        overview: plot?.[0] || outline?.[0] || null,
        air_date: aired[0] || null,
        still_path: null,
        order: episode ? Number(episode[0]) : null,
        season: season ? Number(season[0]) : null,
        runtime: runtime ? Number(runtime) : null,
        original_filename,
        imdbid: imdbid ? imdbid[0] : null,
        tvdbid: tvdbid ? tvdbid[0] : null,
      });
    }
    // if (this.is_movie(name)) {
    //   const { title, originaltitle, plot, outline, runtime, tmdbid, premiered, original_filename } =
    //     data.episodedetails as MovieProfilePayload["movie"];
    //   return Result.Ok({
    //     type: MediaProfileTypesFromNFOFile.Movie,
    //     name: title?.[0],
    //     original_name: originaltitle,
    //     overview: plot?.[0] || outline?.[0] || null,
    //     poster_path: null,
    //     backdrop_path: null,
    //     air_date: premiered || null,
    //     runtime: runtime ? Number(runtime) : null,
    //     original_filename,
    //     tmdb_id: tmdbid || null,
    //     imdbid: imdbid ? imdbid[0] : null,
    //     tvdbid: tvdbid ? tvdbid[0] : null,
    //   });
    // }
    return Result.Err("不是预期的详情文件");
  }
  is_series(name: string) {
    if (name === "tvshow.nfo") {
      return true;
    }
    return false;
  }
  is_season(name: string) {
    if (name.match(/^[sS]eason[0-9]{0,}/)) {
      return true;
    }
    if (name.match(/^[sS][0-9]{1,}/)) {
      return true;
    }
    return false;
  }
  is_episode(name: string) {
    const { episode } = parse_filename_for_video(name);
    if (episode) {
      return true;
    }
    return false;
  }
  is_movie(name: string) {
    if (name.match(/movie\.nfo/)) {
      return true;
    }
    const { episode } = parse_filename_for_video(name);
    if (!episode) {
      return true;
    }
    return false;
  }
}
