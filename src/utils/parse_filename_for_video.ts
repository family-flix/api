import { video_file_type_regexp, remove_str, chinese_num_to_num, padding_zero, season_to_num } from "./index";
import { get_first_letter } from "./pinyin";

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
  voice_type: "语言",
  /**
   * chi 中文
   * eng 英文
   * jpn 日文
   */
  subtitle_lang: "字幕语言",
  air_date: "发布时间",
  extra1: "额外信息1",
  extra2: "额外信息2",
  extra3: "额外信息3",
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
    if (!filename.includes("盗钥匙")) {
      return;
    }
    // console.log(...args);
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
  const k = has_key_factory(VIDEO_ALL_KEYS);
  // 做一些预处理
  // 移除 [name][] 前面的 [name]，大部分日本动漫前面的 [name] 是发布者信息
  log("filename is", filename);
  let original_filename = filename
    .trim()
    .replace(/(第 ){0,1}([2][0-3][0-9]{2})-{0,1}([0-2][0-9])-{0,1}([0-3][0-9]) 期/, "$2$3$4期")
    .replace(/^\[[a-zA-Z0-9&-]{1,}\]/, ".")
    .replace(/^\[[^\]]{1,}\](?=\[)/, "")
    .replace(/^【[^】0-9]{1,}】/, "")
    .replace(/\.[1-9]{1}[+-][1-9]{1,}\./, ".")
    // 移除零宽空格
    .replace(/\u200B/g, "")
    // 在 小谢尔顿S01E01 这种 S01E01 紧跟着名字后面的场景，前面加一个符号来分割
    .replace(/(?=[sS][0-9]{2}[eE][0-9]{2})([sS][0-9]{2}[eE][0-9]{2})/, ".$1")
    .replace(/_([0-9]{1,3})_/, ".E$1.");
  const special_season_with_number_regexp = /(^|[^a-zA-Z])([sS][pP])([0-9]{1,})($|[^a-zA-Z])/;
  if (original_filename.match(special_season_with_number_regexp)) {
    // name.SP2 改成 name.SP.E2
    original_filename = original_filename.replace(special_season_with_number_regexp, "$1.SP.E$3.$4");
  }
  original_filename = original_filename
    .replace(/^\./, "")
    .replace(/ - /g, ".")
    .replace(/第 {1,}([0-9]{1,}) {1,}[集話话]/, "第$1集")
    .replace(/[ _丨]/g, ".")
    .replace(/^\[无字\]/, "")
    .replace(/\]\[/, ".")
    .replace(/[【】《》「」\[\]]{1,}/g, ".")
    .replace(/^\./, "")
    .replace(/^\(([0-9]{1,})\)/, "E$1.")
    .replace(/\+{1,}/g, ".")
    // .replace(/(^[\u4e00-\u9fa5]{1,})([0-9]{1,})(\.[a-zA-Z]{1,}[0-9a-zA-Z]{1,}$)/, (matched, p1, p2, p3) => {
    //   return (
    //     p1 +
    //     "." +
    //     (() => {
    //       if (p2.length < 2) {
    //         return "0" + p2;
    //       }
    //       return p2;
    //     })() +
    //     p3
    //   );
    // })
    .replace(/(https{0,1}:){0,1}(\/\/){0,1}[0-9a-zA-Z]{1,}\.(com|cn)\b/, "")
    // 移除 28(1) 后面的 (1)。这种紧着在字符后的。如果是 S01 (1) 中的 1 视为剧集数
    .replace(/([^.(]{1})\([0-9]{1,}\)/, "$1.")
    .replace(/(\.){2,}/g, ".");
  // const special_season_regexp = /(^|[^a-zA-Z])([sS][pP])($|[^a-zA-Z])/;
  log("before custom parse", original_filename);
  for (let i = 0; i < extra_rules.length; i += 1) {
    (() => {
      const rule = extra_rules[i];
      const { replace } = rule;
      try {
        // log("before apply parse", replace[0]);
        const regexp = new RegExp(replace[0]);
        if (!original_filename.match(regexp)) {
          return;
        }
        // log("apply custom parse", regexp, replace[1]);
        if (replace[1] === "ORIGINAL_NAME") {
          if (!keys.includes("original_name")) {
            return;
          }
          const r = original_filename.match(regexp);
          if (r) {
            result["original_name"] = r[0];
            original_filename = original_filename.replace(r[0], "");
            return;
          }
        }
        if (replace[1] === "NAME") {
          if (!keys.includes("name")) {
            return;
          }
          const r = original_filename.match(regexp);
          log("[]NAME rule", r);
          if (r) {
            result["name"] = r[0];
            original_filename = original_filename.replace(r[0], "");
            return;
          }
        }
        if (replace[1] === "EMPTY") {
          original_filename = original_filename.replace(regexp, "");
          return;
        }
        original_filename = original_filename.replace(regexp, replace[1]);
      } catch (err) {
        // replace[0] 可能不是合法的正则
      }
    })();
  }
  log("after  custom parse", original_filename);
  let cur_filename = original_filename;
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
  // 制作组
  const publishers = [
    "-Huawei",
    "FRDS",
    "￡{0,1}cXcY@FRDS",
    "MediaClub",
    "-Yumi@FRDS",
    "-BlackTV",
    "-HotWEB",
    "-SeeWEB",
    "-HDSWEB",
    "-HDCTV",
    "-HaresWEB",
    "-PTerWEB",
    "-BtsTV",
    "-Vampire",
    "-NGB",
    "-DHTCLUB",
    "-OurTV",
    "-TrollHD",
    "-CtrlHD",
    "rartv",
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
    "-7SINS",
    "ATV",
    "HQC",
    "Mp4Ba",
    "-Amber",
    "-HeiGuo",
    "-Nanzhi",
    "-SciSurf",
    "-orpheus",
    "-BS666",
    "GM-Team",
    "-52KHD",
    "-SXG",
    "-BestWEB",
    "BDE4",
    "DBD制作组&离谱Sub.",
    "艺声译影",
    "推しの子",
    "傅艺伟",
    "人人影视",
    "Shimazu",
    "BOBO",
    "VCB-Studio",
    "GOTV-TS",
    "\\btvr",
    "\\btri",
    "xtm.dvd-halfcd2.",
    "BeanSub&FZSD&LoliHouse",
    "BeanSub&FZSD",
    "BeanSub",
  ]
    .map((s) => `${s}`)
    .join("|");
  // 分发
  const publishers2 = [
    "Tacit0924",
    "-{0,1}SuperMiao",
    "蓝色狂想",
    "蓝色狂想制作",
    "tv综合吧",
    "tvzongheba",
    "MyTVSuper",
    "SS的笔记",
    "FLTTH",
    "\\bBOBO",
    "\\bProf\\b",
    "CYW",
    "Ma10p",
  ]
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
    {
      regexp: /[生熟]肉/,
    },
    // 奇怪的冗余信息
    {
      regexp:
        /超前点[映播]|超前[0-9]{1,}-[0-9]{1,}|超前[0-9]{0,}集{0,1}完结|点映礼|[bB]站logo|Remux|^备份$|[\u4e00-\u9fa5]{1,}节限定/,
    },
    {
      regexp: /（[^）]{1,}）$/,
    },
    {
      regexp: /E[0-9]{1,}(修正)/,
      pick: [1],
    },
    {
      regexp: /^[tT][oO][pP][0-9]{1,}\./,
    },
    {
      key: k("episode"),
      // 20190503 完整年月日视为综艺剧集数
      regexp: /\.[123][0-9]{3}[01][0-9][0123][0-9]\./,
      placeholder: ".",
    },
    {
      regexp: /(\.(?=[A-Z0-9]{1,}[0-9])[A-Z0-9]{8})\./,
      pick: [1],
    },
    {
      regexp: /_File|HDJ|RusDub|Mandarin|百度云盘下载|主演团陪看|又名|超前点播直播现场/,
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
      regexp: /repack|REMUX/,
    },
    // 流媒体平台
    {
      regexp: /AMZN|ATVP|NF|Netflix|DSNP|iQIYI|HunanTV|\bCCTV[1-9]{0,2}|YYeTs|陕艺|JSTV\.{0,1}|江苏卫视\.{0,1}|[bB]站/,
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
      regexp: /2[ch]{2,}/,
    },
    {
      key: k("subtitle_lang"),
      regexp: /([cChHtTsiISeEnNgG]{2,}&[cChHtTsiISeEnNgG]{2,}|简英)\./,
      pick: [1],
    },
    {
      key: k("subtitle_lang"),
      regexp: /[^a-z]([zZ][hH]|[cC][hH][iIsStT]|[eE][nN][gG])\./,
      pick: [1],
    },
    // 一些国产剧影片特有的信息？
    {
      /**
       * 最前面方便排序用的 影片首字母拼音 大写英文字母。只有该字母后面跟着中文，才会被处理
       * 如 `M 魔幻手机`，会变成 `魔幻手机`
       * `A Hard Day's Night` 不会被处理，仍保留原文
       * 如果是 S熟年 这种，仍保留原文
       */
      regexp: /^[A-Za-z]{1}(\.| |-|（|）|⌒|·|★)(?=[\u4e00-\u9fa5]{1,})/,
    },
    {
      regexp: /含[\u4e00-\u9fa5]{1,}[0-9]{1,}部全系列/,
    },
    {
      regexp: /含[\u4e00-\u9fa5]{1,}篇/,
    },
    {
      // 多少集，包含「更新中」信息
      // key: k("episode_count"),
      regexp: /([0-9]{1,}集){0,1}((持续){0,1}更新中|[已全]\.{0,1}完结)/,
    },
    {
      regexp: /默认|付费|去除|保留|官方|流媒体|公众号[:：]{0,1}/,
    },
    {
      regexp: /杜比音效/,
    },
    {
      regexp: /[多双粤国英]{1,}[语言音]{1,}[轨频]/,
    },
    {
      key: k("voice_type"),
      regexp:
        /[英国國粤日][语語配](中字|繁字|无字|内嵌){0,1}版{0,1}|繁体中字|双语中字|中英双字|[国粤韩英日中德]{1,3}[双三][语轨]|双语源码|上海话/,
      placeholder: ".",
    },
    {
      regexp: /中字|双字/,
    },
    {
      regexp: /([韩][语語]){0,1}[简官繁]中/,
    },
    {
      regexp: /[简繁]体/,
    },
    {
      regexp: /\([0-9]{4,}\)/,
    },
    {
      regexp: /\.{0,1}[0-9]{1,}(end)/,
      pick: [1],
    },
    {
      // 字幕及其语言
      regexp:
        /(内封|内嵌|外挂){0,1}[简繁中英多双]{1,}[文语語]{0,1}字幕|无字|(内封|内嵌|内挂|无|[软硬])字幕版{0,1}|(内封|内嵌|外挂)(多国){0,1}字幕|(内封|内嵌|外挂)[简繁中英][简繁中英]|(内封|内嵌|外挂)/,
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
      regexp: /高清|超清|超高清|原码率\.{0,1}|小体积\.{0,1}/,
    },
    {
      regexp: /[1-9][0-9]{0,}分钟版/,
    },
    {
      regexp: /单集[0-9]{1,}[gG][bB]/,
    },
    {
      regexp: /重[置制]版/,
    },
    {
      regexp: /版本[1-9]{1,}/,
    },
    {
      regexp: /(压缩|会员|宝藏|等)版本{0,1}/,
    },
    {
      regexp: /会员plus版|高内存版/,
    },
    {
      regexp: /CCTV\.Version/,
    },
    {
      regexp: /[pP][aA][rR][tT]\.{0,1}[1-9]{1}(\.|$)/,
    },
    {
      regexp: /高码[率]{0,1}|修复版{0,1}|[0-9]{1,}重[置制]版\.{0,1}/,
    },
    {
      regexp: /多语版|网络版|劇場版|合成版|连续剧版|亚马逊版|迪士尼版|\.Extended/,
    },
    {
      regexp: /[俄]版/,
    },
    {
      regexp: /([0-9]{1,}部){0,1}剧场版/,
    },
    {
      regexp: /无台标(水印版){0,1}/,
    },
    {
      regexp: /无水印|三无|[无未]删减|正片/,
    },
    {
      key: k("extra1"),
      regexp: /去片头片尾/,
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
      key: k("extra1"),
      regexp: /纯享版/,
      before() {
        cur_filename = cur_filename.replace(/（{0,1}纯享版）{0,1}/, ".纯享版.");
      },
    },
    {
      key: k("extra1"),
      regexp: /纯享/,
    },
    {
      key: k("extra2"),
      regexp: /加长版|plus版/,
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
      regexp: /（{0,1}僅限港澳台地區）{0,1}/,
    },
    {
      regexp: /(完整){0,1}全集/,
    },
    {
      regexp: /国漫|[0-9]{1,}年日剧\.{0,1}/,
    },
    {
      regexp: /[泰]剧\.{0,}/,
    },
    {
      regexp: /[0-9]{1,}集特别版/,
    },
    {
      regexp: /[0-9]{1,}部MV/,
    },
    {
      regexp: /高分(战争|爱情|悬疑)剧/,
    },
    {
      regexp: /豆瓣[0-9\.]{1,}分{0,1}/,
    },
    // 总大小信息
    {
      regexp: /【{0,1}[0-9]{1,5}(\.[0-9]{1,5}){0,1}([gG]|[mM])[bB]{0,1}】{0,1}\.{0,1}$/,
    },
    {
      regexp: /[nN][oO]\.[0-9]{1,}｜{0,1}/,
    },
    {
      regexp: /^№[0-9]{1,}\.{1,}/,
    },
    { regexp: /GB/ },
    // 剧集的额外信息
    {
      // remastered 是指重发版？
      regexp: /REMASTERED/,
    },
    /**
     * ----------------------- 分辨率 start -----------------------
     */
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
    {
      regexp: /[hH][qQ]/,
    },
    {
      regexp: /[vV][cC]-1\b/,
    },
    {
      key: k("resolution"),
      regexp: /([hHbB][dD]){0,1}\.{0,1}[0-9]{3,4}\.{0,1}[xX×]\.{0,1}[0-9]{3,4}/,
    },
    {
      key: k("resolution"),
      regexp: /HD(360|720|1080|2160)[pP]{0,1}(×265){0,1}/,
    },
    {
      key: k("resolution"),
      regexp: /（{0,1}(360|720|1080|2160)[pPiI]）{0,1}/,
    },
    {
      regexp: /[0-9]{1,}(帧|[fF][pP][sS])/,
    },
    {
      key: k("resolution"),
      regexp: /[hH][dD]1080[pP]/,
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
      desc: "总集数4",
      regexp: /[0-9]{1,}-[0-9]{1,}[集話话]全/,
    },
    {
      desc: "总集数3",
      regexp: /([0-9]{1,})[集話话]全/,
    },
    // 编码方式
    {
      key: k("encode"),
      // 能处理 HD4K、HD265 这种异常数据
      regexp: /[xX]{0,1}[hH]{0,1}[dD]{0,1}\.26[45]{1}(_FLAC){0,1}/,
      before() {
        cur_filename = cur_filename.replace(/([xX]26[45])\.(FLAC)/, "$1_$2");
      },
    },
    {
      key: k("encode"),
      regexp: /[xXhH]26[45]{1}/,
    },
    // AVC 是编解码器，8位深度
    {
      regexp: /AVC-[0-9]{1,}Bit/,
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
    {
      regexp: /[1-9]Audios/,
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
    },
    {
      regexp: /[dD]olby/,
    },
    {
      key: k("voice_encode"),
      regexp: /[eE]{0,1}[aA][cC]3/,
    },
    {
      key: k("voice_encode"),
      regexp: /DTS-{0,1}HD([\.-]MA){0,1}(\.5\.1){0,1}/,
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
      key: k("voice_encode"),
      regexp: /TrueHD\.7\.1/,
    },
    {
      key: k("episode"),
      // 第1-20集
      regexp: /第[0-9]{1,}-[0-9]{1,}[集話话]/,
    },
    {
      regexp: /^[0-9]{1,}-[1-9][0-9]{0,}$/,
      after() {
        // @todo 这里很纠结，存在 综艺剧集数 01-20.mp4 这种情况，所以只有是文件夹时才将 01-20 视为剧集总数，否则就忽略
        if (result.type) {
          return { skip: true };
        }
      },
    },
    // 总季数，要放在「中文名称」前面
    {
      desc: "总季数1",
      // 1-3 季
      regexp: /([1-9]{1,}[-+][1-9]{1,})[季部][全]{0,1}/,
    },
    {
      regexp: /前[1-9]{1,2}季/,
    },
    {
      key: k("season"),
      regexp: /第[0-9]{1,}[季]/,
      before() {
        cur_filename = cur_filename.replace(/(第[1-9]{1,}[季])([0-9]{1,})/, "$1.E$2");
      },
    },
    /**
     * ----------------------- 季 start -----------------------
     */
    {
      key: k("season"),
      desc: "special season1",
      regexp: /本篇|完结篇|\bOVA([^编編篇]{1,}[编編篇]){0,1}|特典映像|番外篇|特辑篇|PV|泡面番/,
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
        // 如果非 name.SP.episode 这种，而是在名称中包含 sp 的单词，就跳过
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
      regexp: /（[一二三四五六七]{1,}）/,
      placeholder: ".",
    },
    {
      key: k("season"),
      regexp: /\bVI{1,3}\b|\bIX|\bIV|\bIII|Ⅱ|\bII/,
    },
    {
      key: k("season"),
      regexp: /\.(X)\.[^a-zA-Z]/,
      pick: [1],
    },
    {
      key: k("season"),
      regexp: /[sS][eE]{0,1}[0-9]{1,}/,
    },
    {
      key: k("season"),
      regexp: /season\.V/,
    },
    /**
     * ------------------------ 提取集数1 episode1 start -----------------------
     */
    // 综艺
    {
      key: k("episode"),
      // 1020.2012 月日.年
      regexp: /[01][0-9][0123][0-9]\.[123][0-9]{3}/,
    },
    {
      key: k("episode"),
      regexp: /[0-9]{4,8}\.{0,1}-{0,1}慢{0,1}直播(第[0-9]{1,}[期局场]){0,1}/,
      before() {
        if (cur_filename.match(/[0-9]{1,}[期局场]：/)) {
          cur_filename = cur_filename.replace(/([0-9]{1,}[期局场])：/, "$1.");
        }
      },
    },
    {
      key: k("episode"),
      regexp: /[0-9]{4,8}\.{0,1}-{0,1}Plus\.{0,1}(第[0-9]{1,}[期局场]){0,1}/,
    },
    {
      key: k("episode"),
      regexp: /[0-9]{4,8}\.{0,1}-{0,1}(独家){0,1}直拍(第[0-9]{1,}[期局场]){0,1}/,
    },
    {
      key: k("episode"),
      regexp: /[0-9]{4,8}\.{0,1}-{0,1}(特别企划|加更版|先导片|彩蛋|超前营业)(第[0-9]{1,}[期局场]){0,1}/,
    },
    {
      key: k("episode"),
      regexp: /第{0,1}[12][0-9]{3}[012][0-9][0123][0-9]期/,
      priority: 1,
    },
    {
      key: k("episode"),
      // 2012.05.01 05.01  和下面的区别就是 月，这里匹配 1-9 月下面的匹配 10-12 月
      regexp: /^([123][0-9]{1,4}[-.年]{0,1}){0,1}0[1-9][-.月]{0,1}[0-3][0-9][期局场]{0,1}-{0,1}\.{0,1}[上下]{0,1}/,
    },
    {
      key: k("episode"),
      // 2012.10.01 12.10.01 10.01
      regexp: /^([123][0-9]{1,4}[-.年]{0,1}){0,1}1[0-2][-.月]{0,1}[0-3][0-9][期局场]{0,1}-{0,1}\.{0,1}[上下]{0,1}/,
    },
    {
      key: k("episode"),
      regexp: /第{0,1}[123][0-9]{7}\.{0,1}[上下]{0,1}[期局场]{0,1}/,
      before() {
        if (cur_filename.match(/[123][0-9]{7}\.{0,1}-{0,1}期：/)) {
          cur_filename = cur_filename.replace(/期：/, "期.");
        }
      },
    },
    {
      key: k("episode"),
      regexp: /第[01][0-9]\.{0,1}[123][0-9][期局场]/,
    },
    {
      key: k("episode"),
      regexp: /第{0,1}[0-9]{1,}[期局场][.-]{0,1}[上下]/,
      priority: 1,
      before() {
        const regexp = /第{0,1}[0-9]{1,}[期局场][.-]{0,1}[上下]/;
        if (result.episode && result.episode.match(/^[0-9]{4,8}/)) {
          if (cur_filename.match(regexp)) {
            cur_filename = cur_filename.replace(regexp, "");
          }
          return {
            skip: true,
          };
        }
      },
    },
    {
      key: k("episode"),
      regexp: /第{0,1}[0-9]{1,}[期局场]\.{0,1}\([上下]\)/,
      priority: 1,
      // before() {
      //   const regexp = /第{0,1}[0-9]{1,}[期局场][.-]{0,1}[上下]/;
      //   if (result.episode && result.episode.match(/^[0-9]{4,8}/)) {
      //     if (cur_filename.match(regexp)) {
      //       cur_filename = cur_filename.replace(regexp, "");
      //     }
      //     return {
      //       skip: true,
      //     };
      //   }
      // },
    },
    // {
    //   key: k("episode"),
    //   regexp: /第{0,1}[0-9]{1,}[期局场]\.{0,1}加更/,
    // },
    {
      key: k("episode"),
      regexp: /第{0,1}[0-9]{1,}[期局场]/,
      before() {
        // log("------------");
        // log(result.episode);
        const regexp = /第{0,1}[0-9]{1,}[期局场]/;
        if (result.episode && result.episode.match(/^[0-9]{4,8}/)) {
          if (cur_filename.match(regexp)) {
            cur_filename = cur_filename.replace(regexp, "");
          }
          return {
            skip: true,
          };
        }
        // 前面一个 第9期上：医学生花式宣讲 将前面的 ： 替换成 . 否则就识别成电视剧名称了
        cur_filename = cur_filename.replace(/^[：:]/, ".");
      },
    },
    {
      key: k("episode"),
      regexp: /(特别|超前)企划/,
    },
    {
      key: k("episode"),
      regexp: /集结篇：{0,1}[^$]{1,}/,
    },
    {
      key: k("episode"),
      regexp: /先导片：{0,1}[^$]{1,}/,
    },
    {
      key: k("episode"),
      regexp: /[123][0-9]{1,3}[-.][01][0-9][-.][0-3][0-9]/,
    },
    {
      key: k("episode"),
      regexp: /[123][0-9]{1,3}[01][0-9][0123][0-9][局期]{0,1}/,
    },
    // 电视剧
    {
      key: k("episode"),
      // NCOP 表示片头曲？NCED 表示片尾曲？
      regexp: /\b([nN][cC][eEoO][dDpP][0-9]{0,})/,
      pick: [1],
    },
    {
      key: k("episode"),
      // CM05 表示广告？
      regexp: /[cC][mM][0-9]{1,}/,
    },
    {
      key: k("episode"),
      regexp: /^[01][0-9][0123][0-9](-|$)/,
      before() {
        cur_filename = cur_filename.replace(/^\.{2,}/, "").replace(/\.{1,}$/, "");
      },
    },
    {
      key: k("episode"),
      regexp: /^[0-9]{1,3}(-|$)/,
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
      regexp: /预告[0-9]{0,}/,
    },
    {
      key: k("episode"),
      regexp: /续集|特辑|OAD\.{0,1}[0-9]{1,}|彩蛋[0-9]{0,}|花絮[0-9]{0,}|番外[0-9]{0,}|BONUS|[pP][rR][0-9]{0,}[\.$]/,
      placeholder: ".",
      priority: -1,
    },
    {
      key: k("episode"),
      regexp: /第[\u4e00-\u9fa5]{1,}[集話话期局场]/,
      priority: 1,
    },
    {
      key: k("episode"),
      // 这里之所以可能出现 第.55.集 这种情况是最开始将「空格」替换成了 . 符号
      regexp: /第{0,1}[0-9]{1,}[集話话期局场]/,
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
      regexp: /\b([eE][pP]{0,1}[0-9]{1,}[上下]{0,1})/,
      pick: [1],
    },
    {
      key: k("episode"),
      regexp: /([0-9]{1,})[vV][234]/,
      pick: [1],
      before() {
        const r = /([0-9]{1,})[vV][234]/;
        if (cur_filename.match(r)) {
          cur_filename = cur_filename.replace(/[vV][234]/, "");
        }
      },
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
      before() {
        // 2001三少爷的剑31.mkv 处理成 三少爷的剑.2001.31.mkv
        cur_filename = cur_filename.replace(/([123][0-9]{3})([\u4e00-\u9fa5]{2,})([0-9]{1,})$/, "$2.$1.$3.$4");
      },
    },
    // {
    //   // 针对国产剧，有一些加在名称后面的数字表示季，如 还珠格格2、欢乐颂3_01
    //   key: k("season"),
    //   regexp: /[\u4e00-\u9fa5]{1,}(0{0,1}(?!0)[1-9]{1,2}[:：]{0,1})(\.|$|-)/,
    //   priority: 1,
    //   pick: [1],
    // },
    {
      key: k("name"),
      regexp: /^[a-zA-Z：]{1,}[\u4e00-\u9fa5]{1,}/,
      after(matched) {
        const episode_index = result.episode ? original_filename.indexOf(result.episode) : -1;
        const name_index = matched ? original_filename.indexOf(matched) : -1;
        // log("--------- need skip name ------", name_index, episode_index, result.episode);
        if (episode_index !== -1 && name_index !== -1 && name_index > episode_index) {
          return {
            skip: true,
          };
        }
      },
    },
    {
      // 日文名称
      key: k("name"),
      desc: "japanese name",
      regexp:
        /^\[{0,1}[0-9]{0,}([\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff][0-9a-zA-Z\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff，：！· ]{0,}[0-9a-zA-Z\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff！])\]{0,1}/,
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
        const i = original_filename.indexOf(matched_content);
        // 如果季数在 name 前面 name 视为无效
        log("[japanese-name]compare season position", original_filename.indexOf(result.season), i);
        if (result.season && original_filename.indexOf(result.season) < i) {
          return {
            skip: true,
          };
        }
        if (result.episode && original_filename.indexOf(result.episode) < i) {
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
        /^\[{0,1}[0-9]{0,}([\u4e00-\u9fa5][0-9a-zA-Z\u4e00-\u9fa5！：，（）～~“”,·、■（）]{0,}[0-9a-zA-Z\u4e00-\u9fa5！：，（）～！“”])\]{0,1}/,
      before() {
        // 把 1981.阿蕾拉 这种情况转换成 阿蕾拉.1981
        const r1 = /^([12][0-9]{3}\.{1,})([\u4e00-\u9fa5A-Za-z0-9！：，（）～~“”,·、■.-]{1,})/;
        // 针对 1883 这个剧特殊处理？？1883.2002 这样的名字，1883 是剧名
        // const r2 = /([12][01789][0-9]{2})\.{0,}[12][01789][0-9]{2}/;
        // if (cur_filename.match(r2)) {
        //   result.name = cur_filename.match(r2)![1];
        //   return;
        // }
        if (cur_filename.match(r1)) {
          cur_filename = cur_filename.replace(r1, "$2.$1");
        }
        // const r2 = /^([0-9]{4}\.{1,})([\u4e00-\u9fa5A-Za-z！，：·、■（）]{1,})/;
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
      after(v) {
        log("[3.1]need skip extracted chinese name3", result.episode, result.name, v);
        if (result.episode) {
          result.episode = result.episode.replace(/^\.{1,}/, "").replace(/\.{1,}$/, "");
          if (v) {
            const name_index = filename.indexOf(v);
            const episode_index = filename.indexOf(result.episode);
            log("[3.2]need skip extracted chinese name3", name_index, episode_index);
            if (name_index !== -1 && episode_index !== -1 && name_index > episode_index) {
              return {
                skip: true,
              };
            }
          }
        }
      },
    },
    {
      key: k("name"),
      desc: "chinese name4",
      // 字母开头，如 Doctor异乡人
      regexp: /^[A-Za-z]{1,}\.{0,1}[A-Za-z0-9\u4e00-\u9fa5！：，（）～~“”-]{1,}[\u4e00-\u9fa5！：，（）～~“”-]{1,}/,
      // regexp: /^[A-Za-z]{1,}[0-9\u4e00-\u9fa5！，.-]{1,}[\u4e00-\u9fa5-]{1,}/,
      after(matched) {
        const episode_index = result.episode ? original_filename.indexOf(result.episode) : -1;
        const name_index = matched ? original_filename.indexOf(matched) : -1;
        // log("--------- need skip name ------", name_index, episode_index, result.episode);
        if (episode_index !== -1 && name_index !== -1 && name_index > episode_index) {
          return {
            skip: true,
          };
        }
        if (!matched?.match(/[\u4e00-\u9fa5]/)) {
          return { skip: true };
        }
        // if (!matched?.match(/[\u4e00-\u9fa5]/) && !result.name && !result.original_name) {
        //   // 英文名在中文名前面，这里可以处理，但是会影响其他场景
        //   const r = cur_filename.match(/([-A-Za-z~“”.]{1,})([\u4e00-\u9fa5]{1,})/);
        //   if (r) {
        //     result.name = r[2].replace(/\.{1,}/, "");
        //     result.original_name = r[1].replace(/\.{1,}/, "");
        //   }
        //   return {
        //     skip: true,
        //   };
        // }
      },
    },
    {
      key: k("name"),
      desc: "chinese name4",
      // 数字开头，如 1840~两个人的梦想与恋爱~
      regexp: /^[0-9]{1,}[A-Za-z0-9\u4e00-\u9fa5！：，（）～~-]{1,}[\u4e00-\u9fa5！：，（）～~-]{1,}/,
      // after() {
      //   if (cur_filename.match(/\.[0-9]{1,}\./)) {
      //     // 提取到名字后，可能剩下 .8.mp4 这种，可以将 8 视为集数
      //     cur_filename = cur_filename.replace(/^\.([0-9]{1,})\./, ".E$1.");
      //   }
      // },
    },
    // {
    //   key: k("name"),
    //   desc: "chinese name5",
    //   regexp: /^[\u4e00-\u9fa5]{1,}[\u4e00-\u9fa5！：，（）～~-]{1,}/,
    // },
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
      regexp: /[123][0-9]{3}[-\/][0-9]{1,2}[-\/][0-9]{1,2}/,
    },
    {
      key: k("year"),
      regexp: /[(（]{0,1}[123]{1}[0-9]{3}[）)]{0,1}年{0,1}/,
    },
    {
      key: k("year"),
      regexp: /^[12][0-9]{3}/,
    },
    // 影片来源
    {
      key: k("source"),
      regexp: /(HMAX){0,1}[wW][eE][bB](-IMAX){0,1}(-HR){0,1}([Rr][i][p]){0,1}(-{0,1}[dD][lL]){0,1}/,
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
      regexp: /[0-9]{1,}[bB][iI][tT]/,
    },
    {
      //  Subtitles for the deaf and hard of hearing (SDH)
      regexp: /Eng\.SubEngSDH/,
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
        // if (/\{\{[^\{]{1,}\}\}/.test(cur_filename)) {
        //   return;
        // }
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
      regexp: /^\.([0-9]{1,})\./,
      pick: [1],
    },
    {
      key: k("episode"),
      regexp: /Episode\.[0-9]{1,}/,
    },
    {
      key: k("episode"),
      regexp: /\.[（(]([0-9]{1,})[)）]/,
      pick: [1],
    },
    {
      key: k("episode"),
      regexp: /([eE][pP]{0,1}[0-9]{1,})/,
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
        /[0-9a-zA-Z\u4e00-\u9fa5\u0400-\u04FF\uAC00-\uD7A3\u0800-\u4e00]{1,}[ \.\-&!,'（）：！？～×－0-9a-zA-Z\u4e00-\u9fa5\u0400-\u04FF\uAC00-\uD7A3\u0800-\u4e00]{1,}[）0-9a-zA-Z!！？－\u4e00-\u9fa5\u0400-\u04FF\uAC00-\uD7A3\u0800-\u4e00]/;
      const remove_multiple_dot = () => {
        // log("[6.0]before original_name or episode name", cur_filename);
        // 后面的 ` 符号特意用一个生僻字符做「占位」
        cur_filename = cur_filename.replace(/[\.]{2,}/g, "`").replace(/^\.{0,1}/, "");
        // if (/\{\{[^\{]{1,}\}\}/.test(cur_filename)) {
        //   cur_filename = cur_filename.replace(/\{\{/, "").replace(/\}\}/, "");
        // }
        // log("[6]after original_name or episode name", cur_filename);
      };
      const name_extra: ExtraRule[] = [
        {
          key: k("original_name"),
          regexp: name_regexp,
          priority: -1,
          before() {
            remove_multiple_dot();
          },
          after(matched_content) {
            if (!matched_content) {
              return undefined;
            }
            const include_chinese = !!matched_content.match(/[\u4e00-\u9fa5]/);
            // const include_japanese = matched_content.match(/[\u0800-\u4e00]/);
            // const include_korean = matched_content.match(/[\uAC00-\uD7A3]/);
            // if (include_japanese) {
            //   log("[3.11]include_japanese");
            //   return {
            //     skip: false,
            //   };
            // }
            // if (include_korean) {
            //   log("[3.12]include_korean");
            //   return {
            //     skip: false,
            //   };
            // }
            if (include_chinese) {
              // 存在「一」，判断不了是中文还是日文？
              return {
                skip: true,
              };
            }
            const original_name_index = original_filename.indexOf(matched_content);
            // 如果季数在 original_name 前面，original_name 视为无效
            // if (original_name_index === 0) {
            //   return undefined;
            // }
            log("[3.1]the original_name is", original_filename, original_name_index);
            if (result.season) {
              const season_index = original_filename.indexOf(result.season);
              // log("[3.1.2]the original_name is", season_index, original_name_index);
              if (season_index !== -1 && season_index < original_name_index) {
                return {
                  skip: true,
                };
              }
            }
            log("[3.2]the original_name is", original_filename, original_name_index);
            if (result.episode) {
              const a = result.episode.match(/[0-9]{1,}/);
              if (!a) {
                return undefined;
              }
              const episode_index = original_filename.indexOf(result.episode);
              log("[3.3]the result.episode is", result.episode, episode_index);
              if (episode_index !== -1 && episode_index >= original_name_index) {
                return undefined;
              }
              const episode_index2 = original_filename.indexOf(a[0]);
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
          key: k("original_name"),
          regexp: /^([a-zA-Z-!]{1,}\.{1}){1,}[a-zA-Z-!]{1,}(\.|$)/,
          priority: -1,
          before() {
            cur_filename = cur_filename.replace(/`$/, "");
          },
          after(matched_content) {
            if (!matched_content) {
              return undefined;
            }
            const original_name_index = original_filename.indexOf(matched_content);
            // 如果季数在 original_name 前面，original_name 视为无效
            // if (original_name_index === 0) {
            //   return undefined;
            // }
            log("[3.1]the original_name is", original_filename, original_name_index);
            if (result.season) {
              const season_index = original_filename.indexOf(result.season);
              // log("[3.1.2]the original_name is", season_index, original_name_index);
              if (season_index !== -1 && season_index < original_name_index) {
                return {
                  skip: true,
                };
              }
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
      // log("[3]invoke after fn for", unique, "and result is", r);
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
    log("[5]extracted content for", unique, "is", extracted_content, `key: ${key}`, `priority: ${priority}`);
    if (key && VIDEO_ALL_KEYS.includes(key)) {
      // log("[6]replace value with priority", priority, priorityMap);
      if (!priority) {
        if (priorityMap[key]) {
          continue;
        }
      }
      // log("[5.1]compare priority", extracted_content, priority, priorityMap);
      if (priority === -1 && result[key]) {
        // -1 优先级最低，如果之前匹配到了，就忽略这次匹配到的
        continue;
      }
      if (priority !== undefined) {
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
  if (result.season) {
    result.season = format_season_number(result.season);
  }
  if (result.episode) {
    result.episode = format_episode_number(result.episode, {
      log,
    });
  }
  if (result.original_name && result.original_name.match(/\.$/)) {
    result.original_name = result.original_name.replace(/\.$/, "");
  }
  // log("[------]update name with season number", result.season, `[${result.episode}]`, `[${result.type}]`);
  if (result.season && !result.episode && result.type) {
    // 有季没有集，而且是文件，很可能是电影续集
    const season_number = season_to_num(result.season);
    result.season = "";
    if (result.name) {
      if (!result.name.match(new RegExp(`${season_number}$`))) {
        // 如果结尾已经拼好了，就不用重复拼接
        result.name = `${result.name}${season_number}`;
      }
    }
    if (result.original_name) {
      if (!result.original_name.match(new RegExp(`${season_number}$`))) {
        result.original_name = `${result.original_name}${season_number}`;
      }
    }
  }
  if (!result.season && result.episode) {
    result.season = maybe_other_season(result.episode);
  }
  if (result.subtitle_lang !== undefined) {
    result.subtitle_lang = format_subtitle_lang(result.subtitle_lang);
  }
  if (result.resolution) {
    result.resolution = result.resolution
      .replace(/[（\(\)）]/g, "")
      .replace(/^\./g, "")
      .replace(/\.$/g, "");
  }
  if (result.voice_type) {
    result.voice_type = result.voice_type.replace(/^\./g, "");
  }
  if (result.extra1) {
    if (result.extra1 === "去片头片尾") {
      result.extra1 = "纯享版";
    }
    if (result.extra1 === "纯享") {
      result.extra1 = "纯享版";
    }
  }
  return keys
    .map((k) => {
      return {
        [k]: result[k],
      };
    })
    .reduce((t, cur) => {
      return {
        ...t,
        ...cur,
      };
    }) as Record<VideoKeys, string>; // 怎么筛选传入的 keys
}

function format_subtitle_lang(lang: string) {
  if (lang.includes("&")) {
    return lang;
  }
  if (lang.match(/2[cChH]{2,}/)) {
    return "chi";
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
export function format_season_number(n: string, prefix = "S") {
  const number = n.replace(/\.$/, "");
  // console.log("(format_number) - season", number);
  if (number === "Ⅱ") {
    return "S02";
  }
  if (number === "II") {
    return "S02";
  }
  if (number === "III") {
    return "S03";
  }
  if (number === "IV") {
    return "S04";
  }
  if (number.match(/[sS]eason\.V/)) {
    return "S05";
  }
  if (number === "VI") {
    return "S06";
  }
  if (number === "VII") {
    return "S07";
  }
  if (number === "VIII") {
    return "S08";
  }
  if (number === "IX") {
    return "S09";
  }
  if (number === "X") {
    return "S10";
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
  if (number.match(/特别篇/)) {
    if (!number.match(/[0-9]{1,}/)) {
      return "特别篇01";
    }
    return number;
  }
  if (number.match(/[eE][pP][0-9]{1,}/)) {
    return number.replace(/[pP]/, "");
  }
  const nn = number.match(/[sS][eE]([0-9]{1,})/);
  if (nn) {
    return `S${padding_zero(nn[1])}`;
  }
  const matched = number.match(/[0-9]{1,}/);
  if (!matched) {
    const m2 = number.match(/[零一二三四五六七八九十]{1,}/);
    if (!m2) {
      return number;
    }
    const num = chinese_num_to_num(m2[0]);
    return `${prefix}${padding_zero(num)}`;
  }
  const num = matched[0];
  const e = `${prefix}${padding_zero(num)}`;
  return e;
}

function format_episode_number2(n: string) {
  let result = n.replace(/[\.\(\)]/g, "").trim();
  if (result.match(/^第[0-9]{1,}/)) {
    return result;
  }
  if (result.match(/[0-9]{4,8}/)) {
    const r = result.match(/([0-9]{4,8})/);
    if (r) {
      return r[1];
    }
  }
  const r = result.match(/([0-9]{1,})/);
  if (r) {
    const r2 = result.match(/([期集])/);
    if (r2) {
      return `第${Number(r[1])}${r2[1]}`;
    }
    return `第${Number(r[1])}期`;
  }
  return result;
}
/**
 * 格式化 episode 数
 * @param number
 * @param prefix
 * @returns
 */
export function format_episode_number(n: string, options: Partial<{ log: (...args: unknown[]) => void }> = {}): string {
  const { log = () => {} } = options;
  // log("[]format_episode_number", n);
  const prefix = "E";
  const number = n.replace(/\.{1,}$/, "").replace(/^\.{1,}/, "");
  if (number.match(/[上下]/)) {
    const remaining = number.replace(/[上下]/, "");
    return `${format_episode_number2(remaining)}${number.match(/[上下]/)![0]}`;
  }
  // if (number.match(/加更/)) {
  //   if (number.match(/第([0-9]{1,})期/)) {
  //     const r = number.match(/第([0-9]{1,})期/);
  //     if (r) {
  //       return `加更${padding_zero(r[1])}`;
  //     }
  //     return "加更01";
  //   }
  // }
  // if (number.match(/(独家){0,1}直拍/)) {
  //   if (number.match(/第([0-9]{1,})期/)) {
  //     const r = number.match(/第([0-9]{1,})期/);
  //     if (r) {
  //       return `直拍${padding_zero(r[1])}`;
  //     }
  //     return "直拍01";
  //   }
  // }
  // if (number.match(/直播/)) {
  //   if (number.match(/第([0-9]{1,})期/)) {
  //     const r = number.match(/第([0-9]{1,})期/);
  //     if (r) {
  //       return `直播${padding_zero(r[1])}`;
  //     }
  //     return "直播01";
  //   }
  // }
  // if (number.match(/Plus/)) {
  //   if (number.match(/第([0-9]{1,})期/)) {
  //     const r = number.match(/第([0-9]{1,})期/);
  //     if (r) {
  //       return `Plus${padding_zero(r[1])}`;
  //     }
  //     return "Plus01";
  //   }
  // }
  // if (number.match(/超前营业/)) {
  //   if (number.match(/第([0-9]{1,})期/)) {
  //     const r = number.match(/第([0-9]{1,})期/);
  //     if (r) {
  //       return `超前营业${padding_zero(r[1])}`;
  //     }
  //     return "超前营业01";
  //   }
  // }
  // if (number.match(/彩蛋/)) {
  //   if (number.match(/第([0-9]{1,})期/)) {
  //     const r = number.match(/第([0-9]{1,})期/);
  //     if (r) {
  //       return `彩蛋${padding_zero(r[1])}`;
  //     }
  //     return "彩蛋01";
  //   }
  // }
  if (number.match(/^(集结篇|企划|先导片)/)) {
    return number;
  }
  if (number.match(/第[0-9]{2}\.{0,1}[0-9]{2}期/)) {
    const r = number.match(/第([0-9]{2})\.{0,1}([0-9]{2})期/);
    if (r) {
      return `${r[1]}${r[2]}`;
    }
  }
  log("[]format_episode_number - before 20121212", number);
  if (number.match(/^[12][0-9][0-9]{2}[012][0-9][0123][0-9]/)) {
    const r = number.match(/^([12][0-9][0-9]{2}[012][0-9][0123][0-9])/);
    if (r) {
      return r[1];
    }
  }
  log("[]format_episode_number - before [0-9]{4,8}[期-]", number);
  if (number.match(/[0-9]{4,8}[期-]$/)) {
    const r = number.match(/([0-9]{4,8})[期-]/);
    return r ? r[1] : number;
  }
  log("[]format_episode_number - before [0-9]{8}", number);
  if (number.match(/[0-9]{8}/)) {
    return number;
  }
  log("[]format_episode_number - before [0-9]{4}.[123][0-9]{3}", number);
  if (number.match(/[0-9]{4}\.[123][0-9]{3}/)) {
    const r = number.match(/([0-9]{4})\.([123][0-9]{3})/)!;
    if (r) {
      return `${r[2]}${r[1]}`;
    }
  }
  log("[]format_episode_number - before 年.月.日 - 年月日", number);
  if (number.match(/[0-9]{4}[-.年][0-9]{2}[-.月][0-9]{2}/)) {
    log("年.月.日 - 年月日");
    // 年.月.日 变成 年月日
    const r = number.match(/([0-9]{4})[-.年]([0-9]{2})[-.月]([0-9]{2})/);
    if (r) {
      return `${r[1]}${r[2]}${r[3]}`;
    }
  }
  log("[]format_episode_number - before ^[0-1][0-9][-.]{0,1}[0-3][0-9]", number);
  if (number.match(/^[0-1][0-9][-.]{0,1}[0-3][0-9]/)) {
    // 月.日 变成 月日
    const r = number.match(/^([0-1][0-9])[-.]{0,1}([0-3][0-9])/);
    if (r) {
      return `${r[1]}${r[2]}`;
    }
  }
  log("[]format_episode_number - before [0-9]{8}", number);
  if (number.match(/[0-9]{8}/)) {
    return number;
  }
  if (number.match(/^(特辑|OAD|彩蛋|花絮|番外|预告)/)) {
    const r1 = number.match(/^(特辑|OAD|彩蛋|花絮|番外|预告)/)!;
    const r2 = number.match(/\.{0,1}([0-9]{1,})/);
    const prefix = r1[1];
    const num = r2 ? r2[1] : null;
    if (!num) {
      return `${prefix}01`;
    }
    return `${prefix}${padding_zero(Number(num))}`;
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
  const nn = number.match(/[sS][eE]([0-9]{1,})/);
  if (nn) {
    return `S${padding_zero(nn[1])}`;
  }
  if (number.charAt(0) === "e") {
    return number.replace(/^e/, "E");
  }
  // console.log("[UTILS]format_number before E01-E02");
  // E01-E02
  if (number.match(/[eE][pP]{0,1}[0-9]{1,}-{0,1}[eE]{0,1}[pP]{0,1}[0-9]{1,}/)) {
    const matched = number.match(/[eE][pP]{0,1}([0-9]{1,})-{0,1}[eE][pP]{0,1}([0-9]{1,})/);
    // if (!matched) {
    if (matched) {
      return `E${matched[1]}-${matched[2]}`;
    }
  }
  // console.log("[UTILS]format_number before 第01-02话");
  // 第01-02话
  if (number.match(/第[0-9]{1,}-[0-9]{1,}[集話话]/)) {
    const matched = number.match(/第([0-9]{1,})-([0-9]{1,})[集話话]/);
    if (!matched) {
      return number;
    }
    return `E${matched[1]}-${matched[2]}`;
  }
  // 第01-02话 处理成 E01-E02
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

export function maybe_other_season(episode: string) {
  if (episode.match(/BONUS|PR|NCOP|NCED|CM/)) {
    return "其他";
  }
  return "";
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

/**
 * 构建一个带有首字母的电视剧名称
 */
export function build_media_name(values: { name: string | null; original_name: string | null }) {
  const { name, original_name } = values;
  const first_char_pin_yin = get_first_letter(name);
  const nn = name
    ? name
        .replace(/ {2,}/, " ")
        .split(" ")
        .map((t) => t.trim())
        .join(" ")
    : null;
  const n = [first_char_pin_yin, nn].filter(Boolean).join(" ");
  const original_n = (() => {
    if (name && name === original_name) {
      return "";
    }
    if (!original_name) {
      return "";
    }
    return original_name
      .split(" ")
      .map((t) => t.trim())
      .map((t) => {
        return t.replace(/\.{1,}$/, "").replace(/^\.{1,}/, "");
      })
      .join(".");
  })().replace(/ /, "");
  const name_with_pin_yin = [n, original_n].filter(Boolean).join(".").replace(/:/, "：");
  return name_with_pin_yin;
}

/**
 * 各种奇怪的集数信息正常化
 * @param filename
 * @returns
 */
function normalize_episode_text(filename: string) {
  let name = filename;
  // if there only two number, use as episode number.
  if (/(\.|^)[-_]{0,1}([0-9]{2,3})(\.|$)/.test(name)) {
    name = name.replace(/(\.|^)[-_]{0,1}([0-9]{2,3})(\.|$)/, ".E$2.");
  }
  if (name.match(/\b([0-9]{1,})[xX]([0-9]{1,})\b/)) {
    return name.replace(/\b([0-9]{1,})[xX]([0-9]{1,})\b/g, "S$1.E$2");
  }
  return name.replace(/\b([0-9]{1})([0-9]{2})\b/g, "S$1.E$2");
}
