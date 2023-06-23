const path = require("path");

const express = require("express");

const assets = path.resolve(__dirname, "storage");
const port = 3201;
const host = "0.0.0.0";

console.log('', assets);

const server = express();
server.use(express.static(assets));
server.listen(port, host, () => {
  console.log("asset server is listen at", `${host}:${port}`);
});
