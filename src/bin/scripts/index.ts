import path from "path";

function main() {
  const filepath = "/Users/Application/filename.mp4";
  const res = path.parse(filepath);
  console.log(res);
}

main();
