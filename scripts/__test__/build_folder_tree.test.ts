import { describe, test, expect } from "vitest";

type FolderTree = {
  file_id: string;
  name: string;
  type: "file" | "folder";
  items?: FolderTree[];
};
function build_folder_tree(
  records: {
    file_name: string;
    parent_paths: string;
  }[]
) {
  let tree: FolderTree[] = [];
  let temp_tree = tree;
  for (let i = 0; i < records.length; i += 1) {
    const episode = records[i];
    const { file_name, parent_paths } = episode;
    const segments = parent_paths.split("/").concat(file_name);
    for (let j = 0; j < segments.length; j += 1) {
      const path = segments[j];
      const is_last = j === segments.length - 1;
      console.log("\n");
      console.log("start", path, j);
      if (temp_tree.length === 0) {
        console.log("items is empty");
        const name = path;
        const sub_folder_or_file = {
          file_id: name,
          name: name,
          type: is_last ? "file" : "folder",
        } as FolderTree;
        if (!is_last) {
          sub_folder_or_file.items = [];
        }
        console.log(
          `${is_last ? "is" : "not"} last one, so create ${
            is_last ? "file" : "sub folder"
          } then insert`,
          path,
          sub_folder_or_file
        );
        temp_tree.push(sub_folder_or_file);
        if (!is_last) {
          temp_tree = sub_folder_or_file.items!;
        }
        if (is_last) {
          console.log("1 need reset temp_tree");
          temp_tree = tree;
          break;
        }
        continue;
      }
      console.log("not empty", temp_tree);
      const matched_folder = temp_tree.find((f) => f.file_id === path);
      if (!matched_folder) {
        const name = path;
        const sub_folder_or_file = {
          file_id: name,
          name: name,
          type: is_last ? "file" : "folder",
        } as FolderTree;
        if (!is_last) {
          sub_folder_or_file.items = [];
        }
        console.log(
          `${is_last ? "is" : "not"} last one, so create ${
            is_last ? "file" : "sub folder"
          } then insert`,
          path,
          temp_tree
        );
        temp_tree.push(sub_folder_or_file);
        if (!is_last) {
          temp_tree = sub_folder_or_file.items!;
        }
        if (is_last) {
          console.log("2 need reset temp_tree");
          temp_tree = tree;
          break;
        }
        continue;
      }
      console.log("there has matched folder", matched_folder);
      if (matched_folder.items) {
        temp_tree = matched_folder.items;
      }
    }
  }
  return tree;
}

