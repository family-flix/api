require("dotenv").config();

import { store } from "@/store";
import {
  patch_shared_files,
  check_tv_in_progress_is_completed,
} from "./patch_tv_in_progress";

async function main() {
  await check_tv_in_progress_is_completed(store);
  await patch_shared_files(store);
}

main();
