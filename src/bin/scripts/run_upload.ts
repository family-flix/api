require("dotenv").config();

import fs from "fs";
import crypto from "crypto";
// import CryptoJS from "crypto-js";

import axios, { AxiosInstance } from "axios";

import { Drive } from "@/domains/drive";
import { Application } from "@/domains/application";
// import { store } from "@/store";

// const authToken =
//   "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NTY1MDQ1ZWVmODQ0NDVjYmRlY2U3OTBhZWJlNTRiZCIsImN1c3RvbUpzb24iOiJ7XCJjbGllbnRJZFwiOlwiMjVkelgzdmJZcWt0Vnh5WFwiLFwiZG9tYWluSWRcIjpcImJqMjlcIixcInNjb3BlXCI6W1wiRFJJVkUuQUxMXCIsXCJTSEFSRS5BTExcIixcIkZJTEUuQUxMXCIsXCJVU0VSLkFMTFwiLFwiVklFVy5BTExcIixcIlNUT1JBR0UuQUxMXCIsXCJTVE9SQUdFRklMRS5MSVNUXCIsXCJCQVRDSFwiLFwiT0FVVEguQUxMXCIsXCJJTUFHRS5BTExcIixcIklOVklURS5BTExcIixcIkFDQ09VTlQuQUxMXCIsXCJTWU5DTUFQUElORy5MSVNUXCIsXCJTWU5DTUFQUElORy5ERUxFVEVcIl0sXCJyb2xlXCI6XCJ1c2VyXCIsXCJyZWZcIjpcImh0dHBzOi8vd3d3LmFsaXl1bmRyaXZlLmNvbS9cIixcImRldmljZV9pZFwiOlwiODEwMmU5MDY3ZmU3NGQxMjhmN2ZjNjExZTNkYmUyYjFcIn0iLCJleHAiOjE2OTI3ODMyOTgsImlhdCI6MTY5Mjc3NjAzOH0.AAIhbcqERSskqjs-qCsYyD7sQRfRg7TocA3Pu3jLfN27gj_BH4Q-V9OYgTeUCx4QymkkwEPRtcjIUYgy0NPqNgWke48LWWtFd9006rFO66p62Jee9Nv1kYC3yhqBw_IJbDAWQacQQoLnwliAJhbBsAMQhdZfEo7x7tmgF7-5myk";
const authToken =
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NTY1MDQ1ZWVmODQ0NDVjYmRlY2U3OTBhZWJlNTRiZCIsImN1c3RvbUpzb24iOiJ7XCJjbGllbnRJZFwiOlwiMjVkelgzdmJZcWt0Vnh5WFwiLFwiZG9tYWluSWRcIjpcImJqMjlcIixcInNjb3BlXCI6W1wiRFJJVkUuQUxMXCIsXCJTSEFSRS5BTExcIixcIkZJTEUuQUxMXCIsXCJVU0VSLkFMTFwiLFwiVklFVy5BTExcIixcIlNUT1JBR0UuQUxMXCIsXCJTVE9SQUdFRklMRS5MSVNUXCIsXCJCQVRDSFwiLFwiT0FVVEguQUxMXCIsXCJJTUFHRS5BTExcIixcIklOVklURS5BTExcIixcIkFDQ09VTlQuQUxMXCIsXCJTWU5DTUFQUElORy5MSVNUXCIsXCJTWU5DTUFQUElORy5ERUxFVEVcIl0sXCJyb2xlXCI6XCJ1c2VyXCIsXCJyZWZcIjpcImh0dHBzOi8vd3d3LmFsaXl1bmRyaXZlLmNvbS9cIixcImRldmljZV9pZFwiOlwiMTI5NWYzODE4M2Q3NDcyMTkzYmQzZDY3MTJiYTBlOTZcIn0iLCJleHAiOjE2OTI4MDQwNTAsImlhdCI6MTY5Mjc5Njc5MH0.mmkVyyXZ5oFz5rcHFM6SuUkAwI_3I6cnjueKhUk7_YMelJa3I36HWM4Uku2l-MP1GSsL7S_efhstzcxc9nBd7_0UwLRPZNP9kKd5km53mMIOXCLRAZrnkBLcmm7N3h2wRbmBc18VDW7jkiJyYYHyptG2MA1PJN8C3o7Kwm165kE";
// const md5Int = parseInt(crypto.createHash("md5").update(authToken).digest("hex").slice(0, 16), 16);

