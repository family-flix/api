import { store } from "@/store";

const where: NonNullable<Parameters<typeof store.prisma.parsed_episode.findMany>[number]>["where"] = {
//   episode_id: null,
  can_search: 1,
//   user_id: "srMcpBwrd92pSC7",
//   drive_id: "cKkn0DkbfX7RS4T",
};
const scope = [
  {
    name: "花琉璃轶闻",
  },
];
if (scope && scope.length) {
  where.parsed_tv = {
    OR: scope.map((s) => {
      const { name } = s;
      return {
        name: {
          contains: name,
        },
      };
    }),
  };
}
(async () => {
  console.log(where);
  //   const count = await store.prisma.parsed_episode.count({ where });
  const list = await store.prisma.parsed_episode.findMany({ where });
  console.log(list.length);
})();
