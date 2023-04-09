require("dotenv").config();
import { store } from "@/store/sqlite";

import { check_in } from "./check_in";

(async () => {
  const resp = await check_in(store);
  if (resp.error) {
    console.log("[ERROR]check_in failed", resp.error.message);
    return;
  }
  console.log("Check in success");
})();
