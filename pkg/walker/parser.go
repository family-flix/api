package walker

import (
	"fmt"
	"os"
	"regexp"
	"strconv"
	"strings"

	"github.com/rs/zerolog"
)

var Logger zerolog.Logger

func init() {
	Logger = zerolog.New(os.Stdout).With().Timestamp().Logger()
}

// SetLogOutput redirects the package-level Logger to the given writer.
func SetLogOutput(w *os.File) {
	Logger = zerolog.New(w).With().Timestamp().Logger()
}

// ParsedVideoInfo matches the structure in types.go
// We assume types.go already defines this struct.
// But for this file to be standalone compilable if types.go is missing (which is not the case here),
// we rely on the existing types.go.

var (
	// FilenameRules from src/utils/filename_rules.ts
	FilenameRules = []struct {
		Replace [2]string
	}{
		{Replace: [2]string{"101.Dalmatians", "ORIGINAL_NAME"}},
		{Replace: [2]string{"12.Angry.Men", "ORIGINAL_NAME"}},
		{Replace: [2]string{"2.Broke.Girls", "ORIGINAL_NAME"}},
		{Replace: [2]string{"100.Percent.Wolf", "ORIGINAL_NAME"}},
		{Replace: [2]string{"20.Days.in.Mariupol", "ORIGINAL_NAME"}},
		{Replace: [2]string{"100.Yen.Love", "ORIGINAL_NAME"}},
		{Replace: [2]string{"^24\\.", "ORIGINAL_NAME"}},
		{Replace: [2]string{"The\\.Story\\.of\\.Ming\\.Lan", ""}},
		{Replace: [2]string{"1080\\.1080", "1080"}},
		{Replace: [2]string{"大军师司马懿之军师联盟", "大军师司马懿.S01."}},
		{Replace: [2]string{"大军师司马懿之虎啸龙吟", "大军师司马懿.S02."}},
		{Replace: [2]string{"西行纪之集结篇", "西行纪.S02."}},
		{Replace: [2]string{"西行纪之宿命篇", "西行纪.S03."}},
	}

	// Pre-compiled regexes for performance
	publishers = []string{
		"-Huawei", "FRDS", "￡{0,1}cXcY@FRDS", "MediaClub", "-Yumi@FRDS", "-BlackTV", "-HotWEB", "-SeeWEB",
		"-HDSWEB", "-HDCTV", "-HaresWEB", "-PTerWEB", "-BtsTV", "-Vampire", "-NGB", "-DHTCLUB", "-OurTV",
		"-TrollHD", "-CtrlHD", "rartv", "-NiXON", "-NTb", "-SHORTBREHD", "-rovers", "-TjHD", "-TEPES",
		"-SMURF", "-SiGMA", "-CMCTV{0,1}", "-AIU", "-7SINS", "ATV", "HQC", "Mp4Ba", "-Amber", "-HeiGuo",
		"-Nanzhi", "-SciSurf", "-orpheus", "-BS666", "GM-Team", "-52KHD", "-SXG", "-BestWEB", "BDE4",
		"DBD制作组&离谱Sub.", "艺声译影", "推しの子", "傅艺伟", "人人影视", "Shimazu", "BOBO", "VCB-Studio",
		"GOTV-TS", "\\btvr", "\\btri", "xtm.dvd-halfcd2.", "BeanSub&FZSD&LoliHouse", "BeanSub&FZSD", "BeanSub",
	}
	publishers2 = []string{
		"Tacit0924", "-{0,1}SuperMiao", "蓝色狂想", "蓝色狂想制作", "tv综合吧", "tvzongheba", "MyTVSuper",
		"SS的笔记", "FLTTH", "\\bBOBO", "\\bProf\\b", "CYW", "Ma10p",
	}

	videoFileTypeRegexp = regexp.MustCompile(`\.[mM][kK][vV]$|\.[mM][pP]4$|\.[tT][sS]$|\.[fF][lL][vV]$|\.[rR][mM][vV][bB]$|\.[mM][oO][vV]$`)
)

type ExtraRule struct {
	Key         string
	Desc        string
	Regexp      *regexp.Regexp
	Pick        []int
	Priority    int
	Placeholder string
	Before      func() *BeforeResult
	After       func(matchedContent string) *AfterResult
	When        func() bool
}

type BeforeResult struct {
	Skip bool
}

type AfterResult struct {
	Skip bool
}

type ExtraRuleOption struct {
	Replace [2]string
}

