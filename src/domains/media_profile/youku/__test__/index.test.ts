/**
 * @file 国漫
 */
import crypto from "crypto";

import dayjs from "dayjs";
import { describe, expect, test } from "vitest";

import { get_sign } from "../utils";

// var c = function (e: string) {
//   function t(e, t) {
//     return (e << t) | (e >>> (32 - t));
//   }
//   function n(e, t) {
//     var n, o, r, i, a;
//     return (
//       (r = 2147483648 & e),
//       (i = 2147483648 & t),
//       (a = (1073741823 & e) + (1073741823 & t)),
//       (n = 1073741824 & e) & (o = 1073741824 & t)
//         ? 2147483648 ^ a ^ r ^ i
//         : n | o
//         ? 1073741824 & a
//           ? 3221225472 ^ a ^ r ^ i
//           : 1073741824 ^ a ^ r ^ i
//         : a ^ r ^ i
//     );
//   }
//   function o(e, o, r, i, a, s, c) {
//     return (
//       (e = n(
//         e,
//         n(
//           n(
//             (function (e, t, n) {
//               return (e & t) | (~e & n);
//             })(o, r, i),
//             a
//           ),
//           c
//         )
//       )),
//       n(t(e, s), o)
//     );
//   }
//   function r(e, o, r, i, a, s, c) {
//     return (
//       (e = n(
//         e,
//         n(
//           n(
//             (function (e, t, n) {
//               return (e & n) | (t & ~n);
//             })(o, r, i),
//             a
//           ),
//           c
//         )
//       )),
//       n(t(e, s), o)
//     );
//   }
//   function i(e, o, r, i, a, s, c) {
//     return (
//       (e = n(
//         e,
//         n(
//           n(
//             (function (e, t, n) {
//               return e ^ t ^ n;
//             })(o, r, i),
//             a
//           ),
//           c
//         )
//       )),
//       n(t(e, s), o)
//     );
//   }
//   function a(e, o, r, i, a, s, c) {
//     return (
//       (e = n(
//         e,
//         n(
//           n(
//             (function (e, t, n) {
//               return t ^ (e | ~n);
//             })(o, r, i),
//             a
//           ),
//           c
//         )
//       )),
//       n(t(e, s), o)
//     );
//   }
//   function s(e: number) {
//     var t;
//     var n = "";
//     var o = "";
//     for (t = 0; 3 >= t; t++) n += (o = "0" + ((e >>> (8 * t)) & 255).toString(16)).substr(o.length - 2, 2);
//     return n;
//   }
//   var c, u, p, d, l, f, m, y, g, h;
//   for (
//     e = (function (e) {
//       e = e.replace(/\r\n/g, "\n");
//       for (var t = "", n = 0; n < e.length; n++) {
//         var o = e.charCodeAt(n);
//         128 > o
//           ? (t += String.fromCharCode(o))
//           : o > 127 && 2048 > o
//           ? ((t += String.fromCharCode((o >> 6) | 192)), (t += String.fromCharCode((63 & o) | 128)))
//           : ((t += String.fromCharCode((o >> 12) | 224)),
//             (t += String.fromCharCode(((o >> 6) & 63) | 128)),
//             (t += String.fromCharCode((63 & o) | 128)));
//       }
//       return t;
//     })(e),
//       h = (function (e) {
//         for (
//           var t, n = e.length, o = n + 8, r = 16 * ((o - (o % 64)) / 64 + 1), i = new Array(r - 1), a = 0, s = 0;
//           n > s;

