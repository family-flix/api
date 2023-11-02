-- CreateTable
CREATE TABLE "PersonProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unique_id" TEXT NOT NULL,
    "source" INTEGER DEFAULT 0,
    "sources" TEXT DEFAULT '',
    "name" TEXT NOT NULL,
    "profile" TEXT DEFAULT '',
    "biography" TEXT,
    "profile_path" TEXT,
    "birthday" TEXT,
    "place_of_birth" TEXT,
    "known_for_department" TEXT
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "known_for_department" TEXT,
    "profile_id" TEXT NOT NULL,
    "season_id" TEXT,
    "movie_id" TEXT,
    CONSTRAINT "Person_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "PersonProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Person_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "SeasonProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Person_movie_id_fkey" FOREIGN KEY ("movie_id") REFERENCES "movie_profile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TVLive" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "detail" TEXT,
    "logo" TEXT,
    "group_name" TEXT,
    "order" INTEGER NOT NULL DEFAULT 9999,
    "hidden" INTEGER NOT NULL DEFAULT 0,
    "user_id" TEXT NOT NULL,
    CONSTRAINT "TVLive_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
