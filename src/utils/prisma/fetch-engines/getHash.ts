import crypto from "crypto";
import fs from "fs";

export function getHash(filepath: string): Promise<string> {
  const hash = crypto.createHash("sha256");
  const input = fs.createReadStream(filepath);
  return new Promise((resolve) => {
    input.on("readable", () => {
      const data = input.read();
      if (data) {
        hash.update(data);
      } else {
        resolve(hash.digest("hex"));
      }
    });
  });
}
