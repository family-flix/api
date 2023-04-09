// @ts-nocheck
/**
 * api 插件
 * @param api
 */
export default function debugPlugin(api) {
  api.applyPlugins({
    key: "debug",
    fn: () => {
      // this.log(
      //   `%c CORE %c ${this.originalFetch.name} %c sort `,
      //   "color:white;background:#dfa639;border-top-left-radius:2px;border-bottom-left-radius:2px;",
      //   "color:white;background:#515a6e;border-top-right-radius:2px;border-bottom-right-radius:2px;",
      //   "color:#515a6e;",
      //   sorter
      // );
    },
  });
}