describe("构建 folder 树", () => {
  test("每个文件夹下都只有一个文件夹", () => {
    const records = [
      {
        created: "Tue, 14 Feb 2023 16:05:14 GMT",
        episode: "E55",
        file_id: "63dc95333a0313b266854f31a2cd94f2481ad178",
        id: "yrZNtsI0RwLml86",
        updated: "Tue, 14 Feb 2023 16:05:14 GMT",
        tv_id: "f9hbsDUwbd62779",
        season_id: "9eJy5VSBaQMVxMv",
        file_name: "人民的名义 (2017).S01E55.mp4",
        parent_paths:
          "tv2/人民的名义/人民的名义.1+2/人民的名义1.4K（2017）/Season 1",
      },
      {
        created: "Tue, 14 Feb 2023 16:05:14 GMT",
        episode: "E54",
        file_id: "63dc95357e2159ffa0cf4ba992529a97963fea77",
        id: "Ng2RGnGTJppdbYF",
        updated: "Tue, 14 Feb 2023 16:05:14 GMT",
        tv_id: "f9hbsDUwbd62779",
        season_id: "9eJy5VSBaQMVxMv",
        file_name: "人民的名义 (2017).S01E54.mp4",
        parent_paths:
          "tv2/人民的名义/人民的名义.1+2/人民的名义1.4K（2017）/Season 1",
      },
      {
        created: "Tue, 14 Feb 2023 16:05:14 GMT",
        episode: "E53",
        file_id: "63dc9532fb97d9b330cb4d1d9170173d2fe16356",
        id: "3VJfxFxjwXLQrq3",
        updated: "Tue, 14 Feb 2023 16:05:14 GMT",
        tv_id: "f9hbsDUwbd62779",
        season_id: "9eJy5VSBaQMVxMv",
        file_name: "人民的名义 (2017).S01E53.mp4",
        parent_paths:
          "tv2/人民的名义/人民的名义.1+2/人民的名义1.4K（2017）/Season 1",
      },
    ];
    const folders = build_folder_tree(records);
    const tree = folders[0];
    expect(tree.name).toBe("tv2");
    expect(tree.items?.length).toBe(1);
    expect(tree.items?.[0]?.name).toBe("人民的名义");
    expect(tree.items?.[0]?.items?.length).toBe(1);
    expect(tree.items?.[0]?.items?.[0].name).toBe("人民的名义.1+2");
    expect(tree.items?.[0]?.items?.[0].items?.length).toBe(1);
    expect(tree.items?.[0]?.items?.[0].items?.[0].name).toBe(
      "人民的名义1.4K（2017）"
    );
    expect(tree.items?.[0]?.items?.[0].items?.[0].items?.length).toBe(1);
    expect(tree.items?.[0]?.items?.[0].items?.[0].items?.[0].name).toBe(
      "Season 1"
    );
    expect(
      tree.items?.[0]?.items?.[0].items?.[0].items?.[0].items?.length
    ).toBe(3);
    expect(
      tree.items?.[0]?.items?.[0].items?.[0].items?.[0].items?.[0]
    ).toStrictEqual({
      file_id: "人民的名义 (2017).S01E55.mp4",
      name: "人民的名义 (2017).S01E55.mp4",
      type: "file",
    });
  });

  test("每个文件夹下都只有一个文件夹", () => {
    const records = [
      {
        created: "Tue, 14 Feb 2023 16:05:14 GMT",
        episode: "E55",
        file_id: "63dc95333a0313b266854f31a2cd94f2481ad178",
        id: "yrZNtsI0RwLml86",
        updated: "Tue, 14 Feb 2023 16:05:14 GMT",
        tv_id: "f9hbsDUwbd62779",
        season_id: "9eJy5VSBaQMVxMv",
        file_name: "人民的名义 (2017).S01E55.mp4",
        parent_paths:
          "tv2/人民的名义/人民的名义.1+2/人民的名义1.4K（2017）/Season 1",
      },
      {
        created: "Tue, 14 Feb 2023 16:05:14 GMT",
        episode: "E54",
        file_id: "63dc95357e2159ffa0cf4ba992529a97963fea77",
        id: "Ng2RGnGTJppdbYF",
        updated: "Tue, 14 Feb 2023 16:05:14 GMT",
        tv_id: "f9hbsDUwbd62779",
        season_id: "9eJy5VSBaQMVxMv",
        file_name: "人民的名义 (2017).S01E54.mp4",
        parent_paths:
          "tv2/人民的名义/人民的名义.1+2/人民的名义1.4K（2017）/Season 1",
      },
      {
        created: "Tue, 14 Feb 2023 16:05:14 GMT",
        episode: "E53",
        file_id: "63dc9532fb97d9b330cb4d1d9170173d2fe16356",
        id: "3VJfxFxjwXLQrq3",
        updated: "Tue, 14 Feb 2023 16:05:14 GMT",
        tv_id: "f9hbsDUwbd62779",
        season_id: "9eJy5VSBaQMVxMv",
        file_name: "人民的名义 (2017).S01E53.mp4",
        parent_paths:
          "tv2/人民的名义/人民的名义.1+2/人民的名义1.4K（2017）/Season 1",
      },
      {
        created: "Tue, 14 Feb 2023 16:05:14 GMT",
        episode: "E01",
        file_id: "63dc9532fb97d9b330cb4d1d9170173d2fe16356",
        id: "3VJfxFxjwXLQrq3",
        updated: "Tue, 14 Feb 2023 16:05:14 GMT",
        tv_id: "f9hbsDUwbd62779",
        season_id: "9eJy5VSBaQMVxMv",
        file_name: "人民的名义 (2017).S01E01.mp4",
        parent_paths:
          "tv2/人民的名义/人民的名义.1+2/人民的名义2.4K（2017）/Season 1",
      },
    ];
    const folders = build_folder_tree(records);
    const tree = folders[0];
    expect(tree.name).toBe("tv2");
    expect(tree.items?.length).toBe(1);
    expect(tree.items?.[0]?.name).toBe("人民的名义");
    expect(tree.items?.[0]?.items?.length).toBe(1);
    expect(tree.items?.[0]?.items?.[0].name).toBe("人民的名义.1+2");
    expect(tree.items?.[0]?.items?.[0].items?.length).toBe(2);
    expect(tree.items?.[0]?.items?.[0].items?.[0].name).toBe(
      "人民的名义1.4K（2017）"
    );
    expect(tree.items?.[0]?.items?.[0].items?.[1].name).toBe(
      "人民的名义2.4K（2017）"
    );
    expect(tree.items?.[0]?.items?.[0].items?.[1].items?.length).toBe(1);
    expect(tree.items?.[0]?.items?.[0].items?.[1].items?.[0].name).toBe(
      "Season 1"
    );
    expect(
      tree.items?.[0]?.items?.[0].items?.[1].items?.[0].items?.length
    ).toBe(1);
    expect(
      tree.items?.[0]?.items?.[0].items?.[1].items?.[0].items?.[0]
    ).toStrictEqual({
      file_id: "人民的名义 (2017).S01E01.mp4",
      name: "人民的名义 (2017).S01E01.mp4",
      type: "file",
    });
  });
});
