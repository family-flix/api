const path = require("path");
const { parse } = require("url");

require("dotenv").config();
const next = require("next");
const express = require("express");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST || "0.0.0.0";
const port = process.env.PORT || 3200;
const output_path = process.env.OUTPUT_PATH || __dirname;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();

  // const assets = path.resolve(output_path, "storage");
  // server.use(express.static(assets, { maxAge: "7d", immutable: true }));

  server.all("*", (req, res) => {
    const url = parse(req.url, true);
    //     const { pathname, hostname, search } = url;
    return handle(req, res, url);
  });
  server.listen(port, hostname, () => {
    console.log("asset server is listen at", `${hostname}:${port}`);
  });
});
