import { store } from "@/store";

async function main() {
  //   await store.prisma.async_task.deleteMany({});
  const list = await store.prisma.async_task.findMany({});
  console.log(list);
  //   const res = await store.prisma.async_task.delete({
  //     where: {
  //       id: "",
  //     },
  //   });
}

main();
