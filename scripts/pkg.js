const path = require("path");
const fs = require("fs");

const pkg = require("pkg");

async function run() {
  const prismaClientPkg = require(".prisma/client/package.json");
  if (!prismaClientPkg.version) {
    prismaClientPkg.version = "1.0.0";
    fs.writeFileSync(".prisma/client/package.json", JSON.stringify(prismaClientPkg));
  }
  await pkg.exec(["./index.js", "--config=scripts/pkg.json", "--target=macos", "--compress=GZip", "--out-path=bin"]);
}

run();
