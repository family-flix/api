import { AliyunDriveFolder } from "@/domains/aliyundrive/folder";
import { Result } from "@/types";
import {
  add_record_factory,
  find_records_factory,
  find_record_factory,
  StoreOperation,
  update_record_factory,
  delete_record_factory,
  record_pagination_factory,
} from "./operations";
import {
  RecordCommonPart,
  AliyunDriveTokenRecord,
  AliyunDriveRecord,
  AsyncTaskRecord,
  DriveCheckInRecord,
  EpisodeRecord,
  PlayHistoryRecord,
  MemberLinkRecord,
  MemberRecord,
  MovieRecord,
  RecommendedTV,
  SearchedTVRecord,
  SeasonRecord,
  SharedFilesRecord,
  TmpEpisodeRecord,
  TmpTVRecord,
  TVRecord,
  FilesRecord,
  TmpFilesRecord,
  SharedFilesInProgressRecord,
  SearchedSeasonRecord,
  UserRecord,
  TVNeedComplete,
} from "./types";

export const store_factory = (o: StoreOperation) => {
  const table_name1 = "aliyun_drive_token";
  const add_aliyun_drive_token = add_record_factory<
    AliyunDriveTokenRecord,
    AliyunDriveTokenRecord & RecordCommonPart
  >(table_name1, o);
  const update_aliyun_drive_token = update_record_factory<
    Partial<AliyunDriveTokenRecord>,
    AliyunDriveTokenRecord & RecordCommonPart
  >(table_name1, o);
  const find_aliyun_drive_token = find_record_factory<
    Partial<AliyunDriveTokenRecord>,
    AliyunDriveTokenRecord & RecordCommonPart
  >(table_name1, o);
  const find_aliyun_drives_token = find_records_factory<
    Partial<AliyunDriveTokenRecord>,
    AliyunDriveTokenRecord & RecordCommonPart
  >(table_name1, o);

  const table_name2 = "aliyun_drive";
  const add_aliyun_drive = add_record_factory<
    AliyunDriveRecord,
    AliyunDriveRecord & RecordCommonPart
  >(table_name2, o);
  const update_aliyun_drive = update_record_factory<
    Partial<AliyunDriveRecord>,
    AliyunDriveRecord & RecordCommonPart
  >(table_name2, o);
  const find_aliyun_drive = find_record_factory<
    Partial<AliyunDriveRecord>,
    AliyunDriveRecord & RecordCommonPart
  >(table_name2, o);
  const find_aliyun_drives = find_records_factory<
    Partial<AliyunDriveRecord>,
    AliyunDriveRecord & RecordCommonPart
  >(table_name2, o);
  const find_aliyun_drives_with_pagination = record_pagination_factory<
    Partial<AliyunDriveRecord>,
    AliyunDriveRecord & RecordCommonPart
  >(table_name2, o);

  const table_name3 = "async_task";
  const add_async_task = add_record_factory<
    AsyncTaskRecord,
    AsyncTaskRecord & RecordCommonPart
  >(table_name3, o);
  const update_async_task = update_record_factory<
    Partial<AsyncTaskRecord>,
    AsyncTaskRecord & RecordCommonPart
  >(table_name3, o);
  const delete_async_task = delete_record_factory<
    Partial<AsyncTaskRecord>,
    AsyncTaskRecord & RecordCommonPart
  >(table_name3, o);
  const find_async_task = find_record_factory<
    Partial<AsyncTaskRecord>,
    AsyncTaskRecord & RecordCommonPart
  >(table_name3, o);
  const find_async_tasks = find_records_factory<
    Partial<AsyncTaskRecord>,
    AsyncTaskRecord & RecordCommonPart
  >(table_name3, o);
  const find_async_task_with_pagination = record_pagination_factory<
    Partial<AsyncTaskRecord>,
    AsyncTaskRecord & RecordCommonPart
  >(table_name3, o);

  const table_name4 = "drive_check_in";
  const add_check_in = add_record_factory<
    DriveCheckInRecord,
    DriveCheckInRecord & RecordCommonPart
  >(table_name4, o);

  const table_name5 = "episode";
  const add_episode = add_record_factory<
    EpisodeRecord,
    EpisodeRecord & RecordCommonPart
  >(table_name5, o);
  const update_episode = update_record_factory<
    Partial<EpisodeRecord>,
    EpisodeRecord & RecordCommonPart
  >(table_name5, o);
  const find_episode = find_record_factory<
    Partial<EpisodeRecord>,
    EpisodeRecord & RecordCommonPart
  >(table_name5, o);
  const find_episodes = find_records_factory<
    Partial<EpisodeRecord>,
    EpisodeRecord & RecordCommonPart
  >(table_name5, o);
  const find_episodes_with_pagination = record_pagination_factory<
    Partial<EpisodeRecord>,
    EpisodeRecord & RecordCommonPart
  >(table_name5, o);
  const delete_episode = delete_record_factory<
    Partial<EpisodeRecord>,
    EpisodeRecord & RecordCommonPart
  >(table_name5, o);

  const table_name6 = "play_progress";
  const add_history = add_record_factory<
    PlayHistoryRecord,
    PlayHistoryRecord & RecordCommonPart
  >(table_name6, o);
  const delete_history = delete_record_factory<
    Partial<PlayHistoryRecord>,
    PlayHistoryRecord & RecordCommonPart
  >(table_name6, o);
  const update_history = update_record_factory<
    Partial<PlayHistoryRecord>,
    PlayHistoryRecord & RecordCommonPart
  >(table_name6, o);
  const find_history = find_record_factory<
    Partial<PlayHistoryRecord>,
    PlayHistoryRecord & RecordCommonPart
  >(table_name6, o);
  const find_histories = find_records_factory<
    Partial<PlayHistoryRecord>,
    PlayHistoryRecord & RecordCommonPart
  >(table_name6, o);
  const find_history_with_pagination = record_pagination_factory<
    Partial<PlayHistoryRecord>,
    PlayHistoryRecord & RecordCommonPart
  >(table_name6, o);

  const table_name7 = "member_link";
  const add_member_token = add_record_factory<
    MemberLinkRecord,
    MemberLinkRecord & RecordCommonPart
  >(table_name7, o);
  const update_member_token = update_record_factory<
    Partial<MemberLinkRecord>,
    MemberLinkRecord & RecordCommonPart
  >(table_name7, o);
  const delete_member_token = delete_record_factory<
    Partial<MemberLinkRecord>,
    MemberLinkRecord & RecordCommonPart
  >(table_name7, o);
  const find_member_token = find_record_factory<
    Partial<MemberLinkRecord>,
    MemberLinkRecord & RecordCommonPart
  >(table_name7, o);
  const find_member_tokens = find_records_factory<
    Partial<MemberLinkRecord>,
    MemberLinkRecord & RecordCommonPart
  >(table_name7, o);
  const find_member_tokens_with_pagination = record_pagination_factory<
    Partial<MemberLinkRecord>,
    MemberLinkRecord & RecordCommonPart
  >(table_name7, o);

  const table_name8 = "member";
  const add_member = add_record_factory<
    MemberRecord,
    MemberRecord & RecordCommonPart
  >(table_name8, o);
  const update_member = update_record_factory<
    Partial<MemberRecord>,
    MemberRecord & RecordCommonPart
  >(table_name8, o);
  const delete_member = delete_record_factory<
    Partial<MemberRecord>,
    MemberRecord & RecordCommonPart
  >(table_name8, o);
  const find_member = find_record_factory<
    Partial<MemberRecord>,
    MemberRecord & RecordCommonPart
  >(table_name8, o);
  const find_members = find_records_factory<
    Partial<MemberRecord>,
    MemberRecord & RecordCommonPart
  >(table_name8, o);
  const find_member_with_pagination = record_pagination_factory<
    Partial<MemberRecord>,
    MemberRecord & RecordCommonPart
  >(table_name8, o);

  const table_name9 = "movie";
  const add_movie = add_record_factory<
    MovieRecord,
    MovieRecord & RecordCommonPart
  >(table_name9, o);
  const update_movie = update_record_factory<
    Partial<MovieRecord>,
    MovieRecord & RecordCommonPart
  >(table_name9, o);
  const find_movie = find_record_factory<
    Partial<MovieRecord>,
    MovieRecord & RecordCommonPart
  >(table_name9, o);
  const find_movies = find_records_factory<
    Partial<MovieRecord>,
    MovieRecord & RecordCommonPart
  >(table_name9, o);
  const fetch_movie_with_pagination = record_pagination_factory<
    Partial<MovieRecord>,
    MovieRecord & RecordCommonPart
  >(table_name9, o);

  const table_name10 = "recommended_tv";
  const add_recommended_tv = add_record_factory<
    RecommendedTV,
    RecommendedTV & RecordCommonPart
  >(table_name10, o);
  const update_recommended_tv = update_record_factory<
    Partial<RecommendedTV>,
    RecommendedTV & RecordCommonPart
  >(table_name10, o);
  const delete_recommended_tv = delete_record_factory<
    Partial<RecommendedTV>,
    RecommendedTV & RecordCommonPart
  >(table_name10, o);
  const find_recommended_tv = find_record_factory<
    Partial<RecommendedTV>,
    RecommendedTV & RecordCommonPart
  >(table_name10, o);
  const find_recommended_tvs = find_records_factory<
    Partial<RecommendedTV>,
    RecommendedTV & RecordCommonPart
  >(table_name10, o);
  const find_recommended_tv_with_pagination = record_pagination_factory<
    Partial<RecommendedTV>,
    RecommendedTV & RecordCommonPart
  >(table_name10, o);

  const table_name11 = "searched_tv";
  const add_searched_tv = add_record_factory<
    SearchedTVRecord,
    SearchedTVRecord & RecordCommonPart
  >(table_name11, o);
  const update_searched_tv = update_record_factory<
    Partial<SearchedTVRecord>,
    SearchedTVRecord & RecordCommonPart
  >(table_name11, o);
  const find_searched_tv = find_record_factory<
    Partial<SearchedTVRecord>,
    SearchedTVRecord & RecordCommonPart
  >(table_name11, o);
  const find_searched_tvs = find_records_factory<
    Partial<SearchedTVRecord>,
    SearchedTVRecord & RecordCommonPart
  >(table_name11, o);
  const find_searched_tv_with_pagination = record_pagination_factory<
    Partial<SearchedTVRecord>,
    SearchedTVRecord & RecordCommonPart
  >(table_name11, o);

  const table_name12 = "season";
  const add_season = add_record_factory<
    SeasonRecord,
    SeasonRecord & RecordCommonPart
  >(table_name12, o);
  const update_season = update_record_factory<
    Partial<SeasonRecord>,
    SeasonRecord & RecordCommonPart
  >(table_name12, o);
  const delete_seasons = delete_record_factory<
    Partial<SeasonRecord>,
    SeasonRecord & RecordCommonPart
  >(table_name12, o);
  const find_season = find_record_factory<
    Partial<SeasonRecord>,
    SeasonRecord & RecordCommonPart
  >(table_name12, o);
  const find_seasons = find_records_factory<
    Partial<SeasonRecord>,
    SeasonRecord & RecordCommonPart
  >(table_name12, o);

  const table_name13 = "shared_files";
  const add_shared_files = add_record_factory<
    SharedFilesRecord,
    SharedFilesRecord & RecordCommonPart
  >(table_name13, o);
  async function add_shared_files_safely(body: SharedFilesRecord) {
    const { url } = body;
    const e_resp = await find_shared_files({ url });
    if (e_resp.error) {
      return;
    }
    if (e_resp.data) {
      return;
    }
    add_shared_files(body);
  }
  const update_shared_files = update_record_factory<
    Partial<SharedFilesRecord>,
    SharedFilesRecord & RecordCommonPart
  >(table_name13, o);
  const delete_shared_files = delete_record_factory<
    Partial<SharedFilesRecord>,
    SharedFilesRecord & RecordCommonPart
  >(table_name13, o);
  const find_shared_files = find_record_factory<
    Partial<SharedFilesRecord>,
    SharedFilesRecord & RecordCommonPart
  >(table_name13, o);
  const find_shared_files_list = find_records_factory<
    Partial<SharedFilesRecord>,
    SharedFilesRecord & RecordCommonPart
  >(table_name13, o);
  const find_shared_files_list_with_pagination = record_pagination_factory<
    Partial<SharedFilesRecord>,
    SharedFilesRecord & RecordCommonPart
  >(table_name13, o);

  const table_name14 = "tmp_episode";
  const add_tmp_episode = add_record_factory<
    TmpEpisodeRecord,
    TmpEpisodeRecord & RecordCommonPart
  >(table_name14, o);
  const update_tmp_episode = update_record_factory<
    Partial<TmpEpisodeRecord>,
    TmpEpisodeRecord & RecordCommonPart
  >(table_name14, o);
  const find_tmp_episode = find_record_factory<
    Partial<TmpEpisodeRecord>,
    TmpEpisodeRecord & RecordCommonPart
  >(table_name14, o);
  const find_tmp_episodes = find_records_factory<
    Partial<TmpEpisodeRecord>,
    TmpEpisodeRecord & RecordCommonPart
  >(table_name14, o);
  const find_tmp_episodes_with_pagination = record_pagination_factory<
    Partial<TmpEpisodeRecord>,
    TmpEpisodeRecord & RecordCommonPart
  >(table_name14, o);

  const table_name15 = "tmp_tv";
  const add_tmp_tv = add_record_factory<
    TmpTVRecord,
    TmpTVRecord & RecordCommonPart
  >(table_name15, o);
  const update_tmp_tv = update_record_factory<
    Partial<TmpTVRecord>,
    TmpTVRecord & RecordCommonPart
  >(table_name15, o);
  const delete_tmp_tv = delete_record_factory<
    Partial<TmpTVRecord>,
    TmpTVRecord & RecordCommonPart
  >(table_name15, o);
  const find_tmp_tv = find_record_factory<
    Partial<TmpTVRecord>,
    TmpTVRecord & RecordCommonPart
  >(table_name15, o);
  const find_tmp_tvs = find_records_factory<
    Partial<TmpTVRecord>,
    TmpTVRecord & RecordCommonPart
  >(table_name15, o);
  const find_tmp_tv_with_pagination = record_pagination_factory<
    Partial<TmpTVRecord>,
    TmpTVRecord & RecordCommonPart
  >(table_name15, o);

  const table_name16 = "tv";
  const add_tv = add_record_factory<TVRecord, TVRecord & RecordCommonPart>(
    table_name16,
    o
  );
  const update_tv = update_record_factory<
    Partial<TVRecord>,
    TVRecord & RecordCommonPart
  >(table_name16, o);
  const delete_tv = delete_record_factory<
    Partial<TVRecord>,
    TVRecord & RecordCommonPart
  >(table_name16, o);
  const find_tv = find_record_factory<
    Partial<TVRecord>,
    TVRecord & RecordCommonPart
  >(table_name16, o);
  const find_tvs = find_records_factory<
    Partial<TVRecord>,
    TVRecord & RecordCommonPart
  >(table_name16, o);
  const find_tv_with_pagination = record_pagination_factory<
    Partial<TVRecord>,
    TVRecord & RecordCommonPart
  >(table_name16, o);

  const table_name17 = "users";
  const add_user = add_record_factory<TVRecord, TVRecord & RecordCommonPart>(
    table_name17,
    o
  );
  const update_user = update_record_factory<
    Partial<UserRecord>,
    UserRecord & RecordCommonPart
  >(table_name17, o);
  const delete_user = delete_record_factory<
    Partial<UserRecord>,
    UserRecord & RecordCommonPart
  >(table_name17, o);
  const find_user = find_record_factory<
    Partial<UserRecord>,
    UserRecord & RecordCommonPart
  >(table_name17, o);
  const find_users = find_records_factory<
    Partial<UserRecord>,
    UserRecord & RecordCommonPart
  >(table_name17, o);
  const find_user_with_pagination = record_pagination_factory<
    Partial<UserRecord>,
    UserRecord & RecordCommonPart
  >(table_name17, o);

  const table_name18 = "folder";
  const add_folder = add_record_factory<
    FilesRecord,
    FilesRecord & RecordCommonPart
  >(table_name18, o);
  const update_folder = update_record_factory<
    Partial<FilesRecord>,
    FilesRecord & RecordCommonPart
  >(table_name18, o);
  const delete_folder = delete_record_factory<
    Partial<FilesRecord>,
    FilesRecord & RecordCommonPart
  >(table_name18, o);
  const find_folder = find_record_factory<
    Partial<FilesRecord>,
    FilesRecord & RecordCommonPart
  >(table_name18, o);
  const find_folders = find_records_factory<
    Partial<FilesRecord>,
    FilesRecord & RecordCommonPart
  >(table_name18, o);
  const find_folder_with_pagination = record_pagination_factory<
    Partial<FilesRecord>,
    FilesRecord & RecordCommonPart
  >(table_name18, o);

  const table_name19 = "tmp_folder";
  const add_tmp_folder = add_record_factory<
    TmpFilesRecord,
    TmpFilesRecord & RecordCommonPart
  >(table_name19, o);
  const update_tmp_folder = update_record_factory<
    Partial<TmpFilesRecord>,
    TmpFilesRecord & RecordCommonPart
  >(table_name19, o);
  const delete_tmp_folder = delete_record_factory<
    Partial<TmpFilesRecord>,
    TmpFilesRecord & RecordCommonPart
  >(table_name19, o);
  const find_tmp_folder = find_record_factory<
    Partial<TmpFilesRecord>,
    TmpFilesRecord & RecordCommonPart
  >(table_name19, o);
  const find_tmp_folders = find_records_factory<
    Partial<TmpFilesRecord>,
    TmpFilesRecord & RecordCommonPart
  >(table_name19, o);
  const find_tmp_folder_with_pagination = record_pagination_factory<
    Partial<TmpFilesRecord>,
    TmpFilesRecord & RecordCommonPart
  >(table_name19, o);

  const table_name20 = "shared_files_in_progress";
  const add_shared_files_in_progress = add_record_factory<
    SharedFilesInProgressRecord,
    SharedFilesInProgressRecord & RecordCommonPart
  >(table_name20, o);
  const update_shared_files_in_progress = update_record_factory<
    Partial<SharedFilesInProgressRecord>,
    SharedFilesInProgressRecord & RecordCommonPart
  >(table_name20, o);
  const delete_shared_files_in_progress = delete_record_factory<
    Partial<SharedFilesInProgressRecord>,
    SharedFilesInProgressRecord & RecordCommonPart
  >(table_name20, o);
  const find_shared_files_in_progress = find_record_factory<
    Partial<SharedFilesInProgressRecord>,
    SharedFilesInProgressRecord & RecordCommonPart
  >(table_name20, o);
  const find_shared_files_list_in_progress = find_records_factory<
    Partial<SharedFilesInProgressRecord>,
    SharedFilesInProgressRecord & RecordCommonPart
  >(table_name20, o);
  const find_shared_files_in_progress_with_pagination =
    record_pagination_factory<
      Partial<SharedFilesInProgressRecord>,
      SharedFilesInProgressRecord & RecordCommonPart
    >(table_name20, o);

  const table_name21 = "searched_season";
  const add_searched_season = add_record_factory<
    SearchedSeasonRecord,
    SearchedSeasonRecord & RecordCommonPart
  >(table_name21, o);
  const update_searched_season = update_record_factory<
    Partial<SearchedSeasonRecord>,
    SearchedSeasonRecord & RecordCommonPart
  >(table_name21, o);
  const delete_searched_season = delete_record_factory<
    Partial<SearchedSeasonRecord>,
    SearchedSeasonRecord & RecordCommonPart
  >(table_name21, o);
  const find_searched_season = find_record_factory<
    Partial<SearchedSeasonRecord>,
    SearchedSeasonRecord & RecordCommonPart
  >(table_name21, o);
  const find_searched_season_list = find_records_factory<
    Partial<SearchedSeasonRecord>,
    SearchedSeasonRecord & RecordCommonPart
  >(table_name21, o);
  const find_searched_season_with_pagination = record_pagination_factory<
    Partial<SearchedSeasonRecord>,
    SearchedSeasonRecord & RecordCommonPart
  >(table_name21, o);

  const table_name22 = "tv_need_complete";
  const add_tv_need_complete = add_record_factory<
    TVNeedComplete,
    TVNeedComplete & RecordCommonPart
  >(table_name22, o);
  const update_tv_need_complete = update_record_factory<
    Partial<TVNeedComplete>,
    TVNeedComplete & RecordCommonPart
  >(table_name22, o);
  const delete_tv_need_complete = delete_record_factory<
    Partial<TVNeedComplete & RecordCommonPart>,
    TVNeedComplete & RecordCommonPart
  >(table_name22, o);
  const find_tv_need_complete = find_record_factory<
    Partial<TVNeedComplete>,
    TVNeedComplete & RecordCommonPart
  >(table_name22, o);
  const find_tv_need_complete_list = find_records_factory<
    Partial<TVNeedComplete>,
    TVNeedComplete & RecordCommonPart
  >(table_name22, o);
  const find_tv_need_complete_with_pagination = record_pagination_factory<
    Partial<TVNeedComplete>,
    TVNeedComplete & RecordCommonPart
  >(table_name22, o);

  return {
    operation: o,
    table_names: [
      table_name1,
      table_name2,
      table_name3,
      table_name4,
      table_name5,
      table_name6,
      table_name7,
      table_name8,
      table_name9,
      table_name10,
      table_name11,
      table_name12,
      table_name13,
      table_name14,
      table_name15,
      table_name16,
      table_name17,
      table_name18,
      table_name19,
      table_name20,
      table_name21,
      table_name22,
    ],

    add_aliyun_drive_token,
    update_aliyun_drive_token,
    find_aliyun_drive_token,
    find_aliyun_drives_token,

    add_aliyun_drive,
    update_aliyun_drive,
    find_aliyun_drive,
    find_aliyun_drives,
    find_aliyun_drives_with_pagination,

    add_async_task,
    update_async_task,
    find_async_task,
    find_async_tasks,
    delete_async_task,
    find_async_task_with_pagination,

    add_check_in,

    add_episode,
    update_episode,
    delete_episode,
    find_episode,
    find_episodes,
    find_episodes_with_pagination,

    add_history,
    update_history,
    delete_history,
    find_history,
    find_histories,
    find_history_with_pagination,

    add_member_link: add_member_token,
    update_member_link: update_member_token,
    delete_member_link: delete_member_token,
    find_member_link: find_member_token,
    find_member_links: find_member_tokens,
    find_member_link_with_pagination: find_member_tokens_with_pagination,

    add_member,
    update_member,
    delete_member,
    find_member,
    find_members,
    find_member_with_pagination,

    update_movie,
    add_movie,
    find_movie,
    find_movies,

    add_recommended_tv,
    update_recommended_tv,
    find_recommended_tv,
    find_recommended_tvs,
    find_recommended_tv_with_pagination,

    add_searched_tv,
    update_searched_tv,
    find_searched_tv,
    find_searched_tvs,
    find_searched_tv_with_pagination,

    add_season,
    update_season,
    delete_seasons,
    find_season,
    find_seasons,

    add_shared_files,
    add_shared_files_safely,
    update_shared_files,
    delete_shared_files,
    find_shared_files,
    find_shared_files_list,
    find_shared_files_list_with_pagination,

    add_tmp_episode,
    update_tmp_episode,
    find_tmp_episode,
    find_tmp_episodes,
    find_tmp_episodes_with_pagination,

    add_tmp_tv,
    update_tmp_tv,
    delete_tmp_tv,
    find_tmp_tv,
    find_tmp_tvs,
    find_tmp_tv_with_pagination,

    add_tv,
    update_tv,
    delete_tv,
    find_tv,
    find_tvs,
    find_tv_with_pagination,

    add_user,
    update_user,
    delete_user,
    find_user,
    find_users,
    find_user_with_pagination,

    add_folder,
    update_folder,
    delete_folder,
    find_folder,
    find_folders,
    find_folder_with_pagination,

    add_tmp_folder,
    update_tmp_folder,
    delete_tmp_folder,
    find_tmp_folder,
    find_tmp_folders,
    find_tmp_folder_with_pagination,

    add_shared_files_in_progress,
    find_shared_files_in_progress,
    find_shared_files_list_in_progress,
    update_shared_files_in_progress,
    delete_shared_files_in_progress,
    find_shared_files_in_progress_with_pagination,

    add_searched_season,
    update_searched_season,
    find_searched_season,
    find_searched_season_list,
    find_searched_season_with_pagination,

    add_tv_need_complete,
    update_tv_need_complete,
    delete_tv_need_complete,
    find_tv_need_complete,
    find_tv_need_complete_list,
    find_tv_need_complete_with_pagination,
  };
};
function db_value(v?: string) {
  if (v === undefined) {
    return "";
  }
  if (typeof v === "string" && v.includes('"')) {
    return `'${v}'`;
  }
  return `"${v}"`;
}
export function folder_client(
  body: { drive_id: string },
  store: ReturnType<typeof store_factory>
) {
  const { drive_id } = body;
  return {
    async fetch_file(id) {
      const r = await store.find_folder({ file_id: id, drive_id });
      if (r.error) {
        return r;
      }
      if (!r.data) {
        return Result.Err("No matched record");
      }
      return Result.Ok({
        ...r.data,
        type: r.data.type === 1 ? "file" : "folder",
      });
    },
    async fetch_files(id, options) {
      const { marker } = options;
      const page_size = 20;
      const sql = `SELECT * FROM folder WHERE parent_file_id = '${id}' AND drive_id = '${drive_id}'${
        marker === "" ? "" : " AND name <= " + db_value(marker)
      } ORDER BY name DESC LIMIT ${page_size + 1}`;
      // console.log(sql);
      const r = await store.operation.all<FilesRecord[]>(sql);
      if (r.error) {
        // console.log("happen error", r.error.message);
        return r;
      }
      const rows = r.data.map((f) => {
        const { file_id, parent_file_id, name, type } = f;
        return {
          file_id,
          parent_file_id,
          name,
          type: type === 1 ? "file" : "folder",
        };
      });
      const has_next_page = rows.length === page_size + 1 && rows[page_size];
      const next_marker = has_next_page ? rows[page_size].name : "";
      const result = {
        items: rows.slice(0, page_size),
        next_marker,
      };
      return Result.Ok(result);
    },
  } as AliyunDriveFolder["client"];
}
