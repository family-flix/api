import { ensure_sync } from "@/utils/back_end";
import dayjs from "dayjs";
import pino from "pino";

const today = dayjs().format("YYYYMMDD");
export const logger = (() => {
  try {
    const log_path = process.env.LOG_PATH;
    if (!log_path) {
      return null;
      // throw new Error("Missing LOG_PATH in env");
    }
    ensure_sync(log_path);
    return pino(
      {},
      pino.destination({
        dest: `${log_path}/${today}`,
        sync: false,
      })
    );
  } catch (err) {
    return null;
  }
})();
export function log(...args: unknown[]) {
  if (logger === null) {
    return;
  }
  const msgs: (string | number)[] = [];
  const data: unknown[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const v = args[i];
    if (typeof v === "object" && v !== null) {
      data.push(v);
      continue;
    }
    if (["string", "number"].includes(typeof v)) {
      msgs.push(v as string | number);
      continue;
    }
  }
  const text = msgs.join(" ");
  const child = logger.child({ data });
  child.info(text);
}
