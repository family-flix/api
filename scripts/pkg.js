const path = require("path");
const fs = require("fs");

const pkg = require("pkg");

async function run() {
  const prismaClientPkg = require(".prisma/client/package.json");
  if (!prismaClientPkg.version) {
    prismaClientPkg.version = "1.0.0";
    fs.writeFileSync("node_modules/.prisma/client/package.json", JSON.stringify(prismaClientPkg));
  }
  await pkg.exec([
    "./dist/t.js",
    "--config=scripts/pkg.json",
    "--debug",
    // "--targets=node16-macos-x64,node16-win-arm64,node16-linux-arm64",
    "--targets=node16-macos-x64",
    "--compress=GZip",
    "--out-path=bin",
  ]);
}

run();
