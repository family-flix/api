import axios from "axios";

import { Result } from "@/types";

type ChannelGroup = {
  title: string;
  logo: string;
  channels: {
    url: string;
  }[];
};

export const source_url1 = "https://live.fanmingming.com/tv/m3u/global.m3u";
const source_url2 = "https://iptv-org.github.io/iptv/index.nsfw.m3u";
export function fetchTVLiveGroups(data: string) {
  const lines = data.split("\n");
  const groups: Record<
    string,
    {
      group_name: string;
      name: string;
      logo: string;
      url: string;
    }[]
  > = {};
  for (let i = 1; i < lines.length; i += 2) {
    (() => {
      const live_url = lines[i + 1];
      if (!live_url.startsWith("http")) {
        return;
      }
      const line = lines[i];
      const channel = parse_M3U_info_line(line);
      if (channel === null) {
        return;
      }
      const { group_title, tvg_name, tvg_logo } = channel;
      groups[group_title] = groups[group_title] || [];
      groups[group_title].push({
        group_name: group_title,
        name: tvg_name,
        logo: tvg_logo,
        url: live_url,
      });
    })();
  }
  return groups;
}

function parse_M3U_info_line(line: string) {
  const match = line.match(
    /#EXTINF:(-?\d+)\s*tvg-id="([^"]*)"\s*tvg-name="([^"]*)"\s*tvg-logo="([^"]*)"\s*group-title="([^"]*)",(.*)/
  );
  if (!match) {
    return null;
  }
  const info: {
    duration: number;
    tvg_id: string;
    tvg_name: string;
    tvg_logo: string;
    group_title: string;
    description: string;
  } = {
    duration: parseInt(match[1]),
    tvg_id: match[2],
    tvg_name: match[3],
    tvg_logo: match[4],
    group_title: match[5],
    description: match[6],
  };

  return info;
}

async function main(url: string) {
  const r = await axios.get<string>(url);
  const { data } = r;
  const groups = fetchTVLiveGroups(data);
  const channels = Object.keys(groups)
    .map((k) => {
      return groups[k];
    })
    .reduce((total, cur) => {
      return total.concat(cur);
    }, []);
  console.log(channels);
}
main(source_url2);