class YourFileUploader {
  authToken: string;
  uploadChunkSize: number;
  session: AxiosInstance;

  constructor(authToken: string) {
    this.authToken = authToken;
    this.uploadChunkSize = 10 * 1024 * 1024; // 10 MB
    this.session = axios.create();
  }

  async _getPartInfoList(fileSize: number) {
    const numParts = Math.ceil(fileSize / this.uploadChunkSize);
    const partInfoList = [];

    for (let i = 1; i <= numParts; i++) {
      partInfoList.push({ part_number: i });
    }

    return partInfoList;
  }

  async _getProofCode(fileBuffer: Buffer) {
    //     const v1 = crypto.createHash("md5").update(Buffer.from(this.authToken, "utf-8"));
    //     const md5Int = parseInt(crypto.createHash("md5").update(Buffer.from(authToken)).digest("hex").slice(0, 16), 16);
    //     const v2 = v1.digest("hex");
    //     const md5Int = parseInt(v2.slice(0, 16), 16);
    //     const offset = md5Int % fileBuffer.length;
    //     console.log(v1);
    //     console.log(v2);

    //     const md5Hash = CryptoJS.MD5(CryptoJS.enc.Latin1.parse(authToken));
    //     const md5Hex = md5Hash.toString();
    //     const md5Int = parseInt(md5Hex.slice(0, 16), 16);
    //     const offset = md5Int % fileBuffer.length;

    var md5sum = crypto.createHash("md5");
    md5sum.update(Buffer.from(this.authToken, "utf8"));
    const md5val = md5sum.digest("hex");
    const v1 = md5val.slice(0, 16);
    const decimalBigInt = BigInt(`0x${v1}`);
    const md5Int = decimalBigInt;
    const o = md5Int % BigInt(fileBuffer.length);
    const offset = parseInt(o.toString(), 10);
    const bytesToRead = Math.min(8, fileBuffer.length - offset);
    const bys = fileBuffer.slice(offset, offset + bytesToRead);
    return Buffer.from(bys).toString("base64");
  }

  async _contentHash(fileBuffer: Buffer) {
    const contentHash = crypto.createHash("sha1");

    for (let offset = 0; offset < fileBuffer.length; offset += this.uploadChunkSize) {
      const segment = fileBuffer.slice(offset, offset + this.uploadChunkSize);
      contentHash.update(segment);
    }

    const contentHashValue = contentHash.digest("hex").toUpperCase();
    return contentHashValue;
  }