//         )
//           (a = (s % 4) * 8), (i[(t = (s - (s % 4)) / 4)] = i[t] | (e.charCodeAt(s) << a)), s++;
//         return (
//           (a = (s % 4) * 8),
//           (i[(t = (s - (s % 4)) / 4)] = i[t] | (128 << a)),
//           (i[r - 2] = n << 3),
//           (i[r - 1] = n >>> 29),
//           i
//         );
//       })(e),
//       f = 1732584193,
//       m = 4023233417,
//       y = 2562383102,
//       g = 271733878,
//       c = 0;
//     c < h.length;
//     c += 16
//   )
//     (u = f),
//       (p = m),
//       (d = y),
//       (l = g),
//       (f = o(f, m, y, g, h[c + 0], 7, 3614090360)),
//       (g = o(g, f, m, y, h[c + 1], 12, 3905402710)),
//       (y = o(y, g, f, m, h[c + 2], 17, 606105819)),
//       (m = o(m, y, g, f, h[c + 3], 22, 3250441966)),
//       (f = o(f, m, y, g, h[c + 4], 7, 4118548399)),
//       (g = o(g, f, m, y, h[c + 5], 12, 1200080426)),
//       (y = o(y, g, f, m, h[c + 6], 17, 2821735955)),
//       (m = o(m, y, g, f, h[c + 7], 22, 4249261313)),
//       (f = o(f, m, y, g, h[c + 8], 7, 1770035416)),
//       (g = o(g, f, m, y, h[c + 9], 12, 2336552879)),
//       (y = o(y, g, f, m, h[c + 10], 17, 4294925233)),
//       (m = o(m, y, g, f, h[c + 11], 22, 2304563134)),
//       (f = o(f, m, y, g, h[c + 12], 7, 1804603682)),
//       (g = o(g, f, m, y, h[c + 13], 12, 4254626195)),
//       (y = o(y, g, f, m, h[c + 14], 17, 2792965006)),
//       (f = r(f, (m = o(m, y, g, f, h[c + 15], 22, 1236535329)), y, g, h[c + 1], 5, 4129170786)),
//       (g = r(g, f, m, y, h[c + 6], 9, 3225465664)),
//       (y = r(y, g, f, m, h[c + 11], 14, 643717713)),
//       (m = r(m, y, g, f, h[c + 0], 20, 3921069994)),
//       (f = r(f, m, y, g, h[c + 5], 5, 3593408605)),
//       (g = r(g, f, m, y, h[c + 10], 9, 38016083)),
//       (y = r(y, g, f, m, h[c + 15], 14, 3634488961)),
//       (m = r(m, y, g, f, h[c + 4], 20, 3889429448)),
//       (f = r(f, m, y, g, h[c + 9], 5, 568446438)),
//       (g = r(g, f, m, y, h[c + 14], 9, 3275163606)),
//       (y = r(y, g, f, m, h[c + 3], 14, 4107603335)),
//       (m = r(m, y, g, f, h[c + 8], 20, 1163531501)),
//       (f = r(f, m, y, g, h[c + 13], 5, 2850285829)),
//       (g = r(g, f, m, y, h[c + 2], 9, 4243563512)),
//       (y = r(y, g, f, m, h[c + 7], 14, 1735328473)),
//       (f = i(f, (m = r(m, y, g, f, h[c + 12], 20, 2368359562)), y, g, h[c + 5], 4, 4294588738)),
//       (g = i(g, f, m, y, h[c + 8], 11, 2272392833)),
//       (y = i(y, g, f, m, h[c + 11], 16, 1839030562)),
//       (m = i(m, y, g, f, h[c + 14], 23, 4259657740)),
//       (f = i(f, m, y, g, h[c + 1], 4, 2763975236)),
//       (g = i(g, f, m, y, h[c + 4], 11, 1272893353)),
//       (y = i(y, g, f, m, h[c + 7], 16, 4139469664)),
//       (m = i(m, y, g, f, h[c + 10], 23, 3200236656)),
//       (f = i(f, m, y, g, h[c + 13], 4, 681279174)),
//       (g = i(g, f, m, y, h[c + 0], 11, 3936430074)),
//       (y = i(y, g, f, m, h[c + 3], 16, 3572445317)),
//       (m = i(m, y, g, f, h[c + 6], 23, 76029189)),
//       (f = i(f, m, y, g, h[c + 9], 4, 3654602809)),
//       (g = i(g, f, m, y, h[c + 12], 11, 3873151461)),
//       (y = i(y, g, f, m, h[c + 15], 16, 530742520)),
//       (f = a(f, (m = i(m, y, g, f, h[c + 2], 23, 3299628645)), y, g, h[c + 0], 6, 4096336452)),
//       (g = a(g, f, m, y, h[c + 7], 10, 1126891415)),
//       (y = a(y, g, f, m, h[c + 14], 15, 2878612391)),
//       (m = a(m, y, g, f, h[c + 5], 21, 4237533241)),
//       (f = a(f, m, y, g, h[c + 12], 6, 1700485571)),
//       (g = a(g, f, m, y, h[c + 3], 10, 2399980690)),
//       (y = a(y, g, f, m, h[c + 10], 15, 4293915773)),
//       (m = a(m, y, g, f, h[c + 1], 21, 2240044497)),
//       (f = a(f, m, y, g, h[c + 8], 6, 1873313359)),
//       (g = a(g, f, m, y, h[c + 15], 10, 4264355552)),
//       (y = a(y, g, f, m, h[c + 6], 15, 2734768916)),
//       (m = a(m, y, g, f, h[c + 13], 21, 1309151649)),
//       (f = a(f, m, y, g, h[c + 4], 6, 4149444226)),
//       (g = a(g, f, m, y, h[c + 11], 10, 3174756917)),
//       (y = a(y, g, f, m, h[c + 2], 15, 718787259)),
//       (m = a(m, y, g, f, h[c + 9], 21, 3951481745)),
//       (f = n(f, u)),
//       (m = n(m, p)),
//       (y = n(y, d)),
//       (g = n(g, l));
//   console.log(f, m, y, g);
//   // f -439250483
//   // m -57601208
//   // y 1583565195
//   // g 906374313
//   // 2007706249 1559007109 1418039384 838731809
//   return (s(f) + s(m) + s(y) + s(g)).toLowerCase();
// };
// (() => {
//   var c = function(e) {
//     function t(e, t) {
//         return e << t | e >>> 32 - t;
//     }
//     function n(e, t) {
//         var n, o, r, i, a;
//         return r = 2147483648 & e,
//         i = 2147483648 & t,
//         a = (1073741823 & e) + (1073741823 & t),
//         (n = 1073741824 & e) & (o = 1073741824 & t) ? 2147483648 ^ a ^ r ^ i : n | o ? 1073741824 & a ? 3221225472 ^ a ^ r ^ i : 1073741824 ^ a ^ r ^ i : a ^ r ^ i
//     }
//     function o(e, o, r, i, a, s, c) {
//         return e = n(e, n(n(function(e, t, n) {
//             return e & t | ~e & n
//         }(o, r, i), a), c)),
//         n(t(e, s), o)
//     }
//     function r(e, o, r, i, a, s, c) {
//         return e = n(e, n(n(function(e, t, n) {
//             return e & n | t & ~n
//         }(o, r, i), a), c)),
//         n(t(e, s), o)
//     }
//     function i(e, o, r, i, a, s, c) {
//         return e = n(e, n(n(function(e, t, n) {
//             return e ^ t ^ n
//         }(o, r, i), a), c)),
//         n(t(e, s), o)
//     }
//     function a(e, o, r, i, a, s, c) {
//         return e = n(e, n(n(function(e, t, n) {
//             return t ^ (e | ~n)
//         }(o, r, i), a), c)),
//         n(t(e, s), o)
//     }
//     function s(e) {
//         var t, n = "", o = "";
//         for (t = 0; 3 >= t; t++)
//             n += (o = "0" + (e >>> 8 * t & 255).toString(16)).substr(o.length - 2, 2);
//         return n
//     }
//     var c, u, p, d, l, f, m, y, g, h;
//     for (e = function(e) {
//         e = e.replace(/\r\n/g, "\n");
//         for (var t = "", n = 0; n < e.length; n++) {
//             var o = e.charCodeAt(n);
//             128 > o ? t += String.fromCharCode(o) : o > 127 && 2048 > o ? (t += String.fromCharCode(o >> 6 | 192),
//             t += String.fromCharCode(63 & o | 128)) : (t += String.fromCharCode(o >> 12 | 224),
//             t += String.fromCharCode(o >> 6 & 63 | 128),
//             t += String.fromCharCode(63 & o | 128))
//         }
//         return t
//     }(e),
//     h = function(e) {
//         for (var t, n = e.length, o = n + 8, r = 16 * ((o - o % 64) / 64 + 1), i = new Array(r - 1), a = 0, s = 0; n > s; )
//             a = s % 4 * 8,
//             i[t = (s - s % 4) / 4] = i[t] | e.charCodeAt(s) << a,
//             s++;
//         return a = s % 4 * 8,
//         i[t = (s - s % 4) / 4] = i[t] | 128 << a,
//         i[r - 2] = n << 3,
//         i[r - 1] = n >>> 29,
//         i
//     }(e),
//     f = 1732584193,
//     m = 4023233417,
//     y = 2562383102,
//     g = 271733878,
//     c = 0; c < h.length; c += 16)
//         u = f,
//         p = m,
//         d = y,
//         l = g,
//         f = o(f, m, y, g, h[c + 0], 7, 3614090360),
//         g = o(g, f, m, y, h[c + 1], 12, 3905402710),
//         y = o(y, g, f, m, h[c + 2], 17, 606105819),
//         m = o(m, y, g, f, h[c + 3], 22, 3250441966),
//         f = o(f, m, y, g, h[c + 4], 7, 4118548399),
//         g = o(g, f, m, y, h[c + 5], 12, 1200080426),
//         y = o(y, g, f, m, h[c + 6], 17, 2821735955),
//         m = o(m, y, g, f, h[c + 7], 22, 4249261313),
//         f = o(f, m, y, g, h[c + 8], 7, 1770035416),
//         g = o(g, f, m, y, h[c + 9], 12, 2336552879),
//         y = o(y, g, f, m, h[c + 10], 17, 4294925233),
//         m = o(m, y, g, f, h[c + 11], 22, 2304563134),
//         f = o(f, m, y, g, h[c + 12], 7, 1804603682),
//         g = o(g, f, m, y, h[c + 13], 12, 4254626195),
//         y = o(y, g, f, m, h[c + 14], 17, 2792965006),
//         f = r(f, m = o(m, y, g, f, h[c + 15], 22, 1236535329), y, g, h[c + 1], 5, 4129170786),
//         g = r(g, f, m, y, h[c + 6], 9, 3225465664),
//         y = r(y, g, f, m, h[c + 11], 14, 643717713),
//         m = r(m, y, g, f, h[c + 0], 20, 3921069994),
//         f = r(f, m, y, g, h[c + 5], 5, 3593408605),
//         g = r(g, f, m, y, h[c + 10], 9, 38016083),
//         y = r(y, g, f, m, h[c + 15], 14, 3634488961),
//         m = r(m, y, g, f, h[c + 4], 20, 3889429448),
//         f = r(f, m, y, g, h[c + 9], 5, 568446438),
//         g = r(g, f, m, y, h[c + 14], 9, 3275163606),
//         y = r(y, g, f, m, h[c + 3], 14, 4107603335),
//         m = r(m, y, g, f, h[c + 8], 20, 1163531501),
//         f = r(f, m, y, g, h[c + 13], 5, 2850285829),
//         g = r(g, f, m, y, h[c + 2], 9, 4243563512),
//         y = r(y, g, f, m, h[c + 7], 14, 1735328473),
//         f = i(f, m = r(m, y, g, f, h[c + 12], 20, 2368359562), y, g, h[c + 5], 4, 4294588738),
//         g = i(g, f, m, y, h[c + 8], 11, 2272392833),
//         y = i(y, g, f, m, h[c + 11], 16, 1839030562),
//         m = i(m, y, g, f, h[c + 14], 23, 4259657740),
//         f = i(f, m, y, g, h[c + 1], 4, 2763975236),
//         g = i(g, f, m, y, h[c + 4], 11, 1272893353),
//         y = i(y, g, f, m, h[c + 7], 16, 4139469664),
//         m = i(m, y, g, f, h[c + 10], 23, 3200236656),
//         f = i(f, m, y, g, h[c + 13], 4, 681279174),
//         g = i(g, f, m, y, h[c + 0], 11, 3936430074),
//         y = i(y, g, f, m, h[c + 3], 16, 3572445317),
//         m = i(m, y, g, f, h[c + 6], 23, 76029189),
//         f = i(f, m, y, g, h[c + 9], 4, 3654602809),
//         g = i(g, f, m, y, h[c + 12], 11, 3873151461),
//         y = i(y, g, f, m, h[c + 15], 16, 530742520),
//         f = a(f, m = i(m, y, g, f, h[c + 2], 23, 3299628645), y, g, h[c + 0], 6, 4096336452),
//         g = a(g, f, m, y, h[c + 7], 10, 1126891415),
//         y = a(y, g, f, m, h[c + 14], 15, 2878612391),
//         m = a(m, y, g, f, h[c + 5], 21, 4237533241),
//         f = a(f, m, y, g, h[c + 12], 6, 1700485571),
//         g = a(g, f, m, y, h[c + 3], 10, 2399980690),
//         y = a(y, g, f, m, h[c + 10], 15, 4293915773),
//         m = a(m, y, g, f, h[c + 1], 21, 2240044497),
//         f = a(f, m, y, g, h[c + 8], 6, 1873313359),
//         g = a(g, f, m, y, h[c + 15], 10, 4264355552),
//         y = a(y, g, f, m, h[c + 6], 15, 2734768916),
//         m = a(m, y, g, f, h[c + 13], 21, 1309151649),
//         f = a(f, m, y, g, h[c + 4], 6, 4149444226),
//         g = a(g, f, m, y, h[c + 11], 10, 3174756917),
//         y = a(y, g, f, m, h[c + 2], 15, 718787259),
//         m = a(m, y, g, f, h[c + 9], 21, 3951481745),
//         f = n(f, u),
//         m = n(m, p),
//         y = n(y, d),
//         g = n(g, l);
//     return (s(f) + s(m) + s(y) + s(g)).toLowerCase()
// }
// })();

