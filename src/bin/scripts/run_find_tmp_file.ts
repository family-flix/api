require("dotenv").config();

import { store } from "@/store";

async function main() {
  const body = {
    name: "L 莲花楼 [2023][40集持续更新中]",
    // parent_paths: "2017.小谢尔顿.1-5季.1080p/小谢尔顿S01",
    parent_paths: "",
  };
  const r = await store.prisma.tmp_file.findFirst({
    where: {
      name: body.name,
      parent_paths: body.parent_paths,
    },
  });
  //   const r = await store.find_tmp_file({});
  //   if (r.error) {
  //     console.log(r.error.message);
  //     return;
  //   }
  //   if (!r.data) {
  //     console.log("not found");
  //     return;
  //   }
  console.log("find", r);
}

main();
