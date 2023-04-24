// import jwt from "jsonwebtoken";
// import jwt_decode from "jwt-decode";
import { NextApiResponse } from "next";

import { Result, resultify } from "@/types";
// import { store } from "@/store/sqlite";
// import {
//   RecordCommonPart,
//   SeasonRecord,
//   TmpEpisodeRecord,
//   TVRecord,
// } from "@/store/types";
import { bytes_to_size, find_resolution_from_paths } from ".";
import { decode_token } from "@/domains/user/jwt";

/**
 * 解析 token
 */
export async function parse_token({
  token,
  secret,
}: {
  token?: string;
  secret: string;
}) {
  if (!token) {
    return Result.Err("Missing auth token");
  }
  const user_res = await resultify(decode_token)({ token, secret });
  if (user_res.error) {
    return Result.Err(user_res.error);
  }
  const user = user_res.data;
  if (user === null) {
    return Result.Err("invalid token");
  }
  if (user.id) {
    return Result.Ok({
      id: user.id,
    });
  }
  return Result.Err("invalid token");
}

/**
 * 生成 token
 * @param payload
 * @returns
 */
// export function generate_token(payload: Record<string, number | string>) {
//   const secret = "test";
//   const token = jwt.sign(payload, secret);
//   return Result.Ok(token);
// }

export function response_error_factory(res: NextApiResponse) {
  return (result: Result<unknown> | string | Error) => {
    return res.status(200).json(
      (() => {
        if (typeof result === "string") {
          return {
            code: 11000,
            msg: result,
            data: null,
          };
        }
        if (result instanceof Error) {
          return {
            code: 11000,
            msg: result.message,
            data: null,
          };
        }
        return {
          code: 11000,
          msg: result.error === null ? "Unknown error?" : result.error.message,
          data: null,
        };
      })()
    );
  };
}

/**
 * 一个表既可以用 user_id 也可以用 member_id 时，可以使用这个方法
 * @param token
 * @returns
 */
export function user_id_or_member_id(token: {
  id: string;
  member_id: string;
  is_member: number;
}) {
  const { id, member_id, is_member } = token;
  return {
    user_id: is_member ? undefined : id,
    member_id: is_member ? member_id : undefined,
  };
}

export async function exchange_user_id(token: {
  id: string;
  member_id: string;
  is_member: number;
}) {
  const { id, member_id, is_member } = token;
  if (!is_member) {
    return Result.Ok({ id });
  }
  // const r = await store.operation.get<{ id: string }>(
  //   `SELECT * FROM users WHERE id = (SELECT owner_id FROM member WHERE id = '${member_id}')`
  // );
  // if (r.error) {
  //   return r;
  // }
  // if (!r.data) {
  //   return Result.Err("该 token 不存在");
  // }
  // return Result.Ok({ id: r.data.id });
  return Result.Ok(null);
}

// export function analysis_tv(
//   tv: Pick<TVRecord, "name" | "original_name"> & {
//     overview?: string;
//     poster_path?: string;
//     backdrop_path?: string;
//   } & RecordCommonPart,
//   seasons: (SeasonRecord & RecordCommonPart)[],
//   episodes: (Omit<TmpEpisodeRecord, "season_id"> & {
//     season: string;
//   } & RecordCommonPart)[]
// ) {
//   const total_size = episodes.reduce((e, c) => e + c.size, 0);
//   const seasons_map: Record<
//     string,
//     {
//       id: string;
//       season: string;
//       folders: Record<
//         string,
//         {
//           folder_ids: string;
//           resolution: null | string;
//           episodes: {}[];
//         }
//       >;
//     }
//   > = {};
//   let prev_first_folder_path: null | string = null;
//   let prev_first_folder_id: null | string = null;
//   let in_same_root_folder = true;
//   for (let i = 0; i < episodes.length; i += 1) {
//     const episode = episodes[i];
//     const {
//       id,
//       // season_id,
//       season,
//       episode: e,
//       file_id,
//       file_name,
//       parent_paths,
//       parent_ids,
//     } = episode;
//     // const matched_season = seasons.find((s) => s.id === season_id);
//     // if (!matched_season) {
//     //   throw new Error("Unexpected unmatched season id");
//     // }
//     // const { season } = matched_season;
//     seasons_map[season] = seasons_map[season] || {
//       // id: season_id,
//       season,
//       folders: {},
//     };
//     const file_path = `${parent_paths}/${file_name}`;
//     const first_folder_path = file_path.split("/").shift()!;
//     const first_folder_id = parent_ids.split("/").shift()!;
//     if (
//       prev_first_folder_path !== null &&
//       prev_first_folder_path !== first_folder_path
//     ) {
//       in_same_root_folder = false;
//     }
//     if (prev_first_folder_path === null) {
//       prev_first_folder_id = first_folder_id;
//       prev_first_folder_path = first_folder_path;
//     }
//     const resolution = find_resolution_from_paths(file_path);
//     seasons_map[season].folders[parent_paths] = seasons_map[season].folders[
//       parent_paths
//     ] || {
//       folder_ids: parent_ids,
//       resolution,
//       episodes: [],
//     };
//     seasons_map[season].folders[parent_paths].episodes.push({
//       id,
//       file_id,
//       file_path,
//       episode: e,
//     });
//   }
//   return {
//     name: tv.name,
//     original_name: tv.original_name,
//     poster_path: tv.poster_path,
//     backdrop_path: tv.backdrop_path,
//     folder_id: prev_first_folder_id,
//     in_same_root_folder,
//     size_count: bytes_to_size(total_size),
//     seasons: Object.keys(seasons_map)
//       .map((s) => {
//         const { id, season, folders } = seasons_map[s];
//         return {
//           id,
//           season,
//           folders: Object.keys(folders).map((e) => {
//             const { resolution, folder_ids, episodes } = folders[e];
//             return {
//               folder: e,
//               folder_ids,
//               resolution,
//               episodes,
//             };
//           }),
//         };
//       })
//       .sort((prev, cur) => {
//         return prev.season > cur.season ? 1 : -1;
//       }),
//   };
// }

export function parse_argv(args: string[]) {
  const options: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];
    if (key.startsWith("-")) {
      options[key.slice(1)] = value;
    }
  }
  return options;
}
