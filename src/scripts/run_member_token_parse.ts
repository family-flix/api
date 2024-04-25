import { Member } from "@/domains/user/member";
import { parse_token } from "@/domains/user/utils";

async function main() {
  const token = "eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..hbKQex4-9vb39pt_.gbO99CKLoatF17infWGZRmKUKBRc7mKFIbdOB3zFIctNJ0GM_H_1yqswRUNMDLJOil9BErn5ceb-1f81zrBqWowmdAjuv9vVPHhegDqNRf4b15l7GJY.oS4WoQQfWfHauYTHZOo5rA";
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