describe("dayjs", () => {
  // test("simple", () => {
  //   const e =
  //     'c232df00269193dd29af0bf22c0a8b31&1701093094100&24679788&{"touch_point_code":"PC_play_vip","device_id":"1","cna":"TyNmHYeaUmcCAXPuK4Jgz6e+"}';
  //   const sign = c(e);
  //   expect(sign).toBe("5b0b207a39685d8fd0160b702438d0ae");
  // });
  // test("simple2", () => {
  //   const e =
  //     'c232df00269193dd29af0bf22c0a8b31&1701094049514&24679788&{"ms_codes":"2019030100","params":"{\\"biz\\":\\"new_detail_web2\\",\\"scene\\":\\"component\\",\\"componentVersion\\":\\"3\\",\\"ip\\":\\"115.238.43.130\\",\\"debug\\":0,\\"utdid\\":\\"TyNmHYeaUmcCAXPuK4Jgz6e+\\",\\"userId\\":\\"\\",\\"platform\\":\\"pc\\",\\"gray\\":0,\\"nextSession\\":\\"{\\\\\\"spmA\\\\\\":\\\\\\"a2h08\\\\\\",\\\\\\"level\\\\\\":2,\\\\\\"spmC\\\\\\":\\\\\\"1_3\\\\\\",\\\\\\"spmB\\\\\\":\\\\\\"8165823\\\\\\",\\\\\\"lastPageNo\\\\\\":0,\\\\\\"index\\\\\\":2,\\\\\\"pageId\\\\\\":\\\\\\"PCSHOW_VARIETY_NORMAL\\\\\\",\\\\\\"pageName\\\\\\":\\\\\\"page_playpage\\\\\\",\\\\\\"lastSubIndex\\\\\\":20,\\\\\\"lifecycle\\\\\\":1,\\\\\\"scmB\\\\\\":\\\\\\"manual\\\\\\",\\\\\\"scmA\\\\\\":\\\\\\"20140719\\\\\\",\\\\\\"lastSubId\\\\\\":1529211084,\\\\\\"scmC\\\\\\":\\\\\\"239036\\\\\\",\\\\\\"id\\\\\\":239036}\\",\\"showId\\":\\"ceacba3689f8468ebbfc\\"}","system_info":"{\\"os\\":\\"pc\\",\\"device\\":\\"pc\\",\\"ver\\":\\"1.0.0\\",\\"appPackageKey\\":\\"pcweb\\",\\"appPackageId\\":\\"pcweb\\"}"}';
  //   // const sign = c(e);
  //   const sign = crypto.createHash("md5").update(e).digest("hex");
  //   expect(sign).toBe("96e0209b8f8770b658a52a3e6b9c83d2");
  // });
  // test("simple3", () => {
  //   const e =
  //     'c232df00269193dd29af0bf22c0a8b31&1701093481991&24679788&{"videoId":"XNjExMTcyMDY0NA==","hwClass":1,"devicename":"H5","mediaType":1,"appVersion":"9.4.47","autoPlay":1,"category":"综艺","showId":"ebcbc325640f4d57ae16","tp":1,"stage":20231124,"seconds":5414,"umid":"TyNmHYeaUmcCAXPuK4Jgz6e+","nlid":"TyNmHYeaUmcCAXPuK4Jgz6e+","hd":1,"langName":"default","point":902747,"lastUpdate":1701093481,"logType":1,"playTs":1000499,"timestamp":1701093481986,"appKey":"qPbb2hfIYugHjMaj"}';
  //   const sign = crypto.createHash("md5").update(e).digest("hex");
  //   expect(sign).toBe("670cbc9a481aff18d01f2bd94d4318ea");
  // });
  // test("simple4", () => {
  //   const e =
  //     'c232df00269193dd29af0bf22c0a8b31&1701093481991&24679788&{"videoId":"XNjExMTcyMDY0NA==","hwClass":1,"devicename":"H5","mediaType":1,"appVersion":"9.4.47","autoPlay":1,"category":"综艺","showId":"ebcbc325640f4d57ae16","tp":1,"stage":20231124,"seconds":5414,"umid":"TyNmHYeaUmcCAXPuK4Jgz6e+","nlid":"TyNmHYeaUmcCAXPuK4Jgz6e+","hd":1,"langName":"default","point":902747,"lastUpdate":1701093481,"logType":1,"playTs":1000499,"timestamp":1701093481986,"appKey":"qPbb2hfIYugHjMaj"}';
  //   const sign = crypto.createHash("md5").update(e).digest("hex");
  //   expect(sign).toBe("670cbc9a481aff18d01f2bd94d4318ea");
  // });
  // test("simple5", () => {
  //   // const d =
  //   //   '{"ms_codes":"2019030100","params":"{"biz":"new_detail_web2","componentVersion":"3","debug":0,"gray":0,"ip":"183.129.167.42","nextSession":"{\\"id\\":239036,\\"index\\":2,\\"lastPageNo\\":0,\\"lastSubId\\":1529211084,\\"lastSubIndex\\":20,\\"level\\":2,\\"lifecycle\\":1,\\"pageId\\":\\"PCSHOW_VARIETY_NORMAL\\",\\"pageName\\":\\"page_playpage\\",\\"scmA\\":\\"20140719\\",\\"scmB\\":\\"manual\\",\\"scmC\\":\\"239036\\",\\"spmA\\":\\"a2h08\\",\\"spmB\\":\\"8165823\\",\\"spmC\\":\\"1_3\\"}","platform":"pc","scene":"component","showId":"ceacba3689f8468ebbfc","userId":"","utdid":"TyNmHYeaUmcCAXPuK4Jgz6e+"}","system_info":"{"os":"pc","device":"pc","ver":"1.0.0","appPackageKey":"pcweb","appPackageId":"pcweb"}"}';
  //   const aaa =
  //     '{"biz":"new_detail_web2","componentVersion":"3","debug":0,"gray":0,"ip":"183.129.167.42","nextSession":"{\\"id\\":239036,\\"index\\":2,\\"lastPageNo\\":0,\\"lastSubId\\":1529211084,\\"lastSubIndex\\":20,\\"level\\":2,\\"lifecycle\\":1,\\"pageId\\":\\"PCSHOW_VARIETY_NORMAL\\",\\"pageName\\":\\"page_playpage\\",\\"scmA\\":\\"20140719\\",\\"scmB\\":\\"manual\\",\\"scmC\\":\\"239036\\",\\"spmA\\":\\"a2h08\\",\\"spmB\\":\\"8165823\\",\\"spmC\\":\\"1_3\\"}","platform":"pc","scene":"component","showId":"ceacba3689f8468ebbfc","userId":"","utdid":"TyNmHYeaUmcCAXPuK4Jgz6e+"}';
  //   const d =
  //     '{"ms_codes":"2019030100","params":"","system_info":"{"os":"pc","device":"pc","ver":"1.0.0","appPackageKey":"pcweb","appPackageId":"pcweb"}"}';
  //   // const e =
  //   //   'c232df00269193dd29af0bf22c0a8b31&1701095797059&24679788&{"ms_codes":"2019030100","params":"{"biz":"new_detail_web2","componentVersion":"3","debug":0,"gray":0,"ip":"183.129.167.42","nextSession":"{\\"id\\":239036,\\"index\\":2,\\"lastPageNo\\":0,\\"lastSubId\\":1529211084,\\"lastSubIndex\\":20,\\"level\\":2,\\"lifecycle\\":1,\\"pageId\\":\\"PCSHOW_VARIETY_NORMAL\\",\\"pageName\\":\\"page_playpage\\",\\"scmA\\":\\"20140719\\",\\"scmB\\":\\"manual\\",\\"scmC\\":\\"239036\\",\\"spmA\\":\\"a2h08\\",\\"spmB\\":\\"8165823\\",\\"spmC\\":\\"1_3\\"}","platform":"pc","scene":"component","showId":"ceacba3689f8468ebbfc","userId":"","utdid":"TyNmHYeaUmcCAXPuK4Jgz6e+"}","system_info":"{"os":"pc","device":"pc","ver":"1.0.0","appPackageKey":"pcweb","appPackageId":"pcweb"}"}';
  //   // const sign = crypto.createHash("md5").update(e).digest("hex");
  //   const t = 1701095797059;
  //   const sign = get_sign({ t, d });
  //   expect(sign).toBe("e1436a81f985a94c99e8c8748c410f5a");
  // });
  // test("simple6", () => {
  //   const e =
  //     '12f165abfab35a9012f2ca26edc3be03&1701097452203&24679788&{"ms_codes":"2019030100","params":"{"biz":"new_detail_web2","scene":"component","componentVersion":"3","ip":"115.238.43.130","debug":0,"utdid":"TyNmHYeaUmcCAXPuK4Jgz6e+","userId":"","platform":"pc","gray":0,"nextSession":"{\\"spmA\\":\\"a2h08\\",\\"level\\":2,\\"spmC\\":\\"1_3\\",\\"spmB\\":\\"8165823\\",\\"lastPageNo\\":0,\\"index\\":2,\\"pageId\\":\\"PCSHOW_VARIETY_NORMAL\\",\\"pageName\\":\\"page_playpage\\",\\"lastSubIndex\\":20,\\"lifecycle\\":1,\\"scmB\\":\\"manual\\",\\"scmA\\":\\"20140719\\",\\"lastSubId\\":1529211084,\\"scmC\\":\\"239036\\",\\"id\\":239036}","showId":"ceacba3689f8468ebbfc"}","system_info":"{"os":"pc","device":"pc","ver":"1.0.0","appPackageKey":"pcweb","appPackageId":"pcweb"}"}';
  //   const sign = crypto.createHash("md5").update(e).digest("hex");
  //   expect(sign).toBe("f46e8c6bfb7c8c1dc6f419d2a3e4b230");
  // });
  // test("20231010", () => {
  //   const n = {
  //     // data: '{"ms_codes":"2019030100","params":"{"biz":"new_detail_web2","scene":"component","componentVersion":"3","ip":"183.129.167.42","debug":0,"utdid":"TyNmHYeaUmcCAXPuK4Jgz6e+","userId":"","platform":"pc","gray":0,"nextSession":"{\\"spmA\\":\\"a2h08\\",\\"level\\":2,\\"spmC\\":\\"1_3\\",\\"spmB\\":\\"8165823\\",\\"lastPageNo\\":0,\\"index\\":5,\\"pageId\\":\\"PCSHOW_VARIETY_NORMAL\\",\\"pageName\\":\\"page_playpage\\",\\"lastSubIndex\\":20,\\"lifecycle\\":1,\\"scmB\\":\\"manual\\",\\"scmA\\":\\"20140719\\",\\"lastSubId\\":1529211084,\\"scmC\\":\\"239036\\",\\"id\\":239036}","showId":"53efbfbd70efbfbd52ef"}","system_info":"{"os":"pc","device":"pc","ver":"1.0.0","appPackageKey":"pcweb","appPackageId":"pcweb"}"}',
  //     data: '{"ms_codes":"2019030100","params":"{\\"biz\\":\\"new_detail_web2\\",\\"scene\\":\\"component\\",\\"componentVersion\\":\\"3\\",\\"ip\\":\\"115.238.43.130\\",\\"debug\\":0,\\"utdid\\":\\"TyNmHYeaUmcCAXPuK4Jgz6e+\\",\\"userId\\":\\"\\",\\"platform\\":\\"pc\\",\\"gray\\":0,\\"nextSession\\":\\"{\\\\\\"spmA\\\\\\":\\\\\\"a2h08\\\\\\",\\\\\\"level\\\\\\":2,\\\\\\"spmC\\\\\\":\\\\\\"1_3\\\\\\",\\\\\\"spmB\\\\\\":\\\\\\"8165823\\\\\\",\\\\\\"lastPageNo\\\\\\":0,\\\\\\"index\\\\\\":2,\\\\\\"pageId\\\\\\":\\\\\\"PCSHOW_VARIETY_NORMAL\\\\\\",\\\\\\"pageName\\\\\\":\\\\\\"page_playpage\\\\\\",\\\\\\"lastSubIndex\\\\\\":20,\\\\\\"lifecycle\\\\\\":1,\\\\\\"scmB\\\\\\":\\\\\\"manual\\\\\\",\\\\\\"scmA\\\\\\":\\\\\\"20140719\\\\\\",\\\\\\"lastSubId\\\\\\":1529211084,\\\\\\"scmC\\\\\\":\\\\\\"239036\\\\\\",\\\\\\"id\\\\\\":239036}\\",\\"showId\\":\\"ceacba3689f8468ebbfc\\"}","system_info":"{\\"os\\":\\"pc\\",\\"device\\":\\"pc\\",\\"ver\\":\\"1.0.0\\",\\"appPackageKey\\":\\"pcweb\\",\\"appPackageId\\":\\"pcweb\\"}"}',
  //     data2: JSON.stringify({
  //       ms_codes: "2019030100",
  //       params: JSON.stringify({
  //         biz: "new_detail_web2",
  //         scene: "component",
  //         componentVersion: "3",
  //         ip: "115.238.43.130",
  //         debug: 0,
  //         utdid: "TyNmHYeaUmcCAXPuK4Jgz6e+",
  //         userId: "",
  //         platform: "pc",
  //         gray: 0,
  //         nextSession: JSON.stringify({
  //           spmA: "a2h08",
  //           level: 2,
  //           spmC: "1_3",
  //           spmB: "8165823",
  //           lastPageNo: 0,
  //           index: 2,
  //           pageId: "PCSHOW_VARIETY_NORMAL",
  //           pageName: "page_playpage",
  //           lastSubIndex: 20,
  //           lifecycle: 1,
  //           scmB: "manual",
  //           scmA: "20140719",
  //           lastSubId: 1529211084,
  //           scmC: "239036",
  //           id: 239036,
  //         }),
  //         showId: "ceacba3689f8468ebbfc",
  //       }),
  //       system_info: JSON.stringify({
  //         os: "pc",
  //         device: "pc",
  //         ver: "1.0.0",
  //         appPackageKey: "pcweb",
  //         appPackageId: "pcweb",
  //       }),
  //     }),
  //   };
  //   // console.log(n.data);
  //   // console.log(n.data2);
  //   // console.log(n.data === n.data2);
  //   const sign = get_sign({
  //     t: 1701094049514,
  //     d: n.data2,
  //   });
  //   expect(sign).toBe("96e0209b8f8770b658a52a3e6b9c83d2");
  // });
  // test("20231010", () => {
  //   const n = {
  //     // data: '{"ms_codes":"2019030100","params":"{"biz":"new_detail_web2","scene":"component","componentVersion":"3","ip":"183.129.167.42","debug":0,"utdid":"TyNmHYeaUmcCAXPuK4Jgz6e+","userId":"","platform":"pc","gray":0,"nextSession":"{\\"spmA\\":\\"a2h08\\",\\"level\\":2,\\"spmC\\":\\"1_3\\",\\"spmB\\":\\"8165823\\",\\"lastPageNo\\":0,\\"index\\":5,\\"pageId\\":\\"PCSHOW_VARIETY_NORMAL\\",\\"pageName\\":\\"page_playpage\\",\\"lastSubIndex\\":20,\\"lifecycle\\":1,\\"scmB\\":\\"manual\\",\\"scmA\\":\\"20140719\\",\\"lastSubId\\":1529211084,\\"scmC\\":\\"239036\\",\\"id\\":239036}","showId":"53efbfbd70efbfbd52ef"}","system_info":"{"os":"pc","device":"pc","ver":"1.0.0","appPackageKey":"pcweb","appPackageId":"pcweb"}"}',
  //     // data: '{"ms_codes":"2019030100","params":"{\\"biz\\":\\"new_detail_web2\\",\\"scene\\":\\"component\\",\\"componentVersion\\":\\"3\\",\\"ip\\":\\"115.238.43.130\\",\\"debug\\":0,\\"utdid\\":\\"TyNmHYeaUmcCAXPuK4Jgz6e+\\",\\"userId\\":\\"\\",\\"platform\\":\\"pc\\",\\"gray\\":0,\\"nextSession\\":\\"{\\\\\\"spmA\\\\\\":\\\\\\"a2h08\\\\\\",\\\\\\"level\\\\\\":2,\\\\\\"spmC\\\\\\":\\\\\\"1_3\\\\\\",\\\\\\"spmB\\\\\\":\\\\\\"8165823\\\\\\",\\\\\\"lastPageNo\\\\\\":0,\\\\\\"index\\\\\\":2,\\\\\\"pageId\\\\\\":\\\\\\"PCSHOW_VARIETY_NORMAL\\\\\\",\\\\\\"pageName\\\\\\":\\\\\\"page_playpage\\\\\\",\\\\\\"lastSubIndex\\\\\\":20,\\\\\\"lifecycle\\\\\\":1,\\\\\\"scmB\\\\\\":\\\\\\"manual\\\\\\",\\\\\\"scmA\\\\\\":\\\\\\"20140719\\\\\\",\\\\\\"lastSubId\\\\\\":1529211084,\\\\\\"scmC\\\\\\":\\\\\\"239036\\\\\\",\\\\\\"id\\\\\\":239036}\\",\\"showId\\":\\"ceacba3689f8468ebbfc\\"}","system_info":"{\\"os\\":\\"pc\\",\\"device\\":\\"pc\\",\\"ver\\":\\"1.0.0\\",\\"appPackageKey\\":\\"pcweb\\",\\"appPackageId\\":\\"pcweb\\"}"}',
  //     data2: JSON.stringify({
  //       ms_codes: "2019030100",
  //       params: JSON.stringify({
  //         biz: "new_detail_web2",
  //         scene: "component",
  //         componentVersion: "3",
  //         ip: "115.238.43.130",
  //         debug: 0,
  //         utdid: "TyNmHYeaUmcCAXPuK4Jgz6e+",
  //         userId: "",
  //         platform: "pc",
  //         gray: 0,
  //         nextSession: JSON.stringify({
  //           spmA: "a2h08",
  //           level: 2,
  //           spmC: "1_3",
  //           spmB: "8165823",
  //           lastPageNo: 0,
  //           index: 2,
  //           pageId: "PCSHOW_VARIETY_NORMAL",
  //           pageName: "page_playpage",
  //           lastSubIndex: 20,
  //           lifecycle: 1,
  //           scmB: "manual",
  //           scmA: "20140719",
  //           lastSubId: 1529211084,
  //           scmC: "239036",
  //           id: 239036,
  //         }),
  //         showId: "ceacba3689f8468ebbfc",
  //       }),
  //       system_info: JSON.stringify({
  //         os: "pc",
  //         device: "pc",
  //         ver: "1.0.0",
  //         appPackageKey: "pcweb",
  //         appPackageId: "pcweb",
  //       }),
  //     }),
  //   };
  //   const sign = get_sign({
  //     t: 1701097452203,
  //     d: n.data2,
  //   });
  //   expect(sign).toBe("f46e8c6bfb7c8c1dc6f419d2a3e4b230");
  // });
  test("simple6", () => {
    const e = "Thu, 30-Nov-2023 02:30:04 GMT";
    const r = dayjs(e).format("YYYY-MM-DD HH:mm:ss");
    expect(r).toBe("2023-11-30 10:30:04");
  });
});
