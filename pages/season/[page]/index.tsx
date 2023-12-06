// pages/index.js

import { store } from "@/store";
import { GetStaticPropsContext } from "next";

const itemsPerPage = 5; // 每页显示的记录数

function SeasonListPage(props: {
  data: {
    id: string;
    name: string;
  }[];
  params: {
    page: number;
  };
}) {
  const {
    data,
    params: { page },
  } = props;
  // console.log(props);
  // Render your page with the current page data
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageData = data.slice(startIndex, endIndex);

  // Add pagination navigation
  // You can use the current page, total pages, and navigation links here
  return (
    <div>
      <div>{page}</div>
      <div>
        {currentPageData.map((season) => {
          return (
            <div key={season.id}>
              <div>{season.name}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export async function getStaticProps(context: GetStaticPropsContext) {
  const { params } = context;
  const data = await store.prisma.season.findMany({
    include: {
      tv: {
        include: {
          profile: true,
        },
      },
      profile: {
        include: {
          persons: {
            include: {
              profile: true,
            },
          },
        },
      },
    },
  });
  return {
    props: {
      data: data.map((season) => {
        const { id, tv, profile } = season;
        return {
          id,
          name: tv.profile.name,
          poster_path: profile.poster_path || tv.profile.poster_path,
          overview: profile.overview || tv.profile.overview,
          air_date: profile.air_date || tv.profile.first_air_date,
          season_text: season.season_text,
        };
      }),
      params,
    },
  };
}

export async function getStaticPaths() {
  const data = await store.prisma.season.findMany({
    include: {
      tv: {
        include: {
          profile: true,
        },
      },
      profile: {
        include: {
          persons: {
            include: {
              profile: true,
            },
          },
        },
      },
    },
  });
  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paths = Array.from({ length: totalPages }, (_, i) => ({
    params: { page: (i + 1).toString() },
  }));
  return {
    // data: data.map((season) => {
    //   const { id, tv, profile } = season;
    //   return {
    //     id,
    //     name: tv.profile.name,
    //     poster_path: profile.poster_path || tv.profile.poster_path,
    //     overview: profile.overview || tv.profile.overview,
    //     air_date: profile.air_date || tv.profile.first_air_date,
    //     season_text: season.season_text,
    //   };
    // }),
    paths,
    fallback: false,
  };
}

export default SeasonListPage;
