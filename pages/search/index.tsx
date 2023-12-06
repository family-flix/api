import { useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";

import { store } from "@/store";
import { debounce } from "lodash/fp";

const page_size = 5;
const fuse_options = {
  // isCaseSensitive: false,
  // includeScore: false,
  // shouldSort: true,
  // includeMatches: false,
  // findAllMatches: false,
  // minMatchCharLength: 1,
  // location: 0,
  // threshold: 0.6,
  // distance: 100,
  // useExtendedSearch: false,
  // ignoreLocation: false,
  // ignoreFieldNorm: false,
  // fieldNormWeight: 1,
  keys: ["name"],
};

function MediaSearchPage(props: {
  data: {
    id: string;
    name: string;
    overview: string;
    poster_path: string;
    air_date: string;
    season_text: string;
    actors: { id: string; name: string }[];
  }[];
}) {
  const { data } = props;

  const ref = useRef(new Fuse(data, fuse_options));
  const [value, setValue] = useState("");
  const [result, setResult] = useState<typeof data>([]);
  const search = useMemo(() => {
    return debounce(800, (keyword) => {
      const r = ref.current.search(keyword);
      setResult(r.map((rr) => rr.item).slice(0, 10));
    });
  }, []);

  return (
    <div>
      <div>
        <input
          placeholder="请输入关键字搜索"
          value={value}
          onChange={(event) => {
            search(event.currentTarget.value);
            setValue(event.currentTarget.value);
          }}
        />
        <button
          onClick={() => {
            search(value);
          }}
        >
          搜索
        </button>
      </div>
      {result.map((season) => {
        return (
          <div key={season.id}>
            <div>
              <img style={{ width: 80 }} src={season.poster_path} alt={season.name} />
            </div>
            <div>{season.name}</div>
            <div>{season.overview}</div>
            <div>
              <div>{season.air_date}</div>
              <div>{season.season_text}</div>
            </div>
            <div>
              {season.actors.map((actor) => {
                return <div key={actor.id}>{actor.name}</div>;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
export async function getStaticProps() {
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
    take: 20,
    orderBy: {
      profile: {
        air_date: "desc",
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
          actors: profile.persons.map((p) => {
            const { id, name } = p;
            return {
              id,
              name,
            };
          }),
        };
      }),
    },
  };
}

export default MediaSearchPage;
