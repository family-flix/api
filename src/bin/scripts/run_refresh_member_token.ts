import { Member } from "@/domains/user/member";
import { parse_token } from "@/domains/user/utils";

async function main() {
  const token =
    "eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..MPzy2Rce4AOKQVRI.BT5tWopHfNvU-sRNTRp-Bt9UuY01VkcvxKEpJ0VdTwEM0C_h55cZFpGwEBxnX_BkJ_kYVPPZy5jP_8nqqHsNFf4lPjtu5EScnsYch3Vv_xhmx5R2bQL4n3y4JXFMPk6-9ufNY3garw.vm7lNXH15Y89ESt9_dcIVw";
  const r = await parse_token({
    token,
    secret: Member.SECRET,
  });
  if (r.error) {
    console.log(r.error.message);
    return;
  }
  console.log("校验通过");
}

main();
