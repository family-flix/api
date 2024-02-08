import { Result, Unpacked } from "@/types";
import { bytes_to_size } from "@/utils";
import { PrismaClient } from "@prisma/client";

import { ModelKeys, Statistics } from "./types";
import { add_factory, delete_factory, update_factory, first_factory, many_factory, pagination_factory } from "./utils";

export class DatabaseStore {
  prisma: PrismaClient;
  table_names: ModelKeys[] = [];
  /** 云盘 */
  // (add_factory<PrismaClient\["[^"]{1,}"\]>)\(prisma\.[^)]{1,}\),
  add_drive: ReturnType<typeof add_factory<PrismaClient["drive"]>>;
  // (update_factory<PrismaClient\["[^"]{1,}"\]>)\(prisma\.[^)]{1,}\),
  update_drive: ReturnType<typeof update_factory<PrismaClient["drive"]>>;
  // (delete_factory<PrismaClient\["[^"]{1,}"\]>)\(prisma\.[^)]{1,}\),
  delete_drive: ReturnType<typeof delete_factory<PrismaClient["drive"]>>;
  // (first_factory<PrismaClient\["[^"]{1,}"\]>)\(prisma\.[^)]{1,}\),
  find_drive: ReturnType<typeof first_factory<PrismaClient["drive"]>>;
  // (many_factory<PrismaClient\["[^"]{1,}"\]>)\(prisma\.[^)]{1,}\),
  find_drive_list: ReturnType<typeof many_factory<PrismaClient["drive"]>>;
  // (pagination_factory<PrismaClient\["[^"]{1,}"\]>)\(prisma\.[^)]{1,}\),
  find_drive_list_with_pagination: ReturnType<typeof pagination_factory<PrismaClient["drive"]>>;
  /** 云盘凭证 */
  add_aliyun_drive_token: ReturnType<typeof add_factory<PrismaClient["drive_token"]>>;
  update_aliyun_drive_token: ReturnType<typeof update_factory<PrismaClient["drive_token"]>>;
  find_aliyun_drive_token: ReturnType<typeof first_factory<PrismaClient["drive_token"]>>;
  find_aliyun_drive_token_list: ReturnType<typeof many_factory<PrismaClient["drive_token"]>>;
  /** 电视剧详情 */
  add_tv_profile: ReturnType<typeof add_factory<PrismaClient["tv_profile"]>>;
  delete_tv_profile: ReturnType<typeof delete_factory<PrismaClient["tv_profile"]>>;
  update_tv_profile: ReturnType<typeof update_factory<PrismaClient["tv_profile"]>>;
  find_tv_profile: ReturnType<typeof first_factory<PrismaClient["tv_profile"]>>;
  find_tv_profiles: ReturnType<typeof many_factory<PrismaClient["tv_profile"]>>;
  find_tv_profiles_with_pagination: ReturnType<typeof pagination_factory<PrismaClient["tv_profile"]>>;
  /** 电视剧季详情 */
  add_season_profile: ReturnType<typeof add_factory<PrismaClient["season_profile"]>>;
  update_season_profile: ReturnType<typeof update_factory<PrismaClient["season_profile"]>>;
  find_season_profile: ReturnType<typeof first_factory<PrismaClient["season_profile"]>>;
  find_season_profile_list: ReturnType<typeof many_factory<PrismaClient["season_profile"]>>;
  find_season_profile_list_with_pagination: ReturnType<typeof pagination_factory<PrismaClient["season_profile"]>>;
  /** 电视剧集详情 */
  add_episode_profile: ReturnType<typeof add_factory<PrismaClient["episode_profile"]>>;
  update_episode_profile: ReturnType<typeof update_factory<PrismaClient["episode_profile"]>>;
  find_episode_profile: ReturnType<typeof first_factory<PrismaClient["episode_profile"]>>;
  find_episode_profile_list: ReturnType<typeof many_factory<PrismaClient["episode_profile"]>>;
  find_episode_profile_list_with_pagination: ReturnType<typeof pagination_factory<PrismaClient["episode_profile"]>>;
  /** 电影详情 */
  add_movie_profile: ReturnType<typeof add_factory<PrismaClient["movie_profile"]>>;
  update_movie_profile: ReturnType<typeof update_factory<PrismaClient["movie_profile"]>>;
  find_movie_profile: ReturnType<typeof first_factory<PrismaClient["movie_profile"]>>;
  find_movie_profile_list: ReturnType<typeof many_factory<PrismaClient["movie_profile"]>>;
  find_movie_profile_list_with_pagination: ReturnType<typeof pagination_factory<PrismaClient["movie_profile"]>>;
  /** 电视剧 */
  add_tv: ReturnType<typeof add_factory<PrismaClient["tv"]>>;
  update_tv: ReturnType<typeof update_factory<PrismaClient["tv"]>>;
  delete_tv: ReturnType<typeof delete_factory<PrismaClient["tv"]>>;
  find_tv: ReturnType<typeof first_factory<PrismaClient["tv"]>>;
  find_tvs: ReturnType<typeof many_factory<PrismaClient["tv"]>>;
  find_tv_with_pagination: ReturnType<typeof pagination_factory<PrismaClient["tv"]>>;
  /** 电视剧季 */
  add_season: ReturnType<typeof add_factory<PrismaClient["season"]>>;
  update_season: ReturnType<typeof update_factory<PrismaClient["season"]>>;
  delete_season: ReturnType<typeof delete_factory<PrismaClient["season"]>>;
  find_season: ReturnType<typeof first_factory<PrismaClient["season"]>>;
  find_seasons: ReturnType<typeof many_factory<PrismaClient["season"]>>;
  find_seasons_with_pagination: ReturnType<typeof pagination_factory<PrismaClient["season"]>>;
  /** 电视剧集 */
  add_episode: ReturnType<typeof add_factory<PrismaClient["episode"]>>;
  update_episode: ReturnType<typeof update_factory<PrismaClient["episode"]>>;
  delete_episode: ReturnType<typeof delete_factory<PrismaClient["episode"]>>;
  find_episode: ReturnType<typeof first_factory<PrismaClient["episode"]>>;
  find_episodes: ReturnType<typeof many_factory<PrismaClient["episode"]>>;
  find_episodes_with_pagination: ReturnType<typeof pagination_factory<PrismaClient["episode"]>>;
  /** 电影 */
  add_movie: ReturnType<typeof add_factory<PrismaClient["movie"]>>;
  update_movie: ReturnType<typeof update_factory<PrismaClient["movie"]>>;
  find_movie: ReturnType<typeof first_factory<PrismaClient["movie"]>>;
  find_movies: ReturnType<typeof many_factory<PrismaClient["movie"]>>;
  /** 从云盘文件解析出的电视剧信息 */
  add_parsed_tv: ReturnType<typeof add_factory<PrismaClient["parsed_tv"]>>;
  update_parsed_tv: ReturnType<typeof update_factory<PrismaClient["parsed_tv"]>>;
  delete_parsed_tv: ReturnType<typeof delete_factory<PrismaClient["parsed_tv"]>>;
  find_parsed_tv: ReturnType<typeof first_factory<PrismaClient["parsed_tv"]>>;
  find_parsed_tv_list: ReturnType<typeof many_factory<PrismaClient["parsed_tv"]>>;
  find_parsed_tv_list_with_pagination: ReturnType<typeof pagination_factory<PrismaClient["parsed_tv"]>>;
  /** 从云盘文件解析出的电视剧季信息 */
  add_parsed_season: ReturnType<typeof add_factory<PrismaClient["parsed_season"]>>;
  update_parsed_season: ReturnType<typeof update_factory<PrismaClient["parsed_season"]>>;
  delete_parsed_season: ReturnType<typeof delete_factory<PrismaClient["parsed_season"]>>;
  find_parsed_season: ReturnType<typeof first_factory<PrismaClient["parsed_season"]>>;
  find_parsed_season_list: ReturnType<typeof many_factory<PrismaClient["parsed_season"]>>;
  find_parsed_season_list_with_pagination: ReturnType<typeof pagination_factory<PrismaClient["parsed_season"]>>;
  /** 从云盘文件解析出的电视剧集信息 */
  add_parsed_episode: ReturnType<typeof add_factory<PrismaClient["parsed_episode"]>>;
  update_parsed_episode: ReturnType<typeof update_factory<PrismaClient["parsed_episode"]>>;
  delete_parsed_episode: ReturnType<typeof delete_factory<PrismaClient["parsed_episode"]>>;
  find_parsed_episode: ReturnType<typeof first_factory<PrismaClient["parsed_episode"]>>;
  find_parsed_episode_list: ReturnType<typeof many_factory<PrismaClient["parsed_episode"]>>;
  find_parsed_episode_list_with_pagination: ReturnType<typeof pagination_factory<PrismaClient["parsed_episode"]>>;
  /** 从云盘文件解析出的电视剧集信息 */
  add_parsed_movie: ReturnType<typeof add_factory<PrismaClient["parsed_movie"]>>;
  update_parsed_movie: ReturnType<typeof update_factory<PrismaClient["parsed_movie"]>>;
  delete_parsed_movie: ReturnType<typeof delete_factory<PrismaClient["parsed_movie"]>>;
  find_parsed_movie: ReturnType<typeof first_factory<PrismaClient["parsed_movie"]>>;
  find_parsed_movie_list: ReturnType<typeof many_factory<PrismaClient["parsed_movie"]>>;
  find_parsed_movie_list_with_pagination: ReturnType<typeof pagination_factory<PrismaClient["parsed_movie"]>>;
  /** 播放记录 */
  add_history: ReturnType<typeof add_factory<PrismaClient["play_history"]>>;
  update_history: ReturnType<typeof update_factory<PrismaClient["play_history"]>>;
  delete_history: ReturnType<typeof delete_factory<PrismaClient["play_history"]>>;
  find_history: ReturnType<typeof first_factory<PrismaClient["play_history"]>>;
  find_histories: ReturnType<typeof many_factory<PrismaClient["play_history"]>>;
  find_history_with_pagination: ReturnType<typeof pagination_factory<PrismaClient["play_history"]>>;
  /** 成员凭证 */
  add_member_link: ReturnType<typeof add_factory<PrismaClient["member_token"]>>;
  update_member_link: ReturnType<typeof update_factory<PrismaClient["member_token"]>>;
  delete_member_link: ReturnType<typeof delete_factory<PrismaClient["member_token"]>>;
  find_member_link: ReturnType<typeof first_factory<PrismaClient["member_token"]>>;
  find_member_links: ReturnType<typeof many_factory<PrismaClient["member_token"]>>;
  find_member_link_with_pagination: ReturnType<typeof pagination_factory<PrismaClient["member_token"]>>;
  /** 成员 */
  add_member: ReturnType<typeof add_factory<PrismaClient["member"]>>;
  update_member: ReturnType<typeof update_factory<PrismaClient["member"]>>;
  delete_member: ReturnType<typeof delete_factory<PrismaClient["member"]>>;
  find_member: ReturnType<typeof first_factory<PrismaClient["member"]>>;
  find_members: ReturnType<typeof many_factory<PrismaClient["member"]>>;
  find_member_with_pagination: ReturnType<typeof pagination_factory<PrismaClient["member"]>>;
  /** 索引任务 */
  add_task: ReturnType<typeof add_factory<PrismaClient["async_task"]>>;
  update_task: ReturnType<typeof update_factory<PrismaClient["async_task"]>>;
  find_task: ReturnType<typeof first_factory<PrismaClient["async_task"]>>;
  find_task_list: ReturnType<typeof many_factory<PrismaClient["async_task"]>>;
  delete_task: ReturnType<typeof delete_factory<PrismaClient["async_task"]>>;
  find_task_list_with_pagination: ReturnType<typeof pagination_factory<PrismaClient["async_task"]>>;
  /** log */
  add_output_line: ReturnType<typeof add_factory<PrismaClient["output_line"]>>;
  update_output_line: ReturnType<typeof update_factory<PrismaClient["output_line"]>>;
  find_output_line: ReturnType<typeof first_factory<PrismaClient["output_line"]>>;
  find_output_line_list: ReturnType<typeof many_factory<PrismaClient["output_line"]>>;
  delete_output_line: ReturnType<typeof delete_factory<PrismaClient["output_line"]>>;
  find_output_line_list_with_pagination: ReturnType<typeof pagination_factory<PrismaClient["output_line"]>>;
  /** 云盘签到 */
  add_check_in: ReturnType<typeof add_factory<PrismaClient["drive_check_in"]>>;
  /** 分享资源 */
  add_shared_files: ReturnType<typeof add_factory<PrismaClient["shared_file"]>>;
  add_shared_files_safely: ReturnType<typeof add_factory<PrismaClient["shared_file"]>>;
  update_shared_files: ReturnType<typeof update_factory<PrismaClient["shared_file"]>>;
  delete_shared_files: ReturnType<typeof delete_factory<PrismaClient["shared_file"]>>;
  find_shared_files: ReturnType<typeof first_factory<PrismaClient["shared_file"]>>;
  find_shared_files_list: ReturnType<typeof many_factory<PrismaClient["shared_file"]>>;
  find_shared_files_list_with_pagination: ReturnType<typeof pagination_factory<PrismaClient["shared_file"]>>;
  /** 分享资源同步任务 */
  add_sync_task: ReturnType<typeof add_factory<PrismaClient["bind_for_parsed_tv"]>>;
  update_sync_task: ReturnType<typeof update_factory<PrismaClient["bind_for_parsed_tv"]>>;
  delete_sync_task: ReturnType<typeof delete_factory<PrismaClient["bind_for_parsed_tv"]>>;
  find_sync_task: ReturnType<typeof first_factory<PrismaClient["bind_for_parsed_tv"]>>;
  find_sync_task_list: ReturnType<typeof many_factory<PrismaClient["bind_for_parsed_tv"]>>;
  find_sync_task_list_with_pagination: ReturnType<typeof pagination_factory<PrismaClient["bind_for_parsed_tv"]>>;
  /** 云盘文件 */
  add_file: ReturnType<typeof add_factory<PrismaClient["file"]>>;
  update_file: ReturnType<typeof update_factory<PrismaClient["file"]>>;
  delete_file: ReturnType<typeof delete_factory<PrismaClient["file"]>>;
  find_file: ReturnType<typeof first_factory<PrismaClient["file"]>>;
  find_files: ReturnType<typeof many_factory<PrismaClient["file"]>>;
  find_file_with_pagination: ReturnType<typeof pagination_factory<PrismaClient["file"]>>;
  /** 云盘临时文件 */
  add_tmp_file: ReturnType<typeof add_factory<PrismaClient["tmp_file"]>>;
  update_tmp_file: ReturnType<typeof update_factory<PrismaClient["tmp_file"]>>;
  delete_tmp_file: ReturnType<typeof delete_factory<PrismaClient["tmp_file"]>>;
  find_tmp_file: ReturnType<typeof first_factory<PrismaClient["tmp_file"]>>;
  find_tmp_files: ReturnType<typeof many_factory<PrismaClient["tmp_file"]>>;
  find_tmp_file_with_pagination: ReturnType<typeof pagination_factory<PrismaClient["tmp_file"]>>;
  /** 问题反馈 */
  add_report: ReturnType<typeof add_factory<PrismaClient["report"]>>;
  update_report: ReturnType<typeof update_factory<PrismaClient["report"]>>;
  delete_report: ReturnType<typeof delete_factory<PrismaClient["report"]>>;
  find_report: ReturnType<typeof first_factory<PrismaClient["report"]>>;
  find_report_list: ReturnType<typeof many_factory<PrismaClient["report"]>>;
  find_report_list_with_pagination: ReturnType<typeof pagination_factory<PrismaClient["report"]>>;
  /** 问题反馈 */
  add_permission: ReturnType<typeof add_factory<PrismaClient["permission"]>>;
  update_permission: ReturnType<typeof update_factory<PrismaClient["permission"]>>;
  delete_permission: ReturnType<typeof delete_factory<PrismaClient["permission"]>>;
  find_permission: ReturnType<typeof first_factory<PrismaClient["permission"]>>;
  find_permission_list: ReturnType<typeof many_factory<PrismaClient["permission"]>>;
  find_permission_list_with_pagination: ReturnType<typeof pagination_factory<PrismaClient["permission"]>>;
  /** 转存记录 */
  add_shared_file_save: ReturnType<typeof add_factory<PrismaClient["shared_file_in_progress"]>>;
  update_shared_file_save: ReturnType<typeof update_factory<PrismaClient["shared_file_in_progress"]>>;
  delete_shared_file_save: ReturnType<typeof delete_factory<PrismaClient["shared_file_in_progress"]>>;
  find_shared_file_save: ReturnType<typeof first_factory<PrismaClient["shared_file_in_progress"]>>;
  find_shared_file_save_list: ReturnType<typeof many_factory<PrismaClient["shared_file_in_progress"]>>;
  find_shared_files_save_with_pagination: ReturnType<
    typeof pagination_factory<PrismaClient["shared_file_in_progress"]>
  >;
  /** 用户 */
  add_user: ReturnType<typeof add_factory<PrismaClient["user"]>>;
  update_user: ReturnType<typeof update_factory<PrismaClient["user"]>>;
  delete_user: ReturnType<typeof delete_factory<PrismaClient["user"]>>;
  find_user: ReturnType<typeof first_factory<PrismaClient["user"]>>;
  find_users: ReturnType<typeof many_factory<PrismaClient["user"]>>;
  find_user_with_pagination: ReturnType<typeof pagination_factory<PrismaClient["user"]>>;

