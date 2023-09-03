import pinyin from "pinyin";

function main() {
  const name = "为";
  const r = pinyin(name, {
    style: "first_letter",
//     heteronym: true,
  });
  console.log(r);
}

main();
