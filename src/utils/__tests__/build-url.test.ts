import { expect, it, describe } from "vitest";

// import { buildUrl } from "../utils";

import { query_stringify } from "@/utils";
import { JSONObject } from "@/types";

type ParamConfigure = {
  name: string;
  prefix: string;
  suffix: string;
  pattern: string;
  modifier: string;
};
export function buildUrl(key: string, params?: JSONObject, query?: Parameters<typeof query_stringify>[0]) {
  const keys: ParamConfigure[] = [];
  //   const regexp = pathToRegexp(view.key, keys);
  //   const result = {
  //     regexp,
  //     keys,
  //   };
  //   console.log(result);
  const search = (() => {
    if (!query || Object.keys(query).length === 0) {
      return "";
    }
    return "?" + query_stringify(query);
  })();
  const url = (() => {
    if (!key.match(/:[a-z]{1,}/)) {
      return key + search;
    }
    if (!params || Object.keys(params).length === 0) {
      return key + search;
    }
    return (
      key.replace(/:([a-z]{1,})/g, (...args: string[]) => {
        const [, field] = args;
        const value = String(params[field] || "");
        return value;
      }) + search
    );
  })();
  return url;
}

describe("路径生成", () => {
  it("没有路径参数", () => {
    const path = "/home/tv";
    const params = {
      id: "1",
      type: "2",
    };
    const r = buildUrl(path, params);
    expect(r).toBe("/home/tv");
  });

  it("有一个路径参数", () => {
    const path = "/home/tv/:id";
    const params = {
      id: "1",
    };
    const r = buildUrl(path, params);
    expect(r).toBe("/home/tv/1");
  });

  it("有多个路径参数", () => {
    const path = "/home/:type/:id";
    const params = {
      id: "1",
      type: "2",
    };
    const r = buildUrl(path, params);
    expect(r).toBe("/home/2/1");
  });

  it("有 query", () => {
    const path = "/home/:type/:id";
    const params = {
      id: "1",
      type: "2",
    };
    const r = buildUrl(path, params, { season: "s01" });
    expect(r).toBe("/home/2/1?season=s01");
  });
});
