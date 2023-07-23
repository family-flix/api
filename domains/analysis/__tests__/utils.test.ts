import { describe, it, expect } from "vitest";
import { need_skip_the_file_when_walk } from "../utils";

describe("filter file", () => {
  it("only process special file", () => {
    const need_skip = need_skip_the_file_when_walk({
      target_file_name:
        "tv/风吹半夏[全36集]国语中字.Wild.Bloom.2022.2160p.WEB-DL.H265.DDP5.1/Wild.Bloom.S01E03.2022.2160p.WEB-DL.H265.DDP5.1-BlackTV.mkv",
      target_file_type: "file",
      cur_file: {
        name: "Wild.Bloom.S01E03.2022.2160p.WEB-DL.H265.DDP5.1-BlackTV.mkv",
        parent_paths: "tv/风吹半夏[全36集]国语中字.Wild.Bloom.2022.2160p.WEB-DL.H265.DDP5.1",
        type: "file",
      },
    });
    expect(need_skip).toBe(false);
  });

  it("only process special file in sub folder", () => {
    const need_skip = need_skip_the_file_when_walk({
      target_file_name:
        "tv/风吹半夏[全36集]国语中字.Wild.Bloom.2022.2160p.WEB-DL.H265.DDP5.1/Season1/Wild.Bloom.S01E03.2022.2160p.WEB-DL.H265.DDP5.1-BlackTV.mkv",
      target_file_type: "file",
      cur_file: {
        name: "Wild.Bloom.S01E03.2022.2160p.WEB-DL.H265.DDP5.1-BlackTV.mkv",
        parent_paths: "tv/风吹半夏[全36集]国语中字.Wild.Bloom.2022.2160p.WEB-DL.H265.DDP5.1/Season1",
        type: "file",
      },
    });
    expect(need_skip).toBe(false);
  });

  it("only process special file in sub folder3", () => {
    const need_skip = need_skip_the_file_when_walk({
      target_file_name:
        "tv/风吹半夏[全36集]国语中字.Wild.Bloom.2022.2160p.WEB-DL.H265.DDP5.1/Season1/Wild.Bloom.S01E04.2022.2160p.WEB-DL.H265.DDP5.1-BlackTV.mkv",
      target_file_type: "file",
      cur_file: {
        name: "Wild.Bloom.S01E03.2022.2160p.WEB-DL.H265.DDP5.1-BlackTV.mkv",
        parent_paths: "tv/风吹半夏[全36集]国语中字.Wild.Bloom.2022.2160p.WEB-DL.H265.DDP5.1/Season1",
        type: "file",
      },
    });
    expect(need_skip).toBe(true);
  });

  it("only process special the file in deep sub folder4", () => {
    const need_skip = need_skip_the_file_when_walk({
      target_file_name: "tv/风吹半夏[全36集]国语中字.Wild.Bloom.2022.2160p.WEB-DL.H265.DDP5.1/E01.mp4",
      target_file_type: "file",
      cur_file: {
        name: "我是余欢水",
        parent_paths: "tv",
        type: "folder",
      },
    });
    expect(need_skip).toBe(true);
  });

  it("only process special the file in deep sub folder", () => {
    const need_skip = need_skip_the_file_when_walk({
      target_file_name: "tv/风吹半夏[全36集]国语中字.Wild.Bloom.2022.2160p.WEB-DL.H265.DDP5.1",
      target_file_type: "folder",
      cur_file: {
        name: "Wild.Bloom.S01E03.2022.2160p.WEB-DL.H265.DDP5.1-BlackTV.mkv",
        parent_paths: "tv/风吹半夏[全36集]国语中字.Wild.Bloom.2022.2160p.WEB-DL.H265.DDP5.1/Season1",
        type: "file",
      },
    });
    expect(need_skip).toBe(false);
  });

  it("only process special the file in deep sub folder2", () => {
    const need_skip = need_skip_the_file_when_walk({
      target_file_name: "tv/风吹半夏[全36集]国语中字.Wild.Bloom.2022.2160p.WEB-DL.H265.DDP5.1",
      target_file_type: "folder",
      cur_file: {
        name: "Season1",
        parent_paths: "tv/风吹半夏[全36集]国语中字.Wild.Bloom.2022.2160p.WEB-DL.H265.DDP5.1",
        type: "folder",
      },
    });
    expect(need_skip).toBe(false);
  });

  it("tv/风吹半夏[全36集]国语中字.Wild.Bloom.2022.2160p.WEB-DL.H265.DDP5.1/Season1/1080p", () => {
    const need_skip = need_skip_the_file_when_walk({
      target_file_name: "tv/风吹半夏[全36集]国语中字.Wild.Bloom.2022.2160p.WEB-DL.H265.DDP5.1",
      target_file_type: "folder",
      cur_file: {
        name: "1080p",
        parent_paths: "tv/风吹半夏[全36集]国语中字.Wild.Bloom.2022.2160p.WEB-DL.H265.DDP5.1/Season1",
        type: "folder",
      },
    });
    expect(need_skip).toBe(false);
  });

  it("only process special the file in deep sub folder3", () => {
    const need_skip = need_skip_the_file_when_walk({
      target_file_name: "tv/风吹半夏[全36集]国语中字.Wild.Bloom.2022.2160p.WEB-DL.H265.DDP5.1/Season2",
      target_file_type: "folder",
      cur_file: {
        name: "Season1",
        parent_paths: "tv/风吹半夏[全36集]国语中字.Wild.Bloom.2022.2160p.WEB-DL.H265.DDP5.1",
        type: "folder",
      },
    });
    expect(need_skip).toBe(true);
  });

  it("only process special the file in deep sub folder4", () => {
    const need_skip = need_skip_the_file_when_walk({
      target_file_name: "tv/风吹半夏[全36集]国语中字.Wild.Bloom.2022.2160p.WEB-DL.H265.DDP5.1/Season2",
      target_file_type: "folder",
      cur_file: {
        name: "我是余欢水",
        parent_paths: "tv",
        type: "folder",
      },
    });
    expect(need_skip).toBe(true);
  });

  it("only process special the file in deep sub folder5", () => {
    const need_skip = need_skip_the_file_when_walk({
      target_file_name: "tv/风吹半夏[全36集]国语中字.Wild.Bloom.2022.2160p.WEB-DL.H265.DDP5.1/Season2/E01.mp4",
      target_file_type: "file",
      cur_file: {
        name: "我是余欢水",
        parent_paths: "tv",
        type: "folder",
      },
    });
    expect(need_skip).toBe(true);
  });

  it("downloads/T 他是谁 (2023)(24集持续更新中)/扫码特惠购买阿里云盘会员，VX小程序24小时自动充值，官方授权店铺(5)(1).png", () => {
    const need_skip = need_skip_the_file_when_walk({
      target_file_name: "downloads/T 他是谁 (2023)(24集持续更新中)/4K/他是谁_09_4K_Tacit0924.mp4",
      target_file_type: "file",
      cur_file: {
        name: "扫码特惠购买阿里云盘会员，VX小程序24小时自动充值，官方授权店铺(5)(1).png",
        parent_paths: "downloads/T 他是谁 (2023)(24集持续更新中)/",
        type: "file",
      },
    });
    expect(need_skip).toBe(true);
  });

  it("tv/1993.灌篮高手.102集收藏版+剧场版+漫画+SP.1080p/灌篮高手 合集", () => {
    const need_skip = need_skip_the_file_when_walk({
      target_file_name: "tv/1993.灌篮高手.102集收藏版+剧场版+漫画+SP.1080p/灌篮高手 合集",
      target_file_type: "folder",
      cur_file: {
        name: "1993.灌篮高手.102集收藏版+剧场版+漫画+SP.1080p",
        type: "folder",
        parent_paths: "tv",
      },
    });
    expect(need_skip).toBe(false);
  });
  it("downloads/C 朝鲜律师 (16集全完结)", () => {
    const need_skip = need_skip_the_file_when_walk({
      // 需要是 downloads/C 朝鲜律师 (16集全完结) 这样完整的路径
      target_file_name: "C 朝鲜律师 (16集全完结)",
      target_file_type: "folder",
      cur_file: {
        name: "C 朝鲜律师 (16集全完结)",
        type: "folder",
        parent_paths: "downloads",
      },
    });
    expect(need_skip).toBe(true);
  });
  it("video/tv2/大宋少年志", () => {
    const need_skip = need_skip_the_file_when_walk({
      target_file_name: "video/tv2/大宋少年志",
      target_file_type: "folder",
      cur_file: {
        name: "tv",
        type: "folder",
        parent_paths: "video",
      },
    });
    expect(need_skip).toBe(true);
  });
  it("video/tv2/大宋少年志", () => {
    const need_skip = need_skip_the_file_when_walk({
      target_file_name: "video/tv2/大宋少年志",
      target_file_type: "folder",
      cur_file: {
        name: "movie",
        type: "folder",
        parent_paths: "video",
      },
    });
    expect(need_skip).toBe(true);
  });
});
