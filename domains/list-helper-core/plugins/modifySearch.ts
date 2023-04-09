// @ts-nocheck
import { omit } from "../utils";
/**
 * 拓展 modifySearch 方法
 */
export function modifySearchPlugin(api) {
  api.describe({
    key: "modifySearchPlugin",
    name: "modifySearch",
    fn(process) {
      this.params = {
        ...process(omit(this.params, ["page", "pageSize"])),
        page: this.params.page,
        pageSize: this.params.pageSize,
      };
      return this.resolve();
    },
  });

  // api.registerMethod({

  // });
}
