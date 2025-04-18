import path from "path";
import fs from "fs";
import { IncomingMessage } from "http";

import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";

import { compat_next } from "./utils/server";
import { random_string, r_id } from "./utils/index";
import { brand } from "./utils/text";
import { app, store } from "./store/index";
import { static_serve } from "./middlewares/static";
import { User } from "./domains/user";
import v2_wechat_collection_list from "./pages/api/v2/wechat/collection/list";
import v2_wechat_auth_register from "./pages/api/v2/wechat/auth/register";
import v2_wechat_auth_login from "./pages/api/v2/wechat/auth/login";
import v2_wechat_history_delete from "./pages/api/v2/wechat/history/delete";
import v2_wechat_history_list from "./pages/api/v2/wechat/history/list";
import v2_wechat_history_update from "./pages/api/v2/wechat/history/update";
import v2_wechat_history_updated from "./pages/api/v2/wechat/history/updated";
import v2_wechat_media_list from "./pages/api/v2/wechat/media/list";
import v2_wechat_media_episode from "./pages/api/v2/wechat/media/episode";
import v2_wechat_media_playing from "./pages/api/v2/wechat/media/playing";
import v2_wechat_media_series from "./pages/api/v2/wechat/media/series";
import v2_wechat_member_token from "./pages/api/v2/wechat/member/token";
import v2_wechat_notification_list from "./pages/api/v2/wechat/notification/list";
import v2_wechat_notification_read_all from "./pages/api/v2/wechat/notification/read_all";
import v2_wechat_notification_read from "./pages/api/v2/wechat/notification/read";
import v2_wechat_report_create from "./pages/api/v2/wechat/report/create";
import v2_wechat_report_hide from "./pages/api/v2/wechat/report/hide";
import v2_wechat_report_list from "./pages/api/v2/wechat/report/list";
import v2_wechat_season_list from "./pages/api/v2/wechat/season/list";
import v2_wechat_source_index from "./pages/api/v2/wechat/source";
import v0_validate_index from "./pages/api/validate";
import v0_wechat_info from "./pages/api/info";
import v0_wechat_invitee_add from "./pages/api/invitee/add";
import v0_wechat_invitee_list from "./pages/api/invitee/list";
import v0_wechat_collection_list from "./pages/api/collection/list";
import v0_admin_parse from "./pages/api/admin/parse";
import v2_admin_drive_add from "./pages/api/v2/admin/drive/add";
import v2_admin_drive_list from "./pages/api/v2/admin/drive/list";
import v0_admin_drive_list from "./pages/api/admin/drive/list";
import v2_admin_analysis from "./pages/api/v2/admin/analysis";
import v2_admin_analysis_files from "./pages/api/v2/admin/analysis/files";
import v2_admin_analysis_new_files from "./pages/api/v2/admin/analysis/new_files";
import v2_admin_parsed_media_match_profile from "./pages/api/v2/admin/parsed_media/match_profile";
import v0_admin_person_list from "./pages/api/admin/person/list";
import v0_admin_check_same_name from "./pages/api/admin/shared_file/check_same_name";
import v2_admin_resource_files from "./pages/api/v2/admin/resource/files";
import v0_admin_shared_file_search from "./pages/api/admin/shared_file/search";
import v2_admin_resource_transfer from "./pages/api/v2/admin/resource/transfer";
import v0_admin_shared_file_save_list from "./pages/api/admin/shared_file_save/list";
import v0_admin_short_link from "./pages/api/admin/short_link";
import v0_history_update from "./pages/api/history/update";
import v0_history_list from "./pages/api/history/list";
import v0_admin_user_login from "./pages/api/admin/user/login";
import v0_admin_user_register from "./pages/api/admin/user/register";
import v0_admin_user_logout from "./pages/api/admin/user/logout";
import v0_admin_user_profile from "./pages/api/admin/user/profile";
import v0_admin_user_validate from "./pages/api/admin/user/validate";
import v2_common_analysis from "./pages/api/v2/common/analysis";
import v2_admin_collection_create from "./pages/api/v2/admin/collection/create";
import v2_admin_collection_list from "./pages/api/v2/admin/collection/list";
import v2_admin_collection_edit from "./pages/api/v2/admin/collection/edit";
import v2_admin_collection_profile from "./pages/api/v2/admin/collection/profile";
import v2_admin_collection_delete from "./pages/api/v2/admin/collection/delete";
import v2_admin_dashboard from "./pages/api/v2/admin/dashboard";
import v2_admin_dashboard_added_media from "./pages/api/v2/admin/dashboard/added_media";
import v2_admin_dashboard_refresh from "./pages/api/v2/admin/dashboard/refresh";
import v2_drive_file_list from "./pages/api/v2/drive/file/list";
import v2_drive_file_delete from "./pages/api/v2/drive/file/delete";
import v2_drive_file_download from "./pages/api/v2/drive/file/download";
import v2_drive_file_transfer from "./pages/api/v2/drive/file/transfer";
import v2_drive_file_to_resource_drive from "./pages/api/v2/drive/file/to_resource_drive";
import v2_drive_file_search from "./pages/api/v2/drive/file/search";
import v2_drive_file_rename from "./pages/api/v2/drive/file/rename";
import v2_admin_drive_delete from "./pages/api/v2/admin/drive/delete";
import v0_admin_tv_list from "./pages/api/admin/tv/list";
import v2_admin_sync_task_override from "./pages/api/v2/admin/sync_task/override";
import v2_admin_sync_task_delete from "./pages/api/v2/admin/sync_task/delete";
import v2_admin_sync_task_complete from "./pages/api/v2/admin/sync_task/complete";
import v2_admin_sync_task_run from "./pages/api/v2/admin/sync_task/run";
import v2_admin_sync_task_update from "./pages/api/v2/admin/sync_task/update";
import v2_admin_sync_task_partial from "./pages/api/v2/admin/sync_task/partial";
import v2_admin_sync_task_list from "./pages/api/v2/admin/sync_task/list";
import v2_admin_sync_task_create from "./pages/api/v2/admin/sync_task/create";
import v2_admin_parsed_media_source_preview from "./pages/api/v2/admin/parsed_media_source/preview";
import v2_admin_parsed_media_source_delete from "./pages/api/v2/admin/parsed_media_source/delete";
import v2_admin_parsed_media_source_set_profile from "./pages/api/v2/admin/parsed_media_source/set_profile";
import v2_admin_parsed_media_set_profile from "./pages/api/v2/admin/parsed_media/set_profile";
import v2_admin_parsed_media_set_profile_in_file_id from "./pages/api/v2/admin/parsed_media/set_profile_in_file_id";
import v2_admin_media_transfer from "./pages/api/v2/admin/media/transfer";
import v2_admin_media_refresh_profile from "./pages/api/v2/admin/media/refresh_profile";
import v2_admin_media_delete from "./pages/api/v2/admin/media/delete";
import v2_admin_media_to_resource_drive from "./pages/api/v2/admin/media/to_resource_drive";
import v2_admin_media_invalid from "./pages/api/v2/admin/media/invalid";
import v2_admin_media_archive_list from "./pages/api/v2/admin/media/archive/list";
import v2_admin_media_archive_partial from "./pages/api/v2/admin/media/archive/partial";
import v2_admin_movie_profile from "./pages/api/v2/admin/movie/profile";
import v2_admin_movie_list from "./pages/api/v2/admin/movie/list";
import v2_admin_season_list from "./pages/api/v2/admin/season/list";
import v2_admin_season_profile from "./pages/api/v2/admin/season/profile";
import v2_admin_season_partial from "./pages/api/v2/admin/season/partial";
import v2_media_profile_list from "./pages/api/v2/media_profile/list";
import v2_media_profile_partial from "./pages/api/v2/media_profile/partial";
import v2_media_profile_refresh from "./pages/api/v2/media_profile/refresh";
import v0_admin_member_add from "./pages/api/admin/member/add";
import v0_admin_settings_index from "./pages/api/admin/settings";
import v2_admin_subtitle_delete from "./pages/api/v2/admin/subtitle/delete";
import v2_admin_subtitle_list from "./pages/api/v2/admin/subtitle/list";
import v2_admin_subtitle_batch_create from "./pages/api/v2/admin/subtitle/batch_create";
import v2_admin_parsed_media_list from "./pages/api/v2/admin/parsed_media/list";
import v2_admin_parsed_media_source_list from "./pages/api/v2/admin/parsed_media_source/list";
import v2_admin_report_list from "./pages/api/v2/admin/report/list";
import v2_admin_report_reply from "./pages/api/v2/admin/report/reply";
import v2_media_profile_init_series from "./pages/api/v2/media_profile/init_series";
import v2_media_profile_init_season from "./pages/api/v2/media_profile/init_season";
import v2_media_profile_edit from "./pages/api/v2/media_profile/edit";
import v2_media_profile_delete from "./pages/api/v2/media_profile/delete";
import v2_media_profile_search_tmdb from "./pages/api/v2/media_profile/search_tmdb";
import v2_drive_rename_files from "./pages/api/v2/drive/rename_files";
import v2_media_profile_search from "./pages/api/v2/common/search";
import v2_admin_media_set_profile from "./pages/api/v2/admin/media/set_profile";
import v2_admin_task_status from "./pages/api/v2/admin/task/status";
import v2_admin_task_list from "./pages/api/v2/admin/task/list";
import v2_admin_task_pause from "./pages/api/v2/admin/task/pause";
import v2_admin_task_profile from "./pages/api/v2/admin/task/profile";
import v0_admin_member_list from "./pages/api/admin/member/list";
import v0_account_merge from "./pages/api/account/merge";
import v2_admin_member_list from "./pages/api/v2/admin/member/list";
import v2_admin_member_add from "./pages/api/v2/admin/member/add";
import v2_admin_member_add_token from "./pages/api/v2/admin/member/add_token";
import v2_admin_member_delete from "./pages/api/v2/admin/member/delete";
import v2_admin_member_profile from "./pages/api/v2/admin/member/profile";
import v2_admin_member_update_permission from "./pages/api/v2/admin/member/update_permission";
import v2_admin_subtitle_parse from "./pages/api/v2/admin/subtitle/parse";
import v2_admin_clear_thumbnails from "./pages/api/v2/admin/clear_thumbnails";
import v1_drive_find_first from "./pages/api/v1/drive/find_first";
import v1_drive_update from "./pages/api/v1/drive/update";
import v1_drive_token_update from "./pages/api/v1/drive_token/update";
import v1_user_find_first from "./pages/api/v1/user/find_first";
import v0_admin_user_existing from "./pages/api/admin/user/existing";
import v2_wechat_mine_update_email from "./pages/api/v2/wechat/mine/update_account";
import v2_admin_drive_refresh from "./pages/api/v2/admin/drive/refresh";
import v2_wechat_auth_code_create from "./pages/api/v2/wechat/auth/code/create";
import v2_wechat_auth_code_check from "./pages/api/v2/wechat/auth/code/check";
import v2_wechat_auth_code_confirm from "./pages/api/v2/wechat/auth/code/confirm";
import v0_admin_permission_list from "./pages/api/admin/permission/list";
import v0_admin_permission_add from "./pages/api/admin/permission/add";
import v0_admin_member_token_add from "./pages/api/admin/member/token/add/[id]";
import v2_wechat_code_list from "./pages/api/v2/wechat/code/list";
import v2_wechat_code_create from "./pages/api/v2/wechat/code/create";
import v2_wechat_mine_update_pwd from "./pages/api/v2/wechat/mine/update_pwd";
import v2_admin_settings_index from "./pages/api/v2/admin/settings/profile";
import v2_admin_settings_update from "./pages/api/v2/admin/settings/update";
import v2_wechat_rank from "./pages/api/v2/wechat/rank";
import v2_wechat_media_profile from "./pages/api/v2/wechat/media/profile";
import v2_admin_member_histories from "./pages/api/v2/admin/member/histories";
import v2_drive_file_profile from "./pages/api/v2/drive/file/profile";
import v2_wechat_mine_profile from "./pages/api/v2/wechat/mine/profile";
import v2_wechat_auth_weapp from "./pages/api/v2/wechat/auth/weapp";
import v2_wechat_diary_list from "./pages/api/v2/wechat/diary/list";
import v2_wechat_mine_bind_weapp from "./pages/api/v2/wechat/mine/bind_weapp";
// import v2_admin_drive_file_change_hash from "./pages/api/v2/drive/file/change_hash";
// import v2_admin_live_update from "./pages/api/v2/admin/live/update";
import v2_wechat_live_list from "./pages/api/v2/wechat/live/list";
import v2_admin_media_source_list from "./pages/api/v2/admin/media_source/list";
import v0_proxy from "./pages/api/proxy";
import v2_wechat_proxy from "./pages/api/v2/wechat/proxy";
import v2_admin_drive_set_root_folder from "./pages/api/v2/admin/drive/set_root_folder";
import v2_admin_drive_set_token from "./pages/api/v2/admin/drive/set_token";
import v2_admin_drive_export from "./pages/api/v2/admin/drive/export";
import v2_admin_drive_check_in from "./pages/api/v2/admin/drive/check_in";
import v2_admin_drive_update from "./pages/api/v2/admin/drive/update";
import v2_admin_drive_profile from "./pages/api/v2/admin/drive/profile";
import v2_drive_file_add from "./pages/api/v2/drive/file/add";
import v2_admin_drive_receive_rewards from "./pages/api/v2/admin/drive/receive_rewards";
import v2_admin_parsed_media_delete from "./pages/api/v2/admin/parsed_media/delete";
import v2_admin_sync_task_transfer_history from "./pages/api/v2/admin/sync_task/transfer_history_list";
import v2_admin_sync_task_search_history from "./pages/api/v2/admin/sync_task/search_history_list";
import v2_admin_collection_refresh_media_rank from "./pages/api/v2/admin/collection/update_media_rank";
import v2_media_profile_profile from "./pages/api/v2/media_profile/profile";
import { check_existing } from "./utils/fs";
import v2_media_profile_set_name from "./pages/api/v2/media_profile/set_name";
import v2_media_profile_series_profile from "./pages/api/v2/media_profile/series_profile";
import v2_aliyundrive_refresh from "./pages/api/v2/aliyundrive/refresh";
import v2_alipan_get_login_status from "./pages/api/v2/alipan/get_login_status";
import v2_alipan_get_qrcode from "./pages/api/v2/alipan/get_qrcode";
import v2_alipan_get_access_token from "./pages/api/v2/alipan/get_access_token";
import v2_local_file_list from "./pages/api/v2/drive/local_files";
import v2_admin_parsed_media_set_profile_after_create from "./pages/api/v2/admin/parsed_media/set_profile_after_create";

