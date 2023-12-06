// pages/index.js

import { store } from "@/store";

const itemsPerPage = 20; // 每页显示的记录数

function HomePage({
  data,
  currentPage,
}: {
  data: {
    id: string;
    name: string;
  }[];
  currentPage: number;
}) {
  // Render your page with the current page data
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageData = data.slice(startIndex, endIndex);

  // Add pagination navigation
  // You can use the current page, total pages, and navigation links here
  return (
    <div>
      {data.map((season) => {
        return (
          <div key={season.id}>
            <div>{season.name}</div>
          </div>
        );
      })}
    </div>
  );
}
export async function getStaticProps() {
  // const data = await store.prisma.season.findMany({
  //   include: {
  //     tv: {
  //       include: {
  //         profile: true,
  //       },
  //     },
  //     profile: {
  //       include: {
  //         persons: {
  //           include: {
  //             profile: true,
  //           },
  //         },
  //       },
  //     },
  //   },
  //   take: 20,
  //   orderBy: {
  //     profile: {
  //       air_date: "desc",
  //     },
  //   },
  // });
  // return {
  //   props: {
  //     data: data.map((season) => {
  //       const { id, tv, profile } = season;
  //       return {
  //         id,
  //         name: tv.profile.name,
  //         poster_path: profile.poster_path || tv.profile.poster_path,
  //         overview: profile.overview || tv.profile.overview,
  //         air_date: profile.air_date || tv.profile.first_air_date,
  //         season_text: season.season_text,
  //       };
  //     }),
  //   },
  // };
  return {
    props: {
      data: [],
    }
  }
}

// export async function getStaticPaths() {
//   const data = await store.prisma.season.findMany({});
//   const totalItems = data.length;
//   const totalPages = Math.ceil(totalItems / itemsPerPage);
//   const paths = Array.from({ length: totalPages }, (_, i) => ({
//     params: { page: (i + 1).toString() },
//   }));
//   return {
//     paths,
//     fallback: false,
//   };
// }

export default HomePage;