func ParseFilenameForVideo(filename string, opts ...interface{}) ParsedVideoInfo {
	keys := []string{"name", "original_name", "season", "episode"}
	var extraRuleOptions []ExtraRuleOption

	for _, opt := range opts {
		switch v := opt.(type) {
		case []string:
			keys = v
		case []ExtraRuleOption:
			extraRuleOptions = v
		}
	}

	VIDEO_ALL_KEYS := []string{"name", "original_name", "season", "episode", "type", "year", "resolution", "source", "encode", "voice_encode", "voice_type", "subtitle_lang", "extra1", "extra2", "episode_name"}

	result := ParsedVideoInfo{}
	priority_keys := make(map[string]int) // Store priority values for FilenameRules
	priority_map := make(map[string]int)  // Store priority values for extraRules

	// Helper to set result with priority
	// In TS: priority_map stores the priority value.
	// Logic:
	// if (!priority) { if (priority_map[key]) continue; }
	// if (priority === -1 && result[key]) continue;
	// if (priority !== undefined) { if (priority <= prev) continue; result=val; map=prio; }

	original_filename := filename
	cur_filename := filename

	// 1. Extra Rule Options (user-provided rules take priority)
	for _, rule := range extraRuleOptions {
		r := regexp.MustCompile(rule.Replace[0])
		if !r.MatchString(original_filename) {
			continue
		}

		if rule.Replace[1] == "ORIGINAL_NAME" {
			need_original_name := false
			for _, k := range keys {
				if k == "original_name" {
					need_original_name = true
					break
				}
			}
			if !need_original_name {
				continue
			}

			match := r.FindString(original_filename)
			if match != "" {
				result.OriginalName = match
				priority_keys["original_name"] = 1
				original_filename = strings.Replace(original_filename, match, "", 1)
			}
		} else if rule.Replace[1] == "NAME" {
			need_name := false
			for _, k := range keys {
				if k == "name" {
					need_name = true
					break
				}
			}
			if !need_name {
				continue
			}
			match := r.FindString(original_filename)
			if match != "" {
				result.Name = match
				priority_keys["name"] = 1
			}
		} else {
			original_filename = r.ReplaceAllString(original_filename, rule.Replace[1])
			cur_filename = original_filename
		}
	}

	// 2. FilenameRules (replace rules)
	for _, rule := range FilenameRules {
		r := regexp.MustCompile(rule.Replace[0])
		if !r.MatchString(original_filename) {
			continue
		}

		if rule.Replace[1] == "ORIGINAL_NAME" {
			// Check if we need original_name
			need_original_name := false
			for _, k := range keys {
				if k == "original_name" {
					need_original_name = true
					break
				}
			}
			if !need_original_name {
				continue
			}

			match := r.FindString(original_filename)
			if match != "" {
				result.OriginalName = match
				priority_keys["original_name"] = 1
				original_filename = strings.Replace(original_filename, match, "", 1)
				// TS returns here in the loop lambda, which acts like 'continue' for the main loop effectively?
				// No, the TS code says `return;` inside `(() => { ... })()`.
				// So it proceeds to next rule.
			}
		} else if rule.Replace[1] == "NAME" {
			// Logic for NAME
			need_name := false
			for _, k := range keys {
				if k == "name" {
					need_name = true
					break
				}
			}
			if !need_name {
				continue
			}
			match := r.FindString(original_filename)
			if match != "" {
				result.Name = match
				priority_keys["name"] = 1
				// Doesn't replace originalFilename in TS for NAME?
				// TS: result["name"] = r[0]; priority_keys["name"] = "1";
			}
		} else {
			// Standard replace
			original_filename = r.ReplaceAllString(original_filename, rule.Replace[1])
			cur_filename = original_filename
		}
	}

	// Pre-processing before Extra Rules
	original_filename = preprocess_filename(original_filename)
	cur_filename = original_filename

	// 2. Extra Rules
	var extra_rules []ExtraRule

	publishersStr := strings.Join(publishers, "|")
	publishers2Str := strings.Join(publishers2, "|")

	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(publishersStr)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(publishers2Str)})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "extra1",
		Regexp: regexp.MustCompile(`(超高清|高清|超清|原盘)(韩|日|英|国|粤|中)[语配音]+[中繁双字]+`),
	})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`[^字\.]{1,}字幕组\.{0,1}`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`[生熟]肉`)})
	extra_rules = append(extra_rules, ExtraRule{
		Regexp: regexp.MustCompile(`^[- .]+`),
	})

	extra_rules = append(extra_rules, ExtraRule{
		Regexp: regexp.MustCompile(`超前点[映播]|超前[0-9]{1,}-[0-9]{1,}|超前[0-9]{0,}集{0,1}完结|点映礼|[bB]站logo|Remux|^备份$|[\p{Han}]{1,}节限定`),
	})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`（[^）]{1,}）$`)})
	extra_rules = append(extra_rules, ExtraRule{
		Regexp: regexp.MustCompile(`E[0-9]{1,}(修正)`),
		Pick:   []int{1},
	})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`^[tT][oO][pP][0-9]{1,}\.`)})
	extra_rules = append(extra_rules, ExtraRule{
		Key:         "episode",
		Regexp:      regexp.MustCompile(`\.[123][0-9]{3}[01][0-9][0123][0-9]\.`),
		Placeholder: ".",
	})
	extra_rules = append(extra_rules, ExtraRule{
		Regexp: regexp.MustCompile(`\.([A-Z0-9](?:[0-9][A-Z0-9]{6}|[A-Z0-9][0-9][A-Z0-9]{5}|[A-Z0-9]{2}[0-9][A-Z0-9]{4}|[A-Z0-9]{3}[0-9][A-Z0-9]{3}|[A-Z0-9]{4}[0-9][A-Z0-9]{2}|[A-Z0-9]{5}[0-9][A-Z0-9]|[A-Z0-9]{6}[0-9]))\.`),
		Pick:   []int{1},
		After: func(matchedContent string) *AfterResult {
			if !regexp.MustCompile(`[0-9]`).MatchString(matchedContent) {
				return &AfterResult{Skip: true}
			}
			return nil
		},
	})
	extra_rules = append(extra_rules, ExtraRule{
		Regexp: regexp.MustCompile(`_File|HDJ|RusDub|Mandarin|百度云盘下载|主演团陪看|又名|超前点播直播现场`),
		Before: func() *BeforeResult {
			// Go regex doesn't support lookbehind (?<=\d)
			// We can implement it by matching digit + group and replacing group
			// Or just `([0-9])[(（][0-9]{1,}[）)]` -> replace with `$1`
			r2 := regexp.MustCompile(`([0-9])[(（][0-9]{1,}[）)]`)
			if r2.MatchString(cur_filename) {
				cur_filename = r2.ReplaceAllString(cur_filename, "$1")
			}
			return nil
		},
	})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`[cC][hH][sS]\.{0,1}[jJ][pP][nN]`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`repack|REMUX`)})
	extra_rules = append(extra_rules, ExtraRule{
		Regexp: regexp.MustCompile(`AMZN|ATVP|NF|Netflix|DSNP|iQIYI|HunanTV|\bCCTV[1-9]{0,2}|YYeTs|陕艺|JSTV\.{0,1}|江苏卫视\.{0,1}|[bB]站`),
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "type",
		Regexp: videoFileTypeRegexp,
		After: func(matchedContent string) *AfterResult {
			if matchedContent == "" {
				if regexp.MustCompile(`^[1-9][0-9]{3}`).MatchString(cur_filename) {
					return nil
				}
				cur_filename = regexp.MustCompile(`^[0-9]{1,}\.`).ReplaceAllString(cur_filename, "")
			}
			return nil
		},
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "subtitle_lang",
		Regexp: regexp.MustCompile(`2[ch]{2,}`),
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "subtitle_lang",
		Regexp: regexp.MustCompile(`([cChHtTsiISeEnNgG]{2,}&[cChHtTsiISeEnNgG]{2,}|简英)\.`),
		Pick:   []int{1},
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "subtitle_lang",
		Regexp: regexp.MustCompile(`[^a-z]([zZ][hH]|[cC][hH][iIsStT]|[eE][nN][gG])\.`),
		Pick:   []int{1},
	})
	extra_rules = append(extra_rules, ExtraRule{
		Regexp: regexp.MustCompile(`(^[A-Za-z]{1}(?:\.| |-|（|）|⌒|·|★))[\p{Han}]{1,}`),
		Pick:   []int{1},
	})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`含[\p{Han}]{1,}[0-9]{1,}部全系列`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`含[\p{Han}]{1,}篇`)})
	extra_rules = append(extra_rules, ExtraRule{
		Regexp: regexp.MustCompile(`([0-9]{1,}集){0,1}((持续){0,1}更新中|[已全]\.{0,1}完结)`),
	})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`默认|付费|去除|保留|官方|流媒体|公众号[:：]{0,1}`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`杜比音效`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`[多双粤国英]{1,}[语言音]{1,}[轨频]`)})
	extra_rules = append(extra_rules, ExtraRule{
		Key:         "voice_type",
		Regexp:      regexp.MustCompile(`[英国國粤日][语語配](中字|繁字|无字|内嵌){0,1}版{0,1}|繁体中字|双语中字|中英双字|[国粤韩英日中德]{1,3}[双三][语轨]|双语源码|上海话`),
		Placeholder: ".",
		After: func(matchedContent string) *AfterResult {
			if matchedContent == "" {
				return nil
			}
			r1 := regexp.MustCompile(regexp.QuoteMeta(matchedContent) + `[eE]{0,1}[0-9]{1,}$`)
			if r1.MatchString(cur_filename) {
				return nil
			}
			r2 := regexp.MustCompile(`[^^]` + regexp.QuoteMeta(matchedContent) + `[^0-9]{0,}`)
			if !r2.MatchString(cur_filename) {
				return &AfterResult{Skip: true}
			}
			return nil
		},
	})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`中字|双字`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`([韩][语語]){0,1}[简官繁]中`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`[简繁]体`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`\([0-9]{4,}\)`)})
	extra_rules = append(extra_rules, ExtraRule{
		Regexp: regexp.MustCompile(`\.{0,1}[0-9]{1,}(end)`),
		Pick:   []int{1},
	})
	extra_rules = append(extra_rules, ExtraRule{
		Regexp: regexp.MustCompile(`(内封|内嵌|外挂){0,1}[简繁中英多双]{1,}[文语語]{0,1}字幕|无字|(内封|内嵌|内挂|无|[软硬])字幕版{0,1}|(内封|内嵌|外挂)(多国){0,1}字幕|(内封|内嵌|外挂)[简繁中英][简繁中英]|(内封|内嵌|外挂)`),
	})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`[\p{Han}]{0,}压制组{0,1}`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`\({0,1}CC标准\){0,1}`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`杜比视界`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`高清|超清|超高清|原码率\.{0,1}|小体积\.{0,1}`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`[1-9][0-9]{0,}分钟版`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`单集[0-9]{1,}[gG][bB]`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`重[置制]版`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`版本[1-9]{1,}`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`(压缩|会员|宝藏|等)版本{0,1}`)})
	// Resolution Rules
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`蓝光版{0,1}`)})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "resolution",
		Regexp: regexp.MustCompile(`(蓝光){0,1}(4[kK])\.{0,}`),
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "resolution",
		Regexp: regexp.MustCompile(`[bB][dD](720|1080|2160)[pP]`),
	})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`[fF][sS][0-9]{2,3}[pP]`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`[hH][qQ]`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`[vV][cC]-1\b`)})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "resolution",
		Regexp: regexp.MustCompile(`([hHbB][dD]){0,1}\.{0,1}[0-9]{3,4}\.{0,1}[xX×]\.{0,1}[0-9]{3,4}`),
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "resolution",
		Regexp: regexp.MustCompile(`HD(360|720|1080|2160)[pP]{0,1}(×265){0,1}`),
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "resolution",
		Regexp: regexp.MustCompile(`（{0,1}(360|720|1080|2160)[pPiI]）{0,1}`),
	})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`[0-9]{1,}(帧|[fF][pP][sS])`)})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "resolution",
		Regexp: regexp.MustCompile(`[hH][dD]1080[pP]`),
	})

	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`会员plus版|高内存版`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`CCTV\.Version`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`[pP][aA][rR][tT]\.{0,1}[1-9]{1}(\.|$)`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`高码[率]{0,1}|修复版{0,1}|[0-9]{1,}重[置制]版\.{0,1}`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`多语版|网络版|劇場版|合成版|连续剧版|亚马逊版|迪士尼版|\.Extended`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`[俄]版`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`([0-9]{1,}部){0,1}剧场版`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`无台标(水印版){0,1}`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`无水印|三无|[无未]删减|正片`)})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "extra1",
		Regexp: regexp.MustCompile(`去片头片尾`),
	})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`片头(片中){0,1}`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`片尾\+{0,1}`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`去{0,1}广告`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`洗码[0-9]{0,}`)})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "extra1",
		Regexp: regexp.MustCompile(`纯享版`),
		Before: func() *BeforeResult {
			cur_filename = regexp.MustCompile(`[\.]{2,}`).ReplaceAllString(cur_filename, "`")
			cur_filename = regexp.MustCompile(`^\.{0,1}`).ReplaceAllString(cur_filename, "")
			cur_filename = regexp.MustCompile("^[- .`]+").ReplaceAllString(cur_filename, "")
			return nil
		},
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "extra1",
		Regexp: regexp.MustCompile(`纯享`),
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "extra2",
		Regexp: regexp.MustCompile(`加长版|plus版`),
	})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`\({0,1}[0-9]{1,}版\){0,1}`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`(爱奇艺版|亚马逊版|原版|新版|完整版|收藏版)(备份){0,1}`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`非{0,1}[a-zA-Z]{1,}版`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`(经典){0,1}(本港台|台版|台剧|怀旧)`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`（{0,1}僅限港澳台地區）{0,1}`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`(完整){0,1}全集`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`国漫|[0-9]{1,}年日剧\.{0,1}`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`[泰]剧\.{0,}`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`[0-9]{1,}集特别版`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`[0-9]{1,}部MV`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`高分(战争|爱情|悬疑)剧`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`豆瓣[0-9\.]{1,}分{0,1}`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`【{0,1}[0-9]{1,5}(\.[0-9]{1,5}){0,1}([gG]|[mM])[bB]{0,1}】{0,1}\.{0,1}$`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`[nN][oO]\.[0-9]{1,}｜{0,1}`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`^№[0-9]{1,}\.{1,}`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`GB`)})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`REMASTERED`)})

	extra_rules = append(extra_rules, ExtraRule{
		Desc:   "总集数1",
		Regexp: regexp.MustCompile(`[eE][pP][0-9]{1,}-([0-9]{1,})`),
		Before: func() *BeforeResult {
			if regexp.MustCompile(`[eE][pP][0-9]{1,}-[0-9]{1,}\.[12][0-9]{3}`).MatchString(cur_filename) {
				return &BeforeResult{Skip: true}
			}
			return nil
		},
	})
	extra_rules = append(extra_rules, ExtraRule{
		Desc:   "总集数2",
		Regexp: regexp.MustCompile(`全([0-9]{1,})[集話话]`),
	})
	extra_rules = append(extra_rules, ExtraRule{
		Desc:   "总集数4",
		Regexp: regexp.MustCompile(`[0-9]{1,}-[0-9]{1,}[集話话]全`),
	})
	extra_rules = append(extra_rules, ExtraRule{
		Desc:   "总集数3",
		Regexp: regexp.MustCompile(`([0-9]{1,})[集話话]全`),
	})

	// Audio / Video Codec
	extra_rules = append(extra_rules, ExtraRule{Key: "voice_encode", Regexp: regexp.MustCompile(`[dD][tT][sS]-{0,1}[hH][dD]([\.-][Mm][Aa]){0,1}(\.5\.1){0,1}`)})
	extra_rules = append(extra_rules, ExtraRule{Key: "voice_encode", Regexp: regexp.MustCompile(`[tT][rR][uU][eE][hH][dD]`)})
	extra_rules = append(extra_rules, ExtraRule{Key: "voice_encode", Regexp: regexp.MustCompile(`[aA][cC]3`)})
	extra_rules = append(extra_rules, ExtraRule{Key: "voice_encode", Regexp: regexp.MustCompile(`[dD][dD][pP]5\.1`)})
	extra_rules = append(extra_rules, ExtraRule{Key: "voice_encode", Regexp: regexp.MustCompile(`[dD][dD][pP]2\.0`)})
	extra_rules = append(extra_rules, ExtraRule{Key: "voice_encode", Regexp: regexp.MustCompile(`[aA][aA][cC]([257]\.1){0,1}`)})

	extra_rules = append(extra_rules, ExtraRule{
		Key:    "encode",
		Regexp: regexp.MustCompile(`[xX×]{0,1}[hH]{0,1}[dD]{0,1}\.26[45]`),
	})
	extra_rules = append(extra_rules, ExtraRule{Key: "encode", Regexp: regexp.MustCompile(`[xX]26[45]`)})
	extra_rules = append(extra_rules, ExtraRule{Key: "encode", Regexp: regexp.MustCompile(`[hH]26[45]`)})
	extra_rules = append(extra_rules, ExtraRule{Key: "encode", Regexp: regexp.MustCompile(`[aA][vV]1`)})
	extra_rules = append(extra_rules, ExtraRule{Key: "encode", Regexp: regexp.MustCompile(`[hH][eE][vV][cC]`)})
	extra_rules = append(extra_rules, ExtraRule{Key: "encode", Regexp: regexp.MustCompile(`[aA][vV][c]`)})
	extra_rules = append(extra_rules, ExtraRule{Key: "encode", Regexp: regexp.MustCompile(`[mM][pP][eE][gG]4`)})
	extra_rules = append(extra_rules, ExtraRule{Key: "encode", Regexp: regexp.MustCompile(`[mM][pP][gG]`)})

	// Language / Subtitle / Region / Version / Container / Other
	extra_rules = append(extra_rules, ExtraRule{Key: "voice_type", Regexp: regexp.MustCompile(`[cC][hH][sS]`)})
	extra_rules = append(extra_rules, ExtraRule{Key: "voice_type", Regexp: regexp.MustCompile(`[cC][hH][tT]`)})
	extra_rules = append(extra_rules, ExtraRule{Key: "voice_type", Regexp: regexp.MustCompile(`[eE][nN][gG]`)})
	extra_rules = append(extra_rules, ExtraRule{Key: "voice_type", Regexp: regexp.MustCompile(`[jJ][pP][nN]`)})

	extra_rules = append(extra_rules, ExtraRule{Key: "subtitle_lang", Regexp: regexp.MustCompile(`[iI][nN][tT][eE][rR][nN][aA][lL]`)})
	extra_rules = append(extra_rules, ExtraRule{Key: "subtitle_lang", Regexp: regexp.MustCompile(`[eE][xX][tT][eE][rR][nN][aA][lL]`)})

	extra_rules = append(extra_rules, ExtraRule{Key: "version", Regexp: regexp.MustCompile(`[vV][23]`)})

	extra_rules = append(extra_rules, ExtraRule{Key: "extra1", Regexp: regexp.MustCompile(`[rR][eE][pP][aA][cC][kK]`)})
	extra_rules = append(extra_rules, ExtraRule{Key: "extra1", Regexp: regexp.MustCompile(`[rR][eE][mM][uU][xX]`)})

	// Total Season / Season
	extra_rules = append(extra_rules, ExtraRule{
		Desc:   "总季数1",
		Regexp: regexp.MustCompile(`([1-9]{1,}[-+][1-9]{1,})[季部][全]{0,1}`),
	})
	extra_rules = append(extra_rules, ExtraRule{Regexp: regexp.MustCompile(`前[1-9]{1,2}季`)})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "season",
		Regexp: regexp.MustCompile(`第[0-9]{1,}[季]`),
		Before: func() *BeforeResult {
			cur_filename = regexp.MustCompile(`(第[1-9]{1,}[季])([0-9]{1,})`).ReplaceAllString(cur_filename, "$1.E$2")
			return nil
		},
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "season",
		Desc:   "special season1",
		Regexp: regexp.MustCompile(`本篇|完结篇|\bOVA([^编編篇]{1,}[编編篇]){0,1}|特典映像|番外篇|特辑篇|PV|泡面番`),
		Before: func() *BeforeResult {
			cur_filename = regexp.MustCompile(`PV([0-9]{1,})`).ReplaceAllString(cur_filename, "PV.E$1")
			return nil
		},
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "season",
		Desc:   "special season3",
		Regexp: regexp.MustCompile(`[sS][pP]`),
		Before: func() *BeforeResult {
			reSpecial := regexp.MustCompile(`(^|[^a-zA-Z])([sS][pP])($|[^a-zA-Z])`)
			if reSpecial.MatchString(cur_filename) {
				reSpecialNum := regexp.MustCompile(`(^|[^a-zA-Z])([sS][pP])([0-9]{1,})($|[^a-zA-Z])`)
				if reSpecialNum.MatchString(cur_filename) {
					cur_filename = reSpecialNum.ReplaceAllString(cur_filename, "$1.SP.E$3.$4")
					return nil
				}
				cur_filename = reSpecial.ReplaceAllString(cur_filename, "$1.SP.$3")
				return nil
			}
			return &BeforeResult{Skip: true}
		},
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "season",
		Regexp: regexp.MustCompile(`第[\p{Han}]{1,}[季]`),
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:         "season",
		Regexp:      regexp.MustCompile(`（[一二三四五六七]{1,}）`),
		Placeholder: ".",
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "season",
		Regexp: regexp.MustCompile(`\bVI{1,3}\b|\bIX|\bIV|\bIII|Ⅱ|\bII`),
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "season",
		Regexp: regexp.MustCompile(`\.(X)\.[^a-zA-Z]`),
		Pick:   []int{1},
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "season",
		Regexp: regexp.MustCompile(`[sS][eE]{0,1}[0-9]{1,}`),
		Before: func() *BeforeResult {
			if result.Episode != "" {
				return nil
			}
			// TS: xxxxep01 xxxxe01 -> skip
			if regexp.MustCompile(`[^sS][eE][pP]{0,1}[0-9]{1,}`).MatchString(cur_filename) {
				return nil
			}
			cur_filename = normalizeEpisodeText(cur_filename)
			return nil
		},
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "season",
		Regexp: regexp.MustCompile(`season\.V`),
	})

	// Variety Episode Rules
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "episode",
		Regexp: regexp.MustCompile(`[01][0-9][0123][0-9]\.[123][0-9]{3}`),
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "episode",
		Regexp: regexp.MustCompile(`[0-9]{4,8}\.{0,1}-{0,1}慢{0,1}直播(第[0-9]{1,}[期局场]){0,1}`),
		Before: func() *BeforeResult {
			if regexp.MustCompile(`[0-9]{1,}[期局场]：`).MatchString(cur_filename) {
				cur_filename = regexp.MustCompile(`([0-9]{1,}[期局场])：`).ReplaceAllString(cur_filename, "$1.")
			}
			return nil
		},
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "episode",
		Regexp: regexp.MustCompile(`[0-9]{4,8}\.{0,1}-{0,1}Plus\.{0,1}(第[0-9]{1,}[期局场]){0,1}`),
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "episode",
		Regexp: regexp.MustCompile(`[0-9]{4,8}\.{0,1}-{0,1}(独家){0,1}直拍(第[0-9]{1,}[期局场]){0,1}`),
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "episode",
		Regexp: regexp.MustCompile(`[0-9]{4,8}\.{0,1}-{0,1}(特别企划|加更版|先导片|彩蛋|超前营业)(第[0-9]{1,}[期局场]){0,1}`),
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:      "episode",
		Regexp:   regexp.MustCompile(`第{0,1}[12][0-9]{3}[012][0-9][0123][0-9]期`),
		Priority: 1,
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "episode",
		Regexp: regexp.MustCompile(`^([123][0-9]{1,4}[-.年]{0,1}){0,1}0[1-9][-.月]{0,1}[0-3][0-9][期局场]{0,1}-{0,1}\.{0,1}[上下]{0,1}`),
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "episode",
		Regexp: regexp.MustCompile(`^([123][0-9]{1,4}[-.年]{0,1}){0,1}1[0-2][-.月]{0,1}[0-3][0-9][期局场]{0,1}-{0,1}\.{0,1}[上下]{0,1}`),
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "episode",
		Regexp: regexp.MustCompile(`第{0,1}[123][0-9]{7}\.{0,1}[上下]{0,1}[期局场]{0,1}`),
		Before: func() *BeforeResult {
			if regexp.MustCompile(`[123][0-9]{7}\.{0,1}-{0,1}期：`).MatchString(cur_filename) {
				cur_filename = regexp.MustCompile(`期：`).ReplaceAllString(cur_filename, "期.")
			}
			return nil
		},
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "episode",
		Regexp: regexp.MustCompile(`第[01][0-9]\.{0,1}[123][0-9][期局场]`),
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:      "episode",
		Regexp:   regexp.MustCompile(`第{0,1}[0-9]{1,}[期局场][.-]{0,1}[上下]`),
		Priority: 1,
		Before: func() *BeforeResult {
			re := regexp.MustCompile(`第{0,1}[0-9]{1,}[期局场][.-]{0,1}[上下]`)
			if result.Episode != "" && regexp.MustCompile(`^[0-9]{4,8}`).MatchString(result.Episode) {
				if re.MatchString(cur_filename) {
					cur_filename = re.ReplaceAllString(cur_filename, "")
				}
				return &BeforeResult{Skip: true}
			}
			return nil
		},
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:      "episode",
		Regexp:   regexp.MustCompile(`第{0,1}[0-9]{1,}[期局场]\.{0,1}\([上下]\)`),
		Priority: 1,
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "episode",
		Regexp: regexp.MustCompile(`第{0,1}[0-9]{1,}[期局场]`),
		Before: func() *BeforeResult {
			re := regexp.MustCompile(`第{0,1}[0-9]{1,}[期局场]`)
			if result.Episode != "" && regexp.MustCompile(`^[0-9]{4,8}`).MatchString(result.Episode) {
				if re.MatchString(cur_filename) {
					cur_filename = re.ReplaceAllString(cur_filename, "")
				}
				return &BeforeResult{Skip: true}
			}
			cur_filename = regexp.MustCompile(`^[：:]`).ReplaceAllString(cur_filename, ".")
			return nil
		},
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "episode",
		Regexp: regexp.MustCompile(`(特别|超前)企划`),
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "episode",
		Regexp: regexp.MustCompile(`集结篇：{0,1}[^$]{1,}`),
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "episode",
		Regexp: regexp.MustCompile(`先导片：{0,1}[^$]{1,}`),
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "episode",
		Regexp: regexp.MustCompile(`[123][0-9]{1,3}[-.][01][0-9][-.][0-3][0-9]`),
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "episode",
		Regexp: regexp.MustCompile(`[123][0-9]{1,3}[01][0-9][0123][0-9][局期]{0,1}`),
	})

	// TV Episode Rules
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "episode",
		Regexp: regexp.MustCompile(`\b([nN][cC][eEoO][dDpP][0-9]{0,})`),
		Pick:   []int{1},
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "episode",
		Regexp: regexp.MustCompile(`[cC][mM][0-9]{1,}`),
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "episode",
		Regexp: regexp.MustCompile(`^[01][0-9][0123][0-9](-|$)`),
		Before: func() *BeforeResult {
			cur_filename = regexp.MustCompile(`^\.{2,}`).ReplaceAllString(cur_filename, "")
			cur_filename = regexp.MustCompile(`\.{1,}$`).ReplaceAllString(cur_filename, "")
			return nil
		},
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "episode",
		Regexp: regexp.MustCompile(`^[0-9]{1,3}(-|$)`),
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "episode",
		Regexp: regexp.MustCompile(`第[0-9]{1,}[\.$]`),
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "episode",
		Regexp: regexp.MustCompile(`特别篇[0-9]{1,}`),
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "episode",
		Regexp: regexp.MustCompile(`预告[0-9]{0,}`),
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:         "episode",
		Regexp:      regexp.MustCompile(`续集|特辑|OAD\.{0,1}[0-9]{1,}|彩蛋[0-9]{0,}|花絮[0-9]{0,}|番外[0-9]{0,}|BONUS|[pP][rR][0-9]{0,}[\.$]`),
		Placeholder: ".",
		Priority:    -1,
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:      "episode",
		Regexp:   regexp.MustCompile(`第[\p{Han}]{1,}[集話话期局场]`),
		Priority: 1,
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:      "episode",
		Regexp:   regexp.MustCompile(`第{0,1}[0-9]{1,}[集話话期局场]`),
		Priority: 1,
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "episode",
		Regexp: regexp.MustCompile(`\b[eE][pP]{0,1}[0-9]{1,}-[eE][0-9]{1,}`),
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "episode",
		Regexp: regexp.MustCompile(`\b[eE][pP]{0,1}[0-9]{1,}-[0-9]{1,}`),
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "episode",
		Regexp: regexp.MustCompile(`\b[eE][pP]{0,1}[0-9]{1,}[eE][0-9]{1,}`),
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "episode",
		Regexp: regexp.MustCompile(`\b([eE][pP]{0,1}[0-9]{1,}[上下]{0,1})`),
		Pick:   []int{1},
	})
	// Episode v2 matches TS 1003: regexp: /([0-9]{1,})[vV][234]/
	// Go implementation is slightly different below, keeping it as is for now or merging?
	// The existing Go Episode v2 (lines 481-492) handles [0-9]{1,}[vV][0-9].
	// TS 1013: regexp: /[\u4e00-\u9fa5]{1,}(0[1-9]{1,2})\./
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "episode",
		Regexp: regexp.MustCompile(`[\p{Han}]{1,}(0[1-9]{1,2})\.`),
		Pick:   []int{1},
	})

	// Episode v2
	extra_rules = append(extra_rules, ExtraRule{
		Key:         "episode",
		Regexp:      regexp.MustCompile(`[0-9]{1,}[vV][0-9]`),
		Placeholder: ".",
		Before: func() *BeforeResult {
			r1 := regexp.MustCompile(`^[0-9]{1,}[vV][0-9]`)
			if r1.MatchString(cur_filename) {
				return nil
			}
			return &BeforeResult{Skip: true}
		},
	})

	// Episode v3
	extra_rules = append(extra_rules, ExtraRule{
		Key:         "episode",
		Regexp:      regexp.MustCompile(`[0-9]{1,}(\.[0-9]{1,}){0,1}$`),
		Placeholder: ".",
		Before: func() *BeforeResult {
			r1 := regexp.MustCompile(`\-([0-9]{1,}(\.[0-9]{1,}){0,1})$`)
			if r1.MatchString(cur_filename) {
				// Handle 洗冤录1-01 case - don't strip the leading number if it's part of Chinese name
				rName := regexp.MustCompile(`[\p{Han}]+[0-9]+-[0-9]+$`)
				if rName.MatchString(cur_filename) {
					return &BeforeResult{Skip: true}
				}
				// Remove the preceding dash, keep the number for the main regex
				cur_filename = r1.ReplaceAllString(cur_filename, ".$1")
				return nil
			}
			r2 := regexp.MustCompile(` [0-9]{1,}(\.[0-9]{1,}){0,1}$`)
			if r2.MatchString(cur_filename) {
				return nil
			}
			r3 := regexp.MustCompile(`第[0-9]{1,}(\.[0-9]{1,}){0,1}[话話集]`)
			if r3.MatchString(original_filename) {
				return nil
			}
			return &BeforeResult{Skip: true}
		},
	})

	// Episode v4 - REMOVED (Not in TS)

	// TS 1020: "number.number 结尾的剧集名" e.g. 十八年后的告白2.0
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "name",
		Desc:   "number.number 结尾的剧集名",
		Regexp: regexp.MustCompile(`([\p{Han}]{1,}[0-9]{1}\.[0-9]{1})([^0-9]|$)`),
		Pick:   []int{1},
		Before: func() *BeforeResult {
			cur_filename = regexp.MustCompile(`([123][0-9]{3})([\p{Han}]{2,})([0-9]{1,})$`).ReplaceAllString(cur_filename, "$2.$1.$3.$4")
			return nil
		},
	})

	// TS 1036: English + Chinese
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "name",
		Regexp: regexp.MustCompile(`(?:^|\.)([a-zA-Z]{1,}(?:\.[a-zA-Z]{1,}){0,}[\p{Han}]{1,})`),
		Pick:   []int{1},
	})

	// TS 1050: Japanese
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "name",
		Desc:   "japanese name",
		Regexp: regexp.MustCompile(`^\[{0,1}[0-9]{0,}([\x{3040}-\x{30ff}\x{3400}-\x{4dbf}\x{4e00}-\x{9fff}][0-9a-zA-Z\x{3040}-\x{30ff}\x{3400}-\x{4dbf}\x{4e00}-\x{9fff}，：！· ]{0,}[0-9a-zA-Z\x{3040}-\x{30ff}\x{3400}-\x{4dbf}\x{4e00}-\x{9fff}！])\]{0,1}`),
		Before: func() *BeforeResult {
			if !isJapanese(cur_filename) {
				return &BeforeResult{Skip: true}
			}
			return nil
		},
		After: func(matchedContent string) *AfterResult {
			if matchedContent == "" {
				return nil
			}
			i := strings.Index(original_filename, matchedContent)
			if result.Season != "" {
				seasonIndex := strings.Index(original_filename, result.Season)
				if seasonIndex != -1 && seasonIndex < i {
					return &AfterResult{Skip: true}
				}
			}
			if result.Episode != "" {
				episodeIndex := strings.Index(original_filename, result.Episode)
				if episodeIndex != -1 && episodeIndex < i {
					return &AfterResult{Skip: true}
				}
			}
			return nil
		},
		Pick: []int{1},
	})

	// Japanese original name (similar to Korean original name)
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "original_name",
		Desc:   "japanese original name",
		Regexp: regexp.MustCompile(`[\.\-_ ]{1}([\x{3040}-\x{30ff}\x{3400}-\x{4dbf}][0-9a-zA-Z\x{3040}-\x{30ff}\x{3400}-\x{4dbf}，：！· ]{0,}[\x{3040}-\x{30ff}\x{3400}-\x{4dbf}0-9a-zA-Z!]*)`),
		Pick:   []int{1},
		Before: func() *BeforeResult {
			if !isJapanese(cur_filename) {
				return &BeforeResult{Skip: true}
			}
			return nil
		},
	})

	// TS 1085: Korean
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "original_name",
		Desc:   "korean name",
		Regexp: regexp.MustCompile(`\[{0,1}[0-9]{0,}[\x{ac00}-\x{d7a3}][0-9a-zA-Z\x{ac00}-\x{d7a3}，：·]{0,}[\x{ac00}-\x{d7a3}0-9a-zA-Z]`),
	})

	// TS 1092: Chinese Name 1 (Number Start)
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "name",
		Desc:   "chinese name1",
		Regexp: regexp.MustCompile(`^([0-9]{1,}[：\p{Han}]{1,})(?:[\.\-` + "`" + `]|$)`),
		Pick:   []int{1},
	})

	// TS 1099: Chinese Name 2 (Single Char)
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "name",
		Desc:   "chinese name2",
		Regexp: regexp.MustCompile(`^([\p{Han}])\.`),
		Pick:   []int{1},
	})

	// TS 1106: Chinese Name 3 (Chinese Start)
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "name",
		Desc:   "chinese name with trailing number before dash",
		Regexp: regexp.MustCompile(`^([\p{Han}]{1,}[0-9]+)-[0-9]+`),
		Pick:   []int{1},
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "name",
		Desc:   "chinese name3",
		Regexp: regexp.MustCompile(`^\[{0,1}([0-9]{0,}[\p{Han}][0-9a-zA-Z\p{Han}！：，"",·、■（）]{0,}[0-9a-zA-Z\p{Han}！：，"",（）～！""])\]{0,1}`),
		Before: func() *BeforeResult {
			// TS: Handle 1981.Name -> Name.1981
			r1 := regexp.MustCompile(`^([12][0-9]{3}\.{1,})([\p{Han}A-Za-z0-9！：，（）～~"",·、■.-]{1,})`)
			if r1.MatchString(cur_filename) {
				cur_filename = r1.ReplaceAllString(cur_filename, "$2.$1")
			}
			// Handle BURN-E.电焊工波力 -> 电焊工波力.BURN-E
			r1b := regexp.MustCompile(`^([a-zA-Z][a-zA-Z-]{1,}\.)([\p{Han}]{1,})`)
			if r1b.MatchString(cur_filename) {
				cur_filename = r1b.ReplaceAllString(cur_filename, "$2.$1")
			}
			// TS: Handle NameS02 -> Name.S02
			r2 := regexp.MustCompile(`^([\p{Han}]{1,})([sS][0-9]{1,})`)
			if r2.MatchString(cur_filename) {
				cur_filename = r2.ReplaceAllString(cur_filename, "$1.$2")
			}
			// Handle 洗冤录1-01 -> 洗冤录.1-01
			r3 := regexp.MustCompile(`^([\p{Han}]+)([0-9]+-[0-9]+)`)
			if r3.MatchString(cur_filename) {
				cur_filename = r3.ReplaceAllString(cur_filename, "$1.$2")
			}
			// Strip leading dots so ^anchor can match the name
			cur_filename = regexp.MustCompile(`^\.{1,}`).ReplaceAllString(cur_filename, "")

			if isJapanese(cur_filename) {
				return &BeforeResult{Skip: true}
			}
			return nil
		},
		After: func(matchedContent string) *AfterResult {
			if result.Episode != "" {
				// Cleanup episode dots
				result.Episode = strings.Trim(result.Episode, ".")
				if matchedContent != "" {
					nameIndex := strings.Index(original_filename, matchedContent)
					episodeIndex := strings.Index(original_filename, result.Episode)
					if nameIndex != -1 && episodeIndex != -1 && nameIndex > episodeIndex {
						return &AfterResult{Skip: true}
					}
				}
			}
			return nil
		},
		Pick: []int{1},
	})

	// TS 1153: Chinese Name 4 (English Start)
	extra_rules = append(extra_rules, ExtraRule{
		Key:      "name",
		Desc:     "chinese name4",
		Regexp:   regexp.MustCompile(`^[a-zA-Z]{1,}\.{0,1}[a-zA-Z0-9\p{Han}！：，（）～~"'-]{1,}[\p{Han}！：，（）～~"'-]{1,}`),
		Priority: -1,
		After: func(matchedContent string) *AfterResult {
			if matchedContent == "" {
				return nil
			}
			if !regexp.MustCompile(`\p{Han}`).MatchString(matchedContent) {
				return &AfterResult{Skip: true}
			}
			return nil
		},
	})

	// TS 1184: Chinese Name 4 (Number Start)
	extra_rules = append(extra_rules, ExtraRule{
		Key:      "original_name",
		Regexp:   regexp.MustCompile(`^([a-zA-Z-!]{1,}\.{1}){0,}[a-zA-Z-!]{1,}(\.[0-9]{1,2}){0,1}(\.|$)`),
		Priority: -1,
		Before: func() *BeforeResult {
			cur_filename = strings.TrimSuffix(cur_filename, "`")
			// Skip if looks like year pattern (4 digits followed by resolution/source)
			if regexp.MustCompile(`\.[12][0-9]{3}\.[a-zA-Z]`).MatchString(cur_filename) || regexp.MustCompile(`\.[12][0-9]{3}\.[a-zA-Z]`).MatchString(original_filename) {
				return &BeforeResult{Skip: true}
			}
			return nil
		},
		After: func(matchedContent string) *AfterResult {
			if matchedContent == "" {
				return nil
			}
			// Skip if the matched content ends with suffix like -IMAX, -WEB, etc.
			if regexp.MustCompile(`-[A-Z]{2,}$`).MatchString(matchedContent) {
				return &AfterResult{Skip: true}
			}
			originalNameIndex := strings.Index(original_filename, matchedContent)
			if result.Season != "" {
				seasonIndex := strings.Index(original_filename, result.Season)
				if seasonIndex != -1 && seasonIndex < originalNameIndex {
					return &AfterResult{Skip: true}
				}
			}
			return nil
		},
	})

	// Year
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "year",
		Regexp: regexp.MustCompile(`[(（]{0,1}[0-9]{4}-[0-9]{4}[）)]{0,1}`),
		Before: func() *BeforeResult {
			if regexp.MustCompile(`^[0-9]{4}\.`).MatchString(cur_filename) {
				cur_filename = regexp.MustCompile(`^([0-9]{4})\.`).ReplaceAllString(cur_filename, "$1")
			}
			return nil
		},
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "year",
		Regexp: regexp.MustCompile(`[123][0-9]{3}[-/][0-9]{1,2}[-/][0-9]{1,2}`),
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "year",
		Regexp: regexp.MustCompile(`[(（]{0,1}[123]{1}[0-9]{3}[）)]{0,1}年{0,1}`),
		Before: func() *BeforeResult {
			if regexp.MustCompile(`^[0-9]{4}\.`).MatchString(cur_filename) {
				cur_filename = regexp.MustCompile(`^([0-9]{4})\.`).ReplaceAllString(cur_filename, "$1")
			}
			return nil
		},
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "year",
		Regexp: regexp.MustCompile(`^[12][0-9]{3}`),
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:         "year",
		Regexp:      regexp.MustCompile(`\.[12][0-9]{3}\.`),
		Placeholder: ".",
		Priority:    1,
		Before: func() *BeforeResult {
			if regexp.MustCompile(`\.(360|480|720|1080|2160)\.`).MatchString(cur_filename) {
				return &BeforeResult{Skip: true}
			}
			return nil
		},
	})

	// Source
	extra_rules = append(extra_rules, ExtraRule{Key: "source", Regexp: regexp.MustCompile(`[wW][eE][bB]-[dD][lL]`)})
	extra_rules = append(extra_rules, ExtraRule{Key: "source", Regexp: regexp.MustCompile(`[bB][lL][uU]-[rR][aA][yY]`)})
	extra_rules = append(extra_rules, ExtraRule{Key: "source", Regexp: regexp.MustCompile(`[wW][eE][bB][rR][iI][pP]`)})
	extra_rules = append(extra_rules, ExtraRule{Key: "source", Regexp: regexp.MustCompile(`[bB][dD][rR][iI][pP]`)})
	extra_rules = append(extra_rules, ExtraRule{Key: "source", Regexp: regexp.MustCompile(`[hH][dD][tT][vV]`)})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "source",
		Regexp: regexp.MustCompile(`(HMAX){0,1}[wW][eE][bB](-IMAX){0,1}(-HR){0,1}([Rr][i][p]){0,1}(-{0,1}[dD][lL]){0,1}`),
	})
	extra_rules = append(extra_rules, ExtraRule{Key: "source", Regexp: regexp.MustCompile(`[wW][eE][bB]`)})
	extra_rules = append(extra_rules, ExtraRule{Key: "source", Regexp: regexp.MustCompile(`[hH][dD][rR][iI][pP]`)})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "source",
		Regexp: regexp.MustCompile(`HDTV([Rr][Ii][Pp]){0,1}`),
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "source",
		Regexp: regexp.MustCompile(`(UHD)[-.]?[bB][lL][uU][-.]?[rR][aA][yY]|[bB][lL][uU][-.]?[rR][aA][yY]`),
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "source",
		Regexp: regexp.MustCompile(`([bB][dD]|[wW][eE][bB]|[dD][vV][dD])-{0,1}[rR][iI][pP]`),
	})

	// Resolution / HDR / Bitrate
	extra_rules = append(extra_rules, ExtraRule{
		Regexp: regexp.MustCompile(`\({0,1}([SH]DR|DV|HLG)\){0,1}([0-9]{1,}){0,1}`),
	})
	extra_rules = append(extra_rules, ExtraRule{
		Regexp: regexp.MustCompile(`[0-9]{1,}[bB][iI][tT]`),
	})

	// Subtitle
	extra_rules = append(extra_rules, ExtraRule{
		Regexp: regexp.MustCompile(`Eng\.SubEngSDH`),
	})

	// Misc date dots
	extra_rules = append(extra_rules, ExtraRule{
		Regexp: regexp.MustCompile(`\.[0-9]\.[0-9]\.`),
	})

	// Season Fallback
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "season",
		Regexp: regexp.MustCompile(`[sS][eE]{0,1}[0-9]{1,}`),
		Before: func() *BeforeResult {
			// log("[season]filename before add E char or S char", curFilename)
			if result.Episode != "" {
				return &BeforeResult{Skip: true}
			}
			// xxxxep01 xxxxe01 -> skip
			// TS: /[^sS](?![sS])[eE][pP]{0,1}[0-9]{1,}/
			// Go regex doesn't support lookahead.
			// Equivalent: match non-S char followed by (EP|E|P)digits
			// But TS `(?![sS])` is negative lookahead "not followed by sS".
			// `[^sS]` matches a char that is not sS.
			// `[^sS][eE][pP]{0,1}[0-9]{1,}` matches "xe01" where x is not s.
			// We can approximate.
			if regexp.MustCompile(`[^sS][eE][pP]{0,1}[0-9]{1,}`).MatchString(cur_filename) {
				return &BeforeResult{Skip: true}
			}

			cur_filename = normalizeEpisodeText(cur_filename)
			return nil
		},
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "season",
		Regexp: regexp.MustCompile(`[1-9]{1,}[nN][dD]\.Season`),
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "season",
		Regexp: regexp.MustCompile(`Season\.{0,}[0-9]{1,}`),
	})

	// Episode Fallback
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "episode",
		Regexp: regexp.MustCompile(`[_-][0-9]{1,}`),
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "episode",
		Regexp: regexp.MustCompile(`^\.([0-9]{1,})\.`),
		Pick:   []int{1},
		Before: func() *BeforeResult {
			// Skip if episode was already captured from SxxExx pattern
			if result.Episode != "" && result.Season != "" {
				return &BeforeResult{Skip: true}
			}
			return nil
		},
		After: func(matchedContent string) *AfterResult {
			// fmt.Printf("[debug] After hook checking: %s\n", matchedContent)
			if regexp.MustCompile(`^\.?([0-9]{3,4})\.?$`).MatchString(matchedContent) {
				nums := regexp.MustCompile(`[0-9]{3,4}`).FindString(matchedContent)
				if regexp.MustCompile(`^(360|480|720|1080|2160|4320)$`).MatchString(nums) {
					return &AfterResult{Skip: true}
				}
			}
			return nil
		},
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "episode",
		Regexp: regexp.MustCompile(`Episode\.[0-9]{1,}`),
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "episode",
		Regexp: regexp.MustCompile(`\.[（(]([0-9]{1,})[)）]`),
		Pick:   []int{1},
	})
	extra_rules = append(extra_rules, ExtraRule{
		Key:    "episode",
		Regexp: regexp.MustCompile(`\b([eE][pP]{0,1}[0-9]{1,})`),
		Pick:   []int{1},
		After: func(matchedContent string) *AfterResult {
			// fmt.Printf("[debug] After hook checking: %s\n", matchedContent)
			if regexp.MustCompile(`^\.?([0-9]{3,4})\.?$`).MatchString(matchedContent) {
				nums := regexp.MustCompile(`[0-9]{3,4}`).FindString(matchedContent)
				if regexp.MustCompile(`^(360|480|720|1080|2160|4320)$`).MatchString(nums) {
					return &AfterResult{Skip: true}
				}
			}
			return nil
		},
	})

	// Name / Episode Name Fallback
	// TS 1331: name_regexp
	// /[0-9a-zA-Z\u4e00-\u9fa5\u0400-\u04FF\uAC00-\uD7A3\u0800-\u4e00]{1,}[ \.\-&!,'（）：！？～×－0-9a-zA-Z\u4e00-\u9fa5\u0400-\u04FF\uAC00-\uD7A3\u0800-\u4e00]{1,}[）0-9a-zA-Z!！？－\u4e00-\u9fa5\u0400-\u04FF\uAC00-\uD7A3\u0800-\u4e00]/
	// Go equivalent unicode ranges:
	// \u4e00-\u9fa5 -> \p{Han} (mostly)
	// \u0400-\u04FF -> Cyrillic
	// \uAC00-\uD7A3 -> Hangul Syllables
	// \u0800-\u4e00 -> Misc (Kana etc)
	// We can use hex ranges in Go regexp.
	nameRegexpStr := `[\x{0400}-\x{04FF}\x{0800}-\x{4e00}\x{4e00}-\x{9fa5}\x{ac00}-\x{d7a3}0-9a-zA-Z]{1,}[ \.\-&!,'（）：！？～×－\x{0400}-\x{04FF}\x{0800}-\x{4e00}\x{4e00}-\x{9fa5}\x{ac00}-\x{d7a3}0-9a-zA-Z]{1,}[）\x{0400}-\x{04FF}\x{0800}-\x{4e00}\x{4e00}-\x{9fa5}\x{ac00}-\x{d7a3}0-9a-zA-Z!！？－]`
	nameRegexp := regexp.MustCompile(nameRegexpStr)

	removeMultipleDot := func() {
		cur_filename = regexp.MustCompile(`[\.]{2,}`).ReplaceAllString(cur_filename, "`")
		cur_filename = regexp.MustCompile(`^\.{0,1}`).ReplaceAllString(cur_filename, "")
	}

	extra_rules = append(extra_rules, ExtraRule{
		Key:      "original_name",
		Regexp:   nameRegexp,
		Priority: -1,
		Before: func() *BeforeResult {
			removeMultipleDot()
			return nil
		},
		After: func(matchedContent string) *AfterResult {
			if matchedContent == "" {
				return nil
			}
			// include_chinese check - skip if has Chinese (let name rule handle it)
			if regexp.MustCompile(`\p{Han}`).MatchString(matchedContent) {
				return &AfterResult{Skip: true}
			}

			originalNameIndex := strings.Index(original_filename, matchedContent)
			if result.Season != "" {
				seasonIndex := strings.Index(original_filename, result.Season)
				if seasonIndex != -1 && seasonIndex < originalNameIndex {
					return &AfterResult{Skip: true}
				}
			}

			if result.Episode != "" {
				// Check if digits exist in episode
				if !regexp.MustCompile(`[0-9]{1,}`).MatchString(result.Episode) {
					return nil
				}
				episodeIndex := strings.Index(original_filename, result.Episode)
				if episodeIndex != -1 && episodeIndex >= originalNameIndex {
					return nil
				}
				// check digits in episode
				matches := regexp.MustCompile(`[0-9]{1,}`).FindStringSubmatch(result.Episode)
				if len(matches) > 0 {
					episodeIndex2 := strings.Index(original_filename, matches[0])
					if episodeIndex2 != -1 && episodeIndex2 >= originalNameIndex {
						return nil
					}
				}

				return &AfterResult{Skip: true}
			}
			return nil
		},
	})

	extra_rules = append(extra_rules, ExtraRule{
		Key:      "original_name",
		Regexp:   regexp.MustCompile(`^([a-zA-Z-!]{1,}\.{1}){0,}[a-zA-Z-!]{1,}(\.[0-9]{1,2}){0,1}(\.|$)`),
		Priority: -1,
		Before: func() *BeforeResult {
			cur_filename = strings.TrimSuffix(cur_filename, "`")
			// Trim leading dots, spaces, dashes, backticks from the current filename
			// This handles cases like "`The.Legend" after year extraction
			cur_filename = regexp.MustCompile("^[.\\- `]+").ReplaceAllString(cur_filename, "")
			// Skip if Chinese name already captured and original has year pattern
			if result.Name != "" && regexp.MustCompile(`\.[12][0-9]{3}\.[a-zA-Z]`).MatchString(original_filename) {
				return &BeforeResult{Skip: true}
			}
			return nil
		},
		After: func(matchedContent string) *AfterResult {
			if matchedContent == "" {
				return nil
			}
			// Skip if the matched content ends with suffix like -IMAX, -WEB, etc.
			if regexp.MustCompile(`-[A-Z]{2,}$`).MatchString(matchedContent) {
				return &AfterResult{Skip: true}
			}
			originalNameIndex := strings.Index(original_filename, matchedContent)
			if result.Season != "" {
				seasonIndex := strings.Index(original_filename, result.Season)
				if seasonIndex != -1 && seasonIndex < originalNameIndex {
					return &AfterResult{Skip: true}
				}
			}
			return nil
		},
	})

	extra_rules = append(extra_rules, ExtraRule{
		Key:    "episode_name",
		Regexp: nameRegexp,
		Before: func() *BeforeResult {
			removeMultipleDot()
			return nil
		},
	})
	extra_rules = append(extra_rules, ExtraRule{Key: "source", Regexp: regexp.MustCompile(`[dD][vV][dD][rR][iI][pP]`)})
	extra_rules = append(extra_rules, ExtraRule{Key: "source", Regexp: regexp.MustCompile(`[dD][vV][dD]`)})

	// Name Extra Rules

	extra_rules = append(extra_rules, ExtraRule{
		Key:      "original_name",
		Regexp:   nameRegexp,
		Priority: -1,
		Before: func() *BeforeResult {
			removeMultipleDot()
			return nil
		},
		After: func(matchedContent string) *AfterResult {
			if matchedContent == "" {
				return nil
			}
			includeChinese := regexp.MustCompile(`[\p{Han}]`).MatchString(matchedContent)
			if includeChinese {
				return &AfterResult{Skip: true}
			}

			originalNameIndex := strings.Index(original_filename, matchedContent)
			if result.Season != "" {
				seasonIndex := strings.Index(original_filename, result.Season)
				if seasonIndex != -1 && seasonIndex < originalNameIndex {
					return &AfterResult{Skip: true}
				}
			}

			if result.Episode != "" {
				a := regexp.MustCompile(`[0-9]{1,}`).FindString(result.Episode)
				if a == "" {
					return nil
				}
				episodeIndex := strings.Index(original_filename, result.Episode)
				if episodeIndex != -1 && episodeIndex >= originalNameIndex {
					return nil
				}
				episodeIndex2 := strings.Index(original_filename, a)
				if episodeIndex2 != -1 && episodeIndex2 >= originalNameIndex {
					return nil
				}
				return &AfterResult{Skip: true}
			}
			return nil
		},
	})

	extra_rules = append(extra_rules, ExtraRule{
		Key:      "original_name",
		Regexp:   nameRegexp,
		Priority: -1,
		Before: func() *BeforeResult {
			removeMultipleDot()
			return nil
		},
		After: func(matchedContent string) *AfterResult {
			if matchedContent == "" {
				return nil
			}
			// If contains japanese/korean, it is also a name?
			// TS:
			// const include_chinese = /[\u4e00-\u9fa5]/.test(r[0]);
			// if (isJapanese(r[0])) return;
			// if (isKorean(r[0])) return;
			// if (!include_chinese) return { skip: true };

			if isJapanese(matchedContent) || isKorean(matchedContent) {
				return nil
			}

			includeChinese := regexp.MustCompile(`[\p{Han}]`).MatchString(matchedContent)
			if !includeChinese {
				// For English-only names, this rule sets Name
				// The original_name rule will handle cases where OriginalName is needed
				return nil
			}
			return nil
		},
	})

	// Fallback for name if no chinese
	extra_rules = append(extra_rules, ExtraRule{
		Key:      "name",
		Regexp:   nameRegexp,
		Priority: -1,
		Before: func() *BeforeResult {
			removeMultipleDot()
			return nil
		},
	})

	// Main Loop
	for _, rule := range extra_rules {
		if cur_filename == "" {
			break
		}
		if cur_filename == "." || cur_filename == "`" {
			break
		}

		unique := rule.Desc
		if unique == "" {
			unique = rule.Regexp.String()
		}

		if rule.Before != nil {
			r := rule.Before()
			if r != nil && r.Skip {
				continue
			}
		}

		if rule.Key != "" {
			if _, ok := priority_keys[rule.Key]; ok {
				continue
			}
		}

		m := rule.Regexp.FindStringSubmatchIndex(cur_filename)

		matchedString := ""
		if m != nil {
			matchedString = cur_filename[m[0]:m[1]]
		}

		if rule.After != nil {
			r := rule.After(matchedString)
			if r != nil && r.Skip {
				continue
			}
		}

		if m == nil {
			continue
		}

		extractedContent := ""
		pick := rule.Pick
		if len(pick) == 0 {
			pick = []int{0}
		}

		for _, index := range pick {
			// Ensure index is within bounds of submatches
			// m contains pairs of indices [start, end]
			// So index i corresponds to m[2*i] and m[2*i+1]
			if 2*index+1 >= len(m) || m[2*index] == -1 {
				continue
			}
			c := cur_filename[m[2*index]:m[2*index+1]]

			from := m[2*index]

			if c != "" {
				extractedContent += c
				placeholder := rule.Placeholder
				cur_filename = removeStr(cur_filename, from, len(c), placeholder)
			}
		}

		if rule.Key != "" && contains(VIDEO_ALL_KEYS, rule.Key) {
			if rule.Priority == 0 {
				if _, ok := priority_map[rule.Key]; ok {
					continue
				}
			}

			if rule.Priority == -1 {
				if getField(&result, rule.Key) != "" {
					continue
				}
			}

			if rule.Priority != 0 && rule.Priority != -1 {
				prevKeyPriority, hasPrev := priority_map[rule.Key]
				if hasPrev && rule.Priority <= prevKeyPriority {
					continue
				}
				if rule.Key == "name" || rule.Key == "original_name" || rule.Key == "episode" || rule.Key == "season" || rule.Key == "year" || rule.Key == "voice_encode" || rule.Key == "resolution" || rule.Key == "source" || rule.Key == "encode" {
					Logger.Info().Str("key", rule.Key).Str("extracted", extractedContent).Str("rule", unique).Msgf("Captured %s", rule.Key)
				}
				setField(&result, rule.Key, extractedContent)
				priority_map[rule.Key] = rule.Priority
			} else {
				if rule.Key == "name" || rule.Key == "original_name" || rule.Key == "episode" || rule.Key == "season" || rule.Key == "year" || rule.Key == "voice_encode" || rule.Key == "resolution" || rule.Key == "source" || rule.Key == "encode" {
					Logger.Info().Str("key", rule.Key).Str("extracted", extractedContent).Str("rule", unique).Msgf("Captured %s", rule.Key)
				}
				setField(&result, rule.Key, extractedContent)
			}
		}
	}

	// Post-processing
	// log("[7]finish!")
	if result.Season != "" {
		result.Season = formatSeasonNumber(result.Season)
	}
	if result.Episode != "" {
		result.Episode = formatEpisodeNumber(result.Episode)
	}

	if result.OriginalName != "" {
		result.OriginalName = strings.TrimRight(result.OriginalName, "-.")
	}

	if result.Season != "" && result.Episode == "" && result.Type != "" {
		// Likely a movie sequel
		seasonNumber := seasonToNum(result.Season)
		result.Season = ""
		if result.Name != "" {
			suffix := strconv.Itoa(seasonNumber)
			if !strings.HasSuffix(result.Name, suffix) {
				result.Name += suffix
			}
		}
		if result.OriginalName != "" {
			suffix := strconv.Itoa(seasonNumber)
			if !strings.HasSuffix(result.OriginalName, suffix) {
				result.OriginalName += suffix
			}
		}
	}

	if result.Season == "" && result.Episode != "" {
		result.Season = maybeOtherSeason(result.Episode)
	}

	if result.SubtitleLang != "" {
		result.SubtitleLang = formatSubtitleLang(result.SubtitleLang)
	}

	if result.Resolution != "" {
		result.Resolution = regexp.MustCompile(`[（\(\)）]`).ReplaceAllString(result.Resolution, "")
		result.Resolution = strings.TrimPrefix(result.Resolution, ".")
		result.Resolution = strings.TrimSuffix(result.Resolution, ".")
	}

	if result.VoiceType != "" {
		result.VoiceType = strings.TrimPrefix(result.VoiceType, ".")
	}

	if result.Extra1 != "" {
		if result.Extra1 == "去片头片尾" {
			result.Extra1 = "纯享版"
		}
		if result.Extra1 == "纯享" {
			result.Extra1 = "纯享版"
		}
	}

	return result
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

