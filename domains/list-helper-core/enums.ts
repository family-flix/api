export enum PluginType {
  preset = "preset",
  plugin = "plugin",
}

export enum ServiceStage {
  uninitialized,
  constructor,
  init,
  initPresets,
  initPlugins,
  initHooks,
  pluginReady,
  getConfig,
  getPaths,
  run,
}

export enum ConfigChangeType {
  reload = "reload",
  regenerateTmpFiles = "regenerateTmpFiles",
}

/**
 * 插件触发类型
 */
export enum ApplyPluginsType {
  /**
   * 新增
   */
  add = "add",
  /**
   * 修改参数，返回新的参数
   */
  modify = "modify",
  /**
   * 事件触发，会修改传入的参数
   */
  event = "event",
}

export enum EnableBy {
  register = "register",
  config = "config",
}
