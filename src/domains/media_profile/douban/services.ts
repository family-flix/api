/**
 * @file 豆瓣 api
 */
import { Result, resultify, UnpackedResult } from "@/domains/result/index";
import { DOUBAN_GENRE_TEXT_TO_VALUE } from "@/constants";
import { Unpacked } from "@/types/index";
// import { query_stringify } from "@/utils";

export type Language = "zh-CN" | "en-US";
export type RequestCommonPart = {
  api_key?: string;
  language?: string;
};