func getField(v *ParsedVideoInfo, key string) string {
	// Reflection or manual mapping
	// Manual mapping for safety and performance
	switch key {
	case "name":
		return v.Name
	case "original_name":
		return v.OriginalName
	case "season":
		return v.Season
	case "episode":
		return v.Episode
	case "type":
		return v.Type
	case "year":
		return v.Year
	case "resolution":
		return v.Resolution
	case "source":
		return v.Source
	case "encode":
		return v.Encode
	case "voice_encode":
		return v.VoiceEncode
	case "voice_type":
		return v.VoiceType
	case "subtitle_lang":
		return v.SubtitleLang
	case "extra1":
		return v.Extra1
	case "extra2":
		return v.Extra2
	case "episode_name":
		return v.EpisodeName
	}
	return ""
}

func setField(v *ParsedVideoInfo, key string, value string) {
	switch key {
	case "name":
		v.Name = value
	case "original_name":
		v.OriginalName = value
	case "season":
		v.Season = value
	case "episode":
		v.Episode = value
	case "type":
		v.Type = value
	case "year":
		v.Year = value
	case "resolution":
		v.Resolution = value
	case "source":
		v.Source = value
	case "encode":
		v.Encode = value
	case "voice_encode":
		v.VoiceEncode = value
	case "voice_type":
		v.VoiceType = value
	case "subtitle_lang":
		v.SubtitleLang = value
	case "extra1":
		v.Extra1 = value
	case "extra2":
		v.Extra2 = value
	case "episode_name":
		v.EpisodeName = value
	}
}

