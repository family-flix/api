package handler

import (
	"io/fs"
	"net/http"
	"os"
	"path/filepath"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"

	"github.com/family-flix/api/frontend"
	"github.com/family-flix/api/internal/repository"
	"github.com/family-flix/api/internal/service"
	"github.com/family-flix/api/pkg/ffmpeg"
)

type BaseHandler struct {
	db        *gorm.DB
	baseDir   string
	cacheDir  string
	ffmpegBin string
}

func (h *BaseHandler) NewContext(ec echo.Context) Context {
	return NewEchoContext(ec, h.db, h.baseDir, h.cacheDir, h.ffmpegBin)
}

func SetupRouter(e *echo.Echo, db *gorm.DB, baseDir, cache_dir, ffmpeg_bin string, localFileIgnoreNames []string) {
	// Dependencies
	historyRepo := repository.NewHistoryRepository(db)
	collectionRepo := repository.NewCollectionRepository(db)
	historyService := service.NewHistoryService(historyRepo)
	collectionService := service.NewCollectionService(collectionRepo)
	driveRepo := repository.NewDriveRepository(db)
	driveService := service.NewDriveService(driveRepo)
	mediaRepo := repository.NewMediaRepository(db)
	mediaService := service.NewMediaService(mediaRepo)
	userRepo := repository.NewUserRepository(db)
	userService := service.NewUserService(userRepo)
	memberRepo := repository.NewMemberRepository(db)
	memberService := service.NewMemberService(memberRepo, userService)
	mediaProfileRepo := repository.NewMediaProfileRepository(db)
	mediaProfileService := service.NewMediaProfileService(mediaProfileRepo)
	taskRepo := repository.NewTaskRepository(db)
	taskService := service.NewTaskService(taskRepo)
	syncTaskRepo := repository.NewSyncTaskRepository(db)
	syncTaskService := service.NewSyncTaskService(syncTaskRepo)
	reportRepo := repository.NewReportRepository(db)
	reportService := service.NewReportService(reportRepo)
	settingsRepo := repository.NewSettingsRepository(db)
	settingsService := service.NewSettingsService(settingsRepo)
	dashboardRepo := repository.NewDashboardRepository(db)
	dashboardService := service.NewDashboardService(dashboardRepo)
	toolRepo := repository.NewToolRepository(db)
	toolService := service.NewToolService(toolRepo)
	wechatRepo := repository.NewWechatRepository(db)
	wechatService := service.NewWechatService(wechatRepo, userService, driveService)

	// Handlers
	commonHandler := NewCommonHandler(db, baseDir, cache_dir, ffmpeg_bin)
	memberHandler := NewMemberHandler(historyService, collectionService, memberService, db, baseDir, cache_dir, ffmpeg_bin)
	adminCollectionHandler := NewAdminCollectionHandler(collectionService, db, baseDir, cache_dir, ffmpeg_bin)
	adminDriveHandler := NewAdminDriveHandler(driveService, db, baseDir, cache_dir, ffmpeg_bin, localFileIgnoreNames)
	adminMediaHandler := NewAdminMediaHandler(mediaService, db, baseDir, cache_dir, ffmpeg_bin)
	adminUserHandler := NewAdminUserHandler(userService, memberService, db, baseDir, cache_dir, ffmpeg_bin)
	mediaProfileHandler := NewMediaProfileHandler(mediaProfileService, db, baseDir, cache_dir, ffmpeg_bin)
	taskHandler := NewTaskHandler(taskService, db, baseDir, cache_dir, ffmpeg_bin)
	syncTaskHandler := NewSyncTaskHandler(syncTaskService, db, baseDir, cache_dir, ffmpeg_bin)
	reportHandler := NewReportHandler(reportService, db, baseDir, cache_dir, ffmpeg_bin)
	settingsHandler := NewSettingsHandler(settingsService, db, baseDir, cache_dir, ffmpeg_bin)
	dashboardHandler := NewDashboardHandler(dashboardService, db, baseDir, cache_dir, ffmpeg_bin)
	systemHandler := NewSystemHandler(historyService, db, baseDir, cache_dir, ffmpeg_bin)
	toolHandler := NewToolHandler(toolService, db, baseDir, cache_dir, ffmpeg_bin)
	wechatHandler := NewWechatHandler(wechatService, historyService, db, baseDir, cache_dir, ffmpeg_bin)
	analysisHandler := NewAnalysisHandler(db, baseDir, cache_dir, ffmpeg_bin)

	e.GET("/api/ping", commonHandler.Ping)
	e.GET("/favicon.ico", commonHandler.Favicon)
	e.GET("/api/proxy", commonHandler.Proxy)
	e.GET("/api/proxy/javbus", commonHandler.ProxyJavbus)

	e.POST("/api/admin/user/login", adminUserHandler.Login)
	e.POST("/api/admin/user/register", adminUserHandler.Register)
	e.POST("/api/admin/user/logout", adminUserHandler.Logout)
	e.POST("/api/admin/user/profile", adminUserHandler.Profile)
	e.POST("/api/admin/user/validate", adminUserHandler.Validate)
	e.GET("/api/admin/user/existing", adminUserHandler.Existing)
	e.POST("/api/admin/drive/list", adminDriveHandler.List)
	e.POST("/api/admin/parse", toolHandler.Parse)
	e.POST("/api/admin/person/list", systemHandler.PersonList)
	e.POST("/api/admin/shared_file/check_same_name", toolHandler.SharedFileCheckSameName)
	e.POST("/api/admin/shared_file/search", toolHandler.SharedFileSearch)
	e.GET("/api/admin/shared_file_save/list", toolHandler.SharedFileSaveList)
	e.GET("/api/admin/short_link", toolHandler.ShortLink)
	e.GET("/api/admin/tv/list", adminMediaHandler.AdminTvList)
	e.POST("/api/admin/member/list", adminUserHandler.MemberList)
	e.POST("/api/admin/member/add", adminUserHandler.MemberAdd)
	e.POST("/api/admin/member/token/add", adminUserHandler.MemberAddToken)
	e.POST("/api/admin/permission/list", adminUserHandler.PermissionList)
	e.POST("/api/admin/permission/add", adminUserHandler.PermissionAdd)
	e.POST("/api/admin/settings", settingsHandler.Profile)

	e.POST("/api/v1/drive/find_first", adminDriveHandler.V1FindFirst)
	e.POST("/api/v1/drive/update", adminDriveHandler.V1Update)
	e.POST("/api/v1/drive_token/update", adminDriveHandler.V1TokenUpdate)
	e.POST("/api/v1/user/find_first", memberHandler.V1UserFindFirst)

	e.POST("/api/v2/admin/dashboard", dashboardHandler.Dashboard)
	e.POST("/api/v2/admin/dashboard/refresh", dashboardHandler.Refresh)
	e.POST("/api/v2/admin/dashboard/added_media", dashboardHandler.AddedMedia)
	e.POST("/api/v2/admin/analysis", analysisHandler.AdminAnalysis)
	e.POST("/api/v2/admin/analysis/files", analysisHandler.AdminAnalysisFiles)
	e.POST("/api/v2/admin/analysis/new_files", analysisHandler.AdminAnalysisNewFiles)
	e.POST("/api/v2/admin/drive/list", adminDriveHandler.List)
	e.POST("/api/v2/admin/drive/add", adminDriveHandler.Add)
	e.POST("/api/v2/admin/drive/delete", adminDriveHandler.Delete)
	e.POST("/api/v2/admin/drive/profile", adminDriveHandler.Profile)
	e.POST("/api/v2/admin/drive/refresh", adminDriveHandler.Refresh)
	e.POST("/api/v2/admin/drive/set_token", adminDriveHandler.SetToken)
	e.POST("/api/v2/admin/drive/set_root_folder", adminDriveHandler.SetRootFolder)
	e.POST("/api/v2/admin/drive/export", adminDriveHandler.Export)
	e.POST("/api/v2/admin/drive/check_in", adminDriveHandler.CheckIn)
	e.POST("/api/v2/admin/drive/receive_rewards", adminDriveHandler.ReceiveRewards)
	e.POST("/api/v2/admin/drive/update", adminDriveHandler.Update)
	e.POST("/api/v2/admin/resource/files", systemHandler.ResourceFiles)
	e.POST("/api/v2/admin/resource/transfer", systemHandler.ResourceTransfer)
	e.POST("/api/v2/admin/task/list", taskHandler.List)
	e.POST("/api/v2/admin/task/status", taskHandler.Status)
	e.POST("/api/v2/admin/task/pause", taskHandler.Pause)
	e.POST("/api/v2/admin/task/profile", taskHandler.Profile)
	e.POST("/api/v2/admin/media/transfer", adminMediaHandler.Transfer)
	e.POST("/api/v2/admin/media/archive/list", adminMediaHandler.ArchiveList)
	e.POST("/api/v2/admin/media/archive/partial", adminMediaHandler.ArchivePartial)
	e.POST("/api/v2/admin/media/to_resource_drive", adminMediaHandler.ToResourceDrive)
	e.POST("/api/v2/admin/media/refresh_profile", adminMediaHandler.RefreshProfile)
	e.POST("/api/v2/admin/media/invalid", adminMediaHandler.ListInvalidMedia)
	e.POST("/api/v2/admin/media/delete", adminMediaHandler.DeleteMedia)
	e.POST("/api/v2/admin/media/set_profile", adminMediaHandler.SetProfile)
	e.POST("/api/v2/admin/media_source/list", adminMediaHandler.ListMediaSource)
	e.POST("/api/v2/admin/season/list", adminMediaHandler.ListSeason)
	e.POST("/api/v2/admin/season/profile", adminMediaHandler.GetSeasonProfile)
	e.POST("/api/v2/admin/season/partial", adminMediaHandler.GetSeasonPartial)
	e.POST("/api/v2/admin/movie/list", adminMediaHandler.ListMovie)
	e.POST("/api/v2/admin/movie/profile", adminMediaHandler.GetMovieProfile)
	e.POST("/api/v2/admin/av/list", adminMediaHandler.ListAV)
	e.POST("/api/v2/admin/av/profile", adminMediaHandler.GetAVProfile)
	e.POST("/api/v2/admin/artist/list", adminMediaHandler.ListArtist)
	e.POST("/api/v2/admin/subtitle/list", adminMediaHandler.ListSubtitle)
	e.POST("/api/v2/admin/subtitle/parse", adminMediaHandler.AdminSubtitleParse)
	e.POST("/api/v2/admin/subtitle/batch_create", adminMediaHandler.AdminSubtitleBatchCreate)
	e.POST("/api/v2/admin/subtitle/delete", adminMediaHandler.DeleteSubtitle)
	e.POST("/api/v2/admin/parsed_media/list", adminMediaHandler.AdminParsedMediaList)
	e.POST("/api/v2/admin/parsed_media/set_profile", adminMediaHandler.SetParsedMediaProfile)
	e.POST("/api/v2/admin/parsed_media/set_profile_after_create", adminMediaHandler.SetParsedMediaProfileAfterCreate)
	e.POST("/api/v2/admin/parsed_media/set_profile_in_file_id", adminMediaHandler.SetParsedMediaProfileByFileID)
	e.POST("/api/v2/admin/parsed_media/delete", adminMediaHandler.AdminParsedMediaDelete)
	e.POST("/api/v2/admin/parsed_media_source/list", adminMediaHandler.AdminParsedMediaSourceList)
	e.POST("/api/v2/admin/parsed_media_source/set_profile", adminMediaHandler.AdminParsedMediaSourceSetProfile)
	e.POST("/api/v2/admin/parsed_media_source/delete", adminMediaHandler.AdminParsedMediaSourceDelete)
	e.POST("/api/v2/admin/parsed_media_source/preview", adminMediaHandler.AdminParsedMediaSourcePreview)
	e.POST("/api/v2/admin/member/list", adminUserHandler.MemberList)
	e.POST("/api/v2/admin/member/add", adminUserHandler.MemberAdd)
	e.POST("/api/v2/admin/member/profile", adminUserHandler.MemberProfile)
	e.POST("/api/v2/admin/member/delete", adminUserHandler.MemberDelete)
	e.POST("/api/v2/admin/member/update_permission", adminUserHandler.MemberUpdatePermission)
	e.POST("/api/v2/admin/member/add_token", adminUserHandler.MemberAddToken)
	e.POST("/api/v2/admin/member/histories", adminUserHandler.MemberHistories)
	e.POST("/api/v2/admin/clear_thumbnails", systemHandler.ClearThumbnails)
	e.POST("/api/v2/admin/collection/list", adminCollectionHandler.List)
	e.POST("/api/v2/admin/collection/create", adminCollectionHandler.Create)
	e.POST("/api/v2/admin/collection/edit", adminCollectionHandler.Edit)
	e.POST("/api/v2/admin/collection/delete", adminCollectionHandler.Delete)
	e.POST("/api/v2/admin/collection/profile", adminCollectionHandler.Profile)
	e.POST("/api/v2/admin/collection/refresh_media_rank", adminCollectionHandler.RefreshMediaRank)
	e.POST("/api/v2/admin/sync_task/complete", syncTaskHandler.Complete)
	e.POST("/api/v2/admin/sync_task/run", syncTaskHandler.Run)
	e.POST("/api/v2/admin/sync_task/update", syncTaskHandler.Update)
	e.POST("/api/v2/admin/sync_task/partial", syncTaskHandler.Partial)
	e.POST("/api/v2/admin/sync_task/list", syncTaskHandler.List)
	e.POST("/api/v2/admin/sync_task/create", syncTaskHandler.Create)
	e.POST("/api/v2/admin/sync_task/delete", syncTaskHandler.Delete)
	e.POST("/api/v2/admin/sync_task/override", syncTaskHandler.Override)
	e.POST("/api/v2/admin/sync_task/transfer_history", syncTaskHandler.TransferHistory)
	e.POST("/api/v2/admin/sync_task/search_history", syncTaskHandler.SearchHistory)
	e.POST("/api/v2/admin/report/list", reportHandler.List)
	e.POST("/api/v2/admin/report/reply", reportHandler.Reply)
	e.POST("/api/v2/admin/settings/profile", settingsHandler.Profile)
	e.POST("/api/v2/admin/settings/update", settingsHandler.Update)
	e.POST("/api/v2/parsed_media/match_profile", adminMediaHandler.AdminParsedMediaMatchProfile)

	e.POST("/api/v2/drive/file/add", adminDriveHandler.FileAdd)
	e.POST("/api/v2/drive/file/list", adminDriveHandler.FileList)
	e.POST("/api/v2/drive/file/profile", adminDriveHandler.FileProfile)
	e.POST("/api/v2/drive/file/delete", adminDriveHandler.FileDelete)
	e.POST("/api/v2/drive/file/download", adminDriveHandler.FileDownload)
	e.POST("/api/v2/drive/file/transfer", adminDriveHandler.FileTransfer)
	e.POST("/api/v2/drive/file/to_resource_drive", adminDriveHandler.FileToResourceDrive)
	e.POST("/api/v2/drive/file/search", adminDriveHandler.FileSearch)
	e.POST("/api/v2/drive/file/preview", adminDriveHandler.FilePreview)
	e.POST("/api/v2/drive/file/rename", adminDriveHandler.FileRename)
	e.POST("/api/v2/drive/rename_files", adminDriveHandler.RenameFiles)
	e.POST("/api/v2/local_file/list", adminDriveHandler.LocalFileList)

	e.POST("/api/v2/media_profile/list", mediaProfileHandler.List)
	e.POST("/api/v2/media_profile/search", mediaProfileHandler.Search)
	e.POST("/api/v2/media_profile/partial", mediaProfileHandler.Partial)
	e.POST("/api/v2/media_profile/profile", mediaProfileHandler.Profile)
	e.POST("/api/v2/media_profile/series_profile", mediaProfileHandler.SeriesProfile)
	e.POST("/api/v2/media_profile/set_name", mediaProfileHandler.SetName)
	e.POST("/api/v2/media_profile/refresh", mediaProfileHandler.Refresh)
	e.POST("/api/v2/media_profile/init_series", mediaProfileHandler.InitSeries)
	e.POST("/api/v2/media_profile/init_season", mediaProfileHandler.InitSeason)
	e.POST("/api/v2/media_profile/edit", mediaProfileHandler.Edit)
	e.POST("/api/v2/media_profile/delete", mediaProfileHandler.Delete)
	e.POST("/api/v2/media_profile/search_tmdb", mediaProfileHandler.SearchTmdb)
	e.POST("/api/v2/media_profile/search_javbus", mediaProfileHandler.SearchJavbus)

	e.POST("/api/v2/common/analysis", analysisHandler.CommonAnalysis)

	e.GET("/api/history", memberHandler.HistoryList)
	e.GET("/api/history/list", memberHandler.HistoryList)
	e.POST("/api/history/update", memberHandler.HistoryUpdate)
	e.POST("/api/invitee/add", memberHandler.InviteeAdd)
	e.GET("/api/invitee/list", memberHandler.InviteeList)
	e.GET("/api/info", memberHandler.Info)
	e.POST("/api/account/merge", memberHandler.AccountMerge)
	e.POST("/api/collection/list", memberHandler.CollectionList)
	e.POST("/api/validate", memberHandler.Validate)

	e.POST("/api/v2/wechat/auth/login", wechatHandler.AuthLogin)
	e.POST("/api/v2/wechat/auth/register", wechatHandler.AuthRegister)
	e.POST("/api/v2/wechat/auth/code/create", wechatHandler.AuthCodeCreate)
	e.POST("/api/v2/wechat/auth/code/check", wechatHandler.AuthCodeCheck)
	e.POST("/api/v2/wechat/auth/code/confirm", wechatHandler.AuthCodeConfirm)
	e.POST("/api/v2/wechat/auth/weapp", wechatHandler.AuthWeapp)
	e.POST("/api/v2/wechat/mine/update_email", wechatHandler.MineUpdateEmail)
	e.POST("/api/v2/wechat/mine/update_pwd", wechatHandler.MineUpdatePwd)
	e.POST("/api/v2/wechat/mine/profile", wechatHandler.MineProfile)
	e.POST("/api/v2/wechat/mine/bind_weapp", wechatHandler.MineBindWeapp)
	e.POST("/api/v2/wechat/collection/list", memberHandler.WechatCollectionList)
	e.POST("/api/v2/wechat/history/delete", wechatHandler.HistoryDelete)
	e.POST("/api/v2/wechat/history/list", wechatHandler.HistoryList)
	e.POST("/api/v2/wechat/history/update", wechatHandler.HistoryUpdate)
	e.POST("/api/v2/wechat/history/updated", wechatHandler.HistoryUpdated)
	e.POST("/api/v2/wechat/media/episode", wechatHandler.MediaEpisode)
	e.POST("/api/v2/wechat/media/profile", wechatHandler.MediaProfile)
	e.POST("/api/v2/wechat/media/list", wechatHandler.MediaList)
	e.POST("/api/v2/wechat/media/playing", wechatHandler.MediaPlaying)
	e.POST("/api/v2/wechat/media/series", wechatHandler.MediaSeries)
	e.POST("/api/v2/wechat/member/token", wechatHandler.MemberToken)
	e.POST("/api/v2/wechat/invitation_code/list", wechatHandler.InvitationCodeList)
	e.POST("/api/v2/wechat/invitation_code/create", wechatHandler.InvitationCodeCreate)
	e.POST("/api/v2/wechat/notification/list", wechatHandler.NotificationList)
	e.POST("/api/v2/wechat/notification/read_all", wechatHandler.NotificationReadAll)
	e.POST("/api/v2/wechat/notification/read", wechatHandler.NotificationRead)
	e.POST("/api/v2/wechat/report/create", wechatHandler.ReportCreate)
	e.POST("/api/v2/wechat/report/hide", wechatHandler.ReportHide)
	e.POST("/api/v2/wechat/report/list", wechatHandler.ReportList)
	e.POST("/api/v2/wechat/season/list", wechatHandler.SeasonList)
	e.POST("/api/v2/wechat/source", wechatHandler.Source)
	e.POST("/api/v2/wechat/rank", wechatHandler.Rank)
	e.POST("/api/v2/wechat/diary/list", wechatHandler.DiaryList)
	e.POST("/api/v2/wechat/live/list", wechatHandler.LiveList)

	e.GET("/api/v2/aliyundrive/refresh", adminDriveHandler.AliyundriveRefresh)
	e.GET("/api/v2/alipan/qrcode", adminDriveHandler.AlipanGetQrcode)
	e.GET("/api/v2/alipan/login_status", adminDriveHandler.AlipanGetLoginStatus)
	e.GET("/api/v2/alipan/access_token", adminDriveHandler.AlipanGetAccessToken)
	e.GET("/api/v2/wechat/proxy", wechatHandler.Proxy)

	ff := ffmpeg.New(ffmpeg_bin, cache_dir)

	e.GET("/api/v2/preview", func(c echo.Context) error {
		filePath := c.QueryParam("path")
		if filePath == "" {
			return c.JSON(400, R{"code": 400, "msg": "missing path"})
		}
		if ff.Available() && isVideo(filePath) && !ffmpeg.CheckMoovPosition(filePath) {
			cached := ff.FaststartPath(filePath)
			if _, err := os.Stat(cached); err == nil {
				filePath = cached
			}
		}
		http.ServeFile(c.Response(), c.Request(), filePath)
		return nil
	})

	e.GET("/api/v2/hls/:hash/*", func(c echo.Context) error {
		hash := c.Param("hash")
		rest := c.Param("*")
		if hash == "" || rest == "" {
			return c.JSON(400, R{"code": 400, "msg": "invalid path"})
		}
		hlsDir := filepath.Join(cache_dir, "hls", hash)
		target := filepath.Join(hlsDir, rest)
		http.ServeFile(c.Response(), c.Request(), target)
		return nil
	})

	mount_spa := func(url_prefix string, dist_candidates ...string) {
		var distFS fs.FS
		for _, candidate := range dist_candidates {
			sub, err := fs.Sub(frontend.FS, candidate)
			if err == nil {
				distFS = sub
				break
			}
		}
		if distFS == nil {
			return
		}

		if assetsFS, err := fs.Sub(distFS, "assets"); err == nil {
			stripPrefix := url_prefix + "/assets/"
			e.GET(url_prefix+"/assets/*", echo.WrapHandler(http.StripPrefix(stripPrefix, http.FileServer(http.FS(assetsFS)))))
		}

		e.GET(url_prefix+"*", func(c echo.Context) error {
			index, err := fs.ReadFile(distFS, "index.html")
			if err != nil {
				return c.NoContent(http.StatusNotFound)
			}
			return c.HTMLBlob(http.StatusOK, index)
		})
	}

	mount_spa("/admin", "admin/dist", "dist")
	mount_spa("/mobile", "mobile/dist")
	mount_spa("/pc", "pc/dist")
}
