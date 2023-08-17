require("dotenv").config();
const path = require("path");

const express = require("express");
const ASSETS_PATH = path.resolve(process.env.OUTPUT_PATH || __dirname, "storage");
console.log(ASSETS_PATH);
const assets = path.resolve(ASSETS_PATH);
const port = 3201;
const host = "0.0.0.0";

console.log("", assets);

const server = express();
server.use(express.static(assets, { maxAge: "365d", immutable: true }));
server.listen(port, host, () => {
  console.log("asset server is listen at", `${host}:${port}`);
});