func maybeOtherSeason(episode string) string {
	if regexp.MustCompile(`BONUS|PR|NCOP|NCED|CM`).MatchString(episode) {
		return "其他"
	}
	return ""
}

func formatSubtitleLang(lang string) string {
	if strings.Contains(lang, "&") {
		return lang
	}
	if regexp.MustCompile(`2[cChH]{2,}`).MatchString(lang) {
		return "chi"
	}
	if regexp.MustCompile(`[zZ][hH]|[cC][hH][sS]`).MatchString(lang) {
		return "chi"
	}
	if regexp.MustCompile(`[zZ][hH]|[cC][hH][tT]`).MatchString(lang) {
		return "cht"
	}
	if regexp.MustCompile(`[eE][nN][gG]`).MatchString(lang) {
		return "eng"
	}
	if lang == "简英" {
		return "chi&eng"
	}
	return lang
}

func seasonToNum(str string) int {
	s := regexp.MustCompile(`[sS]`).ReplaceAllString(str, "")
	matches := regexp.MustCompile(`(\d+)`).FindAllString(s, -1)
	if len(matches) == 0 {
		return 0 // Default or error? TS returns Number(str) if no matches, which might be NaN. But here we expect int.
		// If str is "OVA", matches is empty.
		// If str is "S01", s="01", matches=["01"].
	}
	// TS loop: for let i=0... s=String(num).
	// Basically takes the last number found?
	// If "1 2", s="1", then s="2".
	// So it returns the last number.
	lastMatch := matches[len(matches)-1]
	val, _ := strconv.Atoi(lastMatch)
	return val
}

