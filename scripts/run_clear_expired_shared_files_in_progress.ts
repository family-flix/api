require("dotenv").config();

import { store } from "@/store/sqlite";

import { clear_expired_shared_files_in_progress } from "./clear_expired_shared_files_in_progress";

async function main() {
  await clear_expired_shared_files_in_progress(store);
  console.log("\nComplete");
}

main();
