import { IncomingMessage } from "http";

import { Hono } from "hono";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
// import { serveStatic as static_serve } from "@hono/node-server/serve-static";

import { compat_next } from "./utils/server";
import { brand } from "./utils/text";
import { app, store } from "./store/index";
import { static_serve } from "./middlewares/static";
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
import v0_admin_drive_list from "./pages/api/admin/drive/list";
import v2_admin_analysis from "./pages/api/v2/admin/analysis";
import v2_admin_analysis_files from "./pages/api/v2/admin/analysis/files";
import v2_admin_analysis_new_files from "./pages/api/v2/admin/analysis/new_files";
import v2_admin_parsed_media_match_profile from "./pages/api/v2/admin/parsed_media/match_profile";
import v2_drive_update from "./pages/api/v2/drive/update";
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
import v2_drive_file_profile from "./pages/api/v2/drive/file/profile";
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
import v2_admin_sync_task_run_all from "./pages/api/v2/admin/sync_task/run_all";
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
import v2_wechat_code_list from "./pages/api/v2/wechat/code/list";
import v2_wechat_code_create from "./pages/api/v2/wechat/code/create";
import v2_wechat_mine_update_pwd from "./pages/api/v2/wechat/mine/update_pwd";
import dayjs from "dayjs";
import v2_admin_settings_index from "./pages/api/v2/admin/settings/profile";
import v2_admin_settings_update from "./pages/api/v2/admin/settings/update";
import v2_wechat_rank from "./pages/api/v2/wechat/rank";

// const ROOT_DIR = process.env.ROOT_DIR;

async function main() {
  // if (!ROOT_DIR) {
  //   console.log("缺少环境变量 ROOT_DIR");
  //   return;
  // }
  //   const application = new Application({
  //     root_path: ROOT_DIR,
  //   });
  const server = new Hono<{
    Bindings: {
      incoming: IncomingMessage;
    };
    Variables: {};
  }>();
  // const args = parse_argv<{ port: number }>(process.argv.slice(2));

  // server.use(logger());
  // server.use(async (c, next) => {
  //   console.log(`[${c.req.method}] ${c.req.url}`);
  //   await next();
  // });
  server.use(
    "/mobile/*",
    static_serve({
      root: "./",
      rewriteRequestPath(path) {
        if (path.includes("assets")) {
          return path;
        }
        return "./mobile/index.html";
      },
    })
  );
  server.use(
    "/admin/*",
    static_serve({
      root: "./",
      rewriteRequestPath(path) {
        if (path.includes("assets")) {
          return path;
        }
        return "./admin/index.html";
      },
    })
  );
  server.use(
    "/pc/*",
    static_serve({
      root: "./",
      rewriteRequestPath(path) {
        if (path.includes("assets")) {
          return path;
        }
        return "./pc/index.html";
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
    return v0_admin_member_add(...(await compat_next(c)));
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
  server.post("/api/v2/admin/drive/add", async (c) => {
    return v2_admin_drive_delete(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/drive/delete", async (c) => {
    return v2_admin_drive_add(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/drive/refresh", async (c) => {
    return v2_admin_drive_refresh(...(await compat_next(c)));
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
  server.post("/api/v2/admin/parsed_media/set_profile_in_file_id", async (c) => {
    return v2_admin_parsed_media_set_profile_in_file_id(...(await compat_next(c)));
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
  server.post("/api/v2/admin/sync_task/complete", async (c) => {
    return v2_admin_sync_task_complete(...(await compat_next(c)));
  });
  server.post("/api/v2/admin/sync_task/run_all", async (c) => {
    return v2_admin_sync_task_run_all(...(await compat_next(c)));
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
  server.post("/api/v2/parsed_media/match_profile", async (c) => {
    return v2_admin_parsed_media_match_profile(...(await compat_next(c)));
  });
  server.post("/api/v2/drive/update", async (c) => {
    return v2_drive_update(...(await compat_next(c)));
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
  server.post("/api/v2/aliyundrive/file_profile", async (c) => {
    return v2_drive_update(...(await compat_next(c)));
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
  server.post("/api/v2/wechat/mine/update_email", async (c) => {
    return v2_wechat_mine_update_email(...(await compat_next(c)));
  });
  server.post("/api/v2/wechat/mine/update_pwd", async (c) => {
    return v2_wechat_mine_update_pwd(...(await compat_next(c)));
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
  server.get("/api/v1/qrcode", async (c) => {
    const escape = (v: string) => {
      const needsEscape = ['"', ";", ",", ":", "\\"];
      let escaped = "";
      for (const c of v) {
        if (needsEscape.includes(c)) {
          escaped += `\\${c}`;
        } else {
          escaped += c;
        }
      }
      return escaped;
    };
    const ssid = "wpt-guest";
    const password = `wpt${dayjs().format("YYYYMMDD")}`;
    const props = {
      settings: {
        encryptionMode: "WPA",
        eapMethod: "",
        eapIdentity: "",
        ssid,
        password,
        hiddenSSID: false,
      },
    };
    const opts: Partial<{ T: string; E: string; I: string; S: string; P: string; H: boolean }> = {};
    opts.T = props.settings.encryptionMode || "nopass";
    if (props.settings.encryptionMode === "WPA2-EAP") {
      opts.E = props.settings.eapMethod;
      opts.I = props.settings.eapIdentity;
    }
    opts.S = escape(props.settings.ssid);
    opts.P = escape(props.settings.password);
    opts.H = props.settings.hiddenSSID;
    let data = "";
    Object.entries(opts).forEach(([k, v]) => (data += `${k}:${v};`));
    const qrval = `WIFI:${data};`;
    return c.text(qrval);
  });

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
      console.log("Assets", app.assets);
      console.log("Database ", app.database_path);
      console.log();
      console.log();
      console.log();
      const pathname = "/admin/home/index";
      console.log(`> Ready on http://${address}:${port}${pathname}`);
    }
  );
}
main();
