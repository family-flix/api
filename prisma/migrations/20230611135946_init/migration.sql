-- CreateTable
CREATE TABLE "Drive" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "avatar" TEXT NOT NULL,
    "drive_id" INTEGER NOT NULL,
    "device_id" TEXT NOT NULL,
    "aliyun_user_id" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "total_size" REAL DEFAULT 0,
    "used_size" REAL DEFAULT 0,
    "invalid" INTEGER DEFAULT 0,
    "latest_analysis" DATETIME,
    "root_folder_name" TEXT,
    "root_folder_id" TEXT,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Drive_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DriveToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "expired_at" REAL NOT NULL,
    "drive_id" TEXT NOT NULL,
    CONSTRAINT "DriveToken_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "Drive" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TVProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tmdb_id" INTEGER NOT NULL,
    "name" TEXT,
    "original_name" TEXT,
    "overview" TEXT,
    "poster_path" TEXT,
    "backdrop_path" TEXT,
    "first_air_date" TEXT,
    "original_language" TEXT,
    "popularity" REAL DEFAULT 0,
    "vote_average" REAL DEFAULT 0,
    "vote_count" REAL DEFAULT 0,
    "episode_count" INTEGER DEFAULT 0,
    "season_count" INTEGER DEFAULT 0,
    "status" TEXT,
    "in_production" INTEGER DEFAULT 0
);

-- CreateTable
CREATE TABLE "SeasonProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tmdb_id" INTEGER NOT NULL,
    "name" TEXT,
    "overview" TEXT,
    "poster_path" TEXT,
    "season_number" INTEGER,
    "air_date" TEXT,
    "episode_count" INTEGER DEFAULT 0
);

-- CreateTable
CREATE TABLE "episode_profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tmdb_id" INTEGER NOT NULL,
    "name" TEXT,
    "overview" TEXT,
    "air_date" TEXT
);

