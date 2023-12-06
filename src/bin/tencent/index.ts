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
  console.log(r.data);
}

main();
