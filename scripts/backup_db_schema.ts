/**
 * @file 拷贝
 * @deprecated
 * sqlite3 ~/Downloads/pocketbase_0.12.1_darwin_amd64/pb_data/data.db
 * .out /Users/litao/Documents/workspaces/avideo/domains/walker/__tests__/data.sql
 * .scheme
 * .quit
 * sqlite3 /Users/litao/Documents/workspaces/avideo/domains/walker/__tests__/data.db < /Users/litao/Documents/workspaces/avideo/domains/walker/__tests__/data.sql
 * rm /Users/litao/Documents/workspaces/avideo/domains/walker/__tests__/data.sql
 */
require("dotenv").config();
import path from "path";

import sqlite3 from "sqlite3";

(() => {
  const new_db_filepath = path.resolve(
    __dirname,
    "../domains/walker/__tests__"
  );
  console.log(new_db_filepath);
  if (!process.env.SQLITE_DB_PATH) {
    console.log("The SQLITE_DB_PATH not existing env variables");
    return;
  }
  const db = new sqlite3.Database(process.env.SQLITE_DB_PATH);
  // const today = dayjs().format("YYYYMMDD");
  const new_db = new sqlite3.Database(path.resolve(new_db_filepath, `data.db`));
  // 读取原始数据库文件的表结构
  db.serialize(() => {
    db.each(
      "SELECT name FROM sqlite_master WHERE type='table'",
      (err, row: { name: string }) => {
        if (err) {
          console.error(err.message);
        }
        let tableName = row.name;
        db.each(
          `PRAGMA table_info(${tableName})`,
          (
            err,
            row: {
              name: string;
              type: string;
              pk: number;
              notnull: number;
              cid: number;
            }
          ) => {
            if (err) {
              console.error(err.message);
            }
            const columnName = row.name;
            const columnType = row.type;
            const isPrimaryKey = row.pk === 1;
            const isNotNull = row.notnull === 1;
            const isAutoIncrement =
              row.cid === 0 && isPrimaryKey && columnType === "INTEGER";
            let columnDefinition = `${columnName} ${columnType}`;
            if (isPrimaryKey) {
              columnDefinition += " PRIMARY KEY";
              if (isAutoIncrement) {
                columnDefinition += " AUTOINCREMENT";
              }
            }
            if (isNotNull) {
              columnDefinition += " NOT NULL";
            }
            new_db.run(
              `CREATE TABLE IF NOT EXISTS ${tableName} (${columnDefinition})`
            );
          }
        );
      }
    );
  });
  setTimeout(() => {
    db.close();
    new_db.close();
  }, 2000);
})();
