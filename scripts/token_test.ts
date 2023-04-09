import { generate_token, parse_token } from "@/utils/backend";

// (async () => {
//   const payload = {
//     id: "123",
//   };
//   const token = generate_token(payload);
//   if (token.error) {
//     return;
//   }
//   console.log(token.data);
// })();

(() => {
  const token =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsImlhdCI6MTY3NzU2NTk5Mn0.Eh_1ymdTjjj0np2ivRg1BuW-cbVNnqEOhIHaSj_pG6g";
  const r = parse_token(token);
  if (r.error) {
    console.log(r.error.message);
    return;
  }
  console.log(r.data);
})();
