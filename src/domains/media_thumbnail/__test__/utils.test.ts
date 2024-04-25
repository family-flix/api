import { describe, test, expect } from "vitest";

import { format_number_with_3decimals } from "../utils";

describe("format_number_with_3decimals", () => {
  test("10.12", () => {
    const v = format_number_with_3decimals(10.12);
    expect(v).toBe("10.120");
  });
  test("10", () => {
    const v = format_number_with_3decimals(10);
    expect(v).toBe("10.000");
  });
  test("1130.2", () => {
    const v = format_number_with_3decimals(1130.2);
    expect(v).toBe("1130.200");
  });
  test("1130.23232323", () => {
    const v = format_number_with_3decimals(1130.23232323);
    expect(v).toBe("1130.232");
  });
});
