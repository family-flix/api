require("dotenv").config();
import { store } from "@/store/sqlite";
import { delete_duplicate_episode } from "./delete_duplicate_episode";

async function main() {
  await delete_duplicate_episode(store);
  console.log("Complete");
}

main();
