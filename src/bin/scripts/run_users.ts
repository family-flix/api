require("dotenv").config();

import { store } from "@/store";

async function main() {
  const list = await store.prisma.user.findMany({});
  console.log(list);
}

main();
