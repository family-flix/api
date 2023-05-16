import { describe, it, expect } from "vitest";

import { test_store } from "../store";

describe.skip("删除文件夹及子孙文件夹", () => {
  const { user_id, drive_id } = {
    user_id: "123",
    drive_id: "123",
  };
  it("1", () => {
    test_store.add_file({
      file_id: "01",
      parent_file_id: "root",
      type: 0,
      size: 0,
      name: "01",
      drive_id,
      user_id,
    });
  });
});
