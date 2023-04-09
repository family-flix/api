export const id = "root";
export const data = {
  file_id: id,
  name: "tv_root",
  type: "folder",
  items: [
    {
      // 如果没有 self.episode
      file_id: "root_1",
      name: "root",
      type: "folder",
      items: [
        {
          // @@异常1
          file_id: "root_1_1",
          name: "简中字幕.mp4",
        },
        {
          // @@异常2，可能是电影
          file_id: "root_1_2",
          name: "名称1.mp4",
        },
      ],
    },
    {
      // 所有文件均没有 season
      file_id: "root_2",
      name: "root",
      type: "folder",
      items: [
        {
          // 如果有 tv_and_season
          file_id: "root_2_1",
          name: "名称1",
          type: "folder",
          items: [
            {
              // 如果有 tv_and_season.season
              file_id: "root_2_1_1",
              name: "s01",
              type: "folder",
              items: [
                {
                  // @@正常1
                  file_id: "root_2_1_1_1",
                  name: "e01.mp4",
                  type: "file",
                },
              ],
            },
            {
              // @@正常2
              file_id: "root_2_1_2",
              name: "e01.mp4",
              type: "file",
            },
          ],
        },
        {
          // @@异常3
          file_id: "root_2_2",
          name: "e01.mp4",
          type: "file",
        },
        {
          // 如果有 tv_and_season
          file_id: "root_2_3",
          name: "名称1",
          type: "folder",
          items: [
            {
              // 如果有 tv_and_season.season
              file_id: "root_2_3_1",
              name: "s01",
              type: "folder",
              items: [
                {
                  // @正常3
                  file_id: "root_2_3_1_1",
                  name: "名称1.e01.mp4",
                  type: "file",
                },
              ],
            },
            {
              // @正常4
              file_id: "root_2_3_2",
              name: "名称1.e01.mp4",
              type: "file",
            },
          ],
        },
        {
          // @@正常4.1
          file_id: "root_2_4",
          name: "名称1.e01.mp4",
          type: "file",
        },
        {
          file_id: "root_2_5",
          name: "s01",
          type: "folder",
          items: [
            {
              // @@正常4.1
              file_id: "root_2_5_1",
              name: "名称1.e01.mp4",
              type: "file",
            },
          ],
        },
      ],
    },
    {
      // 没有 self.name（这里的文件，都有 season 和 episode）
      file_id: "root_3",
      name: "root",
      type: "folder",
      items: [
        {
          // 如果没有 tv_and_season
          // @@异常5
          file_id: "root_3_1",
          name: "s01.e01.mp4",
          type: "file",
        },
        {
          file_id: "root_3_2",
          name: "名称1",
          type: "folder",
          items: [
            {
              // 如果有 tv_and_season.season
              file_id: "root_3_2_1",
              name: "s01",
              type: "folder",
              items: [
                {
                  // @@正常5
                  file_id: "root_3_2_1_1",
                  name: "s01.e01.mp4",
                  type: "file",
                },
                {
                  // @@需要提示2
                  file_id: "root_3_2_1_2",
                  name: "s02e01.mp4",
                  type: "file",
                },
              ],
            },
            {
              // @@正常6
              file_id: "root_3_3",
              name: "s01.e01.mp4",
              type: "file",
            },
          ],
        },
      ],
    },
    {
      file_id: "root_4",
      name: "root",
      type: "folder",
      items: [
        {
          // @@正常7
          file_id: "root_4_1",
          name: "名称1.s01.e01.mp4",
          type: "file",
        },
        {
          file_id: "root_4_2",
          name: "s01",
          type: "folder",
          items: [
            {
              // @@正常7
              file_id: "root_4_2_1",
              name: "名称1.s01.e01.mp4",
              type: "file",
            },
          ],
        },
      ],
    },
    {
      // （这里的文件，都有 name、 season 和 episode）
      file_id: "root_6",
      name: "root",
      type: "folder",
      items: [
        {
          file_id: "root_6_1",
          name: "名称1",
          type: "folder",
          items: [
            {
              // 如果有 tv_and_season.season
              file_id: "root_6_1_1",
              name: "s01",
              type: "folder",
              items: [
                {
                  // @@正常8
                  file_id: "root_6_1_1_1",
                  name: "名称1.s01.e01.mp4",
                  type: "file",
                },
                {
                  // @@需要提示3
                  file_id: "root_6_1_1_2",
                  name: "名称1.s02e01.mp4",
                  type: "file",
                },
              ],
            },
            {
              // @@正常9
              file_id: "root_6_1_1",
              name: "名称1.s01.e01.mp4",
              type: "file",
            },
          ],
        },
      ],
    },
    {
      file_id: "root_7",
      name: "root",
      type: "folder",
      items: [
        {
          file_id: "root_7_1",
          name: "名称1",
          type: "folder",
          items: [
            {
              // 如果有 tv_and_season.season
              file_id: "root_7_1_1",
              name: "s01",
              type: "folder",
              items: [
                {
                  // @@需要提示4
                  file_id: "root_7_1_1_1",
                  name: "名称2.s01.e01.mp4",
                  type: "file",
                },
                {
                  // @@需要提示5
                  file_id: "root_7_1_1_2",
                  name: "名称2.s02e01.mp4",
                  type: "file",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      file_id: "root_8",
      name: "root",
      type: "folder",
      items: [
        {
          file_id: "root_8_1",
          name: "名称1",
          type: "folder",
          items: [
            {
              // @@需要提示6
              file_id: "root_8_1_1",
              name: "名称2.s01.e01.mp4",
              type: "file",
            },
          ],
        },
      ],
    },
  ],
};
