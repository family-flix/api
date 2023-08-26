import { Member } from "@/domains/user/member";
import { parse_token } from "@/domains/user/utils";

async function main() {
  const token = "eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..lCSC11_ZW1uZ8gGT.Lw9K_Bj--np-QaPVtX9Vh1YDEuwclcnfDrsYoOuKl9HKrDix35DAYZSU0XPFCXC8_zquM6_B1OsIgzzqILd45T4V3T95UFUhDpzcxeM_6M2GJThoz3DnS2rj33TLRP2CpPP94JSxow.mSf7IcZcMovKmLz2_9kFeQ";
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
