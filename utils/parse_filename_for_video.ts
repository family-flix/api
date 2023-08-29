import { video_file_type_regexp, normalize_episode_text, remove_str, chinese_num_to_num, padding_zero } from "./index";

export const VIDEO_KEY_NAME_MAP = {
  name: "中文名称",
  original_name: "译名or外文原名",
  season: "季",
  episode: "集",
  resolution: "分辨率",
  year: "发布年",
  source: "来源",
  encode: "视频编码方式",
  voice_encode: "音频编码方式",
  episode_count: "总集数",
  episode_name: "集名称",
  type: "后缀",
  /**
   * chi 中文
   * eng 英文
   * jpn 日文
   */
  subtitle_lang: "字幕语言",
};

export type VideoKeys = keyof typeof VIDEO_KEY_NAME_MAP;
export const VIDEO_ALL_KEYS = Object.keys(VIDEO_KEY_NAME_MAP) as VideoKeys[];
export type ParsedVideoInfo = Record<VideoKeys, string>;
/**
 * 从一个文件名中解析出影视剧信息
 * @param filename
 * @param keys
 * @returns
 */
export function parse_filename_for_video(
  filename: string,
  keys: VideoKeys[] = ["name", "original_name", "season", "episode"],
  extra_rules: {
    replace: [string, string];
  }[] = []
) {
  function log(...args: unknown[]) {
    if (!filename.includes("Angry.Men")) {
      return;
    }
    console.log(...args);
  }
  // @ts-ignore
  const result: Record<VideoKeys, string> = keys
    .map((k) => {
      return {
        [k]: "",
      };
    })
    .reduce((total, prev) => {
      return { ...total, ...prev };
    }, {});
  const k = has_key_factory(keys);
  // 做一些预处理
  // 移除 [name][] 前面的 [name]，大部分日本动漫前面的 [name] 是发布者信息
  log("filename is", filename);
  let original_name = filename
    .replace(/^\[[a-zA-Z0-9&-]{1,}\]/, ".")
    .replace(/^\[[^\]]{1,}\](?=\[)/, "")
    .replace(/^【[^】]{1,}】/, "");
  const special_season_with_number_regexp = /(^|[^a-zA-Z])([sS][pP])([0-9]{1,})($|[^a-zA-Z])/;
  if (original_name.match(special_season_with_number_regexp)) {
    // name.SP2 改成 name.SP.E2
    original_name = original_name.replace(special_season_with_number_regexp, "$1.SP.E$3.$4");
  }
  original_name = original_name
    .replace(/^\./, "")
    .replace(/ - /g, ".")
    .replace(/[ _丨]/g, ".")
    .replace(/\]\[/, ".")
    .replace(/[【】《》「」\[\]]{1,}/g, ".")
    .replace(/^\./, "")
    .replace(/\+{1,}/g, ".")
    .replace(/(^[\u4e00-\u9fa5]{1,})([0-9]{1,})(\.[a-zA-Z]{1,}[0-9a-zA-Z]{1,}$)/, (matched, p1, p2, p3) => {
      return (
        p1 +
        "." +
        (() => {
          if (p2.length < 2) {
            return "0" + p2;
          }
          return p2;
        })() +
        p3
      );
    })
    // 2001三少爷的剑31.mkv 处理成 三少爷的剑.2001.31.mkv
    .replace(/([1-9][0-9]{3})([\u4e00-\u9fa5]{1,})([0-9]{1,})(.{1,})/, "$2.$1.$3.$4")
    .replace(/(https{0,1}:){0,1}(\/\/){0,1}[0-9a-zA-Z]{1,}\.(com|cn)/, "")
    .replace(/(\.){2,}/g, ".");
  // const special_season_regexp = /(^|[^a-zA-Z])([sS][pP])($|[^a-zA-Z])/;
  for (let i = 0; i < extra_rules.length; i += 1) {
    (() => {
      const rule = extra_rules[i];
      const { replace } = rule;
      try {
        const regexp = new RegExp(replace[0]);
        if (!original_name.match(regexp)) {
          return;
        }
        original_name = original_name.replace(regexp, replace[1]);
      } catch (err) {
        // replace[0] 可能不是合法的正则
      }
    })();
  }
  log("original_name is", original_name);
  let cur_filename = original_name;
  log("start name", cur_filename);
  type ExtraRule = {
    /** 用于存值的 key */
    key?: VideoKeys;
    /** 额外的描述信息方便定位代码 */
    desc?: string;
    /** 正则 */
    regexp: RegExp;
    /** 从正则匹配结果中选择的下标，如果存在多个，取多个拼接。默认 [0] */
    pick?: number[];
    /** 优先级，默认为 0，如某个设置了大于该值的，覆盖 */
    priority?: number;
    /** 提取后，用该字符作为替换 */
    placeholder?: string;
    /** 执行该正则前调用 */
    before?: () => void | Partial<{
      /** 是否跳过该正则 */
      skip: boolean;
    }>;
    /** 执行该正则完成后调用 */
    after?: (matched_content: string | null) => void | Partial<{
      /** 是否不保存提取到的值 */
      skip: boolean;
    }>;
    /** 当该方法存在且返回 true，才执行该正则 */
    when?: () => boolean;
  };
  const priorityMap: Partial<Record<VideoKeys, number>> = {};
  const publishers = [
    "FRDS",
    "￡{0,1}cXcY@FRDS",
    "MediaClub",
    "-Yumi@FRDS",
    "-BlackTV",
    "-HotWEB",
    "-SeeWEB",
    "-HDSWEB",
    "-Vampire",
    "-NGB",
    "-Huawei",
    "-DHTCLUB",
    "-OurTV",
    "-TrollHD",
    "-CtrlHD",
    "-NiXON",
    "-NTb",
    "-SHORTBREHD",
    "-rovers",
    "-TjHD",
    "-TEPES",
    "-SMURF",
    "-SiGMA",
    "-CMCTV{0,1}",
    "-AIU",
    "ATV",
    "HQC",
    "Mp4Ba",
    "-Amber",
    "-HeiGuo",
    "-HDCTV",
    "-HaresWEB",
    "-BtsTV",
    "-Nanzhi",
    "-PTerWEB",
    "-SciSurf",
    "-orpheus",
    "-BS666",
    "GM-Team",
    "-{0,1}SuperMiao",
    "-52KHD",
    "-SXG",
    "Tacit0924",
    "蓝色狂想",
    "蓝色狂想制作",
    "tv综合吧",
    "DBD制作组&离谱Sub.",
    "艺声译影",
    "推しの子",
    "傅艺伟",
    "Shimazu",
    "BOBO",
    "VCB-Studio",
    "GOTV-TS",
    "tvr",
    "tri",
    "xtm.dvd-halfcd2.",
    "BeanSub&FZSD&LoliHouse",
    "BeanSub&FZSD",
    "BeanSub",
    "tvzongheba",
  ]
    .map((s) => `${s}`)
    .join("|");
  // 这里会和 publishers2 同时出现导致无法一起移除，所以会和上面一起出现的单独列出来
  const publishers2 = ["MyTVSuper", "SS的笔记", "FLTTH", "BOBO", "rartv", "Prof", "CYW", "Ma10p"]
    .map((s) => `${s}`)
    .join("|");
  const extra: ExtraRule[] = [
    // 一些发布者信息
    {
      regexp: new RegExp(publishers),
    },
    {
      regexp: new RegExp(publishers2),
    },
    {
      regexp: /[^字\.]{1,}字幕组\.{0,1}/,
    },
    // 奇怪的冗余信息
    {
      regexp: /超前点映|超前完结|点映礼/,
    },
    {
      regexp: /（[^）]{1,}）$/,
    },
    {
      regexp: /^[tT][oO][pP][0-9]{1,}\./,
    },
    {
      regexp:
        /_File|HDJ|RusDub|Mandarin|[0-9]{5,}|百度云盘下载|主演团陪看|又名|超前点播直播现场|\.(?=[A-Z0-9]{1,}[A-Z])(?=[A-Z0-9]{1,}[0-9])[A-Z0-9]{8}\./,
      before() {
        // 存在 28(1).mkv 这种文件名
        const regex = /(?<=\d)[(（][0-9]{1,}[）)]/g;
        cur_filename = cur_filename.replace(regex, "");
      },
    },
    {
      regexp: /[cC][hH][sS]\.{0,1}[jJ][pP][nN]/,
    },
    {
      regexp: /repack/,
    },
    // 来源平台
    {
      // 亚马逊、奈飞、迪士尼、爱奇艺、湖南TV
      regexp: /AMZN|NF|Netflix|DSNP|iQIYI|HunanTV|YYeTs|陕艺/,
    },
    // 文件后缀
    {
      key: k("type"),
      regexp: video_file_type_regexp,
      after(matched_content) {
        if (matched_content === null) {
          if (cur_filename.match(/^[1-9][0-9]{3}/)) {
            return undefined;
          }
          cur_filename = cur_filename.replace(/^[0-9]{1,}\./, "");
        }
      },
    },
    {
      key: k("subtitle_lang"),
      regexp: /([cChHtTsiISeEnNgG]{1,}&[cChHtTsiISeEnNgG]{1,}|简英)\./,
      pick: [1],
    },
    {
      key: k("subtitle_lang"),
      regexp: /([zZ][hH]|[cC][hH][iIsStT]|[eE][nN][gG])\./,
      pick: [1],
    },
    // 一些国产剧影片特有的信息？
    {
      /**
       * 最前面方便排序用的 影片首字母拼音 大写英文字母。只有该字母后面跟着中文，才会被处理
       * 如 `M 魔幻手机`，会变成 `魔幻手机`
       * `A Hard Day's Night` 不会被处理，仍保留原文
       */
      regexp: /^[A-Za-z]{1}[\. -（）⌒·★]{1}(?=[\u4e00-\u9fa5]{1,})/,
      before() {
        if (cur_filename.match(/^[A-Za-z][\u4e00-\u9fa5]{1,}/)) {
          cur_filename = cur_filename.replace(/(^[A-Za-z])([\u4e00-\u9fa5]{1,})/, "$1 $2");
        }
      },
    },
    {
      regexp: /含[\u4e00-\u9fa5]{1,}[0-9]{1,}部全系列/,
    },
    {
      // 多少集，包含「更新中」信息
      // key: k("episode_count"),
      regexp: /([0-9]{1,}集){0,1}((持续){0,1}更新中|[已全]\.{0,1}完结)/,
    },
    {
      regexp: /默认|付费|去除|保留|官方|公众号[:：]{0,1}/,
    },
    {
      regexp: /[多双粤国英]{1,}[语言音]{1,}[轨频]/,
    },
    {
      regexp:
        /[国粤日][语配](中字|繁字|无字|内嵌){0,1}版{0,1}|繁体中字|双语中字|中英双字|[国粤韩英日中德]{1,3}[双三][语轨]|双语源码/,
    },
    {
      regexp: /中字|双字/,
    },
    {
      regexp: /[官繁]中/,
    },
    {
      regexp: /\([0-9]{1,}\)/,
    },
    {
      regexp: /\.{0,1}[0-9]{1,}(end)/,
      pick: [1],
    },
    {
      // 字幕及其语言
      regexp:
        /(内封|内嵌|外挂){0,1}[简繁中英多]{1,}[文语語]{0,1}字幕|无字|(内封|内嵌|内挂|无|[软硬])字幕版{0,1}|(内封|内嵌|外挂)(多国){0,1}字幕|(内封|内嵌|外挂)[简繁中英][简繁中英]|(内封|内嵌|外挂)/,
    },
    {
      regexp: /[\u4e00-\u9fa5]{0,}压制组{0,1}/,
    },
    {
      regexp: /\({0,1}CC标准\){0,1}/,
    },
    {
      regexp: /杜比视界/,
    },
    {
      regexp: /高清|超清|超高清/,
    },
    {
      regexp: /[1-9][0-9]{0,}分钟版/,
    },
    {
      regexp: /重[置制]版/,
    },
    {
      regexp: /版本[1-9]{1,}/,
    },
    {
      regexp: /高码|修复版{0,1}|[0-9]{1,}重[置制]版\.{0,1}/,
    },
    {
      regexp: /重置版|修复版|多语版|网络版|劇場版|合成版|亚马逊版|\.Extended/,
    },
    {
      regexp: /([0-9]{1,}部){0,1}剧场版/,
    },
    {
      regexp: /[超高]清/,
    },
    {
      regexp: /([0-9]{1,}部){0,1}剧场版/,
    },

    {
      regexp: /无台标(水印版){0,1}/,
    },
    {
      regexp: /无水印|三无|[无未]删减/,
    },
    {
      regexp: /片头(片中){0,1}/,
    },
    {
      regexp: /片尾\+{0,1}/,
    },
    {
      regexp: /去{0,1}广告/,
    },
    {
      regexp: /洗码[0-9]{0,}/,
    },
    {
      regexp: /纯享版/,
      before() {
        cur_filename = cur_filename.replace(/（{0,1}纯享版）{0,1}/, ".纯享版.");
      },
    },
    {
      regexp: /完整全集/,
    },
    {
      regexp: /国漫|[0-9]{1,}年日剧\.{0,1}/,
    },
    {
      regexp: /[0-9]{1,}集特别版/,
    },
    {
      regexp: /[0-9]{1,}部MV/,
    },
    {
      regexp: /\({0,1}[0-9]{1,}版\){0,1}/,
    },
    {
      regexp: /(爱奇艺版|亚马逊版|原版|新版|完整版|收藏版)(备份){0,1}/,
    },
    {
      regexp: /非{0,1}[a-zA-Z]{1,}版/,
    },
    {
      regexp: /(经典){0,1}(本港台|台版|台剧|怀旧)/,
    },
    {
      regexp: /高分(战争|爱情|悬疑)剧/,
    },
    {
      regexp: /豆瓣[0-9\.]{1,}分{0,1}/,
    },
    // 总大小信息
    {
      regexp: /【{0,1}[0-9]{1,}(\.[0-9]{1,}){0,1}([gG]|[mM])[bB]{0,1}】{0,1}/,
    },
    {
      regexp: /[nN][oO]\.[0-9]{1,}｜/,
    },
    { regexp: /GB/ },
    // 分辨率
    {
      regexp: /蓝光版{0,1}/,
    },
    {
      key: k("resolution"),
      regexp: /(蓝光){0,1}(4[kK])\.{0,}/,
    },
    {
      regexp: /[fF][sS][0-9]{2,3}[pP]/,
    },
    // 剧集的额外信息
    {
      // remastered 是指重发版？
      regexp: /REMASTERED/,
    },
    // 分辨率
    {
      key: k("resolution"),
      regexp: /([hHbB][dD]){0,1}\.{0,1}[0-9]{3,4}\.{0,1}[xX×]\.{0,1}[0-9]{3,4}/,
    },
    {
      key: k("resolution"),
      regexp: /HD[0-9]{3,4}/,
    },

    {
      key: k("resolution"),
      regexp: /（{0,1}[0-9]{1,}[pPiI]）{0,1}/,
    },
    {
      regexp: /[0-9]{1,}(帧|FPS)/,
    },
    {
      key: k("year"),
      regexp: /[123][0-9]{3}[-\/][0-9]{1,2}[-\/][0-9]{1,2}/,
    },
    // 总集数，要放在「总季数」前面
    {
      // EP01-40，表示 1 到 40 集
      desc: "总集数1",
      regexp: /[eE][pP][0-9]{1,}-([0-9]{1,})/,
    },
    {
      desc: "总集数2",
      regexp: /全([0-9]{1,})[集話话]/,
    },
    {
      desc: "总集数3",
      regexp: /([0-9]{1,})[集話话]全/,
    },
    {
      key: k("episode"),
      desc: "多集合并场景",
      regexp: /第[1-9]{1,}-[0-9]{1,}[集話话]/,
    },
    // 总季数，要放在「中文名称」前面
    {
      desc: "总季数1",
      // 1-3 季
      regexp: /([1-9]{1,}[-+][1-9]{1,})[季部]/,
    },
    {
      // 重复出现，不要删除，是为了移除和中文名连在一起的「第n季」
      key: k("season"),
      desc: "总季数2",
      regexp: /第[1-9]{1,}[季]/,
      before() {
        cur_filename = cur_filename.replace(/(第[1-9]{1,}[季])([0-9]{1,})/, "$1.E$2");
      },
    },
    {
      key: k("season"),
      desc: "special season1",
      // 一些日本动漫会有的，和「剧场版」等做区分？
      regexp: /本篇|完结篇|OVA([^编編篇]{1,}[编編篇]){0,1}|特典映像|番外篇|特辑篇|PV/,
      before() {
        cur_filename = cur_filename.replace(/PV([0-9]{1,})/, "PV.E$1");
      },
    },
    {
      key: k("season"),
      desc: "special season2",
      regexp: /[sS][pP]/,
      before() {
        const special_season_regexp = /(^|[^a-zA-Z])([sS][pP])($|[^a-zA-Z])/;
        if (cur_filename.match(special_season_regexp)) {
          const special_season_with_number_regexp = /(^|[^a-zA-Z])([sS][pP])([0-9]{1,})($|[^a-zA-Z])/;
          if (cur_filename.match(special_season_with_number_regexp)) {
            cur_filename = cur_filename.replace(special_season_with_number_regexp, "$1.SP.E$3.$4");
            return undefined;
          }
          cur_filename = cur_filename.replace(special_season_regexp, "$1.SP.$3");
          return undefined;
        }
        // 如果非 name.SP.episode 这种，而是在名称中包含 sp 的单测，就跳过
        return {
          skip: true,
        };
      },
    },
    {
      // 重复出现，不要删除
      key: k("season"),
      regexp: /第[\u4e00-\u9fa5]{1,}[季]/,
    },
    {
      key: k("season"),
      regexp: /[sS][eE]{0,1}[0-9]{1,}/,
    },
    // 提取集数
    {
      key: k("episode"),
      // NCOP 表示片头曲？NCED 表示片尾曲？
      regexp: /[nN][cC]([oO][pP]|[eE][dD])[0-9]{1,}/,
    },
    {
      key: k("episode"),
      // CM05 表示广告？
      regexp: /[cC][mM][0-9]{1,}/,
    },
    {
      key: k("episode"),
      regexp: /^[0-9]{1,}$/,
      before() {
        cur_filename = cur_filename.replace(/^\.{2,}/, "").replace(/\.{1,}$/, "");
      },
    },
    {
      key: k("episode"),
      regexp: /第[0-9]{1,}[\.$]/,
    },
    {
      key: k("episode"),
      regexp: /特别篇[0-9]{1,}/,
    },
    {
      key: k("episode"),
      regexp: /预告[0-9]{1,}/,
    },
    {
      key: k("episode"),
      regexp: /续集|彩蛋[0-9]{0,}|花絮[0-9]{0,}|番外[0-9]{0,}|BONUS|[pP][rR][0-9]{0,}[\.$]/,
      placeholder: ".",
    },
    {
      key: k("episode"),
      regexp: /第[\u4e00-\u9fa5]{1,}[集話话]/,
      priority: 1,
    },
    {
      key: k("episode"),
      // 这里之所以可能出现 第.55.集 这种情况是最开始将「空格」替换成了 . 符号
      regexp: /第{0,1}[\.]{0,1}[0-9]{1,}[\.]{0,1}[集話话]/,
      priority: 1,
    },
    {
      key: k("episode"),
      regexp: /[eE][pP]{0,1}[0-9]{1,}-[eE][0-9]{1,}/,
    },
    {
      key: k("episode"),
      regexp: /[eE][pP]{0,1}[0-9]{1,}-[0-9]{1,}/,
    },
    {
      key: k("episode"),
      regexp: /[eE][pP]{0,1}[0-9]{1,}[eE][0-9]{1,}/,
    },
    {
      key: k("episode"),
      regexp: /[eE][pP]{0,1}[0-9]{1,}/,
    },
    {
      key: k("episode"),
      regexp: /[\u4e00-\u9fa5]{1,}(0[1-9]{1,2})\./,
      pick: [1],
    },
    {
      key: k("name"),
      // 如「十八年后的告白2.0」
      desc: "number.number 结尾的剧集名",
      regexp: /([\u4e00-\u9fa5]{1,}[0-9]{1}\.[0-9]{1})([^0-9]|$)/,
      pick: [1],
    },
    {
      // 针对国产剧，有一些加在名称后面的数字表示季，如 还珠格格2、欢乐颂3_01
      key: k("season"),
      regexp: /[\u4e00-\u9fa5]{1,}(0{0,1}(?!0)[1-9]{1,2}[:：]{0,1})(\.|$|-)/,
      priority: 1,
      pick: [1],
    },
    {
      key: k("name"),
      regexp: /^[a-zA-Z：]{1,}[\u4e00-\u9fa5]{1,}/,
    },
    {
      // 日文名称
      key: k("name"),
      desc: "japanese name",
      regexp:
        /^\[{0,1}[0-9]{0,}([\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff][0-9a-zA-Z\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff，：· ]{0,}[0-9a-zA-Z\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff])\]{0,1}/,
      before() {
        // cur_filename = cur_filename.replace(/^\.{2,}/, "");
        const include_japanese = is_japanese(cur_filename);
        // log("[japanese-name]maybe japanese", include_japanese);
        if (!include_japanese) {
          return {
            skip: true,
          };
        }
      },
      after(matched_content) {
        if (!matched_content) {
          return undefined;
        }
        const i = original_name.indexOf(matched_content);
        // 如果季数在 name 前面 name 视为无效
        log("[japanese-name]compare season position", original_name.indexOf(result.season), i);
        if (result.season && original_name.indexOf(result.season) < i) {
          return {
            skip: true,
          };
        }
        if (result.episode && original_name.indexOf(result.episode) < i) {
          return {
            skip: true,
          };
        }
      },
    },
    {
      key: k("original_name"),
      desc: "korean name",
      regexp: /\[{0,1}[0-9]{0,}[\uac00-\ud7a3][0-9a-zA-Z\uac00-\ud7a3，：·]{0,}[\uac00-\ud7a30-9a-zA-Z]/,
    },
    // 中文名称，放在「分辨率」后面，是支持 影片名1080p 这种情况能被正确识别为「影片名」，而不是「影片名1080」
    // 因为影片名支持以数字结尾，如「还珠格格3」
    {
      key: k("name"),
      desc: "chinese name1",
      // 数字开头的，如 007：大破天幕杀机
      regexp: /^([0-9]{1,}[：\u4e00-\u9fa5]{1,})\./,
      pick: [1],
    },
    {
      key: k("name"),
      desc: "chinese name2",
      // 只有一个字的影视剧
      regexp: /^([\u4e00-\u9fa5])\./,
      pick: [1],
    },
    {
      key: k("name"),
      desc: "chinese name3",
      // 中文开头，中间可以包含数字，以中文结尾
      regexp:
        /^\[{0,1}[0-9]{0,}([\u4e00-\u9fa5][0-9a-zA-Z\u4e00-\u9fa5！，：·、■（）]{0,}[0-9a-zA-Z\u4e00-\u9fa5）])\]{0,1}/,
      before() {
        // 把 1981.阿蕾拉 这种情况转换成 阿蕾拉.1981
        cur_filename = cur_filename.replace(/^([0-9]{4}\.{1,})([\u4e00-\u9fa5]{1,})/, "$2.$1");
        // 把 老友记S02 这种情况转换成 老友记.S02
        cur_filename = cur_filename.replace(/^([\u4e00-\u9fa5]{1,})([sS][0-9]{1,})/, "$1.$2");
        // 如果名字前面有很多冗余信息，前面就会出现 ..名称 这种情况，就需要手动处理掉
        // cur_filename = cur_filename.replace(/^\.{2,}/, "");
        const include_japanese = is_japanese(cur_filename);
        if (include_japanese) {
          return {
            skip: true,
          };
        }
      },
    },
    // 发布年，必须在「分辨率」后面，因为分辨率有 2160p 这种，为了方便处理，先把分辨率剔除，再来处理发布年
    // 也要放在 name 先后面，因为有些影视剧名称包含了年份，比如「回到1988」，如果先把 1988 处理了，名字就不对了
    {
      key: k("year"),
      regexp: /[(（]{0,1}[0-9]{4}-[0-9]{4}[）)]{0,1}/,
      before() {
        if (cur_filename.match(/^[0-9]{4}\./)) {
          cur_filename = cur_filename.replace(/^([0-9]{4})\./, "$1");
        }
      },
    },
    {
      key: k("year"),
      regexp: /[(（]{0,1}[123]{1}[0-9]{3}[）)]{0,1}年{0,1}/,
    },
    // 影片来源
    {
      key: k("source"),
      regexp: /(HMAX){0,1}[wW][eE][bB](-HR){0,1}([Rr][i][p]){0,1}(-{0,1}[dD][lL]){0,1}/,
    },
    {
      key: k("source"),
      regexp: /HDTV([Rr][Ii][Pp]){0,1}/,
    },
    {
      key: k("source"),
      // 蓝光 UHD 是指原盘？
      regexp: /(UHD){0,1}[bB]lu-{0,1}[rR]ay/,
    },
    {
      key: k("source"),
      // 指从 Blu-ray 光盘中提取出来的视频文件
      regexp: /([bB][dD]|[wW][eE][bB]|[dD][vV][dD])-{0,1}[rR][iI][pP]/,
    },
    /**
     * 色深，和 10bit/8bit 同等概念？
     * 但也有 HDR 和 10bit 同时存在的，并且单独将这个称为「HDR类型」
     */
    {
      regexp: /\({0,1}([SH]DR|DV|HLG)\){0,1}([0-9]{1,}){0,1}/,
    },
    {
      regexp: /[0-9]{1,}bit/,
    },
    {
      //  Subtitles for the deaf and hard of hearing (SDH)
      regexp: /Eng\.SubEngSDH/,
    },
    // 编码方式
    {
      key: k("resolution"),
      regexp: /[hH][dD]1080[pP]/,
    },
    {
      key: k("encode"),
      // 能处理 HD4K、HD265 这种异常数据
      regexp: /[xX]{0,1}[hH]{0,1}[dD]{0,1}\.{0,1}26[45]{1}(_FLAC){0,1}/,
      before() {
        cur_filename = cur_filename.replace(/([xX]26[45])\.(FLAC)/, "$1_$2");
      },
    },

    {
      // HEVC=H265? AVC=H264？
      regexp: /(HE|A)[VC]C(\.FLAC){0,1}/,
    },
    {
      regexp: /(MPEG|VP9|AV1){1}/,
    },
    // 双声道?
    {
      regexp: /2[Aa][Uu][Dd][Ii][Oo][Ss]/,
    },
    // 音频编码方式
    {
      key: "voice_encode",
      /**
       * DDP5.1: dolby digital plus 5.1声道，有损压缩，流媒体专用
       * DD+5.1: 同上
       * DDP2.0 这是什么？
       * DDP    这是什么？
       */
      regexp: /D[dD]([pP]|\+){0,1}(\.){0,1}([25]\.[01]){0,1}(\.Atmos){0,1}/,
      // before() {
      //   log("before voice_encode", latestFilename);
      // },
    },
    {
      key: k("voice_encode"),
      regexp: /[eE]{0,1}[aA][cC]3/,
    },
    {
      key: k("voice_encode"),
      regexp: /DTSHD-MA/,
    },
    {
      key: k("voice_encode"),
      /**
       * 2声道的多为 AAC、M4a
       * 多声道的多为 AC3(DD)、eAC3(DDP、DD+)、TrueHD(MLP)
       * 杜比全景声多为 Atmos(DD+、TrueHD)、DTS、DTS HDMA、DTS:X
       * > THD 即 TrueHD？
       */
      regexp: /[aA][aA][cC](2\.0){0,1}/,
    },
    {
      key: k("voice_encode"),
      regexp: /TrueHD\.Atmos/,
    },
    {
      // 有些影片名字是「影片名.8.8.English.Name」，不知道这里的 8.8、7.6 等数字是什么意思，上映日期？放在这么后面是因为存在 DDP.5.1 这种情况
      regexp: /\.[0-9]\.[0-9]\./,
    },
    // 上面没有解析出来，这里是最后的机会提取季
    {
      key: k("season"),
      regexp: /[sS][eE]{0,1}[0-9]{1,}/,
      before() {
        log("[season]filename before add E char or S char", cur_filename);
        // 如果有 E01 这种，就跳过
        if (result.episode) {
          return;
        }
        // xxxxep01 xxxxe01 就跳过
        if (/[^sS](?![sS])[eE][pP]{0,1}[0-9]{1,}/.test(cur_filename)) {
          return;
        }
        log("[season]filename before check skip with custom flag", cur_filename);
        if (/\{\{[^\{]{1,}\}\}/.test(cur_filename)) {
          return;
        }
        // 007：大破天幕杀机 兼容这种多个数字开头的
        // if (/^[0-9]{1,}/.test(cur_filename)) {
        //   return;
        // }
        cur_filename = normalize_episode_text(cur_filename);
        log("[season]filename after adding E or P char", cur_filename);
      },
    },
    {
      key: k("season"),
      regexp: /Ⅱ/,
    },
    {
      key: k("season"),
      // 2nd_season 这种情况
      regexp: /[1-9]{1,}[nN][dD]\.Season/,
    },
    {
      key: k("season"),
      regexp: /Season\.{0,}[0-9]{1,}/,
    },
    // 集数
    {
      key: k("episode"),
      regexp: /[_-][0-9]{1,}/,
    },
    {
      key: k("episode"),
      regexp: /Episode\.[0-9]{1,}/,
    },
    {
      key: k("episode"),
      regexp: /[（(]([0-9]{1,})[)）]/,
      pick: [1],
    },
    {
      key: k("episode"),
      regexp: /[eE][pP]{0,1}[0-9]{1,}/,
    },
    // {
    //   key: k("episode"),
    //   regexp: /[eE][pP]{0,1}[0-9]{1,}-{0,1}([eE][pP]{0,1}[0-9]{1,}){0,1}/,
    // },
    // 影片名及集名
    ...(() => {
      // 中文 \u4e00-\u9fa5
      // 俄文 \u0400-\u04FF
      // 韩文 \uAC00-\uD7A3 和英文一样中间可以包含空格
      // 日文 \u0800-\u4e00 还要包含中文字符范围
      // 英文 a-zA-Z
      const name_regexp =
        /[0-9a-zA-Z\u4e00-\u9fa5\u0400-\u04FF\uAC00-\uD7A3\u0800-\u4e00]{1,}[ \.\-&!'（）：！？～0-9a-zA-Z\u4e00-\u9fa5\u0400-\u04FF\uAC00-\uD7A3\u0800-\u4e00]{1,}[）0-9a-zA-Z!！？\u4e00-\u9fa5\u0400-\u04FF\uAC00-\uD7A3\u0800-\u4e00]/;
      const remove_multiple_dot = () => {
        // log("[6.0]before original_name or episode name", cur_filename);
        // 后面的 ` 符号可以换成任意生僻字符，这个极度重要！！
        cur_filename = cur_filename.replace(/[\.]{2,}/g, "`").replace(/^\.{0,1}/, "");
        if (/\{\{[^\{]{1,}\}\}/.test(cur_filename)) {
          cur_filename = cur_filename.replace(/\{\{/, "").replace(/\}\}/, "");
        }
        // log("[6]after original_name or episode name", cur_filename);
      };
      const name_extra: ExtraRule[] = [
        {
          key: k("original_name"),
          regexp: name_regexp,
          before() {
            remove_multiple_dot();
          },
          after(matched_content) {
            if (!matched_content) {
              return undefined;
            }
            const include_chinese = !!matched_content.match(/[\u4e00-\u9fa5]/);
            if (include_chinese) {
              // 存在「一」，判断不了是中文还是日文？
              return {
                skip: true,
              };
            }
            const original_name_index = original_name.indexOf(matched_content);
            // 如果季数在 original_name 前面，original_name 视为无效
            // if (original_name_index === 0) {
            //   return undefined;
            // }
            log("[3.1]the original_name is", original_name, original_name_index);
            if (result.season) {
              const season_index = original_name.indexOf(result.season);
              if (season_index !== -1 && season_index < original_name_index) {
                return {
                  skip: true,
                };
              }
            }
            log("[3.2]the original_name is", original_name, original_name_index);
            if (result.episode) {
              const a = result.episode.match(/[0-9]{1,}/);
              if (!a) {
                return undefined;
              }
              const episode_index = original_name.indexOf(result.episode);
              log("[3.3]the result.episode is", result.episode, episode_index);
              if (episode_index !== -1 && episode_index >= original_name_index) {
                return undefined;
              }
              const episode_index2 = original_name.indexOf(a[0]);
              log("[3.4]the result.episode is", result.episode, episode_index2);
              if (episode_index2 !== -1 && episode_index2 >= original_name_index) {
                return undefined;
              }
              return {
                skip: true,
              };
            }
          },
        },
        {
          key: k("episode_name"),
          regexp: name_regexp,
          before: remove_multiple_dot,
        },
      ];
      return name_extra;
    })(),
  ];
  log("\n");
  log("[0]start apply extra", cur_filename);
  for (let i = 0; i < extra.length; i += 1) {
    const { key, desc, regexp, priority, placeholder, pick = [0], when, before, after } = extra[i];
    if (!cur_filename) {
      break;
    }
    if ([".", "`"].includes(cur_filename)) {
      break;
    }
    const unique = (() => {
      if (desc) {
        return desc;
      }
      // if (key) {
      //   return key;
      // }
      return regexp;
    })();
    log("\n");
    log("[1]extra start", unique, "from", cur_filename);
    // log("[1]start extra content for", chalk.greenBright(unique), "and cur filename is", chalk.blueBright(cur_filename));
    /**
     * 如果重复出现同一个信息，比如 S01E22.第22集，这里「集数」重复出现了
     * 会导致 `第22集` 没有被移除，被下一个正则捕获，出现错误信息。打开后性能也提升没多少，还存在错误信息，干脆关了
     */
    // if (key && result[key]) {
    //   continue;
    // }
    if (before) {
      const r = before();
      log("[2]invoke before fn for", unique, "and result is", r);
      if (r?.skip) {
        continue;
      }
    }
    if (when) {
      const need_match = when();
      if (!need_match) {
        continue;
      }
    }
    const m = cur_filename.match(regexp);
    log("[3]extra result", m);
    if (after) {
      const r = after(
        (() => {
          if (m) {
            return m[0];
          }
          return null;
        })()
      );
      log("[3]invoke after fn for", unique, "and result is", r);
      if (r?.skip) {
        continue;
      }
    }
    if (!m) {
      continue;
    }
    // log("[10]matched content and key", key, m[0]);
    let extracted_content = "";
    for (let i = 0; i < pick.length; i += 1) {
      const index = pick[i];
      const c = m[index];
      let from = cur_filename.indexOf(c);
      if (from === -1 && m.index !== undefined && from >= m.index) {
        from = m.index;
      }
      // log("[4]pick content in", index, "is", c);
      if (m[index] !== undefined) {
        extracted_content += c;
        cur_filename = remove_str(cur_filename, from, c.length, placeholder);
      }
    }
    log("[5]extracted content for", unique, "is", extracted_content);
    if (key && keys.includes(key)) {
      // log("[6]replace value with priority", priority, priorityMap);
      if (!priority) {
        if (priorityMap[key]) {
          continue;
        }
      }
      if (priority) {
        const prevKeyPriority = priorityMap[key];
        if (prevKeyPriority && priority <= prevKeyPriority) {
          continue;
        }
        result[key] = extracted_content;
        priorityMap[key] = priority;
      }
      result[key] = extracted_content;
    }
  }
  // @todo 原产地名称不存在，大概率是中文影片，可以用 name 作为 original_name
  // result.original_name = formatName(latestFilename.trim());
  if (result.season !== undefined) {
    result.season = format_number(result.season);
  }
  if (result.episode !== undefined) {
    result.episode = format_number(result.episode, "E");
  }
  if (result.subtitle_lang !== undefined) {
    result.subtitle_lang = format_subtitle_lang(result.subtitle_lang);
  }
  if (result.resolution) {
    result.resolution = result.resolution.replace(/[（\(\)）]/g, "");
  }
  return result;
}

function format_subtitle_lang(lang: string) {
  if (lang.includes("&")) {
    return lang;
  }
  if (lang.match(/[zZ][hH]|[cC][hH][sS]/)) {
    return "chi";
  }
  if (lang.match(/[zZ][hH]|[cC][hH][tT]/)) {
    return "cht";
  }
  if (lang.match(/[eE][nN][gG]/)) {
    return "eng";
  }
  if (lang === "简英") {
    return "chi&eng";
  }
  return lang;
}

/**
 * 格式化 season 或 episode 数
 * @param number
 * @param prefix
 * @returns
 */
export function format_number(n: string, prefix = "S") {
  const number = n.replace(/\.$/, "");
  // console.log("(format_number) - season", number);
  if (number === "Ⅱ") {
    return "S02";
  }
  if (!number.match(/[0-9]/) && !number.match(/[零一二三四五六七八九十]/)) {
    if (number === "本篇") {
      return "S01";
    }
    if (number === "OVA") {
      return "OVA";
    }
    return number;
  }
  if (number.match(/彩蛋/)) {
    if (!number.match(/[0-9]{1,}/)) {
      return "彩蛋01";
    }
    return number;
  }
  if (number.match(/花絮/)) {
    if (!number.match(/[0-9]{1,}/)) {
      return "花絮01";
    }
    return number;
  }
  if (number.match(/番外/)) {
    if (!number.match(/[0-9]{1,}/)) {
      return "番外01";
    }
    return number;
  }
  if (number.match(/[nN][cC]/)) {
    return number;
  }
  if (number.match(/[cC][mM]/)) {
    return number;
  }
  if (number.match(/[sS][pP]/)) {
    if (!number.match(/[0-9]{1,}/)) {
      // 如果是季，不应该补1？
      return "SP01";
    }
    return number;
  }
  if (number.match(/预告/)) {
    if (!number.match(/[0-9]{1,}/)) {
      return "预告01";
    }
    return number;
  }
  if (number.match(/特别篇/)) {
    if (!number.match(/[0-9]{1,}/)) {
      return "特别篇01";
    }
    return number;
  }
  if (number.match(/[pP][rR]/)) {
    if (!number.match(/[0-9]{1,}/)) {
      return "PR01";
    }
    return number;
  }
  if (number.match(/[eE][pP][0-9]{1,}/)) {
    return number.replace(/[pP]/, "");
  }
  if (number.match(/[sS][eE][0-9]{1,}/)) {
    return number.replace(/[eE]/, "");
  }
  if (number.charAt(0) === "e") {
    return number.replace(/^e/, "E");
  }
  // console.log("[UTILS]format_number before E01-E02");
  // E01-E02
  if (number.match(/[eE][pP]{0,1}[0-9]{1,}-{0,1}[eE]{0,1}[pP]{0,1}[0-9]{1,}/)) {
    const matched = number.match(/[eE][pP]{0,1}([0-9]{1,})-{0,1}[eE][pP]{0,1}([0-9]{1,})/);
    // if (!matched) {
    //   return number;
    // }
    if (matched) {
      return `E${matched[1]}-${matched[2]}`;
    }
  }
  // console.log("[UTILS]format_number before 第01-02话");
  // 第01-02话
  if (number.match(/第[0-9]{1,}-[0-9]{1,}[话集]/)) {
    const matched = number.match(/第([0-9]{1,})-([0-9]{1,})[集话]/);
    if (!matched) {
      return number;
    }
    return `E${matched[1]}-${matched[2]}`;
  }
  // 第01-02话 处理成 E01-E02
  // console.log("[](formatSeason)season");
  const matched = number.match(/[0-9]{1,}/);
  const extra = number.match(/Extended|Complete/);
  if (!matched) {
    const m2 = number.match(/[零一二三四五六七八九十]{1,}/);
    // log("[](formatSeason)matched m2", m2);
    if (!m2) {
      return number;
    }
    const num = chinese_num_to_num(m2[0]);
    const e = `${prefix}${padding_zero(num)}`;
    if (extra) {
      return `${e}.${extra}`;
    }
    return e;
  }
  const num = matched[0];
  const e = `${prefix}${padding_zero(num)}`;
  if (extra) {
    return `${e}.${extra}`;
  }
  return e;
}

export function has_key_factory(keys: VideoKeys[]) {
  return (key: VideoKeys) => {
    if (keys.includes(key)) {
      return key;
    }
    return undefined;
  };
}

export function is_japanese(text: string) {
  const chinese_char = text.match(/[\u4e00-\u9fff]/g) || [];
  const japanese_char = text.match(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/g) || [];
  if (japanese_char.length > chinese_char.length) {
    return true;
  }
  return false;
}
export function is_korean(text: string) {
  const chinese_char = text.match(/[\u4e00-\u9fff]/g) || [];
  const korean_char = text.match(/[\uac00-\ud7a3]/g) || [];
  if (korean_char.length > chinese_char.length) {
    return true;
  }
  return false;
}
