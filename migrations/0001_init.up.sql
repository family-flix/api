CREATE TABLE IF NOT EXISTS "Drive" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "unique_id" TEXT NOT NULL,
    "type" INTEGER DEFAULT 0,
    "name" TEXT NOT NULL,
    "remark" TEXT,
    "avatar" TEXT NOT NULL,
    "profile" TEXT NOT NULL,
    "total_size" REAL DEFAULT 0,
    "used_size" REAL DEFAULT 0,
    "invalid" INTEGER DEFAULT 0,
    "hidden" INTEGER DEFAULT 0,
    "sort" INTEGER DEFAULT 0,
    "latest_analysis" TEXT,
    "root_folder_name" TEXT,
    "root_folder_id" TEXT,
    "drive_token_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    UNIQUE ("user_id", "unique_id"),
    CONSTRAINT "Drive_drive_token_id_fkey" FOREIGN KEY ("drive_token_id") REFERENCES "DriveToken"("id") ON DELETE CASCADE,
    CONSTRAINT "Drive_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "DriveToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "data" TEXT NOT NULL,
    "expired_at" REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS "TVProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "unique_id" TEXT NOT NULL,
    "source" INTEGER DEFAULT 0,
    "sources" TEXT DEFAULT '',
    "alias" TEXT,
    "name" TEXT,
    "original_name" TEXT,
    "overview" TEXT,
    "poster_path" TEXT,
    "backdrop_path" TEXT,
    "first_air_date" TEXT,
    "original_language" TEXT,
    "origin_country" TEXT DEFAULT '',
    "genres" TEXT DEFAULT '',
    "popularity" REAL DEFAULT 0,
    "vote_average" REAL DEFAULT 0,
    "vote_count" REAL DEFAULT 0,
    "episode_count" INTEGER DEFAULT 0,
    "season_count" INTEGER DEFAULT 0,
    "status" TEXT,
    "in_production" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "SeasonProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "unique_id" TEXT NOT NULL,
    "source" INTEGER DEFAULT 0,
    "sources" TEXT DEFAULT '',
    "name" TEXT,
    "overview" TEXT,
    "poster_path" TEXT,
    "season_number" INTEGER,
    "air_date" TEXT,
    "episode_count" INTEGER DEFAULT 0,
    "vote_average" REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "EpisodeProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "unique_id" TEXT NOT NULL,
    "source" INTEGER DEFAULT 0,
    "sources" TEXT DEFAULT '',
    "name" TEXT,
    "overview" TEXT,
    "air_date" TEXT,
    "runtime" INTEGER DEFAULT 0,
    "episode_number" INTEGER,
    "season_number" INTEGER
);

CREATE TABLE IF NOT EXISTS "MovieProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "unique_id" TEXT NOT NULL,
    "source" INTEGER DEFAULT 0,
    "sources" TEXT DEFAULT '',
    "name" TEXT,
    "original_name" TEXT,
    "alias" TEXT,
    "overview" TEXT,
    "poster_path" TEXT,
    "backdrop_path" TEXT,
    "air_date" TEXT,
    "original_language" TEXT,
    "popularity" REAL DEFAULT 0,
    "vote_average" REAL DEFAULT 0,
    "vote_count" REAL DEFAULT 0,
    "origin_country" TEXT DEFAULT '',
    "genres" TEXT DEFAULT '',
    "runtime" INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "PersonProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "name" TEXT NOT NULL,
    "alias" TEXT,
    "biography" TEXT,
    "profile_path" TEXT,
    "birthday" TEXT,
    "place_of_birth" TEXT,
    "known_for_department" TEXT,
    "profile" TEXT DEFAULT '',
    "tmdb_id" TEXT UNIQUE,
    "douban_id" TEXT UNIQUE,
    "imdb_id" TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS "Person" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "known_for_department" TEXT,
    "profile_id" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    CONSTRAINT "Person_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "PersonProfile"("id") ON DELETE CASCADE,
    CONSTRAINT "Person_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "MediaProfile"("id")
);

