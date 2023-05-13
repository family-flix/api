require("dotenv").config();

import { store } from "@/store";

import { find_tv_need_complete } from "./find_tv_need_complete";

function main() {
  find_tv_need_complete(store);
}

main();
