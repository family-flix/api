import Nzh from "nzh";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import relative_time from "dayjs/plugin/relativeTime";

dayjs.extend(relative_time);
dayjs.locale("zh-cn");
const nzhcn = Nzh.cn;

const video_file_regexp = /\.[mM][kM][vV]$|\.[mM][pP]4$|\.[tT][sS]$|\.[fF][lL][vV]$|\.[rR][mM][vV][bB]$/;
export type ParsedFilename = {
  /** 译名 */
  name: string;
  /** 原产地名称 */
  original_name: string;
};
export const VIDEO_KEYS_MAP = {
  name: "",
  original_name: "",
  season: "",
  episode: "",
  episode_name: "",
  resolution: "",
  year: "",
  source: "",
  encode: "",
  voice_encode: "",
  episode_count: "",
};
export type VideoKeys = keyof typeof VIDEO_KEYS_MAP;
export const VIDEO_ALL_KEYS = Object.keys(VIDEO_KEYS_MAP) as VideoKeys[];
export type ParsedVideoInfo = Record<VideoKeys, string>;
export const VIDEO_KEY_NAME_MAP: Record<VideoKeys, string> = {
  name: "中文名称",
  original_name: "译名or外文原名",
  season: "季",
  episode: "集",
  episode_name: "集名称",
  resolution: "分辨率",
  year: "发布年",
  source: "来源",
  encode: "视频编码方式",
  voice_encode: "音频编码方式",
  episode_count: "总集数",
};
export function parse_filename_for_video(
  filename: string,
  keys: VideoKeys[] = ["name", "original_name", "season", "episode", "episode_name"]
) {
  function log(...args: unknown[]) {
    if (!filename.includes("隐门")) {
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
  let original_name = filename.replace(/^\[[a-zA-Z0-9-]{1,}]/, "");
  original_name = original_name
    .replace(/ - /g, ".")
    .replace(/[ _]/g, ".")
    .replace(/\]\[/, ".")
    .replace(/[【】《》「」\[\]]{1,}/g, ".")
    .replace(/^\./, "")
    .replace(/\+{1,}/g, ".")
    .replace(/(https{0,1}:){0,1}(\/\/){0,1}[0-9a-zA-Z]{1,}\.(com|cn)/, "");
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
    /** 执行该正则前调用 */
    before?: () => void | Partial<{
      /** 是否跳过该正则 */
      skip: boolean;
    }>;
    /** 执行该正则完成后调用 */
    after?: (matched_content: string) => void | Partial<{
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
    "BOBO",
    "VCB-Studio",
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
  const publishers2 = ["MyTVSuper", "FLTTH", "BOBO", "rartv", "Prof", "CYW", "Ma10p", ""].map((s) => `${s}`).join("|");
  const extra: ExtraRule[] = [
    // 一些发布者信息
    {
      regexp: new RegExp(publishers),
    },
    {
      regexp: new RegExp(publishers2),
    },
    // 奇怪的冗余信息
    {
      // 后面的 \([0-9]{1,3}\) 是因为存在 28(1).mkv 这种文件名
      regexp:
        /_File|HDJ|RusDub|Mandarin\.CHS|[0-9]{5,}|\([0-9]{1,3}\)|百度云盘下载|主演团陪看|超前点播直播现场|[A-Z][A-Z0-9]{6}[A-Z]/,
    },
    {
      // 这个包含了用什么格式封装(后缀)的信息
      regexp: /GOTV-(TS|MKV)/,
    },
    {
      regexp: /repack/,
    },
    {
      regexp: /CHS/,
    },
    // 来源平台
    {
      // 亚马逊、奈飞、迪士尼、爱奇艺、湖南TV
      regexp: /AMZN|NF|Netflix|DSNP|iQIYI|HunanTV|YYeTs|陕艺/,
    },
    // 文件后缀
    {
      regexp: video_file_regexp,
    },
    // 一些国产剧影片特有的信息？
    {
      /**
       * 最前面方便排序用的 影片首字母拼音 大写英文字母。只有该字母后面跟着中文，才会被处理
       * 如 `M 魔幻手机`，会变成 `魔幻手机`
       * `A Hard Day's Night` 不会被处理，仍保留原文
       */
      regexp: /^[A-Za-z]{1}[\. -（）⌒·★]{0,1}(?=[\u4e00-\u9fa5]{1,})/,
    },
    {
      regexp: /含[\u4e00-\u9fa5]{1,}[0-9]{1,}部全系列/,
    },
    {
      // 多少集，包含「更新中」信息
      key: k("episode_count"),
      regexp: /([0-9]{1,}集){0,1}((持续){0,1}更新中|[已全]\.{0,1}完结)/,
    },
    {
      regexp: /国语(中字|繁字|无字|内嵌){0,1}|繁体中字|双语中字|中英双字|[国粤韩英日]{1,3}[双三]语|双语源码/,
    },
    {
      regexp: /((默认){0,1}[粤国英]语音[轨频])(合成版){0,1}|亚马逊版/,
    },
    {
      regexp: /去除/,
    },
    {
      regexp: /保留/,
    },
    {
      regexp: /官方/,
    },
    {
      // 字幕及其语言
      regexp:
        /(内封|内嵌|外挂){0,1}[简繁中英多]{1,}[文语語]{0,1}字幕|无字|(内封|内嵌|内挂|无|[软硬])字幕版{0,1}|(内封|内嵌|外挂)(多国){0,1}字幕|(内封|内嵌|外挂)[简繁中英][简繁中英]|(内封|内嵌|外挂)/,
    },
    {
      regexp: /杜比视界/,
    },
    {
      regexp: /高码|超{0,1}高{0,1}清(修复版{0,1}){0,1}|[0-9]{2,4}重置版|多语版/,
    },
    {
      regexp: /([0-9]{1,}部){0,1}剧场版/,
    },
    {
      regexp: /超{0,1}高{0,1}清/,
    },
    {
      regexp: /无台标(水印版){0,1}/,
    },
    {
      regexp: /无水印|三无|[无未]删减/,
    },
    {
      regexp: /片头(片中){0,1}片尾\+{0,1}/,
    },
    {
      regexp: /去{0,1}广告/,
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
      regexp: /国漫/,
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
      regexp: /豆瓣[0-9\.]{1,}/,
    },
    // 总大小信息
    {
      regexp: /【{0,1}[0-9]{1,}(\.[0-9]{1,}){0,1}([gG]|[mM])[bB]{0,1}】{0,1}/,
    },
    { regexp: /GB/ },
    // 分辨率
    {
      regexp: /蓝光/,
    },
    {
      key: k("resolution"),
      regexp: /(蓝光){0,1}4[kK]/,
    },
    {
      key: k("resolution"),
      regexp: /(蓝光){0,1}4[kK]/,
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
      regexp: /[eE][pP][0-9]{1,}-[0-9]{1,}/,
    },
    {
      desc: "总集数2",
      regexp: /全[0-9]{1,}[集話话]/,
    },
    {
      desc: "总集数3",
      regexp: /[0-9]{1,}[集話话]全/,
    },
    {
      key: k("episode"),
      desc: "多集合并场景",
      regexp: /第[0-9]{1,}-[0-9]{1,}[集話话]/,
    },
    // 总季数，要放在「中文名称」前面
    {
      desc: "总季数1",
      regexp: /[0-9]{1,}[-+]([0-9]{1,})[季部]{0,1}/,
      pick: [1],
    },
    {
      // 重复出现，不要删除，是为了移除和中文名连在一起的「第n季」
      key: k("season"),
      desc: "总季数2",
      regexp: /第[0-9]{1,}[季部]/,
    },
    // {
    //   regexp: /[^.][sS][0-9]{1,}/,
    //   before() {
    //     cur_filename = normalize_season_number(cur_filename);
    //   },
    // },
    {
      key: k("season"),
      desc: "special season1",
      // 一些日本动漫会有的，和「剧场版」等做区分？
      regexp: /本篇|完结篇|OVA|付费彩蛋|特典映像|番外篇/,
    },
    {
      key: k("season"),
      desc: "special season2",
      regexp: /[sS][pP]/,
      before() {
        if (cur_filename.match(/(^|[^a-zA-Z])[sS][pP]($|[^a-zA-Z])/)) {
          cur_filename = cur_filename.replace(/(^|[^a-zA-Z])([sS][pP])($|[^a-zA-Z])/, "$1.SP.$3");
          log("add dot before SP and after SP");
          return undefined;
        }
        return {
          skip: true,
        };
      },
    },
    {
      // 重复出现，不要删除
      key: k("season"),
      regexp: /第[\u4e00-\u9fa5]{1,}[季部]/,
    },
    // 集数
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
      // 针对国产剧，有一些加在名称后面的数字表示季，如还珠格格2、魔幻手机2傻妞归来、魔幻手机2:傻妞归来
      key: k("season"),
      regexp: /[\u4e00-\u9fa5]{1,}([1-9]{1}[:：]{0,1}[\u4e00-\u9fa5]{0,})(\.|$|-)/,
      priority: 1,
      pick: [1],
    },
    {
      // 日文名称
      key: k("name"),
      desc: "japanese name",
      regexp:
        /^\[{0,1}[0-9]{0,}([\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff][0-9a-zA-Z\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff，：·]{0,}[0-9a-zA-Z\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff])\]{0,1}/,
      before() {
        const include_japanese = is_japanese(cur_filename);
        log("[japanese-name]maybe japanese", include_japanese);
        if (!include_japanese) {
          return {
            skip: true,
          };
        }
      },
      after(matched_content) {
        const i = original_name.indexOf(matched_content);
        // 如果季数在 name 前面 name 视为无效
        log("[japanese-name]compare season position", original_name.indexOf(result.season), i);
        if (result.season && original_name.indexOf(result.season) < i) {
          return {
            skip: true,
          };
        }
      },
    },
    // 中文名称，放在「分辨率」后面，是支持 影片名1080p 这种情况能被正确识别为「影片名」，而不是「影片名1080」
    // 因为影片名支持以数字结尾，如「还珠格格3」
    {
      key: k("name"),
      desc: "chinese name",
      // 中文开头，中间可以包含数字，以中文结尾
      regexp: /^\[{0,1}[0-9]{0,}([\u4e00-\u9fa5][0-9a-zA-Z\u4e00-\u9fa5，：·]{0,}[0-9a-zA-Z\u4e00-\u9fa5])\]{0,1}/,
      before() {
        // 把 1981.阿蕾拉 这种情况转换成 阿蕾拉.1981
        cur_filename = cur_filename.replace(/^([0-9]{4}\.)([\u4e00-\u9fa5]{1,})/, "$2.$1");
        // 把 老友记S02 这种情况转换成 老友记.S02
        cur_filename = cur_filename.replace(/^([\u4e00-\u9fa5]{1,})([sS][0-9]{1,})/, "$1.$2");
        // 如果名字前面有很多冗余信息，前面就会出现 ..名称 这种情况，就需要手动处理掉
        cur_filename = cur_filename.replace(/^\.{2,}/, "");
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
      regexp: /[(（]{0,1}[12]{1}[0-9]{3}[）)]{0,1}年{0,1}/,
    },
    // 影片来源
    {
      key: k("source"),
      regexp: /(HMAX){0,1}[wW][eE][bB](-HR){0,1}([Rr][i][p]){0,1}(-{0,1}[dD][lL]){0,1}/,
    },
    {
      key: k("source"),
      regexp: /HDTV/,
    },
    {
      key: k("source"),
      // 蓝光 UHD 是指原盘？
      regexp: /(UHD){0,1}[bB]lu-{0,1}[rR]ay/,
    },
    {
      key: k("source"),
      regexp: /DVD(-{0,1}[rR]ip){0,1}/,
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
    // 字幕名
    {
      //  Subtitles for the deaf and hard of hearing (SDH)
      regexp: /Eng\.SubEngSDH/,
    },
    // 编码方式
    {
      key: k("encode"),
      regexp: /[hH][dD]1080[pP]/,
    },
    {
      key: k("encode"),
      // 能处理 HD4K、HD265 这种异常数据
      regexp: /[xX]{0,1}[hH]{0,1}[dD]{0,1}[.]{0,1}26[45]{1}/,
    },

    {
      // HEVC=H265? AVC=H264？
      regexp: /(HE|A)[VC]C/,
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
        if (/[^sS](?![sS])[eE][pP]{0,1}[0-9]{1,}/.test(cur_filename)) {
          return;
        }
        cur_filename = normalize_episode_number(cur_filename);
        log("[season]filename after adding E or P char", cur_filename);
      },
    },
    {
      key: k("season"),
      regexp: /第[0-9]{1,}[季部]/,
    },
    {
      key: k("season"),
      regexp: /第[\u4e00-\u9fa5]{1,}[季部]/,
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
      regexp: /[eE][pP]{0,1}[0-9]{1,}-{0,1}([eE][pP]{0,1}[0-9]{1,}){0,1}(\.Extended){0,1}/,
    },
    // 影片名及集名
    ...(() => {
      // 中文 \u4e00-\u9fa5
      // 俄文 \u0400-\u04FF
      // 韩文 \uAC00-\uD7A3 和英文一样中间可以包含空格
      // 日文 \u0800-\u4e00 还要包含中文字符范围
      // 英文 a-zA-Z
      const name_regexp =
        /[0-9a-zA-Z\u4e00-\u9fa5\u0400-\u04FF\uAC00-\uD7A3\u0800-\u4e00]{1,}[ \.\-&'（）：！？～0-9a-zA-Z\u4e00-\u9fa5\u0400-\u04FF\uAC00-\uD7A3\u0800-\u4e00]{1,}[）0-9a-zA-Z!！？\u4e00-\u9fa5\u0400-\u04FF\uAC00-\uD7A3\u0800-\u4e00]/;
      const remove_multiple_dot = () => {
        // log("[6.0]before original_name or episode name", cur_filename);
        // 后面的 ` 符号可以换成任意生僻字符，这个极度重要！！
        cur_filename = cur_filename.replace(/[\.]{2,}/g, "`").replace(/^\.{0,1}/, "");
        // log("[6]after original_name or episode name", cur_filename);
      };
      const name_extra: ExtraRule[] = [
        {
          key: k("original_name"),
          regexp: name_regexp,
          before() {
            remove_multiple_dot();
            const include_chinese = !!cur_filename.match(/[\u4e00-\u9fa5]/);
            if (include_chinese) {
              // 存在「一」，判断不了是中文还是日文？
              return {
                skip: true,
              };
            }
          },
          after(matched_content) {
            const original_name_index = original_name.indexOf(matched_content);
            // 如果季数在 original_name 前面，original_name 视为无效
            if (original_name_index === 0) {
              return undefined;
            }
            log("the original_name is", original_name, original_name_index);
            if (result.season) {
              const season_index = original_name.indexOf(result.season);
              if (season_index !== -1 && season_index < original_name_index) {
                return {
                  skip: true,
                };
              }
            }
            log("the original_name is", original_name, original_name_index);
            if (result.episode) {
              const a = result.episode.match(/[0-9]{1,}/);
              if (!a) {
                return undefined;
              }
              const episode_index = original_name.indexOf(a[0]);
              log("the result.episode is", result.episode, episode_index);
              if (episode_index !== -1 && episode_index < original_name_index) {
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
  for (let i = 0; i < extra.length; i += 1) {
    const { key, desc, regexp, priority, pick = [0], when, before, after } = extra[i];
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
      if (key) {
        return key;
      }
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
    if (!m) {
      continue;
    }
    if (after) {
      const r = after(m[0]);
      log("[3]invoke after fn for", unique, "and result is", r);
      if (r?.skip) {
        continue;
      }
    }
    // log("[10]matched content and key", key, m[0]);
    let extracted_content = "";
    for (let i = 0; i < pick.length; i += 1) {
      const index = pick[i];
      const c = m[index];
      let from = cur_filename.indexOf(c);
      if (from === -1 && m.index !== undefined) {
        from = m.index;
      }
      // log("[4]pick content in", index, "is", c);
      if (m[index] !== undefined) {
        extracted_content += c;
        cur_filename = remove_str(cur_filename, from, c.length);
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
  if (result.resolution) {
    result.resolution = result.resolution.replace(/[（\(\)）]/g, "");
  }
  return result;
}

/**
 * 格式化 season 或 episode 数
 * @param number
 * @param prefix
 * @returns
 */
export function format_number(number: string, prefix = "S") {
  // console.log("(format_number) - season", number);
  if (!number.match(/[0-9]/) && !number.match(/[零一二三四五六七八九十]/)) {
    if (number === "本篇") {
      return "S01";
    }
    if (number === "OVA") {
      return "OVA";
    }
    return number;
  }
  // E01-E02
  if (number.match(/[eE][pP]{0,1}[0-9]{1,}-{0,1}[eE][pP]{0,1}[0-9]{1,}/)) {
    const matched = number.match(/[eE][pP]{0,1}([0-9]{1,})-{0,1}[eE][pP]{0,1}([0-9]{1,})/);
    if (!matched) {
      return number;
    }
    return `E${matched[1]}-${matched[2]}`;
  }
  // 第01-02话
  if (number.match(/第[0-9]{1,}-[0-9]{1,}[话集]/)) {
    const matched = number.match(/第([0-9]{1,})-([0-9]{1,})[集话]/);
    if (!matched) {
      return number;
    }
    return `E${matched[1]}-${matched[2]}`;
  }
  // 第01-02话 处理成 E01-E02
  // log("[](formatSeason)season", season);
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

function has_key_factory(keys: VideoKeys[]) {
  return (key: VideoKeys) => {
    if (keys.includes(key)) {
      return key;
    }
    return undefined;
  };
}

export function is_season(s: string) {
  if (s[0] === "第" && s[s.length - 1] === "季") {
    return true;
  }
  if (/(SE|Season){1} {0,}[0-9]{1}/.test(s)) {
    return true;
  }
  return /^[sS][0-9]{1,}[eE]{0,1}[0-9]{0,}/.test(s);
}
export function extra_season_and_episode(c: string) {
  let i = 0;
  let inSeason = false;
  let inEpisode = false;
  const result = {
    season: "",
    episode: "",
  };
  if (!is_season(c)) {
    result;
  }
  while (i < c.length) {
    const s = c[i];
    if (s.toUpperCase() === "S") {
      if (c[i + 1].toUpperCase() === "E" && /[0-9]/.test(c[i + 2])) {
        inSeason = true;
        result.season += s.toUpperCase();
        i += 2;
        continue;
      }
      // log("[]extra", c, c.slice(i, 6));
      if (c.slice(i, 6).toLowerCase() === "season") {
        inSeason = true;
        result.season += s.toUpperCase();
        i += 6;
        continue;
      }
      inSeason = true;
      result.season += s;
      i += 1;
      continue;
    }
    if (s === "第") {
      inSeason = true;
      result.season += s;
      i += 1;
      continue;
    }
    if (s.toUpperCase() === "E") {
      inEpisode = true;
      inSeason = false;
      result.episode += s;
      i += 1;
      continue;
    }
    if (inEpisode) {
      result.episode += s;
      i += 1;
      continue;
    }
    if (inSeason) {
      result.season += s;
      i += 1;
      continue;
    }
    i += 1;
  }
  return result;
}
export function is_resolution(s: string) {
  return /[0-9]{1,}[pPiI]$/.test(s);
}

export function padding_zero(str: number | string) {
  if (String(str).length === 1) {
    return `0${str}`;
  }
  return String(str);
}
export function remove_str(filename: string, index: number = 0, length: number) {
  return filename.slice(0, index) + filename.slice(index + length);
}

export function normalize_season_number(filename: string) {
  let name = filename;
  // if (/[sS][0-9]{1,}[eE][0-9]{1,}/.test(name)) {

  // }
  return name.replace(/b([sS][0-9]{1,})([eE][0-9]{1,})\b/g, ".$1.$2");
}
/**
 * 各种奇怪的集数信息正常化
 * @param filename
 * @returns
 */
export function normalize_episode_number(filename: string) {
  let name = filename;
  // if there only two number, use as episode number.
  if (/(\.|^)[-_]{0,1}([0-9]{2,3})(\.|$)/.test(name)) {
    name = name.replace(/(\.|^)[-_]{0,1}([0-9]{2,3})(\.|$)/, ".E$2.");
  }
  return name.replace(/\b([0-9]{1})([0-9]{2})\b/g, "S$1.E$2");
}

export function generate_new_video_filename(
  params: Partial<{
    name: string;
    original_name: string;
    firstAirDate: string;
    season: string;
    episode: string;
    episodeName: string;
    resolution: string;
  }>
) {
  let result = [];
  const { name, original_name, firstAirDate, season, episode = "", episodeName = "", resolution } = params;
  if (name) {
    result.push(`[${name}]`);
  }
  if (original_name) {
    result.push(original_name.split(" ").join("."));
  }
  if (firstAirDate) {
    result.push(dayjs(firstAirDate).year());
  }
  if (season) {
    result.push(season + episode);
  }
  if (episodeName) {
    result.push(episodeName.split(" ").join("."));
  }
  if (resolution) {
    result.push(resolution);
  }
  return result.join(".");
}
export function episode_to_num(str: string) {
  const regex = /(\d+)/g;
  let s = str.replace(/[eE]/g, "");
  const matches = s.match(regex);
  if (!matches) {
    return str;
  }
  for (let i = 0; i < matches.length; i++) {
    const num = parseInt(matches[i], 10);
    s = String(num);
  }
  return Number(s);
}
export function episode_to_chinese_num(str: string) {
  const regex = /(\d+)/g;
  let s = str.replace(/[eE]/g, "");
  const matches = s.match(regex);
  if (!matches) {
    return str;
  }
  for (let i = 0; i < matches.length; i++) {
    const num = parseInt(matches[i], 10);
    const chinese_num = num_to_chinese(num);
    s = s.replace(matches[i], `第${chinese_num}集`);
  }
  return s;
}
export function season_to_num(str: string) {
  const regex = /(\d+)/g;
  let s = str.replace(/[sS]/g, "");
  const matches = s.match(regex);
  if (!matches) {
    return str;
  }
  for (let i = 0; i < matches.length; i++) {
    const num = parseInt(matches[i], 10);
    s = String(num);
  }
  return Number(s);
}
export function season_to_chinese_num(str: string) {
  const regex = /(\d+)/g;
  let s = str.replace(/[sS]/g, "");
  const matches = s.match(regex);
  if (!matches) {
    return str;
  }
  for (let i = 0; i < matches.length; i++) {
    const num = parseInt(matches[i], 10);
    const chinese_num = num_to_chinese(num);
    s = s.replace(matches[i], `第${chinese_num}季`);
  }
  return s;
}
/**
 * 阿拉伯数字转中文数字
 * @param num
 * @returns
 */
export function num_to_chinese(num: number) {
  return nzhcn.encodeS(num);
}
export function chinese_num_to_num(str: string) {
  return nzhcn.decodeS(str);
}

export function update<T>(arr: T[], index: number, nextItem: T) {
  if (index === -1) {
    return [...arr];
  }
  return [...arr.slice(0, index), nextItem, ...arr.slice(index + 1)];
}

/**
 * 通过后缀判断给定的文件名是否为一个视频文件名
 * @param filename 文件名
 * @returns
 */
export function is_video_relative_file(filename: string) {
  const types = [
    /\.[mM][kM][vV]$/,
    /\.[mM][pP]4$/,
    /\.[tT][sS]$/,
    /\.[fF][lL][vV]$/,
    /\.[nN][fF][oO]$/,
    /\.[aA][sS][sS]$/,
    /\.[sS][rR][tT]$/,
  ];
  return types.some((reg) => reg.test(filename));
}

export function is_video_file(filename: string) {
  return video_file_regexp.test(filename);
}

export function query_stringify(query: Record<string, string | number | undefined | null>) {
  return Object.keys(query)
    .filter((key) => {
      return query[key] !== undefined && query[key] !== null;
    })
    .map((key) => {
      return `${key}=${encodeURIComponent(query[key]!)}`;
    })
    .join("&");
}

const defaultRandomAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** 返回一条随机作为记录 id 的 15 位字符串 */
export function r_id() {
  return random_string(15);
}
/**
 * 返回一个指定长度的随机字符串
 * @param length
 * @returns
 */
export function random_string(length: number) {
  return random_string_with_alphabet(length, defaultRandomAlphabet);
}
function random_string_with_alphabet(length: number, alphabet: string) {
  let b = new Array(length);
  let max = alphabet.length;
  for (let i = 0; i < b.length; i++) {
    let n = Math.floor(Math.random() * max);
    b[i] = alphabet[n];
  }
  return b.join("");
}

export function maybe_same_tv(existing_names: string[], name: string) {}

/**
 * 推断 tv 的改变
 */
export function detect_change_of_tv(prev_filename: string, cur_filename: string) {
  const prev_parsed_info = parse_filename_for_video(prev_filename);
  const cur_parsed_info = parse_filename_for_video(cur_filename);
  const {
    name: prev_name,
    original_name: prev_original_name,
    season: prev_season,
    episode: prev_episode,
  } = prev_parsed_info;
  const {
    name: cur_name,
    original_name: cur_original_name,
    season: cur_season,
    episode: cur_episode,
  } = cur_parsed_info;
  const diff = [];
  if (prev_name !== cur_name) {
    diff.push({
      name: [prev_name, cur_name],
    });
  }
  if (prev_original_name !== cur_original_name) {
    diff.push({
      original_name: [prev_original_name, cur_original_name],
    });
  }
  if (prev_season !== cur_season) {
    diff.push({
      season: [prev_season, cur_season],
    });
  }
  if (prev_episode !== cur_episode) {
    diff.push({
      episode: [prev_episode, cur_episode],
    });
  }
  return diff;
}

export function bytes_to_size(bytes: number) {
  if (bytes === 0) {
    return "0KB";
  }
  const symbols = ["bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  let exp = Math.floor(Math.log(bytes) / Math.log(1024));
  if (exp < 1) return bytes + " " + symbols[0];
  bytes = Number((bytes / Math.pow(1024, exp)).toFixed(2));
  const size = bytes;
  const unit = symbols[exp];
  if (Number.isInteger(size)) {
    return `${size}${unit}`;
  }
  function remove_zero(num: number | string) {
    let result = Number(num);
    if (String(num).indexOf(".") > -1) {
      result = parseFloat(num.toString().replace(/0+?$/g, ""));
    }
    return result;
  }
  return `${remove_zero(size.toFixed(2))}${unit}`;
}

export function find_resolution_from_paths(full_path: string) {
  const paths = full_path.split("/");
  let i = paths.length - 1;
  while (i > 0) {
    const p = paths[i];
    const { resolution } = parse_filename_for_video(p, ["resolution"]);
    if (resolution) {
      return resolution;
    }
    i -= 1;
  }
  return null;
}

export function find_recommended_pathname(paths: string[]) {
  const matched = paths.find((name) => {
    if (name.match(/4[kK]/)) {
      if (name.match(/去片头/)) {
        return true;
      }
      if (name.match(/纯享版{0,1}/)) {
        return true;
      }
      if (name.match(/[hH]265/)) {
        return true;
      }
      return true;
    }
    if (name.match(/去片头/)) {
      return true;
    }
    if (name.match(/纯享版{0,1}/)) {
      return true;
    }
    if (name.match(/[hH]265/)) {
      return true;
    }
    return false;
  });
  if (!matched) {
    return paths[0];
  }
  return matched;
}

/**
 * 秒数转时分秒
 * @param value
 * @returns
 */
export function seconds_to_hour(value: number) {
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value - hours * 3600) / 60);
  const seconds = Math.floor(value - hours * 3600 - minutes * 60);
  if (hours > 0) {
    return hours + ":" + padding_zero(minutes) + ":" + padding_zero(seconds);
  }
  return padding_zero(minutes) + ":" + padding_zero(seconds);
}

export function relative_time_from_now(time: string) {
  const date = dayjs(time);
  const now = dayjs();
  const minute_diff = now.diff(date, "minute");
  let relativeTimeString;
  if (minute_diff >= 7 * 24 * 60) {
    relativeTimeString = "7天前";
  } else if (minute_diff >= 24 * 60) {
    relativeTimeString = now.diff(date, "day") + "天前"; // 显示天数级别的时间差
  } else if (minute_diff >= 60) {
    relativeTimeString = now.diff(date, "hour") + "小时前"; // 显示小时级别的时间差
  } else if (minute_diff > 0) {
    relativeTimeString = minute_diff + "分钟前"; // 显示分钟级别的时间差
  } else {
    relativeTimeString = "刚刚"; // 不到1分钟，显示“刚刚”
  }
  return relativeTimeString;
}

export function is_japanese(text: string) {
  const chinese_char = text.match(/[\u4e00-\u9fff]/g) || [];
  const japanese_char = text.match(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/g) || [];
  if (japanese_char.length > chinese_char.length) {
    return true;
  }
  return false;
}

export function noop() {}
export function promise_noop() {
  return Promise.resolve();
}

export function filter_undefined_key<T>(value: T): T {
  if (typeof value !== "object" || value === null) {
    return value;
  }
  if (Array.isArray(value)) {
    const v = value.map(filter_undefined_key);
    return v as unknown as T;
  }
  const v = Object.entries(value).reduce((acc, [key, v]) => {
    const cleanedValue = filter_undefined_key(v);
    if (cleanedValue !== undefined && cleanedValue !== "") {
      // @ts-ignore
      acc[key] = cleanedValue;
    }
    return acc;
  }, {} as T);
  return v;
}

/**
 * 延迟指定时间
 * @param delay 要延迟的时间，单位毫秒
 * @returns
 */
export function sleep(delay: number = 1000) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(null);
    }, delay);
  });
}
