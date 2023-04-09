require("dotenv").config();
import { store } from "@/store/sqlite";

import { walk_added_files } from "./walk_added_files";

function main() {
  walk_added_files(store);
}

main();