async function main() {
  const server = new Hono<{
    Bindings: {
      incoming: IncomingMessage;
    };
    Variables: {};
  }>();

  server.use(logger());
  server.use(
    "/mobile/*",
    static_serve({
      root: "./",
      rewriteRequestPath(filepath) {
        if (filepath.includes("assets")) {
          return path.join("./dist/assets", `./${filepath}`);
        }
        return "./dist/assets/mobile/index.html";
      },
    })
  );
  server.use(
    "/admin/*",
    static_serve({
      root: "./",
      rewriteRequestPath(filepath) {
        if (filepath.includes("assets")) {
          return path.join("./dist/assets", `./${filepath}`);
        }
        return "./dist/assets/admin/index.html";
      },
    })
  );
  server.use(
    "/pc/*",
    static_serve({
      root: "./",
      rewriteRequestPath(filepath) {
        if (filepath.includes("assets")) {
          return path.join("./dist/assets", `./${filepath}`);
        }
        return "./dist/assets/pc/index.html";
      },
    })
  );
  server.use(
    "/poster/*",
    static_serve({
      root: app.assets,
    })
  );
  server.use(
    "/m3u8/*",
    static_serve({
      root: app.assets,
    })
  );
  server.use(
    "/thumbnail/*",
    static_serve({
      root: app.assets,
    })
  );
  server.use(
    "/subtitle/*",
    static_serve({
      root: app.assets,
    })
  );
  server.use(
    "/logs/*",
    static_serve({
      root: app.root_path,
    })
  );
  // server.use(async (c, next) => {
  //   c.env.store = store;
  //   await next();
  // });

  server.get("/api/ping", async (c) => {
    return c.json({
      code: 0,
      msg: "ok",
      data: null,
    });
  });
  server.get("/api/proxy", async (c) => {
    return v0_proxy(...(await compat_next(c)));
  });
  /** 管理后台 */
  server.post("/api/admin/user/login", async (c) => {
    return v0_admin_user_login(...(await compat_next(c)));
  });
  server.post("/api/admin/user/register", async (c) => {
    return v0_admin_user_register(...(await compat_next(c)));
  });
  server.post("/api/admin/user/logout", async (c) => {
    return v0_admin_user_logout(...(await compat_next(c)));
  });
  server.post("/api/admin/user/profile", async (c) => {
    return v0_admin_user_profile(...(await compat_next(c)));
  });
  server.post("/api/admin/user/validate", async (c) => {
    return v0_admin_user_validate(...(await compat_next(c)));
  });
  server.get("/api/admin/user/existing", async (c) => {
    return v0_admin_user_existing(...(await compat_next(c)));
  });
  server.post("/api/admin/parse", async (c) => {
    return v0_admin_parse(...(await compat_next(c)));
  });
  server.post("/api/admin/drive/list", async (c) => {
    return v0_admin_drive_list(...(await compat_next(c)));
  });
  server.post("/api/admin/person/list", async (c) => {
    return v0_admin_person_list(...(await compat_next(c)));
  });
  server.post("/api/admin/shared_file/check_same_name", async (c) => {
    return v0_admin_check_same_name(...(await compat_next(c)));
  });
  server.post("/api/admin/shared_file/search", async (c) => {
    return v0_admin_shared_file_search(...(await compat_next(c)));
  });
  server.get("/api/admin/shared_file_save/list", async (c) => {
    return v0_admin_shared_file_save_list(...(await compat_next(c)));
  });
  server.get("/api/admin/short_link", async (c) => {
    return v0_admin_short_link(...(await compat_next(c)));
  });
  server.get("/api/admin/tv/list", async (c) => {
    return v0_admin_tv_list(...(await compat_next(c)));
  });
  server.post("/api/admin/member/list", async (c) => {
    return v0_admin_member_list(...(await compat_next(c)));
  });
  server.post("/api/admin/member/add", async (c) => {
    return v0_admin_member_add(...(await compat_next(c)));
  });
  server.post("/api/admin/member/token/add", async (c) => {
    return v0_admin_member_token_add(...(await compat_next(c)));
  });
  server.post("/api/admin/permission/list", async (c) => {
    return v0_admin_permission_list(...(await compat_next(c)));
  });
  server.post("/api/admin/permission/add", async (c) => {
    return v0_admin_permission_add(...(await compat_next(c)));
  });
  server.post("/api/admin/settings", async (c) => {
    return v0_admin_settings_index(...(await compat_next(c)));
  });
  server.post("/api/v1/drive/find_first", async (c) => {
    return v1_drive_find_first(...(await compat_next(c)));
  });
  server.post("/api/v1/drive/update", async (c) => {
    return v1_drive_update(...(await compat_next(c)));
  });
  server.post("/api/v1/drive_token/update", async (c) => {
    return v1_drive_token_update(...(await compat_next(c)));
  });
  server.post("/api/v1/user/find_first", async (c) => {
    return v1_user_find_first(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/dashboard", async (c) => {
    return v2_admin_dashboard(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/dashboard/refresh", async (c) => {
    return v2_admin_dashboard_refresh(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/dashboard/added_media", async (c) => {
    return v2_admin_dashboard_added_media(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/analysis", async (c) => {
    return v2_admin_analysis(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/analysis/files", async (c) => {
    return v2_admin_analysis_files(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/analysis/new_files", async (c) => {
    return v2_admin_analysis_new_files(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/drive/list", async (c) => {
    return v2_admin_drive_list(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/drive/add", async (c) => {
    return v2_admin_drive_add(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/drive/delete", async (c) => {
    return v2_admin_drive_delete(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/drive/profile", async (c) => {
    return v2_admin_drive_profile(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/drive/refresh", async (c) => {
    return v2_admin_drive_refresh(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/drive/set_token", async (c) => {
    return v2_admin_drive_set_token(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/drive/set_root_folder", async (c) => {
    return v2_admin_drive_set_root_folder(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/drive/export", async (c) => {
    return v2_admin_drive_export(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/drive/check_in", async (c) => {
    return v2_admin_drive_check_in(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/drive/receive_rewards", async (c) => {
    return v2_admin_drive_receive_rewards(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/drive/update", async (c) => {
    return v2_admin_drive_update(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/resource/files", async (c) => {
    return v2_admin_resource_files(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/resource/transfer", async (c) => {
    return v2_admin_resource_transfer(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/task/list", async (c) => {
    return v2_admin_task_list(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/task/status", async (c) => {
    return v2_admin_task_status(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/task/pause", async (c) => {
    return v2_admin_task_pause(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/task/profile", async (c) => {
    return v2_admin_task_profile(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/media/transfer", async (c) => {
    return v2_admin_media_transfer(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/media/archive/list", async (c) => {
    return v2_admin_media_archive_list(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/media/archive/partial", async (c) => {
    return v2_admin_media_archive_partial(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/media/to_resource_drive", async (c) => {
    return v2_admin_media_to_resource_drive(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/media/refresh_profile", async (c) => {
    return v2_admin_media_refresh_profile(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/media/invalid", async (c) => {
    return v2_admin_media_invalid(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/media/delete", async (c) => {
    return v2_admin_media_delete(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/media/set_profile", async (c) => {
    return v2_admin_media_set_profile(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/media_source/list", async (c) => {
    return v2_admin_media_source_list(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/season/list", async (c) => {
    return v2_admin_season_list(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/season/profile", async (c) => {
    return v2_admin_season_profile(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/season/partial", async (c) => {
    return v2_admin_season_partial(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/movie/list", async (c) => {
    return v2_admin_movie_list(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/movie/profile", async (c) => {
    return v2_admin_movie_profile(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/subtitle/list", async (c) => {
    return v2_admin_subtitle_list(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/subtitle/parse", async (c) => {
    return v2_admin_subtitle_parse(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/subtitle/batch_create", async (c) => {
    return v2_admin_subtitle_batch_create(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/subtitle/delete", async (c) => {
    return v2_admin_subtitle_delete(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/parsed_media/list", async (c) => {
    return v2_admin_parsed_media_list(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/parsed_media/set_profile", async (c) => {
    return v2_admin_parsed_media_set_profile(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/parsed_media/set_profile_after_create", async (c) => {
    return v2_admin_parsed_media_set_profile_after_create(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/parsed_media/set_profile_in_file_id", async (c) => {
    return v2_admin_parsed_media_set_profile_in_file_id(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/parsed_media/delete", async (c) => {
    return v2_admin_parsed_media_delete(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/parsed_media_source/list", async (c) => {
    return v2_admin_parsed_media_source_list(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/parsed_media_source/set_profile", async (c) => {
    return v2_admin_parsed_media_source_set_profile(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/parsed_media_source/delete", async (c) => {
    return v2_admin_parsed_media_source_delete(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/parsed_media_source/preview", async (c) => {
    return v2_admin_parsed_media_source_preview(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/member/list", async (c) => {
    return v2_admin_member_list(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/member/add", async (c) => {
    return v2_admin_member_add(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/member/profile", async (c) => {
    return v2_admin_member_profile(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/member/delete", async (c) => {
    return v2_admin_member_delete(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/member/update_permission", async (c) => {
    return v2_admin_member_update_permission(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/member/add_token", async (c) => {
    return v2_admin_member_add_token(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/member/histories", async (c) => {
    return v2_admin_member_histories(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/clear_thumbnails", async (c) => {
    return v2_admin_clear_thumbnails(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/collection/list", async (c) => {
    return v2_admin_collection_list(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/collection/create", async (c) => {
    return v2_admin_collection_create(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/collection/edit", async (c) => {
    return v2_admin_collection_edit(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/collection/delete", async (c) => {
    return v2_admin_collection_delete(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/collection/profile", async (c) => {
    return v2_admin_collection_profile(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/collection/refresh_media_rank", async (c) => {
    return v2_admin_collection_refresh_media_rank(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/sync_task/complete", async (c) => {
    return v2_admin_sync_task_complete(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/sync_task/run", async (c) => {
    return v2_admin_sync_task_run(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/sync_task/update", async (c) => {
    return v2_admin_sync_task_update(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/sync_task/partial", async (c) => {
    return v2_admin_sync_task_partial(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/sync_task/list", async (c) => {
    return v2_admin_sync_task_list(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/sync_task/create", async (c) => {
    return v2_admin_sync_task_create(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/sync_task/delete", async (c) => {
    return v2_admin_sync_task_delete(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/sync_task/override", async (c) => {
    return v2_admin_sync_task_override(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/sync_task/transfer_history", async (c) => {
    return v2_admin_sync_task_transfer_history(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/sync_task/search_history", async (c) => {
    return v2_admin_sync_task_search_history(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/report/list", async (c) => {
    return v2_admin_report_list(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/report/reply", async (c) => {
    return v2_admin_report_reply(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/settings/profile", async (c) => {
    return v2_admin_settings_index(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/settings/update", async (c) => {
    return v2_admin_settings_update(...(await compat_next(c)));
  });
  // server.post("/api/v2/admin/live/update", async (c) => {
  //   return v2_admin_live_update(...(await compat_next(c)));
  // });
  server.post("/api/v2/parsed_media/match_profile", async (c) => {
    return v2_admin_parsed_media_match_profile(...(await compat_next(c)));
  });
  server.post("/api/v2/drive/file/add", async (c) => {
    return v2_drive_file_add(...(await compat_next(c)));
  });
  server.post("/api/v2/drive/file/list", async (c) => {
    return v2_drive_file_list(...(await compat_next(c)));
  });
  server.post("/api/v2/drive/file/profile", async (c) => {
    return v2_drive_file_profile(...(await compat_next(c)));
  });
  server.post("/api/v2/drive/file/delete", async (c) => {
    return v2_drive_file_delete(...(await compat_next(c)));
  });
  // server.post("/api/v2/drive/file/change_hash", async (c) => {
  //   return v2_admin_drive_file_change_hash(...(await compat_next(c)));
  // });
  server.post("/api/v2/drive/file/download", async (c) => {
    return v2_drive_file_download(...(await compat_next(c)));
  });
  server.post("/api/v2/drive/file/transfer", async (c) => {
    return v2_drive_file_transfer(...(await compat_next(c)));
  });
  server.post("/api/v2/drive/file/to_resource_drive", async (c) => {
    return v2_drive_file_to_resource_drive(...(await compat_next(c)));
  });
  server.post("/api/v2/drive/file/search", async (c) => {
    return v2_drive_file_search(...(await compat_next(c)));
  });
  server.post("/api/v2/drive/file/rename", async (c) => {
    return v2_drive_file_rename(...(await compat_next(c)));
  });
  server.post("/api/v2/drive/rename_files", async (c) => {
    return v2_drive_rename_files(...(await compat_next(c)));
  });
  server.post("/api/v2/local_file/list", async (c) => {
    return v2_local_file_list(...(await compat_next(c)));
  });
  server.post("/api/v2/media_profile/list", async (c) => {
    return v2_media_profile_list(...(await compat_next(c)));
  });
  server.post("/api/v2/media_profile/search", async (c) => {
    return v2_media_profile_search(...(await compat_next(c)));
  });
  server.post("/api/v2/media_profile/partial", async (c) => {
    return v2_media_profile_partial(...(await compat_next(c)));
  });
  server.post("/api/v2/media_profile/profile", async (c) => {
    return v2_media_profile_profile(...(await compat_next(c)));
  });
  server.post("/api/v2/media_profile/series_profile", async (c) => {
    return v2_media_profile_series_profile(...(await compat_next(c)));
  });
  server.post("/api/v2/media_profile/set_name", async (c) => {
    return v2_media_profile_set_name(...(await compat_next(c)));
  });
  server.post("/api/v2/media_profile/refresh", async (c) => {
    return v2_media_profile_refresh(...(await compat_next(c)));
  });
  server.post("/api/v2/media_profile/init_series", async (c) => {
    return v2_media_profile_init_series(...(await compat_next(c)));
  });
  server.post("/api/v2/media_profile/init_season", async (c) => {
    return v2_media_profile_init_season(...(await compat_next(c)));
  });
  server.post("/api/v2/media_profile/edit", async (c) => {
    return v2_media_profile_edit(...(await compat_next(c)));
  });
  server.post("/api/v2/media_profile/delete", async (c) => {
    return v2_media_profile_delete(...(await compat_next(c)));
  });
  server.post("/api/v2/media_profile/search_tmdb", async (c) => {
    return v2_media_profile_search_tmdb(...(await compat_next(c)));
  });
  server.post("/api/v2/common/analysis", async (c) => {
    return v2_common_analysis(...(await compat_next(c)));
  });

  /** 主站 */
  server.get("/api/history", async (c) => {
    return v0_history_list(...(await compat_next(c)));
  });
  server.get("/api/history/list", async (c) => {
    return v0_history_list(...(await compat_next(c)));
  });
  server.post("/api/history/update", async (c) => {
    return v0_history_update(...(await compat_next(c)));
  });
  server.post("/api/invitee/add", async (c) => {
    return v0_wechat_invitee_add(...(await compat_next(c)));
  });
  server.get("/api/invitee/list", async (c) => {
    return v0_wechat_invitee_list(...(await compat_next(c)));
  });
  server.get("/api/info", async (c) => {
    return v0_wechat_info(...(await compat_next(c)));
  });
  server.post("/api/account/merge", async (c) => {
    return v0_account_merge(...(await compat_next(c)));
  });
  server.post("/api/collection/list", async (c) => {
    return v0_wechat_collection_list(...(await compat_next(c)));
  });
  server.post("/api/validate", async (c) => {
    return v0_validate_index(...(await compat_next(c)));
  });

  server.post("/api/v2/wechat/auth/login", async (c) => {
    return v2_wechat_auth_login(...(await compat_next(c)));
  });
  server.post("/api/v2/wechat/auth/register", async (c) => {
    return v2_wechat_auth_register(...(await compat_next(c)));
  });
  server.post("/api/v2/wechat/auth/code/create", async (c) => {
    return v2_wechat_auth_code_create(...(await compat_next(c)));
  });
  server.post("/api/v2/wechat/auth/code/check", async (c) => {
    return v2_wechat_auth_code_check(...(await compat_next(c)));
  });
  server.post("/api/v2/wechat/auth/code/confirm", async (c) => {
    return v2_wechat_auth_code_confirm(...(await compat_next(c)));
  });
  server.post("/api/v2/wechat/auth/weapp", async (c) => {
    return v2_wechat_auth_weapp(...(await compat_next(c)));
  });
  server.post("/api/v2/wechat/mine/update_email", async (c) => {
    return v2_wechat_mine_update_email(...(await compat_next(c)));
  });
  server.post("/api/v2/wechat/mine/update_pwd", async (c) => {
    return v2_wechat_mine_update_pwd(...(await compat_next(c)));
  });
  server.post("/api/v2/wechat/mine/profile", async (c) => {
    return v2_wechat_mine_profile(...(await compat_next(c)));
  });
  server.post("/api/v2/wechat/mine/bind_weapp", async (c) => {
    return v2_wechat_mine_bind_weapp(...(await compat_next(c)));
  });
  server.post("/api/v2/wechat/collection/list", async (c) => {
    return v2_wechat_collection_list(...(await compat_next(c)));
  });
  server.post("/api/v2/wechat/history/delete", async (c) => {
    return v2_wechat_history_delete(...(await compat_next(c)));
  });
  server.post("/api/v2/wechat/history/list", async (c) => {
    return v2_wechat_history_list(...(await compat_next(c)));
  });
  server.post("/api/v2/wechat/history/update", async (c) => {
    return v2_wechat_history_update(...(await compat_next(c)));
  });
  server.post("/api/v2/wechat/history/updated", async (c) => {
    return v2_wechat_history_updated(...(await compat_next(c)));
  });
  server.post("/api/v2/wechat/media/episode", async (c) => {
    return v2_wechat_media_episode(...(await compat_next(c)));
  });
  server.post("/api/v2/wechat/media/profile", async (c) => {
    return v2_wechat_media_profile(...(await compat_next(c)));
  });
  server.post("/api/v2/wechat/media/list", async (c) => {
    return v2_wechat_media_list(...(await compat_next(c)));
  });
  server.post("/api/v2/wechat/media/playing", async (c) => {
    return v2_wechat_media_playing(...(await compat_next(c)));
  });
  server.post("/api/v2/wechat/media/series", async (c) => {
    return v2_wechat_media_series(...(await compat_next(c)));
  });
  server.post("/api/v2/wechat/member/token", async (c) => {
    return v2_wechat_member_token(...(await compat_next(c)));
  });
  server.post("/api/v2/wechat/invitation_code/list", async (c) => {
    return v2_wechat_code_list(...(await compat_next(c)));
  });
  server.post("/api/v2/wechat/invitation_code/create", async (c) => {
    return v2_wechat_code_create(...(await compat_next(c)));
  });
  server.post("/api/v2/wechat/notification/list", async (c) => {
    return v2_wechat_notification_list(...(await compat_next(c)));
  });
  server.post("/api/v2/wechat/notification/read_all", async (c) => {
    return v2_wechat_notification_read_all(...(await compat_next(c)));
  });
  server.post("/api/v2/wechat/notification/read", async (c) => {
    return v2_wechat_notification_read(...(await compat_next(c)));
  });
  server.post("/api/v2/wechat/report/create", async (c) => {
    return v2_wechat_report_create(...(await compat_next(c)));
  });
  server.post("/api/v2/wechat/report/hide", async (c) => {
    return v2_wechat_report_hide(...(await compat_next(c)));
  });
  server.post("/api/v2/wechat/report/list", async (c) => {
    return v2_wechat_report_list(...(await compat_next(c)));
  });
  server.post("/api/v2/wechat/season/list", async (c) => {
    return v2_wechat_season_list(...(await compat_next(c)));
  });
  server.post("/api/v2/wechat/source", async (c) => {
    return v2_wechat_source_index(...(await compat_next(c)));
  });
  server.post("/api/v2/wechat/rank", async (c) => {
    return v2_wechat_rank(...(await compat_next(c)));
  });
  server.post("/api/v2/wechat/diary/list", async (c) => {
    return v2_wechat_diary_list(...(await compat_next(c)));
  });
  server.post("/api/v2/wechat/live/list", async (c) => {
    return v2_wechat_live_list(...(await compat_next(c)));
  });
  server.post("/api/v2/aliyundrive/refresh", async (c) => {
    return v2_aliyundrive_refresh(...(await compat_next(c)));
  });
  server.post("/api/v2/alipan/get_qrcode", async (c) => {
    return v2_alipan_get_qrcode(...(await compat_next(c)));
  });
  server.post("/api/v2/alipan/get_login_status", async (c) => {
    return v2_alipan_get_login_status(...(await compat_next(c)));
  });
  server.post("/api/v2/alipan/get_access_token", async (c) => {
    return v2_alipan_get_access_token(...(await compat_next(c)));
  });
  server.get("/api/v2/wechat/proxy", async (c) => {
    return v2_wechat_proxy(...(await compat_next(c)));
  });

  const r = await check_existing(app.database_path);
  if (r.error) {
    console.log("数据库校验失败", r.error.message);
    return;
  }
  if (!r.data) {
    console.log("数据库文件不存在，请先初始化数据库");
    console.log("yarn prisma migrate deploy --schema ./prisma/schema.prisma");
    return;
  }
  try {
    const admin = await store.prisma.user.findFirst({});
    if (!admin) {
      const email = "admin@flix.com";
      const pwd = random_string(6);
      const r = await User.Create({ email, password: pwd }, store);
      if (r.error) {
        console.log("初始化管理员账号失败");
        console.log(r.error.message);
        return;
      }
      console.log("");
      console.log("管理员信息");
      console.log("帐号", email);
      console.log("密码", pwd);
      console.log("");
    }
  } catch (err) {
    const e = err as Error;
    console.log("初始化管理员账号失败");
    console.log(e.message);
    return;
  }
  serve(
    {
      fetch: server.fetch,
      port: (() => {
        if (app.env.PORT) {
          return Number(app.env.PORT);
        }
        if (app.args.port) {
          return app.args.port;
        }
        return 3200;
      })(),
    },
    (info) => {
      const { address, port } = info;
      brand();
      console.log("Env");
      console.log("----------");
      console.log();
      const env_keys = ["ROOT_DIR", "PORT"];
      Object.keys(app.env)
        .filter((key) => env_keys.includes(key))
        .forEach((key) => {
          console.log(`${key}    ${app.env[key as keyof typeof app.env]}`);
        });
      console.log("Args");
      console.log("----------");
      Object.keys(app.args).forEach((key) => {
        console.log(`${key.toUpperCase()}    ${app.args[key as keyof typeof app.args]}`);
      });
      console.log();
      console.log("Paths");
      console.log("----------");
      console.log("静态资源", app.assets);
      console.log("数据库", app.database_path);
      console.log();
      console.log();
      console.log();
      console.log("> 管理后台");
      console.log(`http://${address}:${port}/admin/home/index`);
      console.log("> 视频播放移动端");
      console.log(`http://${address}:${port}/mobile/home/index`);
      console.log("> 视频播放桌面端");
      console.log(`http://${address}:${port}/pc/home/index`);
    }
  );
}
main();

process.on("uncaughtException", (err) => {
  const error = err as unknown as { code: string; address: string; port: number };
  if (error.code === "EADDRINUSE") {
    console.log(`${error.address}:${error.port} 已经被使用，请指定其他端口`);
    console.log("yarn start --port 3001");
    return;
  }
});