-- CreateTable
CREATE TABLE "ParsedTV" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "original_name" TEXT,
    "file_id" TEXT,
    "file_name" TEXT,
    "can_search" INTEGER DEFAULT 1,
    "correct_name" TEXT,
    "tmdb_id" INTEGER,
    "tv_id" TEXT,
    "drive_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "ParsedTV_tv_id_fkey" FOREIGN KEY ("tv_id") REFERENCES "TV" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ParsedTV_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "Drive" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParsedTV_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParsedSeason" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "season_number" TEXT NOT NULL,
    "file_id" TEXT,
    "file_name" TEXT,
    "can_search" INTEGER DEFAULT 1,
    "season_id" TEXT,
    "parsed_tv_id" TEXT NOT NULL,
    "drive_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "ParsedSeason_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "Season" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ParsedSeason_parsed_tv_id_fkey" FOREIGN KEY ("parsed_tv_id") REFERENCES "ParsedTV" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParsedSeason_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "Drive" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParsedSeason_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParsedEpisode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "episode_number" TEXT NOT NULL,
    "season_number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "parent_file_id" TEXT NOT NULL,
    "parent_paths" TEXT NOT NULL,
    "type" INTEGER NOT NULL,
    "size" REAL DEFAULT 0,
    "can_search" INTEGER DEFAULT 1,
    "episode_id" TEXT,
    "parsed_tv_id" TEXT NOT NULL,
    "parsed_season_id" TEXT NOT NULL,
    "drive_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "ParsedEpisode_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "Episode" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParsedEpisode_parsed_tv_id_fkey" FOREIGN KEY ("parsed_tv_id") REFERENCES "ParsedTV" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParsedEpisode_parsed_season_id_fkey" FOREIGN KEY ("parsed_season_id") REFERENCES "ParsedSeason" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ParsedEpisode_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "Drive" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParsedEpisode_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParsedMovie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "parent_file_id" TEXT NOT NULL,
    "parent_paths" TEXT NOT NULL,
    "type" INTEGER NOT NULL,
    "size" REAL DEFAULT 0,
    "drive_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "ParsedMovie_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "Drive" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParsedMovie_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TV" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hidden" INTEGER DEFAULT 0,
    "profile_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "TV_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "TVProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TV_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "season_number" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "tv_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Season_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "SeasonProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Season_tv_id_fkey" FOREIGN KEY ("tv_id") REFERENCES "TV" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Season_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Episode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "episode_number" TEXT NOT NULL,
    "season_number" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "tv_id" TEXT NOT NULL,
    "season_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Episode_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "episode_profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Episode_tv_id_fkey" FOREIGN KEY ("tv_id") REFERENCES "TV" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Episode_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "Season" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Episode_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Movie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "original_name" TEXT,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Movie_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AsyncTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unique_id" TEXT NOT NULL,
    "desc" TEXT,
    "status" INTEGER DEFAULT 0,
    "need_stop" INTEGER DEFAULT 0,
    "error" TEXT,
    "output_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "AsyncTask_output_id_fkey" FOREIGN KEY ("output_id") REFERENCES "output" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AsyncTask_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "output" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "output_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlayHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" REAL DEFAULT 0,
    "current_time" REAL DEFAULT 0,
    "thumbnail" TEXT,
    "file_id" TEXT,
    "tv_id" TEXT,
    "episode_id" TEXT,
    "movie_id" TEXT,
    "member_id" TEXT NOT NULL,
    CONSTRAINT "PlayHistory_tv_id_fkey" FOREIGN KEY ("tv_id") REFERENCES "TV" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayHistory_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "Episode" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PlayHistory_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayHistory_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecommendedTV" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sort" REAL DEFAULT 0,
    "tv_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    CONSTRAINT "RecommendedTV_tv_id_fkey" FOREIGN KEY ("tv_id") REFERENCES "TV" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecommendedTV_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TVProfileQuick" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "tv_profile_id" TEXT NOT NULL,
    CONSTRAINT "TVProfileQuick_tv_profile_id_fkey" FOREIGN KEY ("tv_profile_id") REFERENCES "TVProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SharedFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT,
    "url" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "SharedFile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SharedFileInProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "url" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "drive_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "SharedFileInProgress_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "Drive" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SharedFileInProgress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BindForParsedTV" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "url" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "in_production" INTEGER DEFAULT 1,
    "invalid" INTEGER DEFAULT 0,
    "parsed_tv_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "BindForParsedTV_parsed_tv_id_fkey" FOREIGN KEY ("parsed_tv_id") REFERENCES "ParsedTV" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BindForParsedTV_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DriveCheckIn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checked_at" DATETIME,
    "drive_id" TEXT NOT NULL,
    CONSTRAINT "DriveCheckIn_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "Drive" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TmpFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "type" REAL DEFAULT 0,
    "parent_paths" TEXT NOT NULL,
    "drive_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "TmpFile_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "Drive" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TmpFile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TVNeedComplete" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "episode_count" REAL DEFAULT 0,
    "cur_count" REAL DEFAULT 0,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "TVNeedComplete_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "file_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parent_file_id" TEXT NOT NULL,
    "parent_paths" TEXT NOT NULL,
    "type" INTEGER NOT NULL,
    "size" REAL DEFAULT 0,
    "drive_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "File_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "Drive" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "File_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT,
    "name" TEXT,
    "remark" TEXT NOT NULL,
    "disabled" INTEGER DEFAULT 0,
    "delete" INTEGER DEFAULT 0,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MemberToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "token" TEXT NOT NULL,
    "used" REAL DEFAULT 0,
    "expired_at" TEXT,
    "member_id" TEXT NOT NULL,
    CONSTRAINT "MemberToken_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT,
    "is_read" INTEGER NOT NULL DEFAULT 0,
    "is_delete" INTEGER NOT NULL DEFAULT 0,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Credential" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "password" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Credential_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nickname" TEXT,
    "avatar" TEXT,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "qiniu_access_token" TEXT,
    "qiniu_secret_token" TEXT,
    "qiniu_scope" TEXT,
    "push_deer_token" TEXT,
    "tmdb_token" TEXT,
    "assets" TEXT,
    "websites" TEXT,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Drive_drive_id_key" ON "Drive"("drive_id");

-- CreateIndex
CREATE UNIQUE INDEX "DriveToken_drive_id_key" ON "DriveToken"("drive_id");

-- CreateIndex
CREATE UNIQUE INDEX "TV_profile_id_key" ON "TV"("profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "Season_profile_id_key" ON "Season"("profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "Episode_profile_id_key" ON "Episode"("profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "AsyncTask_output_id_key" ON "AsyncTask"("output_id");

-- CreateIndex
CREATE UNIQUE INDEX "PlayHistory_tv_id_key" ON "PlayHistory"("tv_id");

-- CreateIndex
CREATE UNIQUE INDEX "PlayHistory_movie_id_key" ON "PlayHistory"("movie_id");

-- CreateIndex
CREATE UNIQUE INDEX "TVProfileQuick_name_key" ON "TVProfileQuick"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SharedFile_url_key" ON "SharedFile"("url");

-- CreateIndex
CREATE UNIQUE INDEX "Member_remark_key" ON "Member"("remark");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_provider_account_id_key" ON "Account"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "Credential_email_key" ON "Credential"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Credential_user_id_key" ON "Credential"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_user_id_key" ON "Profile"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_user_id_key" ON "Settings"("user_id");
