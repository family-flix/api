import { MediaTypes } from "@/constants";
import { Application } from "@/domains/application";
import { MediaProfileClient } from "@/domains/media_profile";
import { DoubanClient } from "@/domains/media_profile/douban";

async function main() {
  //   const OUTPUT_PATH = process.env.OUTPUT_PATH;
  //   if (!OUTPUT_PATH) {
  //     console.error("缺少数据库文件路径");
  //     return;
  //   }
  //   const app = new Application({
  //     root_path: OUTPUT_PATH,
  //   });
  //   const store = app.store;
  console.log("Start");
  const $douban = new DoubanClient({});
  const client = $douban;
  const r = await client.search("十六岁的花季1");
  if (r.error) {
    console.log(r.error.message);
    return;
  }
  console.log(r.data.list);
  const rr = await client.match_exact_media(
    { type: MediaTypes.Season, name: "十六岁的花季", original_name: null, order: 1, air_date: null },
    r.data.list
  );
  if (rr.error) {
    console.log(rr.error.message);
    return;
  }
  console.log(rr.data);
//   const profile_r = await client.fetch_media_profile(rr.data.id);
//   if (profile_r.error) {
//     console.log(`获取详情失败，因为 ${profile_r.error.message}`);
//     return;
//   }
//   const profile = profile_r.data;
//   console.log(profile);
  console.log("Success");
}

main();

// Invalid `store.prisma.media_profile.update()` invocation in/root/Documents/workspace/deploy/repos/api/main/src/bin/scripts/tt.ts:181:44  178   payload.source_count = profile.source_count;  179 }  180 console.log("add douban_id for media ", name);→ 181 await store.prisma.media_profile.update({        where: {          id: '1016392'        },        data: {          douban_id: '36071955',          air_date: '2023-07-26',          genres: {            set: {              '0': {      ?         id?: Int              },              '1': {      ?         id?: Int              },              '2': {      ?         id?: Int              }            },      ?     create?: media_genreCreateWithoutMedia_profilesInput | media_genreCreateWithoutMedia_profilesInput[] | media_genreUncheckedCreateWithoutMedia_profilesInput | media_genreUncheckedCreateWithoutMedia_profilesInput[],      ?     connectOrCreate?: media_genreCreateOrConnectWithoutMedia_profilesInput | media_genreCreateOrConnectWithoutMedia_profilesInput[],      ?     upsert?: media_genreUpsertWithWhereUniqueWithoutMedia_profilesInput | media_genreUpsertWithWhereUniqueWithoutMedia_profilesInput[],      ?     disconnect?: media_genreWhereUniqueInput | media_genreWhereUniqueInput[],      ?     delete?: media_genreWhereUniqueInput | media_genreWhereUniqueInput[],      ?     connect?: media_genreWhereUniqueInput | media_genreWhereUniqueInput[],      ?     update?: media_genreUpdateWithWhereUniqueWithoutMedia_profilesInput | media_genreUpdateWithWhereUniqueWithoutMedia_profilesInput[],      ?     updateMany?: media_genreUpdateManyWithWhereWithoutMedia_profilesInput | media_genreUpdateManyWithWhereWithoutMedia_profilesInput[],      ?     deleteMany?: media_genreScalarWhereInput | media_genreScalarWhereInput[]          }        }      })Argument data.genres.set of type media_genreWhereUniqueInput needs at least one argument. Available args are listed in green.Note: Lines with ? are optional.