CREATE TABLE IF NOT EXISTS "Subtitle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "type" INTEGER NOT NULL DEFAULT 1,
    "file_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "movie_id" TEXT,
    "episode_id" TEXT,
    "drive_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Subtitle_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "Movie"("id"),
    CONSTRAINT "Subtitle_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "Episode"("id"),
    CONSTRAINT "Subtitle_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "Drive"("id") ON DELETE CASCADE,
    CONSTRAINT "Subtitle_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "SubtitleV2" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "type" INTEGER NOT NULL DEFAULT 1,
    "unique_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "media_source_id" TEXT,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "SubtitleV2_media_source_id_fkey" FOREIGN KEY ("media_source_id") REFERENCES "MediaSource"("id"),
    CONSTRAINT "SubtitleV2_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "TVLive" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "detail" TEXT,
    "logo" TEXT,
    "group_name" TEXT,
    "order" INTEGER NOT NULL DEFAULT 9999,
    "hidden" INTEGER NOT NULL DEFAULT 0,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "TVLive_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "ParsedTV" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "name" TEXT,
    "original_name" TEXT,
    "file_id" TEXT,
    "file_name" TEXT,
    "can_search" INTEGER DEFAULT 1,
    "source" INTEGER DEFAULT 0,
    "unique_id" TEXT,
    "tv_id" TEXT,
    "drive_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "ParsedTV_tv_id_fkey" FOREIGN KEY ("tv_id") REFERENCES "TV"("id"),
    CONSTRAINT "ParsedTV_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "Drive"("id") ON DELETE CASCADE,
    CONSTRAINT "ParsedTV_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "ParsedSeason" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "season_number" TEXT NOT NULL,
    "file_id" TEXT,
    "file_name" TEXT,
    "can_search" INTEGER DEFAULT 1,
    "season_id" TEXT,
    "parsed_tv_id" TEXT NOT NULL,
    "drive_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "ParsedSeason_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "Season"("id"),
    CONSTRAINT "ParsedSeason_parsed_tv_id_fkey" FOREIGN KEY ("parsed_tv_id") REFERENCES "ParsedTV"("id") ON DELETE CASCADE,
    CONSTRAINT "ParsedSeason_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "Drive"("id") ON DELETE CASCADE,
    CONSTRAINT "ParsedSeason_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "ParsedEpisode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "episode_number" TEXT NOT NULL,
    "season_number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "parent_file_id" TEXT NOT NULL,
    "parent_paths" TEXT NOT NULL,
    "type" INTEGER NOT NULL,
    "size" REAL DEFAULT 0,
    "md5" TEXT,
    "can_search" INTEGER DEFAULT 1,
    "season_id" TEXT,
    "episode_id" TEXT,
    "parsed_tv_id" TEXT NOT NULL,
    "drive_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "ParsedEpisode_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "Season"("id"),
    CONSTRAINT "ParsedEpisode_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "Episode"("id"),
    CONSTRAINT "ParsedEpisode_parsed_tv_id_fkey" FOREIGN KEY ("parsed_tv_id") REFERENCES "ParsedTV"("id"),
    CONSTRAINT "ParsedEpisode_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "Drive"("id") ON DELETE CASCADE,
    CONSTRAINT "ParsedEpisode_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "ParsedMovie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "source" INTEGER DEFAULT 0,
    "unique_id" TEXT,
    "name" TEXT NOT NULL,
    "original_name" TEXT,
    "file_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "parent_file_id" TEXT NOT NULL,
    "parent_paths" TEXT NOT NULL,
    "type" INTEGER NOT NULL,
    "size" REAL DEFAULT 0,
    "can_search" INTEGER DEFAULT 1,
    "movie_id" TEXT,
    "drive_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "ParsedMovie_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "Movie"("id"),
    CONSTRAINT "ParsedMovie_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "Drive"("id") ON DELETE CASCADE,
    CONSTRAINT "ParsedMovie_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "ParsedMedia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "type" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "original_name" TEXT,
    "air_year" TEXT,
    "season_text" TEXT,
    "can_search" INTEGER NOT NULL DEFAULT 1,
    "media_profile_id" TEXT,
    "drive_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "ParsedMedia_media_profile_id_fkey" FOREIGN KEY ("media_profile_id") REFERENCES "MediaProfile"("id"),
    CONSTRAINT "ParsedMedia_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "Drive"("id") ON DELETE CASCADE,
    CONSTRAINT "ParsedMedia_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "ParsedSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "type" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "original_name" TEXT,
    "episode_text" TEXT,
    "season_text" TEXT,
    "file_id" TEXT NOT NULL UNIQUE,
    "file_name" TEXT NOT NULL,
    "parent_file_id" TEXT NOT NULL,
    "parent_paths" TEXT NOT NULL,
    "size" REAL NOT NULL DEFAULT 0,
    "md5" TEXT,
    "can_search" INTEGER NOT NULL DEFAULT 1,
    "cause_job_id" TEXT,
    "parsed_media_id" TEXT,
    "media_source_id" TEXT,
    "drive_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "ParsedSource_parsed_media_id_fkey" FOREIGN KEY ("parsed_media_id") REFERENCES "ParsedMedia"("id") ON DELETE CASCADE,
    CONSTRAINT "ParsedSource_media_source_id_fkey" FOREIGN KEY ("media_source_id") REFERENCES "MediaSource"("id"),
    CONSTRAINT "ParsedSource_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "Drive"("id") ON DELETE CASCADE,
    CONSTRAINT "ParsedSource_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "type" INTEGER NOT NULL DEFAULT 1,
    "text" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Media_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "MediaProfile"("id") ON DELETE CASCADE,
    CONSTRAINT "Media_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "MediaSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "type" INTEGER NOT NULL DEFAULT 1,
    "text" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "MediaSource_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "Media"("id") ON DELETE CASCADE,
    CONSTRAINT "MediaSource_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "MediaSourceProfile"("id") ON DELETE CASCADE,
    CONSTRAINT "MediaSource_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "MediaSeriesProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "type" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "original_name" TEXT,
    "alias" TEXT,
    "overview" TEXT,
    "poster_path" TEXT,
    "backdrop_path" TEXT,
    "air_date" TEXT,
    "tmdb_id" TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS "MediaProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "type" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "original_name" TEXT,
    "alias" TEXT,
    "overview" TEXT,
    "poster_path" TEXT,
    "backdrop_path" TEXT,
    "air_date" TEXT,
    "order" INTEGER NOT NULL,
    "source_count" INTEGER NOT NULL,
    "vote_average" REAL NOT NULL DEFAULT 0,
    "in_production" INTEGER NOT NULL DEFAULT 0,
    "tips" TEXT,
    "tmdb_id" TEXT UNIQUE,
    "douban_id" TEXT UNIQUE,
    "imdb_id" TEXT UNIQUE,
    "series_id" TEXT,
    CONSTRAINT "MediaProfile_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "MediaSeriesProfile"("id")
);

