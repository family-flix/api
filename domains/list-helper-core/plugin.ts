// @ts-ignore
import * as tapable from "tapable";

import { ApplyPluginsType } from "./enums";

import { IHook } from "./typing";

const { AsyncSeriesWaterfallHook, SyncWaterfallHook } = tapable;

function isPromise(obj: any) {
  return (
    !!obj &&
    (typeof obj === "object" || typeof obj === "function") &&
    typeof obj.then === "function"
  );
}

export default class PluginAPI {
  ApplyPluginsType = ApplyPluginsType;
  hooksByPluginId: {
    [key: string]: IHook[];
  } = {};
  skipPluginIds: Set<string> = new Set<string>();

  pluginMethods: {
    [key: string]: any;
  } = {};

  constructor() {
    this.ApplyPluginsType = ApplyPluginsType;
  }

  describe() {}

  async applyAPI(opts: { apply: Function; api: PluginAPI }) {
    let ret = opts.apply()(opts.api);
    if (isPromise(ret)) {
      ret = await ret;
    }
    return ret || {};
  }

  register(hook: IHook) {
    // console.log("[PluginAPI]register hook", hook);
    if (!(hook.key && typeof hook.key === "string")) {
      console.log(
        `api.register() failed, hook.key must supplied and should be string, but got ${hook.key}.`
      );
    }
    if (!(hook.fn && typeof hook.fn === "function")) {
      console.log(
        `api.register() failed, hook.fn must supplied and should be function, but got ${hook.fn}.`
      );
    }
    this.hooksByPluginId[hook.key] = (
      this.hooksByPluginId[hook.key] || []
    ).concat(hook);
  }

  applySyncPlugins(opts: {
    key: string;
    type: ApplyPluginsType;
    initialValue?: any;
    args?: any;
  }) {
    // console.log('[PluginAPI]applyPlugins', opts.key);
    const hooks = this.hooksByPluginId[opts.key] || [];
    switch (opts.type) {
      case ApplyPluginsType.add:
        if ("initialValue" in opts) {
          if (!Array.isArray(opts.initialValue)) {
            console.log(
              `applyPlugins failed, opts.initialValue must be Array if opts.type is add.`
            );
          }
        }
        const tAdd = new SyncWaterfallHook<any>(["memo"]);
        for (const hook of hooks) {
          if (hook.name && !this.isPluginEnable(hook.name)) {
            continue;
          }
          tAdd.tap(
            {
              name: hook.pluginId!,
              stage: hook.stage || 0,
              // @ts-ignore
              before: hook.before,
            },
            (memo: any[]) => {
              const items = hook.fn(opts.args);
              return memo.concat(items);
            }
          );
        }
        return tAdd.call(opts.initialValue || []);
      case ApplyPluginsType.modify:
        const tModify = new SyncWaterfallHook(["memo"]);
        for (const hook of hooks) {
          if (hook.name && !this.isPluginEnable(hook.name)) {
            continue;
          }
          tModify.tap(
            {
              name: hook.key!,
              stage: hook.stage || 0,
              // @ts-ignore
              before: hook.before,
            },
            (memo: any) => {
              return hook.fn(memo, opts.args);
            }
          );
        }
        return tModify.call(opts.initialValue);
      case ApplyPluginsType.event:
        const tEvent = new SyncWaterfallHook(["value"]);
        for (const hook of hooks) {
          if (hook.name && !this.isPluginEnable(hook.name)) {
            continue;
          }
          tEvent.tap(
            {
              name: hook.key!,
              stage: hook.stage || 0,
              // @ts-ignore
              before: hook.before,
            },
            (value: any) => {
              hook.fn(value, opts.args);
            }
          );
        }
        return tEvent.call(opts.initialValue);
      default:
        throw new Error(
          `applyPlugin failed, type is not defined or is not matched, got ${opts.type}.`
        );
    }
  }

  async applyPlugins(opts: {
    key: string;
    type: ApplyPluginsType;
    initialValue?: any;
    args?: any;
  }) {
    // console.log('[PluginAPI]applyPlugins', opts.key);
    const hooks = this.hooksByPluginId[opts.key] || [];
    switch (opts.type) {
      case ApplyPluginsType.add:
        if ("initialValue" in opts) {
          if (!Array.isArray(opts.initialValue)) {
            console.log(
              `applyPlugins failed, opts.initialValue must be Array if opts.type is add.`
            );
          }
        }
        const tAdd = new AsyncSeriesWaterfallHook<any>(["memo"]);
        for (const hook of hooks) {
          if (hook.name && !this.isPluginEnable(hook.name)) {
            continue;
          }
          tAdd.tapPromise(
            {
              name: hook.pluginId!,
              stage: hook.stage || 0,
              // @ts-ignore
              before: hook.before,
            },
            async (memo: any[]) => {
              const items = await hook.fn(opts.args);
              return memo.concat(items);
            }
          );
        }
        return await tAdd.promise(opts.initialValue || []);
      case ApplyPluginsType.modify:
        const tModify = new AsyncSeriesWaterfallHook(["memo"]);
        for (const hook of hooks) {
          if (hook.name && !this.isPluginEnable(hook.name)) {
            continue;
          }
          tModify.tapPromise(
            {
              name: hook.key!,
              stage: hook.stage || 0,
              // @ts-ignore
              before: hook.before,
            },
            async (memo: any) => {
              return await hook.fn(memo, opts.args);
            }
          );
        }
        return await tModify.promise(opts.initialValue);
      case ApplyPluginsType.event:
        const tEvent = new AsyncSeriesWaterfallHook(["value"]);
        for (const hook of hooks) {
          if (hook.name && hook.name && !this.isPluginEnable(hook.name)) {
            continue;
          }
          tEvent.tapPromise(
            {
              name: hook.key!,
              stage: hook.stage || 0,
              // @ts-ignore
              before: hook.before,
            },
            async (value: any) => {
              await hook.fn(value, opts.args);
            }
          );
        }
        return await tEvent.promise(opts.initialValue);
      default:
        throw new Error(
          `applyPlugin failed, type is not defined or is not matched, got ${opts.type}.`
        );
    }
  }

  registerMethod({
    name,
    fn,
    exitsError = true,
  }: {
    name: string;
    fn?: Function;
    exitsError?: boolean;
  }) {
    if (this.pluginMethods[name]) {
      if (exitsError) {
        throw new Error(
          `api.registerMethod() failed, method ${name} is already exist.`
        );
      } else {
        return;
      }
    }
    // 这里不能用 arrow function，this 需指向执行此方法的 PluginAPI
    // 否则 pluginId 会不会，导致不能正确 skip plugin
    const defaultFn = function (fn: Function) {
      const hook = {
        key: name,
        fn,
      };
      // @ts-ignore
      this.register(hook);
    };
    this.pluginMethods[name] = fn || defaultFn;
  }

  isPluginEnable(pluginId: string) {
    if (this.skipPluginIds.has(pluginId)) return false;

    return true;
  }

  skipPlugins(pluginIds: string[]) {
    pluginIds.forEach((pluginId) => {
      this.skipPluginIds.add(pluginId);
    });
  }
}
