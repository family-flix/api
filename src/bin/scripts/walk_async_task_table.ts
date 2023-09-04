/**
 * @file 遍历 async_task 表进行操作
 */
require("dotenv").config();
import dayjs from "dayjs";

import { store } from "@/store";
import { walk_records } from "@/domains/store/utils";
import { TaskStatus } from "@/domains/job";

async function run() {
  walk_records(store.prisma.async_task, {}, async (task) => {
    const { id, status, created, updated } = task;
    // if (created.includes("GMT")) {
    //   const d = dayjs(created).toISOString();
    //   const r = await store.update_task(id, {
    //     // @ts-ignore
    //     created: d,
    //   });
    //   if (r.error) {
    //     console.log("created failed", r.error.message);
    //   }
    // }
    // if (updated.includes("GMT")) {
    //   const r = await store.update_task(id, {
    //     // @ts-ignore
    //     updated: dayjs(updated).toISOString(),
    //   });
    //   if (r.error) {
    //     console.log("updated failed", r.error.message);
    //   }
    // }
    if (status === TaskStatus.Running && dayjs(created).isBefore(dayjs().add(1, "hour"))) {
      console.log("update episode status");
      console.log("need update status");
    }
  });
  console.log("Complete");
}

run();
