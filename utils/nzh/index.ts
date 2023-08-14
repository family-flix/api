import { lang_cn_b } from "./langs/cn_b";
import { lang_cn_s } from "./langs/cn_s";
import * as utils from "./utils";

/**
 * 阿拉伯数字转中文数字
 *
 * @param {String} num 阿拉伯数字/字符串 , 科学记数法字符串
 * @param {Object} opration 转换配置
 *                          {
 *                              ww: {万万化单位 | false}
 *                              tenMin: {十的口语化 | false}
 *                          }
 * @returns String
 */
function cl(
  num: number | string,
  options: Partial<{
    ww: string | false;
    tenMin: string | false;
    /** 数字 */
    ch: string;
    /** 单位 */
    ch_u: string;
    /** 负 */
    ch_f: string;
    /** 点 */
    ch_d: string;
  }> = {}
) {
  const result = utils.getNumbResult(num);
  if (!result) {
    return num;
  }
  const { ch = "", ch_u = "", ch_f = "", ch_d = "." } = options;
  // 零
  var n0 = ch.charAt(0);
  // 整数部分
  var _int = result.int;
  var _decimal = result.decimal; //小数部分
  var _minus = result.minus; //负数标识
  var int = "";
  var decimal = "";
  var minus = _minus ? ch_f : ""; //符号位

  const encodeInt = function encodeInt(
    _int: string,
    _m?: unknown,
    _dg?: unknown
  ) {
    _int = utils.getNumbResult(_int)!.int;
    var int = "";
    var tenm = arguments.length > 1 ? arguments[1] : options.tenMin;
    var _length = _int.length;
    // 一位整数
    if (_length === 1) {
      return ch.charAt(+_int);
    }
    if (_length <= 4) {
      // 四位及以下
      for (var i = 0, n = _length; n--; ) {
        var _num = +_int.charAt(i);
        int +=
          tenm && _length == 2 && i == 0 && _num == 1 ? "" : ch.charAt(_num);
        int += _num && n ? ch_u.charAt(n) : "";
        i++;
      }
    } else {
      // 大数递归
      var d = (_int.length / 4) >> 0;
      var y = _int.length % 4;
      //"兆","京"等单位处理
      while (y == 0 || !ch_u.charAt(3 + d)) {
        y += 4;
        d--;
      }
      var _maxLeft = _int.substr(0, y), //最大单位前的数字
        _other = _int.substr(y); //剩余数字

      int =
        encodeInt(_maxLeft, tenm) +
        ch_u.charAt(3 + d) +
        (_other.charAt(0) == "0" ? n0 : "") + //单位后有0则加零
        encodeInt(_other, _other.length > 4 ? tenm : false);
    }
    int = utils.clearZero(int, n0); //修整零
    return int;
  };

  // 转换小数部分
  if (_decimal) {
    _decimal = utils.clearZero(_decimal, "0", "$"); //去除尾部0
    for (var x = 0; x < _decimal.length; x++) {
      decimal += ch.charAt(+_decimal.charAt(x));
    }
    decimal = decimal ? ch_d + decimal : "";
  }

  //转换整数部分
  int = encodeInt(_int); //转换整数

  //超级大数的万万化
  if (options.ww && ch_u.length > 5) {
    var dw_w = ch_u.charAt(4),
      dw_y = ch_u.charAt(5);
    var lasty = int.lastIndexOf(dw_y);
    if (~lasty) {
      int =
        int.substring(0, lasty).replace(new RegExp(dw_y, "g"), dw_w + dw_w) +
        int.substring(lasty);
    }
  }

  return minus + int + decimal;
}

function uncl(
  cnnumb: string,
  options: Partial<{
    ww: string | false;
    tenMin: string | false;
    /** 数字 */
    ch: string;
    /** 单位 */
    ch_u: string;
    /** 负 */
    ch_f: string;
    /** 点 */
    ch_d: string;
  }> = {}
) {
  cnnumb = cnnumb.toString();
  const { ch = "", ch_d = "", ch_f = "", ch_u = "" } = options;
  var result = cnnumb.split(ch_d);
  var _int = result[0].replace(ch_f, ""),
    _decimal = result[1],
    _minus = !!~result[0].indexOf(ch_f);

  var dw_s = ch_u.charAt(1);
  var dw_w = ch_u.charAt(4);
  var dw_y = ch_u.charAt(5);

  _int = _int.replace(new RegExp(dw_w + "{2}", "g"), dw_y);

  var cnarr = _int.split("");
  var dw = 0,
    maxdw = 0;
  var rnum_a: (string | number)[] = [];
  var num_a: number[] = [];
  var _num_a: number[] = [];
  for (var i = 0; i < cnarr.length; i++) {
    var chr = cnarr[i];
    var n = 0,
      u = 0;
    if (~(n = ch.indexOf(chr))) {
      //_num = _num*10 + n;
      if (n > 0) _num_a.unshift(n);
      //_num_a.unshift(n);
    } else if (~(u = ch_u.indexOf(chr))) {
      var digit = utils.getDigit(u);
      if (dw > u) {
        //正常情况
        utils.unshiftZero(_num_a, digit);
        utils.centerArray(num_a, _num_a);
      } else if (u >= maxdw) {
        //后跟大单位
        if (i == 0) _num_a = [1];
        utils.centerArray(rnum_a, num_a, _num_a);
        if (rnum_a.length > 0) utils.unshiftZero(rnum_a, digit);
        maxdw = u;
      } else {
        if (_num_a.length == 0 && dw_s == chr) _num_a = [1];
        utils.centerArray(num_a, _num_a);
        utils.unshiftZero(num_a, utils.getDigit(u));
        dw = u;
      }
    }
  }
  utils.centerArray(rnum_a, num_a, _num_a).reverse();
  if (rnum_a.length == 0) rnum_a.push(0);
  var decimal: number | string = 0;
  if (_decimal) {
    rnum_a.push(".");
    decimal = "0.";
    for (var i = 0; i < _decimal.length; i++) {
      decimal += ch.indexOf(_decimal.charAt(i));
      rnum_a.push(ch.indexOf(_decimal.charAt(i)));
    }
    decimal = +decimal;
  }
  if (_minus) {
    rnum_a.unshift("-");
  }
  return parseFloat(rnum_a.join(""));
}

/**
 * 中文数字转阿拉伯数字
 *
 * @param {string} cnnumb 中文数字字符串
 * @returns Number
 */

export const cn = {
  encodeS(num: number | string, options: Record<string, unknown> = {}) {
    return cl(num, utils.extend({ ww: true, ...lang_cn_s }, options));
  },
  encodeB(num: string, options: Record<string, unknown> = {}) {
    // options = utils.extend({ ww: true }, options);
    return cl(num, utils.extend({ ww: true, ...lang_cn_b }, options));
  },
  decodeS(num: string, options: Record<string, unknown> = {}) {
    return uncl(num, utils.extend({ ww: true, ...lang_cn_s }, options));
  },
};
