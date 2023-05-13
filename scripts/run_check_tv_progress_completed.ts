require("dotenv").config();

import { store } from "@/store";

import { check_tv_in_progress_is_completed } from "./patch_tv_in_progress";

async function main() {
  await check_tv_in_progress_is_completed(store);
  console.log("\nComplete");
}

main();
