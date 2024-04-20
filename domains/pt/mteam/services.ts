import { HttpClientCore } from "@/domains/http_client";
import { Result } from "@/types";

const _client = new HttpClientCore({
  hostname: "",
});
const client = {
  async get<T>(...args: Parameters<typeof _client.get>) {
    const r = await _client.get<{ code: string; message: string; data: T }>(...args);
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const { code, message, data } = r.data;
    if (Number(code) !== 0) {
      return Result.Err(message);
    }
    return Result.Ok(data);
  },
  async post<T>(...args: Parameters<typeof _client.post>) {
    const r = await _client.post<{ code: string; message: string; data: T }>(...args);
    if (r.error) {
      return Result.Err(r.error.message);
    }
    const { code, message, data } = r.data;
    if (Number(code) !== 0) {
      return Result.Err(message);
    }
    return Result.Ok(data);
  },
};

export function fetch_torrent_detail(id: number) {
  return client.post<{
    id: string;
    createdDate: string;
    lastModifiedDate: string;
    name: string;
    smallDescr: string;
    imdb: string;
    imdbRating: null;
    douban: string;
    doubanRating: string;
    dmmCode: null;
    author: null;
    category: string;
    source: string;
    medium: string;
    standard: string;
    videoCodec: string;
    audioCodec: string;
    team: string;
    processing: string;
    numfiles: string;
    size: string;
    tags: string;
    labels: string;
    msUp: number;
    anonymous: boolean;
    infoHash: null;
    status: {
      id: string;
      createdDate: string;
      lastModifiedDate: string;
      pickType: string;
      toppingLevel: number;
      toppingEndTime: string;
      discount: string;
      discountEndTime: string;
      timesCompleted: string;
      comments: string;
      lastAction: string;
      views: string;
      hits: string;
      support: number;
      oppose: number;
      status: string;
      seeders: string;
      leechers: string;
      banned: boolean;
      visible: boolean;
    };
    editedBy: null;
    editDate: null;
    collection: boolean;
    inRss: boolean;
    canVote: boolean;
    imageList: null;
    resetBox: null;
    originFileName: string;
    descr: string;
    nfo: null;
    mediainfo: string;
    cids: null;
    aids: null;
    showcaseList: unknown[];
    tagList: unknown[];
    thanked: boolean;
    rewarded: boolean;
  }>("https://kp.m-team.cc/api/torrent/detail", { id });
}
/** 获取资源种子下载链接 */
export function fetch_torrent_download_link(id: number) {
  return client.post<string>("https://kp.m-team.cc/api/torrent/genDlToken", { id });
}
