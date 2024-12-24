const fs = require("fs");
const path = require("path");

const esbuild = require("esbuild");

const pkg = require("../package.json");

const ROOT_DIR = path.join(__dirname, "..");
const DIST_DIR = path.join(ROOT_DIR, "./dist");

const ENTRY_JS_FILEPATH = path.join(DIST_DIR, "server.js");
const PWD_SCRIPT_FILEPATH = path.join(DIST_DIR, "pwd.js");

const PACKAGE_FILEPATH = path.join(DIST_DIR, "package.json");
const ENV_FILEPATH = path.join(DIST_DIR, ".env");
const FRONTEND_ASSET_DIR = path.join(DIST_DIR, "dist/assets");

const PRISMA_DIR = path.join(ROOT_DIR, "prisma");
const TARGET_PRISMA_DIR = path.join(DIST_DIR, "prisma");

console.log("[INFO]PATH/dist_dir", DIST_DIR);
console.log("[INFO]PATH/entry_js_filepath", ENTRY_JS_FILEPATH);
console.log("[INFO]PATH/pwd_script_filepath", PWD_SCRIPT_FILEPATH);
console.log("[INFO]PATH/package_filepath", PACKAGE_FILEPATH);
console.log("[INFO]PATH/env_filepath", ENV_FILEPATH);

async function run() {
  await esbuild
    .build({
      entryPoints: ["./src/index.ts"],
      outfile: ENTRY_JS_FILEPATH,
      platform: "node",
      target: "node12",
      legalComments: "none",
      bundle: true,
      minify: true,
      external: ["@prisma/client"],
    })
    .catch(() => process.exit(1));
  await esbuild
    .build({
      entryPoints: ["./src/scripts/change_pwd.ts"],
      outfile: PWD_SCRIPT_FILEPATH,
      platform: "node",
      target: "node12",
      legalComments: "none",
      bundle: true,
      minify: true,
      external: ["@prisma/client"],
    })
    .catch(() => process.exit(1));
  const simple_pkg = {
    name: pkg.name,
    version: pkg.version,
    script: {
      start: pkg.scripts.start,
    },
    dependencies: {
      "@prisma/client": pkg.dependencies["@prisma/client"],
    },
    devDependencies: {
      prisma: pkg.devDependencies["prisma"],
    },
  };
  fs.writeFileSync(PACKAGE_FILEPATH, JSON.stringify(simple_pkg));
  fs.writeFileSync(
    ENV_FILEPATH,
    `DATABASE_PATH=file:///output/data/family-flix.db?connection_limit=1
PRISMA_SCHEMA_PATH=./prisma/schema.prisma
# 上面的内容都不用改动

# 数据库、封面图片等文件的存放目录
OUTPUT_PATH=/output
`
  );
  copy(PRISMA_DIR, TARGET_PRISMA_DIR);

  console.log("Completed.");
}

run();

function copy(source, target) {
  // 确保目标文件夹存在
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
  const files = fs.readdirSync(source);
  for (const file of files) {
    const source_file = path.join(source, file);
    const target_file = path.join(target, file);
    if (fs.statSync(source_file).isDirectory()) {
      copy(source_file, target_file);
    } else {
      fs.copyFileSync(source_file, target_file);
    }
  }
}