  async uploadFile(file: string, name: string, parentFileId = "root") {
    const fileBuffer = fs.readFileSync(file);
    const fileSize = fileBuffer.length;

    const contentHashValue = await this._contentHash(fileBuffer);
    console.log(contentHashValue);
    const proofCode = await this._getProofCode(fileBuffer);
    console.log(proofCode);
    const partInfoList = await this._getPartInfoList(fileSize);
    console.log(partInfoList);

    const requestBody = {
      part_info_list: partInfoList,
      parent_file_id: parentFileId,
      name: name,
      type: "file",
      size: fileSize,
      content_hash: contentHashValue,
      content_hash_name: "sha1",
      proof_code: proofCode,
      proof_version: "v1",
    };
    return requestBody;
    //     try {
    //       const response = await axios.post("your-upload-url", requestBody);
    //       return response.data;
    //     } catch (error) {
    //       if (error.response && error.response.status === 400) {
    //         requestBody.proof_code = await this._getProofCode(fileBuffer);
    //         const retryResponse = await axios.post("your-upload-url", requestBody);
    //         return retryResponse.data;
    //       } else {
    //         throw error;
    //       }
    //     }
  }
}
async function main() {
  const app = new Application({
    root_path: "/Users/litao/Documents/workspaces/family-flix/dev-output",
  });
  const store = app.store;
  const user = await store.prisma.user.findFirst({
    where: {},
  });
  if (!user) {
    return;
  }
  const drive_res = await Drive.Get({
    id: "O2wsuqkBwNehfXe",
    user_id: user.id,
    store,
  });
  if (drive_res.error) {
    return;
  }
  const client = drive_res.data.client;
  const filepath = "/Users/litao/Desktop/example2.png";
  //   const u = new YourFileUploader(client.access_token);
  //   await client.init();
  //   const token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NTY1MDQ1ZWVmODQ0NDVjYmRlY2U3OTBhZWJlNTRiZCIsImN1c3RvbUpzb24iOiJ7XCJjbGllbnRJZFwiOlwiMjVkelgzdmJZcWt0Vnh5WFwiLFwiZG9tYWluSWRcIjpcImJqMjlcIixcInNjb3BlXCI6W1wiRFJJVkUuQUxMXCIsXCJTSEFSRS5BTExcIixcIkZJTEUuQUxMXCIsXCJVU0VSLkFMTFwiLFwiVklFVy5BTExcIixcIlNUT1JBR0UuQUxMXCIsXCJTVE9SQUdFRklMRS5MSVNUXCIsXCJCQVRDSFwiLFwiT0FVVEguQUxMXCIsXCJJTUFHRS5BTExcIixcIklOVklURS5BTExcIixcIkFDQ09VTlQuQUxMXCIsXCJTWU5DTUFQUElORy5MSVNUXCIsXCJTWU5DTUFQUElORy5ERUxFVEVcIl0sXCJyb2xlXCI6XCJ1c2VyXCIsXCJyZWZcIjpcImh0dHBzOi8vd3d3LmFsaXl1bmRyaXZlLmNvbS9cIixcImRldmljZV9pZFwiOlwiODhmOTgzNGYzZWE5NGY3MjliMTY0ZThlMTU2NGVjYTNcIn0iLCJleHAiOjE2OTI4MTEwMTEsImlhdCI6MTY5MjgwMzc1MX0.lboIbl1kEPcZ9UwFNsUcwHIh7Bj6fTnyzW8vgc-5Iu91ZzkarKM6VPSoxYMaSJikzGoHQTyz3XNwVrOimS03NeC6ppdC4VoQhbsSBeEM1SDvtAi0Z5p4saurjBEJY1XPekIhjW4u_Cy69UArPaYxrChZDqG6Rf6Fy3refx-3Dw0";
  // const token ="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NTY1MDQ1ZWVmODQ0NDVjYmRlY2U3OTBhZWJlNTRiZCIsImN1c3RvbUpzb24iOiJ7XCJjbGllbnRJZFwiOlwiMjVkelgzdmJZcWt0Vnh5WFwiLFwiZG9tYWluSWRcIjpcImJqMjlcIixcInNjb3BlXCI6W1wiRFJJVkUuQUxMXCIsXCJTSEFSRS5BTExcIixcIkZJTEUuQUxMXCIsXCJVU0VSLkFMTFwiLFwiVklFVy5BTExcIixcIlNUT1JBR0UuQUxMXCIsXCJTVE9SQUdFRklMRS5MSVNUXCIsXCJCQVRDSFwiLFwiT0FVVEguQUxMXCIsXCJJTUFHRS5BTExcIixcIklOVklURS5BTExcIixcIkFDQ09VTlQuQUxMXCIsXCJTWU5DTUFQUElORy5MSVNUXCIsXCJTWU5DTUFQUElORy5ERUxFVEVcIl0sXCJyb2xlXCI6XCJ1c2VyXCIsXCJyZWZcIjpcImh0dHBzOi8vd3d3LmFsaXl1bmRyaXZlLmNvbS9cIixcImRldmljZV9pZFwiOlwiODhmOTgzNGYzZWE5NGY3MjliMTY0ZThlMTU2NGVjYTNcIn0iLCJleHAiOjE2OTI4MTEwMTEsImlhdCI6MTY5MjgwMzc1MX0.lboIbl1kEPcZ9UwFNsUcwHIh7Bj6fTnyzW8vgc-5Iu91ZzkarKM6VPSoxYMaSJikzGoHQTyz3XNwVrOimS03NeC6ppdC4VoQhbsSBeEM1SDvtAi0Z5p4saurjBEJY1XPekIhjW4u_Cy69UArPaYxrChZDqG6Rf6Fy3refx-3Dw0";
  const token =
    "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NTY1MDQ1ZWVmODQ0NDVjYmRlY2U3OTBhZWJlNTRiZCIsImN1c3RvbUpzb24iOiJ7XCJjbGllbnRJZFwiOlwiMjVkelgzdmJZcWt0Vnh5WFwiLFwiZG9tYWluSWRcIjpcImJqMjlcIixcInNjb3BlXCI6W1wiRFJJVkUuQUxMXCIsXCJTSEFSRS5BTExcIixcIkZJTEUuQUxMXCIsXCJVU0VSLkFMTFwiLFwiVklFVy5BTExcIixcIlNUT1JBR0UuQUxMXCIsXCJTVE9SQUdFRklMRS5MSVNUXCIsXCJCQVRDSFwiLFwiT0FVVEguQUxMXCIsXCJJTUFHRS5BTExcIixcIklOVklURS5BTExcIixcIkFDQ09VTlQuQUxMXCIsXCJTWU5DTUFQUElORy5MSVNUXCIsXCJTWU5DTUFQUElORy5ERUxFVEVcIl0sXCJyb2xlXCI6XCJ1c2VyXCIsXCJyZWZcIjpcImh0dHBzOi8vd3d3LmFsaXl1bmRyaXZlLmNvbS9cIixcImRldmljZV9pZFwiOlwiODhmOTgzNGYzZWE5NGY3MjliMTY0ZThlMTU2NGVjYTNcIn0iLCJleHAiOjE2OTI4MTEwMTEsImlhdCI6MTY5MjgwMzc1MX0.lboIbl1kEPcZ9UwFNsUcwHIh7Bj6fTnyzW8vgc-5Iu91ZzkarKM6VPSoxYMaSJikzGoHQTyz3XNwVrOimS03NeC6ppdC4VoQhbsSBeEM1SDvtAi0Z5p4saurjBEJY1XPekIhjW4u_Cy69UArPaYxrChZDqG6Rf6Fy3refx-3Dw0";
  //   const u = new YourFileUploader(client.access_token);
  await client.ensure_initialized();
  const u = new YourFileUploader(client.access_token);
  const body = await u.uploadFile(filepath, "test01.png");
  //   body.proof_code = "8I7Bg/z7Cw4=";
  // @ts-ignore
  const r = await client.create_with_folder(body);
  if (r.error) {
    return;
  }
  //   console.log(r.data);
  const fileBuffer = fs.readFileSync(filepath);
  if (!r.data.part_info_list?.[0]) {
    return;
  }
  const r2 = await axios.put(r.data.part_info_list[0].upload_url, fileBuffer, {
    headers: {
      Authorization: client.access_token,
      "Content-Type": "application/octet-stream",
    },
  });
  console.log(r2.data);
}

