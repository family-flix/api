  import axios from "axios";

import { HttpClientCore } from "@/domains/http_client";
import { connect } from "@/domains/http_client/provider.axios";
import { RequestCore } from "@/domains/request";

async function main() {
  const u =
    "https://ccp-bj29-video-preview.oss-enet.aliyuncs.com/lt/344D6FD24209239ADF04D6958742C1412DE68210_9552465454__sha1_bj29_e78ad19a/subtitle/subtitle_0.vtt?di=bj29&dr=2549939630&f=6656f6d170830ae9fa6b46f3b17d51ef075906fb&pds-params=%7B%22ap%22%3A%22pJZInNHN2dZWk8qg%22%7D&security-token=CAISvgJ1q6Ft5B2yfSjIr5aHGfnd2LsV2IWSTkH1lFAvVd1fuvfP1Tz2IHhMf3NpBOkZvvQ1lGlU6%2Fcalq5rR4QAXlDfNULnITm9q1HPWZHInuDox55m4cTXNAr%2BIhr%2F29CoEIedZdjBe%2FCrRknZnytou9XTfimjWFrXWv%2Fgy%2BQQDLItUxK%2FcCBNCfpPOwJms7V6D3bKMuu3OROY6Qi5TmgQ41Uh1jgjtPzkkpfFtkGF1GeXkLFF%2B97DRbG%2FdNRpMZtFVNO44fd7bKKp0lQLs0ARrv4r1fMUqW2X543AUgFLhy2KKMPY99xpFgh9a7j0iCbSGyUu%2FhcRm5sw9%2Byfo34lVYneQ7RNTJNbObP7AhWvDNQ3S7jN6YihvSt3zmA4YsrdqJPW1dKDogPIx4aBwHbHMFKlwddMkwuilbFU0fXtuMkagAGDB68pi%2BF2GG2wBeInGVfwRij2boiqNhDjbcjJ%2BUpRBGJK87AYz6ctbbzJOuUjVBEK7PYEyFK3wCXe8o2eBJy9quujycoP5jovAivnYh%2Be2dxK4VNI%2BU2W2cN2fHMeUVaVzJRqFVRWOgUWSKg%2Bykxk%2FrAshswurqpp%2FGV5iy7qsiAA&u=f4f8b630dbfa41c1be2de2ba904bacc5&x-oss-access-key-id=STS.NU2RCi5d4oGyLgDpPzYRsU2d7&x-oss-expires=1718547287&x-oss-signature=MNbJa%2FSew2%2Fnezdgy4S%2FkkXcUzw%2Fkrx1RC7FPvGNkn4%3D&x-oss-signature-version=OSS2";
  const client = new HttpClientCore();
  connect(client);
  const request = new RequestCore(
    () => {
      return {
        method: "GET",
        url: u,
      };
    },
    { client }
  );
  const r = await request.run();
  if (r.error) {
    console.log(r.error.message);
    return;
  }
  const data = r.data;
  console.log(data);
}

main();
