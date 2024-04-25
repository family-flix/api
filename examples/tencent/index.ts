import { TencentDoc } from "@/domains/tencent_doc";

async function main() {
  const doc = new TencentDoc({
    url: "https://docs.qq.com/dop-api/opendoc?u=&id=DQmx1WEdTRXpGeEZ6&normal=1&outformat=1&noEscape=1&commandsFormat=1&preview_token=&doc_chunk_flag=1",
  });
  const r = await doc.fetch();
  if (r.error) {
    console.log(r.error.message);
    return;
  }
  const resources = r.data;
  const name = "一念关山";
  const matched_resource = resources.find((e) => {
    return e.name === name;
  });
  // console.log(resources.slice(0, 20));
  // console.log(matched_resource);
}

main();
