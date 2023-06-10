const esbuild = require("esbuild");
const pkg = require('pkg');

async function run() {
  await esbuild
    .build({
      entryPoints: ["./src/bin/index.ts"], // 指定您的入口文件
      outfile: "./index.js", // 指定输出的打包文件
      bundle: true, // 启用打包模式
      platform: "node", // 指定目标平台为浏览器
      format: "cjs",
      external: ["next", "express", "@prisma/client", "mitt", "qiniu", "axios", "dayjs", "nzh", "chalk"],
    })
    .catch(() => process.exit(1));

  // await pkg.exec()
}

run();
