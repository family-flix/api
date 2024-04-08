/**
 * @file
 */
import fs from "fs";
import path from "path";
import os from "os";

import { describe, expect, test } from "vitest";

import { file_info, prepare_upload_file, prepare_upload_file2 } from "@/domains/clients/alipan/utils";

describe("工具方法测试", () => {
  test(
    "构建上传凭证",
    async () => {
      const filepath = path.resolve(os.homedir(), "./Downloads/这是什么/Spacedrive-darwin-x86_64.dmg");
      const buffer = fs.readFileSync(filepath);
      // const token =
      //   "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmNGY4YjYzMGRiZmE0MWMxYmUyZGUyYmE5MDRiYWNjNSIsImN1c3RvbUpzb24iOiJ7XCJjbGllbnRJZFwiOlwiMjVkelgzdmJZcWt0Vnh5WFwiLFwiZG9tYWluSWRcIjpcImJqMjlcIixcInNjb3BlXCI6W1wiRFJJVkUuQUxMXCIsXCJTSEFSRS5BTExcIixcIkZJTEUuQUxMXCIsXCJVU0VSLkFMTFwiLFwiVklFVy5BTExcIixcIlNUT1JBR0UuQUxMXCIsXCJTVE9SQUdFRklMRS5MSVNUXCIsXCJCQVRDSFwiLFwiT0FVVEguQUxMXCIsXCJJTUFHRS5BTExcIixcIklOVklURS5BTExcIixcIkFDQ09VTlQuQUxMXCIsXCJTWU5DTUFQUElORy5MSVNUXCIsXCJTWU5DTUFQUElORy5ERUxFVEVcIl0sXCJyb2xlXCI6XCJ1c2VyXCIsXCJyZWZcIjpcImh0dHBzOi8vd3d3LmFsaXBhbi5jb20vXCIsXCJkZXZpY2VfaWRcIjpcIjg0YTlhN2YxNDlmMDQ5MzI5NmM4MDI2YTIwZGU5ZDBmXCJ9IiwiZXhwIjoxNzEyNTU2MTg1LCJpYXQiOjE3MTI1NDg5MjV9.qpGLo2QWURotWj0PUUQvEsOAkgNjnduY5MCPPUgc12daHHS2TOkjw6B4Fa8USB6FDs_ZmOw5IyCE_XrR5v7vcIzav0a13Iyrpdu8YZcDVECgp5FMW8t99xxsCQc_Gbx2kNnwyI-oR5-cbPlL_49OciSnf7BpFqC6hwfJSzJD-VY";
      // const token =
      //   "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmNGY4YjYzMGRiZmE0MWMxYmUyZGUyYmE5MDRiYWNjNSIsImN1c3RvbUpzb24iOiJ7XCJjbGllbnRJZFwiOlwicEpaSW5OSE4yZFpXazhxZ1wiLFwiZG9tYWluSWRcIjpcImJqMjlcIixcInNjb3BlXCI6W1wiRFJJVkUuQUxMXCIsXCJGSUxFLkFMTFwiLFwiVklFVy5BTExcIixcIlNIQVJFLkFMTFwiLFwiU1RPUkFHRS5BTExcIixcIlNUT1JBR0VGSUxFLkxJU1RcIixcIlVTRVIuQUxMXCIsXCJCQVRDSFwiLFwiQUNDT1VOVC5BTExcIixcIklNQUdFLkFMTFwiLFwiSU5WSVRFLkFMTFwiLFwiU1lOQ01BUFBJTkcuTElTVFwiXSxcInJvbGVcIjpcInVzZXJcIixcInJlZlwiOlwiXCIsXCJkZXZpY2VfaWRcIjpcIjdjZTYxNzFiN2JiZTRkNWRhMjFmZTgyYWFiZWQyZWI2XCJ9IiwiZXhwIjoxNzEyNTYxMzkzLCJpYXQiOjE3MTI1NTQxMzN9.KV3WTs4qvthxNGGHYRUtZtgAkWFOAd6PWTzGycITJBOrq8rUShFSAErU6yGxf56DNxvOJjHZO5Fy7FftgjFlU_LsGYb6s6fZYroyl1tJDe8bAx10Bml_FQJsEJXCykrBLrXUqENPCFL-dPc8VEsCRZDE3lwRtys4x-5X6QA0IGA";
      const token =
        "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmNGY4YjYzMGRiZmE0MWMxYmUyZGUyYmE5MDRiYWNjNSIsImN1c3RvbUpzb24iOiJ7XCJjbGllbnRJZFwiOlwicEpaSW5OSE4yZFpXazhxZ1wiLFwiZG9tYWluSWRcIjpcImJqMjlcIixcInNjb3BlXCI6W1wiRFJJVkUuQUxMXCIsXCJGSUxFLkFMTFwiLFwiVklFVy5BTExcIixcIlNIQVJFLkFMTFwiLFwiU1RPUkFHRS5BTExcIixcIlNUT1JBR0VGSUxFLkxJU1RcIixcIlVTRVIuQUxMXCIsXCJCQVRDSFwiLFwiQUNDT1VOVC5BTExcIixcIklNQUdFLkFMTFwiLFwiSU5WSVRFLkFMTFwiLFwiU1lOQ01BUFBJTkcuTElTVFwiXSxcInJvbGVcIjpcInVzZXJcIixcInJlZlwiOlwiXCIsXCJkZXZpY2VfaWRcIjpcImZiM2I3MzE3M2VhNzRkOGM4NWQ5ZDA0ODlkYjBjNjMxXCJ9IiwiZXhwIjoxNzEyNTYxOTcyLCJpYXQiOjE3MTI1NTQ3MTJ9.oWyRg2QQYqsDqv8psBDbaYNPkoD2kRsJByWJQk01ZW5pFsLn52qB-HPtzU2cHfAt-YI5HLm5_LZHGHzlVhB3Qsqd5K5SQrsaj_Ewwu37zjiLim_pqCEGVg06XbslYrLj-nokJ63O3fJsH9-fmm6NTH3APWIDCptYpnQK2muF-Ww";
      const r2 = await file_info(filepath);
      if (r2.error) {
        console.log("r2 error", r2.error.message);
        return;
      }
      const { size: file_size } = r2.data;
      const r1 = await prepare_upload_file(filepath, {
        token,
        size: file_size,
      });
      if (r1.error) {
        console.log("1 failed");
        return;
      }
      const result2 = await prepare_upload_file2(buffer, {
        token,
      });
      const result1 = r1.data;
      console.log(result1);
      console.log(result2);
      expect(result1).toStrictEqual(result2);
      expect(true).toBe(true);
    },
    {
      timeout: 5000,
    }
  );
});
