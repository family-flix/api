import { expect, it, describe } from "vitest";

import { to_number } from "../primitive";

describe("基础类型值处理", () => {
  it("数字", () => {
    const r = to_number("1", null);
    expect(r).toBe(1);
  });
});