// Helper functions

func log(args ...interface{}) {
	Logger.Debug().Msg(fmt.Sprint(args...))
}

func isJapanese(text string) bool {
	chineseChar := len(regexp.MustCompile(`[\p{Han}]`).FindAllString(text, -1))
	// Japanese range roughly: \u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff
	japaneseChar := len(regexp.MustCompile(`[\x{3040}-\x{30ff}\x{3400}-\x{4dbf}\x{4e00}-\x{9fff}]`).FindAllString(text, -1))
	return japaneseChar > chineseChar
}

func isKorean(text string) bool {
	chineseChar := len(regexp.MustCompile(`[\p{Han}]`).FindAllString(text, -1))
	koreanChar := len(regexp.MustCompile(`[\x{ac00}-\x{d7a3}]`).FindAllString(text, -1))
	return koreanChar > chineseChar
}

func normalizeEpisodeText(filename string) string {
	name := filename
	// if there only two number, use as episode number.
	re1 := regexp.MustCompile(`(\.|^)[-_]{0,1}([0-9]{2,3})(\.|$)`)
	if re1.MatchString(name) {
		name = re1.ReplaceAllString(name, ".E$2.")
	}

	re2 := regexp.MustCompile(`(\.|^)([0-9]{1,})[xX]([0-9]{1,})(\.|$)`)
	if re2.MatchString(name) {
		name = re2.ReplaceAllString(name, "${1}S$2.E$3${4}")
		return name
	}

	re3 := regexp.MustCompile(`(\.|^)([0-9]{1})([0-9]{2})(\.|$)`)
	name = re3.ReplaceAllString(name, "${1}S$2.E$3${4}")
	return name
}

