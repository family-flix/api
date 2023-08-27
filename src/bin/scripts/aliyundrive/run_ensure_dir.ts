require("dotenv").config();

import fs from "fs";
import crypto from "crypto";

import { Drive } from "@/domains/drive";
import { Application } from "@/domains/application";
import path from "path";

async function main() {
  const app = new Application({
    root_path: "/Users/litao/Documents/workspaces/family-flix/dev-output",
  });
  const store = app.store;
  const user = {
    id: "c983KOZIgUtKheH",
  };
  const drive_id = "WHFIiV9ILBmwaAK";
  const drive_res = await Drive.Get({
    id: drive_id,
    user_id: user.id,
    store,
  });
  if (drive_res.error) {
    return;
  }
  const client = drive_res.data.client;
  const r = await client.ensure_dir(["_subtitle", "test", "hello"], "root");
  if (r.error) {
    console.log(r.error.message);
    return;
  }
  console.log("upload success");
  console.log(r.data);
}

main();
