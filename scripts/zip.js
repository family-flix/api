/**
 * 将打包好的二进制、prisma 二进制 和 prisma schema 打包成压缩包
 */
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

const pkg = require("../package.json");

const ROOT_PATH = process.cwd();
function main() {
  const zip_filepath = path.resolve(ROOT_PATH, `family-flix${pkg.version}.zip`);
  const files = [
    {
      type: "dir",
      filepath: path.resolve(ROOT_PATH, "prisma"),
      target_path: "prisma",
    },
    {
      type: "dir",
      filepath: path.resolve(ROOT_PATH, "dist"),
      target_path: "dist",
    },
    {
      type: "dir",
      filepath: path.resolve(ROOT_PATH, "public"),
      target_path: "public",
    },
    {
      type: "file",
      filepath: path.resolve(ROOT_PATH, "server.js"),
      target_path: "server.js",
    },
    {
      type: "file",
      filepath: path.resolve(ROOT_PATH, ".env.template"),
      target_path: ".env.template",
    },
  ];
  const pkg_content = {
    name: "family-flix",
    version: pkg.version,
    scripts: {
      start: "node server.js",
    },
    dependencies: {
      "@prisma/client": "4.13.0",
    },
    devDependencies: {
      prisma: "^4.16.2",
    },
  };
  // 将 package.json 内容转换为字符串并写入压缩包
  const output = fs.createWriteStream(zip_filepath);
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
  for (let i = 0; i < files.length; i += 1) {
    const { type, filepath, target_path } = files[i];
    if (type === "dir") {
      archive.directory(filepath, target_path);
    }
    if (type === "file") {
      archive.file(filepath, { name: target_path });
    }
  }
  archive.append(JSON.stringify(pkg_content, null, 2), { name: "package.json" });
  archive.finalize();
}

main();
