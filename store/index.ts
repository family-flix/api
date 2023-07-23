import { Application } from "@/domains/application";
import { Folder } from "@/domains/folder";
import { DatabaseStore } from "@/domains/store";
import { FileType } from "@/constants";
import { Result, resultify } from "@/types";

export const app = new Application({
  root_path: process.cwd(),
});
export const store = app.store;

/**
 * 本地存储的 folder client，和 drive client 等同使用
 * @param body
 * @param store
 * @returns
 */
export function folder_client(body: { drive_id: string }, store: DatabaseStore) {
  const { drive_id } = body;
  return {
    async fetch_file(id: string) {
      const r = await store.find_file({ file_id: id, drive_id });
      if (r.error) {
        return r;
      }
      if (!r.data) {
        return Result.Err("No matched record");
      }
      return Result.Ok({
        ...r.data,
        type: r.data.type === 1 ? "file" : "folder",
      });
    },
    async fetch_files(id: string, options: { marker?: string } = {}) {
      const { marker } = options;
      const page_size = 20;
      const r = await resultify(store.prisma.file.findMany.bind(store.prisma.file))({
        where: {
          parent_file_id: id,
          drive_id: drive_id,
          name: marker === "" ? undefined : { lte: marker },
        },
        orderBy: {
          name: "desc",
        },
        take: page_size + 1,
      });
      if (r.error) {
        return r;
      }
      const rows = r.data.map((f) => {
        const { file_id, parent_file_id, name, type } = f;
        return {
          file_id,
          parent_file_id,
          name,
          type: type === FileType.File ? "file" : "folder",
        };
      });
      const has_next_page = rows.length === page_size + 1 && rows[page_size];
      const next_marker = has_next_page ? rows[page_size].name : "";
      const result = {
        items: rows.slice(0, page_size),
        next_marker,
      };
      return Result.Ok(result);
    },
  } as Folder["client"];
}
