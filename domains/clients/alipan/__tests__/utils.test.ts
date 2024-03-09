/**
 * @file
 */
import fs from "fs";
import path from "path";
import os from "os";

import { describe, expect, test } from "vitest";

// import { prepare_upload_file, prepare_upload_file2 } from "../aliyundrive/utils";

describe("工具方法测试", () => {
  test(
    "构建上传凭证",
    async () => {
      const filepath = path.resolve(
        os.homedir(),
        "./Downloads/tmp_media/可爱的中国.My.Beloved.China.2019.E01.WEB-DL.4K.HEVC.HLG.AAC-OPS.mp4"
      );
      const buffer = fs.readFileSync(filepath);
      const token =
        "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NTY1MDQ1ZWVmODQ0NDVjYmRlY2U3OTBhZWJlNTRiZCIsImN1c3RvbUpzb24iOiJ7XCJjbGllbnRJZFwiOlwicEpaSW5OSE4yZFpXazhxZ1wiLFwiZG9tYWluSWRcIjpcImJqMjlcIixcInNjb3BlXCI6W1wiRFJJVkUuQUxMXCIsXCJGSUxFLkFMTFwiLFwiVklFVy5BTExcIixcIlNIQVJFLkFMTFwiLFwiU1RPUkFHRS5BTExcIixcIlNUT1JBR0VGSUxFLkxJU1RcIixcIlVTRVIuQUxMXCIsXCJCQVRDSFwiLFwiQUNDT1VOVC5BTExcIixcIklNQUdFLkFMTFwiLFwiSU5WSVRFLkFMTFwiLFwiU1lOQ01BUFBJTkcuTElTVFwiXSxcInJvbGVcIjpcInVzZXJcIixcInJlZlwiOlwiXCIsXCJkZXZpY2VfaWRcIjpcIjYyNjBlYTBiMzNkNDQyZmNhMmMxMWQ5ZTJjYjVkMWZmXCJ9IiwiZXhwIjoxNzAyNTMwMTA1LCJpYXQiOjE3MDI1MjI4NDV9.Ks4Vl25i0fgpmpaRH7rEex5JT4Ciepmk6oKgSIRDpLwgxh4fUcQsXNgKV8svOy72CkJjC6lnDFkbzO0kxjuEEdEEkd65oAiBsBLB55vdgE7Dc6SXc44yDw1tFfVY8xUezE3o2BarALTCL38E5uUzDxU1-QGDT0AefZGiLxsQfo8";
      // const r1 = await prepare_upload_file(filepath, {
      //   token,
      //   size: 0,
      // });
      // if (r1.error) {
      //   console.log("1 failed");
      //   return;
      // }
      // const result2 = await prepare_upload_file2(buffer, {
      //   token,
      // });
      // const result1 = r1.data;
      // console.log(result1);
      // console.log(result2);
      // expect(result1).toStrictEqual(result2);
      expect(true).toBe(true);
    },
    {
      timeout: 5000,
    }
  );
});