main();
// function main2() {
//   const base64Value = "AAQAAAABAAA=";
//   const bys = Uint8Array.from(Buffer.from(base64Value, "base64"));
//   console.log(bys);
// }
// main2();
function main3() {
  //   const base64Value = "96ncf8mbb/I=";
  //   const offset = md5Int % base64Value.length;
  //   const bytesToRead = Math.min(8, base64Value.length - offset);
  //   const bys = base64Value.slice(offset, offset + bytesToRead);
  //   const decodedBytes = Buffer.from(bys, "base64");
  //   function inner(fileBuffer: Buffer) {
  //     const offset = md5Int % fileBuffer.length;
  //     const bytesToRead = Math.min(8, fileBuffer.length - offset);
  //     const bys = fileBuffer.slice(offset, offset + bytesToRead);
  //     return Buffer.from(bys).toString("base64");
  //   }
  //   const r1 = inner(decodedBytes);
}
// main3();

function main4() {
  let md5Int = null;
  const remainder = 2965;
  const divisor = 4930;
  for (let i = 0; i < divisor; i++) {
    if ((i * divisor + remainder) % divisor === remainder) {
      md5Int = i;
      break;
    }
  }
  console.log(md5Int);
}
// main4();
// function main5() {
//   var txtToHash = "Hello¤World¤";
//   var md5sum = crypto.createHash("md5");
//   md5sum.update(Buffer.from(txtToHash, "utf8"));
//   const md5val = md5sum.digest("hex");
//   console.log(md5val);
// }
// main5();
