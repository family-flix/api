/**
 * @file 索引指定云盘
 */
import { throttle } from "lodash/fp";

import { AliyunDriveClient } from "@/domains/aliyundrive";
import { FolderWalker } from "@/domains/walker";
import { AliyunDriveFolder } from "@/domains/folder";
import { Article, ArticleLineNode } from "@/domains/article";
import { MediaSearcher } from "@/domains/searcher";
import { EpisodeFileProcessor } from "@/domains/episode_file_processor";
import { Result } from "@/types";
import { store_factory } from "@/store";
import { log } from "@/logger/log";

import { adding_file_safely, need_skip_the_file_when_walk } from "./utils";
import { TaskStatus } from "./constants";

/** 索引云盘 */
export async function walk_drive(options: {
  /** 云盘所属用户 id */
  user_id: string;
  /** 云盘 id */
  drive_id: string;
  /** 不全量索引云盘，仅处理这些文件夹/文件 */
  files?: {
    /** 文件名 */
    name: string;
    /** 文件类型 */
    type: string;
  }[];
  /**
   * 用来对云盘进行 API 请求的客户端实例
   */
  client: AliyunDriveClient;
  /** 数据库实例 */
  store: ReturnType<typeof store_factory>;
  /** 从 TMDB 搜索到匹配的结果后，是否需要将海报等图片上传到 cdn */
  upload_image?: boolean;
  /** 是否等待完成（默认都不等待，单测时可以等待） */
  wait_complete?: boolean;
}) {}