func paddingZero(s string) string {
	if len(s) == 1 {
		return "0" + s
	}
	return s
}

func removeStr(filename string, index int, length int, placeholder string) string {
	if index < 0 || index >= len(filename) {
		return filename
	}
	end := index + length
	if end > len(filename) {
		end = len(filename)
	}
	return filename[:index] + placeholder + filename[end:]
}

func chineseNumToNum(s string) int {
	// Simple implementation for 0-99 range usually seen in episodes
	cnDigits := map[string]int{
		"零": 0, "一": 1, "二": 2, "三": 3, "四": 4,
		"五": 5, "六": 6, "七": 7, "八": 8, "九": 9, "十": 10,
	}

	// Simple single digit
	if val, ok := cnDigits[s]; ok {
		return val
	}

	// Handle compound numbers like 十一, 二十, 二十一
	if strings.Contains(s, "十") {
		parts := strings.Split(s, "十")
		if len(parts) == 2 {
			left := parts[0]
			right := parts[1]

			multiplier := 1
			if left != "" {
				if v, ok := cnDigits[left]; ok {
					multiplier = v
				}
			}

			adder := 0
			if right != "" {
				if v, ok := cnDigits[right]; ok {
					adder = v
				}
			}

			return multiplier*10 + adder
		}
	}

	return 0
}

