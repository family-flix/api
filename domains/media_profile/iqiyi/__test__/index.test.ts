/**
 * @file 国漫
 */
import crypto from "crypto";

import { describe, expect, test } from "vitest";
import dayjs from "dayjs";

const w = "howcuteitis";
function get_sign() {
  var t = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : {},
    e = arguments.length > 1 && void 0 !== arguments[1] ? arguments[1] : {},
    r = e.splitKey,
    n = void 0 === r ? "&" : r,
    o = e.secretKey,
    c = void 0 === o ? w : o,
    l = e.key,
    d = void 0 === l ? "secret_key" : l,
    f = Object.keys(t).sort(),
    _ = f.map(function (e) {
      return "".concat(e, "=").concat(t[e]);
    });
  const hash = crypto.createHash("md5");
  return _.push("".concat(d, "=").concat(c)), hash.update(_.join(n)).digest("hex").toUpperCase();
}

describe("dayjs", () => {
  test("20231010", () => {
    const obj = {
      entity_id: 2109395369199100,
      timestamp: 1700978349899,
      src: "pcw_tvg",
      vip_status: 0,
      vip_type: "",
      auth_cookie: "",
      device_id: "4798183996645ebf3163434564f5252c",
      user_id: "",
      app_version: "6.1.0",
      scale: 200,
      // sign=FE56903F2C9BD72EC4E65729442139AB
    };
    const sign = get_sign(obj);
    expect(sign).toBe("FE56903F2C9BD72EC4E65729442139AB");
  });
});
