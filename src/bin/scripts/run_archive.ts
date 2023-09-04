import { get_first_letter } from "@/utils/pinyin";

function main() {
  const name = "为";
  const r = get_first_letter(name);
  console.log(r);
}

main();