func formatSeasonNumber(n string) string {
	prefix := "S"
	number := strings.TrimSuffix(n, ".")

	switch number {
	case "Ⅱ", "II":
		return "S02"
	case "III":
		return "S03"
	case "IV":
		return "S04"
	case "VI":
		return "S06"
	case "VII":
		return "S07"
	case "VIII":
		return "S08"
	case "IX":
		return "S09"
	case "X":
		return "S10"
	case "本篇":
		return "S01"
	case "OVA":
		return "OVA"
	}

	if strings.Contains(number, "Season.V") || strings.Contains(number, "season.V") {
		return "S05"
	}

	// Check for non-numeric and non-chinese
	hasDigit := regexp.MustCompile(`[0-9]`).MatchString(number)
	hasChinese := regexp.MustCompile(`[零一二三四五六七八九十]`).MatchString(number)

	if !hasDigit && !hasChinese {
		if strings.Contains(strings.ToLower(number), "nc") || strings.Contains(strings.ToLower(number), "cm") {
			return number
		}
		if strings.Contains(strings.ToLower(number), "sp") {
			if !regexp.MustCompile(`[0-9]{1,}`).MatchString(number) {
				return "SP01"
			}
			return number
		}
		if strings.Contains(number, "特别篇") {
			if !regexp.MustCompile(`[0-9]{1,}`).MatchString(number) {
				return "特别篇01"
			}
			return number
		}
		if regexp.MustCompile(`[eE][pP][0-9]{1,}`).MatchString(number) {
			return strings.ReplaceAll(strings.ReplaceAll(number, "p", ""), "P", "")
		}
	}

	if matches := regexp.MustCompile(`[sS][eE]([0-9]{1,})`).FindStringSubmatch(number); len(matches) > 1 {
		return "S" + paddingZero(matches[1])
	}

	if matches := regexp.MustCompile(`[0-9]{1,}`).FindStringSubmatch(number); len(matches) > 0 {
		return prefix + paddingZero(matches[0])
	}

	if matches := regexp.MustCompile(`[零一二三四五六七八九十]{1,}`).FindStringSubmatch(number); len(matches) > 0 {
		num := chineseNumToNum(matches[0])
		return prefix + paddingZero(strconv.Itoa(num))
	}

	return number
}

func formatEpisodeNumber2(n string) string {
	result := strings.TrimSpace(strings.ReplaceAll(strings.ReplaceAll(n, ".", ""), "(", ""))
	result = strings.ReplaceAll(result, ")", "")

	if regexp.MustCompile(`^第[0-9]{1,}`).MatchString(result) {
		return result
	}

	if matches := regexp.MustCompile(`([0-9]{4,8})`).FindStringSubmatch(result); len(matches) > 1 {
		return matches[1]
	}

	if matches := regexp.MustCompile(`([0-9]{1,})`).FindStringSubmatch(result); len(matches) > 1 {
		if matches2 := regexp.MustCompile(`([期集])`).FindStringSubmatch(result); len(matches2) > 1 {
			return "第" + matches[1] + matches2[1]
		}
		return "第" + matches[1] + "期"
	}
	return result
}

func formatEpisodeNumber(n string) string {
	prefix := "E"
	number := regexp.MustCompile(`\.{1,}$`).ReplaceAllString(n, "")
	number = regexp.MustCompile(`^\.{1,}`).ReplaceAllString(number, "")

	if regexp.MustCompile(`[上下]`).MatchString(number) {
		remaining := regexp.MustCompile(`[上下]`).ReplaceAllString(number, "")
		suffix := regexp.MustCompile(`[上下]`).FindString(number)
		remaining = regexp.MustCompile(`^0+([0-9])`).ReplaceAllString(remaining, "$1")
		return formatEpisodeNumber2(remaining) + suffix
	}

	if regexp.MustCompile(`^[eE][pP][0-9]+-[0-9]+$`).MatchString(number) {
		number = regexp.MustCompile(`^[eE][pP]`).ReplaceAllString(number, "E")
		return number
	}

	if regexp.MustCompile(`^(集结篇|企划|先导片)`).MatchString(number) {
		return number
	}

	if matches := regexp.MustCompile(`第([0-9]{2})\.{0,1}([0-9]{2})期`).FindStringSubmatch(number); len(matches) > 2 {
		return matches[1] + matches[2]
	}

	if matches := regexp.MustCompile(`^([12][0-9][0-9]{2}[012][0-9][0123][0-9])`).FindStringSubmatch(number); len(matches) > 1 {
		return matches[1]
	}

	if regexp.MustCompile(`[0-9]{4,8}[期-]$`).MatchString(number) {
		if matches := regexp.MustCompile(`([0-9]{4,8})[期-]`).FindStringSubmatch(number); len(matches) > 1 {
			return matches[1]
		}
		return number
	}

	if regexp.MustCompile(`[0-9]{8}`).MatchString(number) {
		return number
	}

	if matches := regexp.MustCompile(`([0-9]{4})\.([123][0-9]{3})`).FindStringSubmatch(number); len(matches) > 2 {
		return matches[2] + matches[1]
	}

	if matches := regexp.MustCompile(`([0-9]{4})[-.年]([0-9]{2})[-.月]([0-9]{2})`).FindStringSubmatch(number); len(matches) > 3 {
		return matches[1] + matches[2] + matches[3]
	}

	if matches := regexp.MustCompile(`^([0-1][0-9])[-.]{0,1}([0-3][0-9])`).FindStringSubmatch(number); len(matches) > 2 {
		return matches[1] + matches[2]
	}

	if regexp.MustCompile(`^(特辑|OAD|彩蛋|花絮|番外|预告)`).MatchString(number) {
		r1 := regexp.MustCompile(`^(特辑|OAD|彩蛋|花絮|番外|预告)`).FindStringSubmatch(number)
		prefixStr := r1[1]
		r2 := regexp.MustCompile(`\.{0,1}([0-9]{1,})`).FindStringSubmatch(number)
		num := ""
		if len(r2) > 1 {
			num = r2[1]
		}
		if num == "" {
			return prefixStr + "01"
		}
		val, _ := strconv.Atoi(num)
		// paddingZero expects string, but logic in TS uses Number(num) then padding_zero
		// My paddingZero takes string.
		return prefixStr + paddingZero(strconv.Itoa(val))
	}

	if regexp.MustCompile(`[nN][cC]`).MatchString(number) {
		return number
	}
	if regexp.MustCompile(`[cC][mM]`).MatchString(number) {
		return number
	}

	if strings.Contains(strings.ToLower(number), "sp") {
		if !regexp.MustCompile(`[0-9]{1,}`).MatchString(number) {
			return "SP01"
		}
		return number
	}

	if strings.Contains(number, "特别篇") {
		if !regexp.MustCompile(`[0-9]{1,}`).MatchString(number) {
			return "特别篇01"
		}
		return number
	}

	if matches := regexp.MustCompile(`[0-9]{1,}`).FindStringSubmatch(number); len(matches) > 0 {
		return prefix + paddingZero(matches[0])
	}

	if matches := regexp.MustCompile(`[零一二三四五六七八九十]{1,}`).FindStringSubmatch(number); len(matches) > 0 {
		num := chineseNumToNum(matches[0])
		return prefix + paddingZero(strconv.Itoa(num))
	}

	return number
}