  constructor(client: PrismaClient) {
    this.prisma = client;
    const prisma = client;

    /** 云盘 */
    this.add_drive = add_factory<PrismaClient["drive"]>(prisma.drive);
    this.update_drive = update_factory<PrismaClient["drive"]>(prisma.drive);
    this.delete_drive = delete_factory<PrismaClient["drive"]>(prisma.drive);
    this.find_drive = first_factory<PrismaClient["drive"]>(prisma.drive);
    this.find_drive_list = many_factory<PrismaClient["drive"]>(prisma.drive);
    this.find_drive_list_with_pagination = pagination_factory<PrismaClient["drive"]>(prisma.drive);
    /** 云盘凭证 */
    this.add_aliyun_drive_token = add_factory<PrismaClient["drive_token"]>(prisma.drive_token);
    this.update_aliyun_drive_token = update_factory<PrismaClient["drive_token"]>(prisma.drive_token);
    this.find_aliyun_drive_token = first_factory<PrismaClient["drive_token"]>(prisma.drive_token);
    this.find_aliyun_drive_token_list = many_factory<PrismaClient["drive_token"]>(prisma.drive_token);
    /** 电视剧详情 */
    this.add_tv_profile = add_factory<PrismaClient["tv_profile"]>(prisma.tv_profile);
    this.delete_tv_profile = delete_factory<PrismaClient["tv_profile"]>(prisma.tv_profile);
    this.update_tv_profile = update_factory<PrismaClient["tv_profile"]>(prisma.tv_profile);
    this.find_tv_profile = first_factory<PrismaClient["tv_profile"]>(prisma.tv_profile);
    this.find_tv_profiles = many_factory<PrismaClient["tv_profile"]>(prisma.tv_profile);
    this.find_tv_profiles_with_pagination = pagination_factory<PrismaClient["tv_profile"]>(prisma.tv_profile);
    /** 电视剧季详情 */
    this.add_season_profile = add_factory<PrismaClient["season_profile"]>(prisma.season_profile);
    this.update_season_profile = update_factory<PrismaClient["season_profile"]>(prisma.season_profile);
    this.find_season_profile = first_factory<PrismaClient["season_profile"]>(prisma.season_profile);
    this.find_season_profile_list = many_factory<PrismaClient["season_profile"]>(prisma.season_profile);
    this.find_season_profile_list_with_pagination = pagination_factory<PrismaClient["season_profile"]>(
      prisma.season_profile
    );
    /** 电视剧集详情 */
    this.add_episode_profile = add_factory<PrismaClient["episode_profile"]>(prisma.episode_profile);
    this.update_episode_profile = update_factory<PrismaClient["episode_profile"]>(prisma.episode_profile);
    this.find_episode_profile = first_factory<PrismaClient["episode_profile"]>(prisma.episode_profile);
    this.find_episode_profile_list = many_factory<PrismaClient["episode_profile"]>(prisma.episode_profile);
    this.find_episode_profile_list_with_pagination = pagination_factory<PrismaClient["episode_profile"]>(
      prisma.episode_profile
    );
    /** 电影详情 */
    this.add_movie_profile = add_factory<PrismaClient["movie_profile"]>(prisma.movie_profile);
    this.update_movie_profile = update_factory<PrismaClient["movie_profile"]>(prisma.movie_profile);
    this.find_movie_profile = first_factory<PrismaClient["movie_profile"]>(prisma.movie_profile);
    this.find_movie_profile_list = many_factory<PrismaClient["movie_profile"]>(prisma.movie_profile);
    this.find_movie_profile_list_with_pagination = pagination_factory<PrismaClient["movie_profile"]>(
      prisma.movie_profile
    );
    /** 电视剧 */
    this.add_tv = add_factory<PrismaClient["tv"]>(prisma.tv);
    this.update_tv = update_factory<PrismaClient["tv"]>(prisma.tv);
    this.delete_tv = delete_factory<PrismaClient["tv"]>(prisma.tv);
    this.find_tv = first_factory<PrismaClient["tv"]>(prisma.tv);
    this.find_tvs = many_factory<PrismaClient["tv"]>(prisma.tv);
    this.find_tv_with_pagination = pagination_factory<PrismaClient["tv"]>(prisma.tv);
    /** 电视剧季 */
    this.add_season = add_factory<PrismaClient["season"]>(prisma.season);
    this.update_season = update_factory<PrismaClient["season"]>(prisma.season);
    this.delete_season = delete_factory<PrismaClient["season"]>(prisma.season);
    this.find_season = first_factory<PrismaClient["season"]>(prisma.season);
    this.find_seasons = many_factory<PrismaClient["season"]>(prisma.season);
    this.find_seasons_with_pagination = pagination_factory<PrismaClient["season"]>(prisma.season);
    /** 电视剧集 */
    this.add_episode = add_factory<PrismaClient["episode"]>(prisma.episode);
    this.update_episode = update_factory<PrismaClient["episode"]>(prisma.episode);
    this.delete_episode = delete_factory<PrismaClient["episode"]>(prisma.episode);
    this.find_episode = first_factory<PrismaClient["episode"]>(prisma.episode);
    this.find_episodes = many_factory<PrismaClient["episode"]>(prisma.episode);
    this.find_episodes_with_pagination = pagination_factory<PrismaClient["episode"]>(prisma.episode);
    /** 电影 */
    this.add_movie = add_factory<PrismaClient["movie"]>(prisma.movie);
    this.update_movie = update_factory<PrismaClient["movie"]>(prisma.movie);
    this.find_movie = first_factory<PrismaClient["movie"]>(prisma.movie);
    this.find_movies = many_factory<PrismaClient["movie"]>(prisma.movie);
    /** 从云盘文件解析出的电视剧信息 */
    this.add_parsed_tv = add_factory<PrismaClient["parsed_tv"]>(prisma.parsed_tv);
    this.update_parsed_tv = update_factory<PrismaClient["parsed_tv"]>(prisma.parsed_tv);
    this.delete_parsed_tv = delete_factory<PrismaClient["parsed_tv"]>(prisma.parsed_tv);
    this.find_parsed_tv = first_factory<PrismaClient["parsed_tv"]>(prisma.parsed_tv);
    this.find_parsed_tv_list = many_factory<PrismaClient["parsed_tv"]>(prisma.parsed_tv);
    this.find_parsed_tv_list_with_pagination = pagination_factory<PrismaClient["parsed_tv"]>(prisma.parsed_tv);
    /** 从云盘文件解析出的电视剧季信息 */
    this.add_parsed_season = add_factory<PrismaClient["parsed_season"]>(prisma.parsed_season);
    this.update_parsed_season = update_factory<PrismaClient["parsed_season"]>(prisma.parsed_season);
    this.delete_parsed_season = delete_factory<PrismaClient["parsed_season"]>(prisma.parsed_season);
    this.find_parsed_season = first_factory<PrismaClient["parsed_season"]>(prisma.parsed_season);
    this.find_parsed_season_list = many_factory<PrismaClient["parsed_season"]>(prisma.parsed_season);
    this.find_parsed_season_list_with_pagination = pagination_factory<PrismaClient["parsed_season"]>(
      prisma.parsed_season
    );
    /** 从云盘文件解析出的电视剧集信息 */
    this.add_parsed_episode = add_factory<PrismaClient["parsed_episode"]>(prisma.parsed_episode);
    this.update_parsed_episode = update_factory<PrismaClient["parsed_episode"]>(prisma.parsed_episode);
    this.delete_parsed_episode = delete_factory<PrismaClient["parsed_episode"]>(prisma.parsed_episode);
    this.find_parsed_episode = first_factory<PrismaClient["parsed_episode"]>(prisma.parsed_episode);
    this.find_parsed_episode_list = many_factory<PrismaClient["parsed_episode"]>(prisma.parsed_episode);
    this.find_parsed_episode_list_with_pagination = pagination_factory<PrismaClient["parsed_episode"]>(
      prisma.parsed_episode
    );
    /** 从云盘文件解析出的电影信息 */
    this.add_parsed_movie = add_factory<PrismaClient["parsed_movie"]>(prisma.parsed_movie);
    this.update_parsed_movie = update_factory<PrismaClient["parsed_movie"]>(prisma.parsed_movie);
    this.delete_parsed_movie = delete_factory<PrismaClient["parsed_movie"]>(prisma.parsed_movie);
    this.find_parsed_movie = first_factory<PrismaClient["parsed_movie"]>(prisma.parsed_movie);
    this.find_parsed_movie_list = many_factory<PrismaClient["parsed_movie"]>(prisma.parsed_movie);
    this.find_parsed_movie_list_with_pagination = pagination_factory<PrismaClient["parsed_movie"]>(prisma.parsed_movie);
    /** 播放记录 */
    this.add_history = add_factory<PrismaClient["play_history"]>(prisma.play_history);
    this.update_history = update_factory<PrismaClient["play_history"]>(prisma.play_history);
    this.delete_history = delete_factory<PrismaClient["play_history"]>(prisma.play_history);
    this.find_history = first_factory<PrismaClient["play_history"]>(prisma.play_history);
    this.find_histories = many_factory<PrismaClient["play_history"]>(prisma.play_history);
    this.find_history_with_pagination = pagination_factory<PrismaClient["play_history"]>(prisma.play_history);
    /** 成员凭证 */
    this.add_member_link = add_factory<PrismaClient["member_token"]>(prisma.member_token);
    this.update_member_link = update_factory<PrismaClient["member_token"]>(prisma.member_token);
    this.delete_member_link = delete_factory<PrismaClient["member_token"]>(prisma.member_token);
    this.find_member_link = first_factory<PrismaClient["member_token"]>(prisma.member_token);
    this.find_member_links = many_factory<PrismaClient["member_token"]>(prisma.member_token);
    this.find_member_link_with_pagination = pagination_factory<PrismaClient["member_token"]>(prisma.member_token);
    /** 成员 */
    this.add_member = add_factory<PrismaClient["member"]>(prisma.member);
    this.update_member = update_factory<PrismaClient["member"]>(prisma.member);
    this.delete_member = delete_factory<PrismaClient["member"]>(prisma.member);
    this.find_member = first_factory<PrismaClient["member"]>(prisma.member);
    this.find_members = many_factory<PrismaClient["member"]>(prisma.member);
    this.find_member_with_pagination = pagination_factory<PrismaClient["member"]>(prisma.member);
    /** 异步任务 */
    this.add_task = add_factory<PrismaClient["async_task"]>(prisma.async_task);
    this.update_task = update_factory<PrismaClient["async_task"]>(prisma.async_task);
    this.find_task = first_factory<PrismaClient["async_task"]>(prisma.async_task);
    this.find_task_list = many_factory<PrismaClient["async_task"]>(prisma.async_task);
    this.delete_task = delete_factory<PrismaClient["async_task"]>(prisma.async_task);
    this.find_task_list_with_pagination = pagination_factory<PrismaClient["async_task"]>(prisma.async_task);
    /** log */
    this.add_output_line = add_factory<PrismaClient["output_line"]>(prisma.output_line);
    this.update_output_line = update_factory<PrismaClient["output_line"]>(prisma.output_line);
    this.find_output_line = first_factory<PrismaClient["output_line"]>(prisma.output_line);
    this.find_output_line_list = many_factory<PrismaClient["output_line"]>(prisma.output_line);
    this.delete_output_line = delete_factory<PrismaClient["output_line"]>(prisma.output_line);
    this.find_output_line_list_with_pagination = pagination_factory<PrismaClient["output_line"]>(prisma.output_line);
    /** 云盘签到 */
    this.add_check_in = add_factory<PrismaClient["drive_check_in"]>(prisma.drive_check_in);
    /** 分享资源 */
    this.add_shared_files = add_factory<PrismaClient["shared_file"]>(prisma.shared_file);
    this.add_shared_files_safely = async (
      body: Omit<Parameters<PrismaClient["shared_file"]["create"]>[0]["data"], "id">
    ) => {
      const { url } = body;
      const existing = await prisma.shared_file.findFirst({
        where: { url },
      });
      if (existing !== null) {
        return Result.Ok(existing);
      }
      return add_factory<PrismaClient["shared_file"]>(prisma.shared_file)(body);
    };
    this.update_shared_files = update_factory<PrismaClient["shared_file"]>(prisma.shared_file);
    this.delete_shared_files = delete_factory<PrismaClient["shared_file"]>(prisma.shared_file);
    this.find_shared_files = first_factory<PrismaClient["shared_file"]>(prisma.shared_file);
    this.find_shared_files_list = many_factory<PrismaClient["shared_file"]>(prisma.shared_file);
    this.find_shared_files_list_with_pagination = pagination_factory<PrismaClient["shared_file"]>(prisma.shared_file);
    /** 分享资源同步任务 */
    this.add_sync_task = add_factory<PrismaClient["bind_for_parsed_tv"]>(prisma.bind_for_parsed_tv);
    this.update_sync_task = update_factory<PrismaClient["bind_for_parsed_tv"]>(prisma.bind_for_parsed_tv);
    this.delete_sync_task = delete_factory<PrismaClient["bind_for_parsed_tv"]>(prisma.bind_for_parsed_tv);
    this.find_sync_task = first_factory<PrismaClient["bind_for_parsed_tv"]>(prisma.bind_for_parsed_tv);
    this.find_sync_task_list = many_factory<PrismaClient["bind_for_parsed_tv"]>(prisma.bind_for_parsed_tv);
    this.find_sync_task_list_with_pagination = pagination_factory<PrismaClient["bind_for_parsed_tv"]>(
      prisma.bind_for_parsed_tv
    );
    /** 云盘文件 */
    this.add_file = add_factory<PrismaClient["file"]>(prisma.file);
    this.update_file = update_factory<PrismaClient["file"]>(prisma.file);
    this.delete_file = delete_factory<PrismaClient["file"]>(prisma.file);
    this.find_file = first_factory<PrismaClient["file"]>(prisma.file);
    this.find_files = many_factory<PrismaClient["file"]>(prisma.file);
    this.find_file_with_pagination = pagination_factory<PrismaClient["file"]>(prisma.file);
    /** 云盘临时文件 */
    this.add_tmp_file = add_factory<PrismaClient["tmp_file"]>(prisma.tmp_file);
    this.update_tmp_file = update_factory<PrismaClient["tmp_file"]>(prisma.tmp_file);
    this.delete_tmp_file = delete_factory<PrismaClient["tmp_file"]>(prisma.tmp_file);
    this.find_tmp_file = first_factory<PrismaClient["tmp_file"]>(prisma.tmp_file);
    this.find_tmp_files = many_factory<PrismaClient["tmp_file"]>(prisma.tmp_file);
    this.find_tmp_file_with_pagination = pagination_factory<PrismaClient["tmp_file"]>(prisma.tmp_file);
    /** 问题反馈 */
    this.add_report = add_factory<PrismaClient["report"]>(prisma.report);
    this.update_report = update_factory<PrismaClient["report"]>(prisma.report);
    this.delete_report = delete_factory<PrismaClient["report"]>(prisma.report);
    this.find_report = first_factory<PrismaClient["report"]>(prisma.report);
    this.find_report_list = many_factory<PrismaClient["report"]>(prisma.report);
    this.find_report_list_with_pagination = pagination_factory<PrismaClient["report"]>(prisma.report);
    /** 权限 */
    this.add_permission = add_factory<PrismaClient["permission"]>(prisma.permission);
    this.update_permission = update_factory<PrismaClient["permission"]>(prisma.permission);
    this.delete_permission = delete_factory<PrismaClient["permission"]>(prisma.permission);
    this.find_permission = first_factory<PrismaClient["permission"]>(prisma.permission);
    this.find_permission_list = many_factory<PrismaClient["permission"]>(prisma.permission);
    this.find_permission_list_with_pagination = pagination_factory<PrismaClient["permission"]>(prisma.permission);
    /** 转存记录 */
    this.add_shared_file_save = add_factory<PrismaClient["shared_file_in_progress"]>(prisma.shared_file_in_progress);
    this.update_shared_file_save = update_factory<PrismaClient["shared_file_in_progress"]>(
      prisma.shared_file_in_progress
    );
    this.delete_shared_file_save = delete_factory<PrismaClient["shared_file_in_progress"]>(
      prisma.shared_file_in_progress
    );
    this.find_shared_file_save = first_factory<PrismaClient["shared_file_in_progress"]>(prisma.shared_file_in_progress);
    this.find_shared_file_save_list = many_factory<PrismaClient["shared_file_in_progress"]>(
      prisma.shared_file_in_progress
    );
    this.find_shared_files_save_with_pagination = pagination_factory<PrismaClient["shared_file_in_progress"]>(
      prisma.shared_file_in_progress
    );
    /** 用户 */
    this.add_user = add_factory<PrismaClient["user"]>(prisma.user);
    this.update_user = update_factory<PrismaClient["user"]>(prisma.user);
    this.delete_user = delete_factory<PrismaClient["user"]>(prisma.user);
    this.find_user = first_factory<PrismaClient["user"]>(prisma.user);
    this.find_users = many_factory<PrismaClient["user"]>(prisma.user);
    this.find_user_with_pagination = pagination_factory<PrismaClient["user"]>(prisma.user);
  }
  clear_dataset = (name: ModelKeys) => {
    // @ts-ignore
    return this.prisma[name].deleteMany({});
  };
  build_extra_args(body: { next_marker?: string; page_size?: number }) {
    const { next_marker, page_size = 20 } = body;
    const extra_args = {
      take: page_size + 1,
      ...(() => {
        const cursor: { id?: string } = {};
        if (next_marker) {
          cursor.id = next_marker;
          return {
            cursor,
          };
        }
        return {};
      })(),
    };
    return extra_args;
  }
  get_next_marker<T extends { id: string }>(list: T[], body: { page_size: number }) {
    const { page_size = 20 } = body;
    let new_next_marker = null;
    if (list.length === page_size + 1) {
      const last_record = list[list.length - 1];
      new_next_marker = last_record.id;
    }
    return new_next_marker;
  }
  async list_with_cursor<F extends (extra: { take: number }) => any>(options: {
    fetch: F;
    next_marker: string;
    page_size?: number;
  }) {
    const { fetch, next_marker = "", page_size = 20 } = options;
    if (next_marker === null) {
      return {
        next_marker: null,
        list: [] as Unpacked<ReturnType<F>>[number][],
      };
    }
    const extra_args = this.build_extra_args({ next_marker, page_size });
    const list = await fetch(extra_args);
    const correct_list: Unpacked<ReturnType<F>>[number][] = list.slice(0, page_size);
    return {
      next_marker: this.get_next_marker(list, { page_size }),
      list: correct_list,
    };
  }
  async list_with_pagination<F extends (extra: { take: number; skip: number }) => any>(options: {
    fetch: F;
    next_marker?: string;
    page?: number;
    page_size?: number;
  }) {
    const { fetch, page = 1, page_size = 20 } = options;
    const extra_args = {
      skip: (page - 1) * page_size,
      take: page_size,
    };
    const list = await fetch(extra_args);
    return {
      list,
      // no_more: list.length + (page - 1) * page_size >= count,
    };
  }
}
