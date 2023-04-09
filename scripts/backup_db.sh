#!/bin/bash

source .env

# src_db_path=${SQLITE_DB_PATH}
# new_db_path="./domains/walker/__tests__/data.db"

# table_names=$(sqlite3 $src_db_path ".tables")


# # 遍历表名列表，创建新数据库文件中的表结构
# for table_name in $table_names; do
#     echo $table_name

#     # 获取源数据库文件中的表结构 SQL 语句
#     create_table_sql=$(sqlite3 -line $src_db_path "SELECT sql FROM sqlite_master WHERE type='table' AND name='$table_name';")

#     # 在新数据库文件中创建表结构
#     sqlite3 $new_db_path "$create_table_sql"
# done



# 源数据库文件
# SRC_DB=${SQLITE_DB_PATH}
# echo $SRC_DB

# # 新数据库文件
# NEW_DB="./domains/walker/__tests__/data.db"

# # 获取源数据库文件中的表名
# TABLES="$(sqlite3 $SRC_DB ".tables")"

# touch $NEW_DB

# # 逐个复制源数据库文件中的表结构到新的数据库文件中
# for TABLE in $TABLES; do
#   echo $TABLE
#   output="$(sqlite3 $SRC_DB "SELECT * FROM $TABLE WHERE 0;")"
# #   echo $output
#   sqlite3 $NEW_DB "CREATE TABLE $TABLE AS $output"
# done

# 原始数据库文件名
SOURCE_DB=${SQLITE_DB_PATH}

# 新数据库文件名
NEW_DB="./domains/__tests__/data.db"

if [ -f "$NEW_DB" ]; then
  rm "$NEW_DB"
  echo "已删除文件 $NEW_DB"
fi

# 连接到原始数据库，获取所有表的名称
table_names=$(sqlite3 $SOURCE_DB "SELECT name FROM sqlite_master WHERE type='table';")

# 创建新的数据库文件，并连接到新数据库
touch $NEW_DB

# 循环遍历所有表，并从源表中获取表结构信息并创建新表
for table_name in $table_names; do
    table_schema=$(sqlite3 $SOURCE_DB ".schema $table_name")
    sqlite3 $NEW_DB "$table_schema"
done

