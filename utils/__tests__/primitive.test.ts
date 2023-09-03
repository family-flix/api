import { expect, it, describe } from "vitest";

import { toNumber } from "../primitive";

describe("基础类型值处理", () => {
  it("数字", () => {
    const r = toNumber("1", null);
    expect(r).toBe(1);
  });
});
