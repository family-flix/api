/**
 * 将打包好的二进制、prisma 二进制 和 prisma schema 打包成压缩包
 */
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

const pkg = require("../package.json");

const ROOT_PATH = process.cwd();
const FLIX_BINS = [
  {
    filepath: "flix-linux",
    platform: "linux",
    prisma_bin_path: "prisma_v4.17.0",
  },
  {
    filepath: "flix-macos",
    platform: "macos",
    prisma_bin_path: "prisma_v4.17.0",
  },
  {
    filepath: "flix-win.exe",
    platform: "win",
    prisma_bin_path: "prisma_v4.17.0.exe",
  },
];
function main() {
  for (let i = 0; i < FLIX_BINS.length; i += 1) {
    const bin = FLIX_BINS[i];
    const { filepath, platform, prisma_bin_path } = bin;
    const prisma_filepath = path.resolve(ROOT_PATH, "bin", platform, prisma_bin_path);
    const flix_filepath = path.resolve(ROOT_PATH, "bin", filepath);
    const prisma_schema_path = path.resolve(ROOT_PATH, "prisma");
    const target_filepath = path.resolve(ROOT_PATH, "bin", `flix_${pkg.version}_${platform}_x64.zip`);

    const output = fs.createWriteStream(target_filepath);
    const archive = archiver("zip", {
      zlib: { level: 9 },
    });
    output.on("close", () => {
      console.log("压缩包生成成功！");
    });
    archive.on("error", (err) => {
      throw err;
    });
    archive.pipe(output);
    archive.file(prisma_filepath, { name: "prisma_v4.17.0" });
    archive.file(flix_filepath, { name: "flix-linux" });
    archive.directory(prisma_schema_path, "prisma");
    archive.finalize();

    //     tar.c(
    //       {
    //         file: target_filepath,
    //         sync: true,
    //         // C: ROOT_PATH,
    //         prefix: null,
    //       },
    //       [prisma_filepath, prisma_schema_path, flix_filepath]
    //     );
  }
}

main();