// javNoiseRegexps are common noise patterns in JAV filenames
var javNoiseRegexps = []*regexp.Regexp{
	regexp.MustCompile(`(?i)\.(mp4|mkv|avi|wmv|flv|rmvb|mov|ts|iso|m2ts)$`),
	regexp.MustCompile(`(?i)(1080[pP]|720[pP]|4[kK]|2160[pP]|480[pP])`),
	regexp.MustCompile(`(?i)(x26[45]|h\.?26[45]|hevc|avc|aac|mp3|flac|dts)`),
	regexp.MustCompile(`(?i)(uncensored|censored|leaked|reduced|mosaic|hack|crack)`),
	regexp.MustCompile(`(?i)(subtitle|sub|字幕|中文|无码|有码|破解|流出|减码)`),
	regexp.MustCompile(`(?i)\b(fhd|hd|sd|uhd|blu-?ray|web-?dl|bdrip|remux)\b`),
	regexp.MustCompile(`(?i)(www\.)?[a-zA-Z0-9]+\.(com|net|org|cc|me|xyz|club|top|info)\b`),
	regexp.MustCompile(`(?i)(hhd800\.com|1pon|10musume|carib|paco|gachi|heyzo)`),
	regexp.MustCompile(`\([^)]*\)`),
	regexp.MustCompile(`\[[^\]]*\]`),
	regexp.MustCompile(`【[^】]*】`),
	regexp.MustCompile(`(?i)(-c|-uc|_uncensored|_leaked)$`),
}

var javSuffixRegexp = regexp.MustCompile(`(?i)-(C|UC|U|SD|CD\d+)$`)
var javTrailingNoiseRegexp = regexp.MustCompile(`(?i)(\d)(ch|uc|c|u)(\s|$)`)

// javCodeRegexp matches common JAV product codes:
// FC2-PPV-1234567, ABC-123, T28-001, 259LUXU-1234, etc.
var javCodeRegexp = regexp.MustCompile(`(?i)\b(FC2-PPV-\d{5,7}|\d{3,6}[A-Z]{2,10}-\d{2,8}|[A-Z]{1,10}\d{0,4}-\d{2,8})\b`)

// ParseFilenameForJAV extracts the JAV product code (番号) from a filename.
func ParseFilenameForJAV(filename string) string {
	s := filename
	// Remove file extension
	s = javNoiseRegexps[0].ReplaceAllString(s, "")
	// Replace separators with spaces for easier matching
	s = strings.NewReplacer("_", " ", ".", " ", "@", " ").Replace(s)
	// Remove noise
	for _, re := range javNoiseRegexps[1:] {
		s = re.ReplaceAllString(s, " ")
	}
	s = strings.TrimSpace(s)
	// Strip trailing noise glued to digits (e.g. "775ch" -> "775 ")
	s = javTrailingNoiseRegexp.ReplaceAllString(s, "$1$3")

	m := javCodeRegexp.FindString(s)
	if m == "" {
		return ""
	}
	m = strings.ToUpper(m)
	// Strip trailing suffixes: -C(中文), -UC(无码中文), -U(无码), -SD, -CD1, etc.
	m = javSuffixRegexp.ReplaceAllString(m, "")
	// A valid JAV code must have a hyphen
	if !strings.Contains(m, "-") {
		return ""
	}
	return m
}

func preprocess_filename(filename string) string {
	s := strings.TrimSpace(filename)

	// replace(/(第 ){0,1}([2][0-3][0-9]{2})-{0,1}([0-2][0-9])-{0,1}([0-3][0-9]) 期/, "$2$3$4期")
	s = regexp.MustCompile(`(第 ){0,1}([2][0-3][0-9]{2})-{0,1}([0-2][0-9])-{0,1}([0-3][0-9]) 期`).ReplaceAllString(s, "$2$3$4期")

	// Handle YYYY.MM.DD期 -> YYYYMMDD期
	s = regexp.MustCompile(`([2][0-3][0-9]{2})\.([0-2][0-9])\.([0-3][0-9])期`).ReplaceAllString(s, "${1}${2}${3}期")

	// replace(/^\[[a-zA-Z0-9&-]{1,}\]/, ".")
	s = regexp.MustCompile(`^\[[a-zA-Z0-9&-]{1,}\]`).ReplaceAllString(s, ".")

	// replace(/^\[[^\]]{1,}\](?=\[)/, "")
	// Go doesn't support lookahead. But here it matches [xxx][...
	// We can match ^\[[^\]]{1,}\]\[ and replace with [
	if regexp.MustCompile(`^\[[^\]]{1,}\]\[`).MatchString(s) {
		s = regexp.MustCompile(`^\[[^\]]{1,}\]`).ReplaceAllString(s, "")
	}

	// replace(/^【[^】0-9]{1,}】/, "")
	s = regexp.MustCompile(`^【[^】0-9]{1,}】`).ReplaceAllString(s, "")

	// replace(/\.[1-9]{1}[+-][1-9]{1,}\./, ".")
	s = regexp.MustCompile(`\.[1-9]{1}[+-][1-9]{1,}\.`).ReplaceAllString(s, ".")

	// replace(/\u200B/g, "")
	s = strings.ReplaceAll(s, "\u200B", "")

	// replace(/✔/, "")
	s = strings.ReplaceAll(s, "✔", "")

	// replace(/(?=[sS][0-9]{2}[eE][0-9]{2})([sS][0-9]{2}[eE][0-9]{2})/, ".$1")
	// Insert dot before SxxExx if not preceded by dot?
	// TS regex literally says: replace "lookahead SxxExx" match "SxxExx" with ".SxxExx".
	// effectively inserting dot before SxxExx.
	// We can just replace SxxExx with .SxxExx
	s = regexp.MustCompile(`([sS][0-9]{2}[eE][0-9]{2})`).ReplaceAllString(s, ".$1")

	// replace(/_([0-9]{1,3})_/, ".E$1.")
	s = regexp.MustCompile(`_([0-9]{1,3})_`).ReplaceAllString(s, ".E$1.")

	// Special season logic
	// const special_season_with_number_regexp = /(^|[^a-zA-Z])([sS][pP])([0-9]{1,})($|[^a-zA-Z])/;
	// if (original_filename.match(special_season_with_number_regexp)) {
	//   if (!original_filename.match(/[sS][0-9]{1,}[sS][pP][0-9]{1,}/)) {
	//     original_filename = original_filename.replace(special_season_with_number_regexp, "$1.SP.E$3.$4");
	//   }
	// }
	reSP := regexp.MustCompile(`(^|[^a-zA-Z])([sS][pP])([0-9]{1,})($|[^a-zA-Z])`)
	if reSP.MatchString(s) {
		if !regexp.MustCompile(`[sS][0-9]{1,}[sS][pP][0-9]{1,}`).MatchString(s) {
			s = reSP.ReplaceAllString(s, "$1.SP.E$3.$4")
		}
	}

	// replace(/^\./, "")
	s = regexp.MustCompile(`^\.`).ReplaceAllString(s, "")

	// replace(/ - /g, ".")
	s = strings.ReplaceAll(s, " - ", ".")

	// replace(/第 {1,}([0-9]{1,}) {1,}[集話话]/, "第$1集")
	s = regexp.MustCompile(`第 {1,}([0-9]{1,}) {1,}[集話话]`).ReplaceAllString(s, "第$1集")

	// replace(/[ _丨]/g, ".")
	s = regexp.MustCompile(`[ _丨]`).ReplaceAllString(s, ".")

	// replace(/^\[无字\]/, "")
	s = regexp.MustCompile(`^\[无字\]`).ReplaceAllString(s, "")

	// replace(/\]\[/, ".")
	s = strings.ReplaceAll(s, "][", ".")

	// replace(/[【】《》「」\[\]]{1,}/g, ".")
	s = regexp.MustCompile(`[【】《》「」\[\]]{1,}`).ReplaceAllString(s, ".")

	// replace(/^\./, "")
	s = regexp.MustCompile(`^\.`).ReplaceAllString(s, "")

	// replace 10.04期-下 pattern with 1004期-下 (e.g. 10.04期-下 -> 1004期-下)
	// This handles cases where two episode numbers are separated by a dot
	s = regexp.MustCompile(`([0-9]{2})\.([0-9]{2})期-([上下])`).ReplaceAllString(s, "${1}${2}期-${3}")

	// replace(/^\(([0-9]{1,})\)/, "E$1.")
	s = regexp.MustCompile(`^\(([0-9]{1,})\)`).ReplaceAllString(s, "E$1.")

	// replace(/\+{1,}/g, ".")
	s = regexp.MustCompile(`\+{1,}`).ReplaceAllString(s, ".")

	// replace(/(https{0,1}:){0,1}(\/\/){0,1}[0-9a-zA-Z]{1,}\.(com|cn)\b/, "")
	s = regexp.MustCompile(`(https{0,1}:){0,1}(\/\/){0,1}[0-9a-zA-Z]{1,}\.(com|cn)\b`).ReplaceAllString(s, "")

	// replace(/([^.(]{1})\([0-9]{1,}\)/, "$1.")
	// Go regex doesn't support excluding group easily like [^.(]. But [^.(] means any char except dot or open paren.
	// "foo(1)" -> "foo."
	s = regexp.MustCompile(`([^.(]{1})\([0-9]{1,}\)`).ReplaceAllString(s, "$1.")

	// replace(/(\.){2,}/g, ".");
	s = regexp.MustCompile(`(\.){2,}`).ReplaceAllString(s, ".")

	return s
}
