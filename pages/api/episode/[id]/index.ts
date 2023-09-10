/**
 * @file 获取指定剧集播放信息
 */
import type { NextApiRequest, NextApiResponse } from "next";

import { Member } from "@/domains/user/member";
import { Drive } from "@/domains/drive";
import { BaseApiResp, Result } from "@/types";
import { response_error_factory } from "@/utils/backend";
import { store } from "@/store";

export default async function handler(req: NextApiRequest, res: NextApiResponse<BaseApiResp<unknown>>) {
  const e = response_error_factory(res);
  const { authorization } = req.headers;
  const { id, type = "LD" } = req.query as Partial<{
    /** 剧集 id */
    id: string;
    /** 分辨率 */
    type: string;
  }>;
  if (!id) {
    return e(Result.Err("缺少影片 id"));
  }
  const t_res = await Member.New(authorization, store);
  if (t_res.error) {
    return e(t_res);
  }
  const { id: member_id, user } = t_res.data;
  // console.log("[Endpoint]episode/[id]", user_id, t_resp.data);
  const episode = await store.prisma.episode.findFirst({
    where: {
      id,
    },
    include: {
      profile: true,
      parsed_episodes: true,
      subtitles: true,
    },
  });
  if (episode === null) {
    return e(Result.Err("没有匹配的影片记录"));
  }
  const play_history = await store.prisma.play_history.findFirst({
    where: {
      episode_id: id,
      member_id,
    },
  });
  const { season_text, episode_text, profile, parsed_episodes } = episode;
  const source = (() => {
    if (parsed_episodes.length === 0) {
      return null;
    }
    if (play_history && play_history.file_id) {
      const matched = parsed_episodes.find((e) => {
        return e.file_id === play_history.file_id;
      });
      if (matched) {
        return matched;
      }
    }
    const matched = parsed_episodes.find((parsed_episode) => {
      const { file_name, parent_paths } = parsed_episode;
      const paths = [parent_paths, file_name].join("/");
      if (paths.includes("4K") || paths.includes("超清")) {
        return true;
      }
      return false;
    });
    if (matched) {
      return matched;
    }
    return parsed_episodes[0];
  })();
  if (source === null) {
    return e(Result.Err("该影片没有可播放的视频源"));
  }
  const { file_id, drive_id } = source;
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return e(drive_res);
  }
  const drive = drive_res.data;
  const client = drive.client;
  const play_info_res = await client.fetch_video_preview_info(file_id);
  if (play_info_res.error) {
    return e(play_info_res);
  }
  const info = play_info_res.data;
  if (info.sources.length === 0) {
    return e("该影片暂时不可播放，请等待一段时间后重试");
  }
  const file_profile_res = await client.fetch_file(file_id);
  if (file_profile_res.error) {
    return e(file_profile_res);
  }
  const { thumbnail } = file_profile_res.data;
  type MediaFile = Partial<{
    id: string;
    name: string;
    overview: string;
    season_number: string;
    episode_number: string;
    file_id: string;
    thumbnail: string;
    url: string;
    type: string;
    width: number;
    height: number;
  }>;
  const recommend_resolution = (() => {
    // 只有一种分辨率，直接返回该分辨率视频
    if (info.sources.length === 1) {
      return info.sources[0];
    }
    let matched_resolution = info.sources.find((r) => {
      return r.type === type;
    });
    if (matched_resolution) {
      return matched_resolution;
    }
    matched_resolution = info.sources.find((r) => {
      return !r.url.includes("pdsapi");
    });
    if (matched_resolution) {
      return matched_resolution;
    }
    return info.sources[0];
  })();
  if (recommend_resolution.url.includes("x-oss-additional-headers=referer")) {
    return e(Result.Err("视频文件无法播放，请修改 refresh_token"));
  }
  // if (recommend.url.includes("https://pdsapi")) {
  //   await (async () => {
  //     const request = axios.create({
  //       maxRedirects: 0,
  //       transformResponse: [],
  //     });
  //     try {
  //       await request.get(recommend.url);
  //     } catch (err) {
  //       const { response } = err as { response: { status: number; data: string } };
  //       if (response.status !== 302) {
  //         return;
  //       }
  //       const u = response.data.match(/href="([^"]{1,})"/);
  //       if (!u) {
  //         return;
  //       }
  //       recommend.url = decodeURIComponent(u[1].replace(/amp;/g, ""));
  //       // recommend.url = u[1].replace(/amp;/g, "");
  //     }
  //   })();
  // }
  // console.log("set recoommend url", recommend.url);
  // recommend.url = decodeURIComponent(
  //   "https://ccp-bj29-video-preview.oss-enet.aliyuncs.com/lt/000417124791AFC1E1E8251DA76C17EB3FC9BA3F_459059310__sha1_bj29_6ea35024/HD/media.m3u8?di=bj29&dr=528581012&f=64afa10c905f191f641048e6ad35a2589869987a&security-token=CAIS%2BgF1q6Ft5B2yfSjIr5fdGcPfmrRtwLaZeBHwljIANMdhtYfS1jz2IHFPeHJrBeAYt%2FoxmW1X5vwSlq5rR4QAXlDfNV%2FLA3WpqFHPWZHInuDox55m4cTXNAr%2BIhr%2F29CoEIedZdjBe%2FCrRknZnytou9XTfimjWFrXWv%2Fgy%2BQQDLItUxK%2FcCBNCfpPOwJms7V6D3bKMuu3OROY6Qi5TmgQ41Uh1jgjtPzkkpfFtkGF1GeXkLFF%2B97DRbG%2FdNRpMZtFVNO44fd7bKKp0lQLukMWr%2Fwq3PIdp2ma447NWQlLnzyCMvvJ9OVDFyN0aKEnH7J%2Bq%2FzxhTPrMnpkSlacGoABJZZD3HTGRs6bHAJS5PumFtTqRT3C6Wp%2Ba8UpC7HEjcFdkUTD3kh8sxm1oNOSAw85cc3%2Fyz0lQ2ahhlbhmkWAGkYNbk9LdjZPJXkBAYGWVE5honVROdeOS5km0AG%2BYJmSH5lzxKsN5jnQSrYuBZmsxj%2FaxsvUx0hai6a%2Fh3Dqd8w%3D&u=4494cd0a0f4f48bf9075f32174a7948b&x-oss-access-key-id=STS.NThRykwkLwtrz7Ar2U8HMZBy4&x-oss-additional-headers=referer&x-oss-expires=1689449146&x-oss-process=hls%2Fsign%2Cparams_ZGksZHIsZix1%2Cheaders_cmVmZXJlcg%3D%3D&x-oss-signature=IAS3nnBl9QkrtdjsmqbioK%2BtoRDN6p%2BmIo06ENB%2FKFQ%3D&x-oss-signature-version=OSS2"
  // );
  const { name, overview } = profile;
  const { url, type: t, width, height } = recommend_resolution;
  const result: MediaFile & { other: MediaFile[]; subtitles: { type: number; lang: string; url: string }[] } = {
    id,
    name: name || episode_text,
    overview: overview || "",
    season_number: season_text,
    episode_number: episode_text,
    file_id,
    url,
    thumbnail,
    type: t,
    width,
    height,
    // 其他分辨率的视频源
    other: info.sources.map((res) => {
      const { url, type, width, height } = res;
      return {
        id: file_id,
        file_id,
        url,
        thumbnail,
        type,
        width,
        height,
      };
    }),
    subtitles: (() => {
      const { subtitles } = info;
      return subtitles
        .map((subtitle) => {
          const { id, name, url, language } = subtitle;
          return {
            type: 1,
            id,
            name,
            url,
            lang: language,
          };
        })
        .concat(
          episode.subtitles.map((subtitle) => {
            const { id, file_id, name, language } = subtitle;
            return {
              type: 2,
              id,
              name,
              url: file_id,
              lang: language,
            };
          }) as {
            id: string;
            type: 1 | 2;
            url: string;
            name: string;
            lang: "chi" | "eng" | "jpn";
          }[]
        );
    })(),
  };
  res.status(200).json({ code: 0, msg: "", data: result });
}