CREATE TABLE IF NOT EXISTS "MediaSourceProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "type" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "original_name" TEXT,
    "overview" TEXT,
    "air_date" TEXT,
    "still_path" TEXT,
    "order" INTEGER NOT NULL,
    "runtime" INTEGER,
    "tmdb_id" TEXT UNIQUE,
    "douban_id" TEXT UNIQUE,
    "media_profile_id" TEXT NOT NULL,
    CONSTRAINT "MediaSourceProfile_media_profile_id_fkey" FOREIGN KEY ("media_profile_id") REFERENCES "MediaProfile"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "MediaGenre" (
    "id" INTEGER NOT NULL PRIMARY KEY,
    "text" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "MediaCountry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "text" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "MediaGenreRelation" (
    "media_profile_id" TEXT NOT NULL,
    "media_genre_id" INTEGER NOT NULL,
    PRIMARY KEY ("media_profile_id", "media_genre_id"),
    CONSTRAINT "MediaGenreRelation_media_profile_id_fkey" FOREIGN KEY ("media_profile_id") REFERENCES "MediaProfile"("id") ON DELETE CASCADE,
    CONSTRAINT "MediaGenreRelation_media_genre_id_fkey" FOREIGN KEY ("media_genre_id") REFERENCES "MediaGenre"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "MediaCountryRelation" (
    "media_profile_id" TEXT NOT NULL,
    "media_country_id" TEXT NOT NULL,
    PRIMARY KEY ("media_profile_id", "media_country_id"),
    CONSTRAINT "MediaCountryRelation_media_profile_id_fkey" FOREIGN KEY ("media_profile_id") REFERENCES "MediaProfile"("id") ON DELETE CASCADE,
    CONSTRAINT "MediaCountryRelation_media_country_id_fkey" FOREIGN KEY ("media_country_id") REFERENCES "MediaCountry"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "TV" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "hidden" INTEGER DEFAULT 0,
    "profile_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "TV_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "TVProfile"("id"),
    CONSTRAINT "TV_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Season" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "season_text" TEXT NOT NULL,
    "season_number" INTEGER NOT NULL,
    "tip" TEXT,
    "profile_id" TEXT NOT NULL,
    "tv_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Season_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "SeasonProfile"("id"),
    CONSTRAINT "Season_tv_id_fkey" FOREIGN KEY ("tv_id") REFERENCES "TV"("id") ON DELETE CASCADE,
    CONSTRAINT "Season_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Episode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "episode_text" TEXT NOT NULL,
    "season_text" TEXT NOT NULL,
    "episode_number" INTEGER NOT NULL,
    "tip" TEXT,
    "profile_id" TEXT NOT NULL,
    "tv_id" TEXT NOT NULL,
    "season_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Episode_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "EpisodeProfile"("id"),
    CONSTRAINT "Episode_tv_id_fkey" FOREIGN KEY ("tv_id") REFERENCES "TV"("id") ON DELETE CASCADE,
    CONSTRAINT "Episode_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "Season"("id") ON DELETE CASCADE,
    CONSTRAINT "Episode_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Movie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "tip" TEXT,
    "profile_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Movie_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "MovieProfile"("id"),
    CONSTRAINT "Movie_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "MediaErrorNeedProcess" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "unique_id" TEXT NOT NULL,
    "type" INTEGER NOT NULL DEFAULT 1,
    "profile" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "MediaErrorNeedProcess_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "InvalidMedia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "type" INTEGER NOT NULL DEFAULT 1,
    "profile" TEXT NOT NULL,
    "media_id" TEXT NOT NULL UNIQUE,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "InvalidMedia_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "Media"("id") ON DELETE CASCADE,
    CONSTRAINT "InvalidMedia_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "InvalidMediaSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "type" INTEGER NOT NULL DEFAULT 1,
    "profile" TEXT NOT NULL,
    "media_source_id" TEXT NOT NULL UNIQUE,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "InvalidMediaSource_media_source_id_fkey" FOREIGN KEY ("media_source_id") REFERENCES "MediaSource"("id") ON DELETE CASCADE,
    CONSTRAINT "InvalidMediaSource_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Collection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "title" TEXT NOT NULL,
    "desc" TEXT,
    "type" INTEGER NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 0,
    "extra" TEXT,
    "rules" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "hidden" INTEGER NOT NULL DEFAULT 0,
    "styles" TEXT,
    "medias" TEXT,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Collection_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "CollectionV2" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "title" TEXT NOT NULL,
    "desc" TEXT,
    "type" INTEGER NOT NULL DEFAULT 1,
    "status" INTEGER NOT NULL DEFAULT 1,
    "extra" TEXT,
    "rules" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "hidden" INTEGER NOT NULL DEFAULT 0,
    "styles" TEXT,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "CollectionV2_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "CollectionTV" (
    "collection_id" TEXT NOT NULL,
    "tv_id" TEXT NOT NULL,
    PRIMARY KEY ("collection_id", "tv_id"),
    CONSTRAINT "CollectionTV_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "Collection"("id") ON DELETE CASCADE,
    CONSTRAINT "CollectionTV_tv_id_fkey" FOREIGN KEY ("tv_id") REFERENCES "TV"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "CollectionSeason" (
    "collection_id" TEXT NOT NULL,
    "season_id" TEXT NOT NULL,
    PRIMARY KEY ("collection_id", "season_id"),
    CONSTRAINT "CollectionSeason_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "Collection"("id") ON DELETE CASCADE,
    CONSTRAINT "CollectionSeason_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "Season"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "CollectionMovie" (
    "collection_id" TEXT NOT NULL,
    "movie_id" TEXT NOT NULL,
    PRIMARY KEY ("collection_id", "movie_id"),
    CONSTRAINT "CollectionMovie_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "Collection"("id") ON DELETE CASCADE,
    CONSTRAINT "CollectionMovie_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "Movie"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "CollectionV2Media" (
    "collection_v2_id" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    PRIMARY KEY ("collection_v2_id", "media_id"),
    CONSTRAINT "CollectionV2Media_collection_v2_id_fkey" FOREIGN KEY ("collection_v2_id") REFERENCES "CollectionV2"("id") ON DELETE CASCADE,
    CONSTRAINT "CollectionV2Media_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "Media"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "AsyncTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "unique_id" TEXT NOT NULL,
    "type" INTEGER NOT NULL DEFAULT 1,
    "desc" TEXT,
    "percent" REAL NOT NULL DEFAULT 0,
    "percent_text" TEXT,
    "status" INTEGER NOT NULL DEFAULT 1,
    "need_stop" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "output_id" TEXT NOT NULL UNIQUE,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "AsyncTask_output_id_fkey" FOREIGN KEY ("output_id") REFERENCES "Output"("id") ON DELETE CASCADE,
    CONSTRAINT "AsyncTask_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Output" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "filepath" TEXT,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Output_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "OutputLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "content" TEXT NOT NULL,
    "output_id" TEXT,
    CONSTRAINT "OutputLine_output_id_fkey" FOREIGN KEY ("output_id") REFERENCES "Output"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "PlayHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "duration" REAL DEFAULT 0,
    "current_time" REAL DEFAULT 0,
    "thumbnail" TEXT,
    "file_id" TEXT,
    "tv_id" TEXT,
    "season_id" TEXT,
    "episode_id" TEXT,
    "movie_id" TEXT,
    "member_id" TEXT NOT NULL,
    CONSTRAINT "PlayHistory_tv_id_fkey" FOREIGN KEY ("tv_id") REFERENCES "TV"("id") ON DELETE CASCADE,
    CONSTRAINT "PlayHistory_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "Season"("id"),
    CONSTRAINT "PlayHistory_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "Episode"("id"),
    CONSTRAINT "PlayHistory_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "Movie"("id") ON DELETE CASCADE,
    CONSTRAINT "PlayHistory_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "PlayHistoryV2" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "text" TEXT NOT NULL,
    "duration" REAL NOT NULL DEFAULT 0,
    "current_time" REAL NOT NULL DEFAULT 0,
    "thumbnail_path" TEXT,
    "file_id" TEXT,
    "media_id" TEXT NOT NULL,
    "media_source_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    CONSTRAINT "PlayHistoryV2_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "Media"("id") ON DELETE CASCADE,
    CONSTRAINT "PlayHistoryV2_media_source_id_fkey" FOREIGN KEY ("media_source_id") REFERENCES "MediaSource"("id") ON DELETE CASCADE,
    CONSTRAINT "PlayHistoryV2_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "TVProfileQuick" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "name" TEXT NOT NULL UNIQUE,
    "tv_profile_id" TEXT NOT NULL,
    CONSTRAINT "TVProfileQuick_tv_profile_id_fkey" FOREIGN KEY ("tv_profile_id") REFERENCES "TVProfile"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "SharedFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "title" TEXT,
    "url" TEXT NOT NULL,
    "pwd" TEXT,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "SharedFile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "SharedFileInProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "url" TEXT NOT NULL,
    "pwd" TEXT,
    "file_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "drive_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "SharedFileInProgress_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "Drive"("id") ON DELETE CASCADE,
    CONSTRAINT "SharedFileInProgress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "BindForParsedTV" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "url" TEXT NOT NULL,
    "file_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "file_id_link_resource" TEXT NOT NULL,
    "file_name_link_resource" TEXT NOT NULL,
    "in_production" INTEGER DEFAULT 1,
    "invalid" INTEGER DEFAULT 0,
    "season_id" TEXT,
    "drive_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "BindForParsedTV_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "Season"("id") ON DELETE CASCADE,
    CONSTRAINT "BindForParsedTV_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "Drive"("id") ON DELETE CASCADE,
    CONSTRAINT "BindForParsedTV_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "ResourceSyncTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "status" INTEGER NOT NULL DEFAULT 1,
    "url" TEXT NOT NULL,
    "pwd" TEXT,
    "file_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "file_id_link_resource" TEXT NOT NULL,
    "file_name_link_resource" TEXT NOT NULL,
    "invalid" INTEGER NOT NULL DEFAULT 0,
    "media_id" TEXT,
    "drive_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "ResourceSyncTask_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "Media"("id") ON DELETE CASCADE,
    CONSTRAINT "ResourceSyncTask_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "Drive"("id") ON DELETE CASCADE,
    CONSTRAINT "ResourceSyncTask_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "DriveCheckIn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "checked_at" TEXT,
    "drive_id" TEXT NOT NULL,
    CONSTRAINT "DriveCheckIn_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "Drive"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "TmpFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "type" REAL NOT NULL DEFAULT 2,
    "name" TEXT NOT NULL,
    "file_id" TEXT,
    "parent_paths" TEXT NOT NULL,
    "drive_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "TmpFile_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "Drive"("id") ON DELETE CASCADE,
    CONSTRAINT "TmpFile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "File" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "file_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parent_file_id" TEXT NOT NULL,
    "parent_paths" TEXT NOT NULL,
    "type" INTEGER NOT NULL DEFAULT 3,
    "size" REAL NOT NULL DEFAULT 0,
    "md5" TEXT,
    "drive_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "File_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "Drive"("id") ON DELETE CASCADE,
    CONSTRAINT "File_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "DriveStatistics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "date" TEXT NOT NULL,
    "data" TEXT NOT NULL DEFAULT '{}',
    "user_id" TEXT NOT NULL,
    CONSTRAINT "DriveStatistics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "title" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "InvitationCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "text" TEXT NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,
    "used_at" TEXT,
    "expired_at" TEXT,
    "inviter_id" TEXT NOT NULL,
    "invitee_id" TEXT UNIQUE,
    CONSTRAINT "InvitationCode_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "Member"("id") ON DELETE CASCADE,
    CONSTRAINT "InvitationCode_invitee_id_fkey" FOREIGN KEY ("invitee_id") REFERENCES "Member"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "AuthCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "step" INTEGER NOT NULL,
    "expires" TEXT NOT NULL,
    "text" TEXT,
    "member_id" TEXT,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "AuthCode_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member"("id") ON DELETE CASCADE,
    CONSTRAINT "AuthCode_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "AuthQRCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "step" INTEGER NOT NULL,
    "expires" TEXT NOT NULL,
    "text" TEXT,
    "member_id" TEXT,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "AuthQRCode_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member"("id") ON DELETE CASCADE,
    CONSTRAINT "AuthQRCode_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Member" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "email" TEXT,
    "name" TEXT,
    "avatar" TEXT,
    "remark" TEXT NOT NULL,
    "permission" TEXT,
    "disabled" INTEGER NOT NULL DEFAULT 0,
    "delete" INTEGER NOT NULL DEFAULT 0,
    "inviter_id" TEXT,
    "from_invite_id" TEXT,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Member_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "Member"("id"),
    CONSTRAINT "Member_from_invite_id_fkey" FOREIGN KEY ("from_invite_id") REFERENCES "MemberInvite"("id"),
    CONSTRAINT "Member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE,
    UNIQUE ("user_id", "inviter_id", "remark")
);

CREATE TABLE IF NOT EXISTS "MemberInvite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "content" TEXT,
    "expired_at" TEXT NOT NULL,
    "count_limit" INTEGER,
    "disabled" INTEGER NOT NULL DEFAULT 0,
    "member_id" TEXT NOT NULL,
    CONSTRAINT "MemberInvite_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "MemberAuthentication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "provider" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "provider_arg1" TEXT,
    "provider_arg2" TEXT,
    "member_id" TEXT NOT NULL,
    CONSTRAINT "MemberAuthentication_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member"("id")
);

CREATE TABLE IF NOT EXISTS "MemberToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "token" TEXT NOT NULL,
    "used" REAL DEFAULT 0,
    "expired_at" TEXT,
    "invalid" INTEGER NOT NULL DEFAULT 0,
    "member_id" TEXT NOT NULL,
    CONSTRAINT "MemberToken_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "MemberFavorite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "type" INTEGER NOT NULL,
    "media_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    CONSTRAINT "MemberFavorite_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "Media"("id") ON DELETE CASCADE,
    CONSTRAINT "MemberFavorite_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "MemberDiary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "day" TEXT NOT NULL,
    "content" TEXT,
    "profile" TEXT,
    "media_source_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    CONSTRAINT "MemberDiary_media_source_id_fkey" FOREIGN KEY ("media_source_id") REFERENCES "MediaSource"("id") ON DELETE CASCADE,
    CONSTRAINT "MemberDiary_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "MemberSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "data" TEXT NOT NULL,
    "member_id" TEXT NOT NULL UNIQUE,
    CONSTRAINT "MemberSetting_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Permission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "desc" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Permission_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "MemberNotification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "unique_id" TEXT NOT NULL,
    "content" TEXT,
    "type" INTEGER NOT NULL DEFAULT 1,
    "status" INTEGER NOT NULL DEFAULT 1,
    "is_delete" INTEGER NOT NULL DEFAULT 0,
    "member_id" TEXT NOT NULL,
    CONSTRAINT "MemberNotification_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "SharedMedia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "url" TEXT NOT NULL,
    "season_id" TEXT,
    "movie_id" TEXT,
    "member_from_id" TEXT NOT NULL,
    "member_target_id" TEXT NOT NULL,
    CONSTRAINT "SharedMedia_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "Season"("id") ON DELETE CASCADE,
    CONSTRAINT "SharedMedia_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "Movie"("id") ON DELETE CASCADE,
    CONSTRAINT "SharedMedia_member_from_id_fkey" FOREIGN KEY ("member_from_id") REFERENCES "Member"("id") ON DELETE CASCADE,
    CONSTRAINT "SharedMedia_member_target_id_fkey" FOREIGN KEY ("member_target_id") REFERENCES "Member"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "SharedMediaV2" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "url" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    "member_from_id" TEXT NOT NULL,
    "member_target_id" TEXT NOT NULL,
    CONSTRAINT "SharedMediaV2_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "Media"("id") ON DELETE CASCADE,
    CONSTRAINT "SharedMediaV2_member_from_id_fkey" FOREIGN KEY ("member_from_id") REFERENCES "Member"("id") ON DELETE CASCADE,
    CONSTRAINT "SharedMediaV2_member_target_id_fkey" FOREIGN KEY ("member_target_id") REFERENCES "Member"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "unique_id" TEXT NOT NULL,
    "content" TEXT,
    "type" INTEGER NOT NULL DEFAULT 1,
    "status" INTEGER NOT NULL DEFAULT 1,
    "is_delete" INTEGER NOT NULL DEFAULT 0,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Statistics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "data" TEXT NOT NULL DEFAULT '{}',
    "user_id" TEXT NOT NULL UNIQUE,
    CONSTRAINT "Statistics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Report" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "type" INTEGER NOT NULL,
    "data" TEXT NOT NULL,
    "answer" TEXT,
    "tv_id" TEXT,
    "season_id" TEXT,
    "episode_id" TEXT,
    "movie_id" TEXT,
    "member_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "Report_tv_id_fkey" FOREIGN KEY ("tv_id") REFERENCES "TV"("id") ON DELETE CASCADE,
    CONSTRAINT "Report_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "Season"("id") ON DELETE CASCADE,
    CONSTRAINT "Report_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "Episode"("id"),
    CONSTRAINT "Report_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "Movie"("id") ON DELETE CASCADE,
    CONSTRAINT "Report_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member"("id") ON DELETE CASCADE,
    CONSTRAINT "Report_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "ReportV2" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "type" INTEGER NOT NULL DEFAULT 1,
    "status" INTEGER NOT NULL DEFAULT 1,
    "data" TEXT NOT NULL,
    "answer" TEXT,
    "hidden" INTEGER NOT NULL DEFAULT 0,
    "media_id" TEXT,
    "media_source_id" TEXT,
    "reply_media_id" TEXT,
    "member_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "ReportV2_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "Media"("id") ON DELETE CASCADE,
    CONSTRAINT "ReportV2_media_source_id_fkey" FOREIGN KEY ("media_source_id") REFERENCES "MediaSource"("id") ON DELETE CASCADE,
    CONSTRAINT "ReportV2_reply_media_id_fkey" FOREIGN KEY ("reply_media_id") REFERENCES "Media"("id") ON DELETE CASCADE,
    CONSTRAINT "ReportV2_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "Member"("id") ON DELETE CASCADE,
    CONSTRAINT "ReportV2_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Account" (
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
    CONSTRAINT "Account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE,
    UNIQUE ("provider", "provider_account_id")
);

CREATE TABLE IF NOT EXISTS "Credential" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "password" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "verified" INTEGER NOT NULL DEFAULT 0,
    "email" TEXT NOT NULL UNIQUE,
    "user_id" TEXT NOT NULL UNIQUE,
    CONSTRAINT "Credential_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nickname" TEXT,
    "avatar" TEXT,
    "user_id" TEXT NOT NULL UNIQUE,
    CONSTRAINT "Profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now')),
    "detail" TEXT,
    "user_id" TEXT NOT NULL UNIQUE,
    CONSTRAINT "Settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" TEXT NOT NULL DEFAULT (datetime('now')),
    "updated" TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "_MediaGenreToMediaProfile" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,
    PRIMARY KEY ("A", "B"),
    CONSTRAINT "_MediaGenreToMediaProfile_A_fkey" FOREIGN KEY ("A") REFERENCES "MediaGenre"("id") ON DELETE CASCADE,
    CONSTRAINT "_MediaGenreToMediaProfile_B_fkey" FOREIGN KEY ("B") REFERENCES "MediaProfile"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "_MediaCountryToMediaProfile" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    PRIMARY KEY ("A", "B"),
    CONSTRAINT "_MediaCountryToMediaProfile_A_fkey" FOREIGN KEY ("A") REFERENCES "MediaCountry"("id") ON DELETE CASCADE,
    CONSTRAINT "_MediaCountryToMediaProfile_B_fkey" FOREIGN KEY ("B") REFERENCES "MediaProfile"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "Drive_drive_token_id_idx" ON "Drive"("drive_token_id");
CREATE INDEX IF NOT EXISTS "Drive_user_id_idx" ON "Drive"("user_id");
CREATE INDEX IF NOT EXISTS "ParsedTV_drive_id_idx" ON "ParsedTV"("drive_id");
CREATE INDEX IF NOT EXISTS "ParsedTV_user_id_idx" ON "ParsedTV"("user_id");
CREATE INDEX IF NOT EXISTS "ParsedEpisode_drive_id_idx" ON "ParsedEpisode"("drive_id");
CREATE INDEX IF NOT EXISTS "ParsedEpisode_user_id_idx" ON "ParsedEpisode"("user_id");
CREATE INDEX IF NOT EXISTS "ParsedMovie_drive_id_idx" ON "ParsedMovie"("drive_id");
CREATE INDEX IF NOT EXISTS "ParsedMovie_user_id_idx" ON "ParsedMovie"("user_id");
CREATE INDEX IF NOT EXISTS "Media_user_id_idx" ON "Media"("user_id");
CREATE INDEX IF NOT EXISTS "Media_profile_id_idx" ON "Media"("profile_id");
CREATE INDEX IF NOT EXISTS "MediaSource_media_id_idx" ON "MediaSource"("media_id");
CREATE INDEX IF NOT EXISTS "MediaSource_user_id_idx" ON "MediaSource"("user_id");
CREATE INDEX IF NOT EXISTS "MediaProfile_series_id_idx" ON "MediaProfile"("series_id");
CREATE INDEX IF NOT EXISTS "TV_user_id_idx" ON "TV"("user_id");
CREATE INDEX IF NOT EXISTS "Season_tv_id_idx" ON "Season"("tv_id");
CREATE INDEX IF NOT EXISTS "Season_user_id_idx" ON "Season"("user_id");
CREATE INDEX IF NOT EXISTS "Episode_tv_id_idx" ON "Episode"("tv_id");
CREATE INDEX IF NOT EXISTS "Episode_season_id_idx" ON "Episode"("season_id");
CREATE INDEX IF NOT EXISTS "Episode_user_id_idx" ON "Episode"("user_id");
CREATE INDEX IF NOT EXISTS "Movie_user_id_idx" ON "Movie"("user_id");
CREATE INDEX IF NOT EXISTS "Member_user_id_idx" ON "Member"("user_id");
CREATE INDEX IF NOT EXISTS "PlayHistory_member_id_idx" ON "PlayHistory"("member_id");
CREATE INDEX IF NOT EXISTS "PlayHistoryV2_media_id_idx" ON "PlayHistoryV2"("media_id");
CREATE INDEX IF NOT EXISTS "PlayHistoryV2_member_id_idx" ON "PlayHistoryV2"("member_id");
CREATE INDEX IF NOT EXISTS "File_drive_id_idx" ON "File"("drive_id");
CREATE INDEX IF NOT EXISTS "File_user_id_idx" ON "File"("user_id");
