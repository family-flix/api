/**
 * @file 遍历 async_task 表进行操作
 */
require("dotenv").config();
import dayjs from "dayjs";

import { AsyncTaskRecord, RecordCommonPart } from "@/store/types";
import { store } from "@/store/sqlite";

import { walk_table_with_pagination } from "@/domains/walker/utils";

async function run() {
  await walk_table_with_pagination<AsyncTaskRecord & RecordCommonPart>(
    store.find_async_task_with_pagination,
    {
      async on_handle(episode) {
        const { id, status, created, updated } = episode;
        if (created.includes("GMT")) {
          const d = dayjs(created).toISOString();
          const r = await store.update_async_task(id, {
            // @ts-ignore
            created: d,
          });
          if (r.error) {
            console.log("created failed", r.error.message);
          }
        }
        if (updated.includes("GMT")) {
          const r = await store.update_async_task(id, {
            // @ts-ignore
            updated: dayjs(updated).toISOString(),
          });
          if (r.error) {
            console.log("updated failed", r.error.message);
          }
        }
        if (
          status === "Running" &&
          dayjs(created).isBefore(dayjs().add(1, "hour"))
        ) {
          console.log("update episode status");
          console.log("need update status");
        }
      },
    }
  );
  console.log("Complete");
}

run();
