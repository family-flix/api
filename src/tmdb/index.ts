import { TMDBClient } from "@/domains/media_profile/tmdb";

async function main() {
  const client = new TMDBClient({
    token: "c2e5d34999e27f8e0ef18421aa5dec38",
  });
  // const profile_res = await client.fetch_movie_profile(844075);
  // if (profile_res.error) {
  //   console.log("请求失败，因为", profile_res.error.message);
  //   return;
  // }
  // console.log("请求成功");
  // const data = profile_res.data;
  // console.log(data);

  // const person = await client.fetch_person_profile({ person_id: "1590275" });
  // if (person.error) {
  //   return;
  // }
  // console.log(person.data);


  const person = await client.fetch_person_profile({ person_id: "126778" });
  if (person.error) {
    return;
  }
  console.log(person.data);
}

main();
