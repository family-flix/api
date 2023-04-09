/**
 * @file 生成阿里云 x-signature 的方法
 */
import crypto from "crypto";
const ft: {
  web?: typeof window.crypto;
  node?: typeof crypto;
} = {
  web: "object" == typeof window && "crypto" in window ? window.crypto : void 0,
  node: crypto,
};
function bigIntToBytes(t: bigint) {
  return hexToBytes(A(t));
}
const ht = {
  isValidPrivateKey(t: string | Uint8Array) {
    try {
      return toBigInt(t), !0;
    } catch (t) {
      return !1;
    }
  },
  hashToPrivateKey: (t: Uint8Array) => {
    if ((t = ensure_uint8array(t)).length < 40 || t.length > 1024)
      throw new Error("Expected 40-1024 bytes of private key as per FIPS 186");
    const e = P(unit8array_to_bigint(t), f.n);
    if (e === i || e === o) throw new Error("Invalid private key");
    return bigIntToBytes(e);
  },
  randomBytes: (t = 32) => {
    if (ft.web) {
      return ft.web.getRandomValues(new Uint8Array(t));
    }
    if (ft.node) {
      const { randomBytes } = ft.node;
      return Uint8Array.from(randomBytes(t));
    }
    throw new Error("The environment doesn't have randomBytes function");
  },
  randomPrivateKey: () => ht.hashToPrivateKey(ht.randomBytes(40)),
  bytesToHex,
  sha256: async (t: Uint8Array) => {
    if (ft.web) {
      const e = await ft.web.subtle.digest("SHA-256", t.buffer);
      return new Uint8Array(e);
    }
    if (ft.node) {
      const { createHash: e } = ft.node;
      return Uint8Array.from(e("sha256").update(t).digest());
    }
    throw new Error("The environment doesn't have sha256 function");
  },
  hmacSha256: async (t: ArrayBuffer, ...e: Uint8Array[]) => {
    if (ft.web) {
      const r = await ft.web.subtle.importKey(
          "raw",
          t,
          { name: "HMAC", hash: { name: "SHA-256" } },
          !1,
          ["sign"]
        ),
        n = E(...e),
        i = await ft.web.subtle.sign("HMAC", r, n);
      return new Uint8Array(i);
    }
    if (ft.node) {
      const { createHmac: r } = ft.node;
      // @ts-ignore
      const n = r("sha256", t);
      return e.forEach((t) => n.update(t)), Uint8Array.from(n.digest());
    }
    throw new Error("The environment doesn't have hmac-sha256 function");
  },
  sha256Sync: void 0,
  hmacSha256Sync: void 0,
};

class V {
  v: Uint8Array;
  k: Uint8Array;
  counter: number;
  constructor() {
    (this.v = new Uint8Array(32).fill(1)),
      (this.k = new Uint8Array(32).fill(0)),
      (this.counter = 0);
  }
  hmac(...t: Uint8Array[]) {
    return ht.hmacSha256(this.k, ...t);
  }
  // hmacSync(...t) {
  //   if ("function" != typeof ht.hmacSha256Sync)
  //     throw new Error("utils.hmacSha256Sync is undefined, you need to set it");
  //   const e = ht.hmacSha256Sync(this.k, ...t);
  //   if (e instanceof Promise)
  //     throw new Error("To use sync sign(), ensure utils.hmacSha256 is sync");
  //   return e;
  // }
  incr() {
    if (this.counter >= 1e3)
      throw new Error("Tried 1,000 k values for sign(), all were invalid");
    this.counter += 1;
  }
  async reseed(t = new Uint8Array()) {
    (this.k = await this.hmac(this.v, Uint8Array.from([0]), t)),
      (this.v = await this.hmac(this.v)),
      0 !== t.length &&
        ((this.k = await this.hmac(this.v, Uint8Array.from([1]), t)),
        (this.v = await this.hmac(this.v)));
  }
  // reseedSync(t = new Uint8Array()) {
  //   (this.k = this.hmacSync(this.v, Uint8Array.from([0]), t)),
  //     (this.v = this.hmacSync(this.v)),
  //     0 !== t.length &&
  //       ((this.k = this.hmacSync(this.v, Uint8Array.from([1]), t)),
  //       (this.v = this.hmacSync(this.v)));
  // }
  async generate() {
    return this.incr(), (this.v = await this.hmac(this.v)), this.v;
  }
  // generateSync() {
  //   return this.incr(), (this.v = this.hmacSync(this.v)), this.v;
  // }
}
function hexToBytes(encoded_payload: string) {
  // console.log("[]R", encoded_payload);
  if ("string" != typeof encoded_payload) {
    throw new TypeError(
      "hexToBytes: expected string, got " + typeof encoded_payload
    );
  }
  if (encoded_payload.length % 2) {
    throw new Error(
      "hexToBytes: received invalid unpadded hex" + encoded_payload.length
    );
  }
  const e = new Uint8Array(encoded_payload.length / 2);
  for (let r = 0; r < e.length; r++) {
    const n = 2 * r,
      i = encoded_payload.slice(n, n + 2),
      o = Number.parseInt(i, 16);
    if (Number.isNaN(o) || o < 0) throw new Error("Invalid byte sequence");
    e[r] = o;
  }
  return e;
}
function hexToBigInt(private_hex_string: string) {
  if ("string" != typeof private_hex_string) {
    throw new TypeError(
      "hexToNumber: expected string, got " + typeof private_hex_string
    );
  }
  return BigInt(`0x${private_hex_string}`);
}
function is_uint8_array(t: unknown) {
  return t instanceof Uint8Array;
}

/** 从 0 开始 256 位十六进制数字 */
const v = Array.from({ length: 256 }, (t, e) =>
  e.toString(16).padStart(2, "0")
);
/** 转十六进制字符串 */
function bytesToHex(private_key: Uint8Array) {
  if (!(private_key instanceof Uint8Array)) {
    throw new Error("Expected Uint8Array");
  }
  let e = "";
  for (let r = 0; r < private_key.length; r++) {
    e += v[private_key[r]];
  }
  return e;
}
function unit8array_to_bigint(private_key: Uint8Array) {
  return hexToBigInt(bytesToHex(private_key));
}
const i = BigInt(0),
  o = BigInt(1),
  s = BigInt(2),
  a = BigInt(3),
  c = BigInt(8),
  u = s ** BigInt(256);
const f = {
  a: i,
  b: BigInt(7),
  P: u - s ** BigInt(32) - BigInt(977),
  n: u - BigInt("432420386565659656852420866394968145599"),
  h: o,
  Gx: BigInt(
    "55066263022277343669578718895168534326250603453777594175500187360389116729240"
  ),
  Gy: BigInt(
    "32670510020758816978083085130507043184471273380659243275938904335757337482424"
  ),
  beta: BigInt(
    "0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"
  ),
};
function is_valid_bigint(t: bigint) {
  return i < t && t < f.n;
}
function toBigInt(private_key: Uint8Array | string) {
  if ("bigint" == typeof private_key) {
    return private_key;
  }
  if (
    "number" == typeof private_key &&
    Number.isSafeInteger(private_key) &&
    private_key > 0
  ) {
    return BigInt(private_key);
  }
  if ("string" == typeof private_key) {
    if (64 !== private_key.length) {
      throw new Error("Expected 32 bytes of private key");
    }
    return hexToBigInt(private_key);
  }
  if (!is_uint8_array(private_key)) {
    throw new TypeError("Expected valid private key");
  }
  if (32 !== private_key.length) {
    throw new Error("Expected 32 bytes of private key");
  }
  const bigInt = unit8array_to_bigint(private_key);
  if (!is_valid_bigint(bigInt)) {
    throw new Error("Expected private key: 0 < key < n");
  }
  return bigInt;
}
function ensure_uint8array(encoded_payload: Uint8Array | string) {
  return encoded_payload instanceof Uint8Array
    ? Uint8Array.from(encoded_payload)
    : hexToBytes(encoded_payload);
}
function L(private_key: bigint) {
  if ("bigint" != typeof private_key) {
    throw new Error("Expected bigint");
  }
  return hexToBytes(A(private_key));
}
function J(t: Uint8Array) {
  return unit8array_to_bigint(t.length > 32 ? t.slice(0, 32) : t);
}
function j(t: Uint8Array) {
  const e = J(t);
  const r = P(e, f.n);
  return L(r < i ? e : r);
}
function E(...t: Uint8Array[]) {
  if (!t.every(is_uint8_array)) {
    throw new Error("Uint8Array list expected");
  }
  if (1 === t.length) return t[0];
  const e = t.reduce((t, e) => t + e.length, 0),
    r = new Uint8Array(e);
  for (let e = 0, n = 0; e < t.length; e++) {
    const i = t[e];
    r.set(i, n), (n += i.length);
  }
  return r;
}
function Q(
  encoded_payload: Uint8Array,
  private_key: Uint8Array,
  extraEntropy?: Uint8Array
) {
  if (null == encoded_payload) {
    throw new Error(
      `sign: expected valid message hash, not "${encoded_payload}"`
    );
  }
  // console.log('[]Q', encoded_payload);
  // H 就是判断了下 encoded_payload 是否为 Uint8Array，是就 Uint8Array.from 返回，否则调用 R，有点 format 的意思
  const payload_uint8_array = ensure_uint8array(encoded_payload);
  // console.log('after H', n);
  const private_key_big_int = toBigInt(private_key);
  const o = [L(private_key_big_int), j(payload_uint8_array)];
  // !!!!重要 这里不能用 !==
  if (extraEntropy != null) {
    extraEntropy = ht.randomBytes(32);
    const t = ensure_uint8array(extraEntropy);
    if (32 !== t.length) {
      throw new Error("sign: Expected 32 bytes of extra data");
    }
    o.push(t);
  }
  return { seed: E(...o), m: J(payload_uint8_array), d: private_key_big_int };
}

const y = new WeakMap();
function Z(t: bigint) {
  return i < t && t < f.P;
}
function T(t: bigint, e: bigint) {
  const { P: r } = f;
  let n = t;
  for (; e-- > i; ) (n *= n), (n %= r);
  return n;
}
function P(t: bigint, e = f.P) {
  const r = t % e;
  return r >= i ? r : e + r;
}
function h(t: bigint) {
  const { a: e, b: r } = f,
    n = P(t * t),
    i = P(n * t);
  return P(i + e * t + r);
}
function to_bigint(t: number | bigint) {
  if ("number" == typeof t && Number.isSafeInteger(t) && t > 0) {
    return BigInt(t);
  }
  if ("bigint" == typeof t && is_valid_bigint(t)) {
    return t;
  }
  throw new TypeError("Expected valid private scalar: 0 < scalar < curve.n");
}
const w = f.a === i;
const z = (t: bigint, e: bigint) => (t + e / s) / e;
const C = s ** BigInt(128);
function _(t: bigint) {
  const { n: e } = f,
    r = BigInt("0x3086d221a7d46bcde86c90e49284eb15"),
    n = -o * BigInt("0xe4437ed6010e88286f547fa90abfe4c3"),
    i = BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8"),
    s = r,
    a = z(s * t, e),
    c = z(-n * t, e);
  let u = P(t - a * r - c * i, e),
    h = P(-a * n - c * s, e);
  const w = u > C,
    l = h > C;
  if ((w && (u = e - u), l && (h = e - h), u > C || h > C))
    throw new Error("splitScalarEndo: Endomorphism failed, k=" + t);
  return { k1neg: w, k1: u, k2neg: l, k2: h };
}
class JacobianPoint {
  x: bigint;
  y: bigint;
  z: bigint;
  constructor(t: bigint, e: bigint, r: bigint) {
    this.x = t;
    this.y = e;
    this.z = r;
  }
  static fromAffine(t: WindowWithPoint) {
    if (!(t instanceof WindowWithPoint)) {
      throw new TypeError("JacobianPoint#fromAffine: expected Point");
    }
    return new JacobianPoint(t.x, t.y, o);
  }
  static toAffineBatch(t: [JacobianPoint, JacobianPoint]) {
    const e = (function (t, e = f.P) {
      const r = new Array(t.length),
        n = $(
          t.reduce((t, n, o) => (n === i ? t : ((r[o] = t), P(t * n, e))), o),
          e
        );
      return (
        t.reduceRight(
          (t, n, o) => (n === i ? t : ((r[o] = P(t * r[o], e)), P(t * n, e))),
          n
        ),
        r
      );
    })(t.map((t) => t.z));
    return t.map((t, r) => t.toAffine(e[r]));
  }
  static normalizeZ(t: [JacobianPoint, JacobianPoint]) {
    return JacobianPoint.toAffineBatch(t).map(JacobianPoint.fromAffine);
  }
  equals(t: JacobianPoint) {
    if (!(t instanceof JacobianPoint)) {
      throw new TypeError("JacobianPoint expected");
    }
    const { x: e, y: r, z: n } = this;
    const { x: i, y: o, z: a } = t;
    const c = P(n ** s);
    const u = P(a ** s);
    const f = P(e * u);
    const h = P(i * c);
    const w = P(P(r * a) * u);
    const y = P(P(o * n) * c);
    return f === h && w === y;
  }
  negate() {
    return new JacobianPoint(this.x, P(-this.y), this.z);
  }
  double() {
    const { x: t, y: e, z: r } = this,
      n = P(t ** s),
      i = P(e ** s),
      o = P(i ** s),
      u = P(s * (P((t + i) ** s) - n - o)),
      f = P(a * n),
      h = P(f ** s),
      w = P(h - s * u),
      y = P(f * (u - w) - c * o),
      d = P(s * e * r);
    return new JacobianPoint(w, y, d);
  }
  static BASE = new JacobianPoint(f.Gx, f.Gy, o);
  static ZERO = new JacobianPoint(i, o, i);
  add(t: JacobianPoint) {
    if (!(t instanceof JacobianPoint)) {
      throw new TypeError("JacobianPoint expected");
    }
    const { x: e, y: r, z: n } = this,
      { x: o, y: a, z: c } = t;
    if (o === i || a === i) return this;
    if (e === i || r === i) return t;
    const u = P(n ** s),
      f = P(c ** s),
      h = P(e * f),
      w = P(o * u),
      y = P(P(r * c) * f),
      d = P(P(a * n) * u),
      g = P(w - h),
      m = P(d - y);
    if (g === i) return m === i ? this.double() : JacobianPoint.ZERO;
    const p = P(g ** s),
      E = P(g * p),
      x = P(h * p),
      v = P(m ** s - E - s * x),
      b = P(m * (x - v) - y * E),
      A = P(n * c * g);
    return new JacobianPoint(v, b, A);
  }
  precomputeWindow(t: number) {
    const e = w ? 128 / t + 1 : 256 / t + 1,
      r = [];
    let n = this,
      i = n;
    for (let o = 0; o < e; o++) {
      i = n;
      r.push(i);
      for (let e = 1; e < 2 ** (t - 1); e++) {
        // @ts-ignore
        i = i.add(n);
        r.push(i);
      }
      // @ts-ignore
      n = i.double();
    }
    return r;
  }
  wNAF(t: bigint, e: WindowWithPoint) {
    !e && this.equals(JacobianPoint.BASE) && (e = WindowWithPoint.BASE);
    const r = (e && e._WINDOW_SIZE) || 1;
    if (256 % r) {
      throw new Error(
        "Point#wNAF: Invalid precomputation window, must be power of 2"
      );
    }
    let n = e && y.get(e);
    n ||
      ((n = this.precomputeWindow(r)),
      e && 1 !== r && ((n = JacobianPoint.normalizeZ(n)), y.set(e, n)));
    let i = JacobianPoint.ZERO,
      s = JacobianPoint.ZERO;
    const a = 1 + (w ? 128 / r : 256 / r),
      c = 2 ** (r - 1),
      u = BigInt(2 ** r - 1),
      f = 2 ** r,
      h = BigInt(r);
    for (let e = 0; e < a; e++) {
      const r = e * c;
      let a = Number(t & u);
      if (((t >>= h), a > c && ((a -= f), (t += o)), 0 === a)) {
        let t = n[r];
        e % 2 && (t = t.negate()), (s = s.add(t));
      } else {
        let t = n[r + Math.abs(a) - 1];
        a < 0 && (t = t.negate()), (i = i.add(t));
      }
    }
    return { p: i, f: s };
  }
  multiply(t: bigint, e: WindowWithPoint) {
    let r,
      n,
      i = to_bigint(t);
    if (w) {
      const { k1neg: t, k1: o, k2neg: s, k2: a } = _(i);
      let { p: c, f: u } = this.wNAF(o, e),
        { p: h, f: w } = this.wNAF(a, e);
      t && (c = c.negate()),
        s && (h = h.negate()),
        (h = new JacobianPoint(P(h.x * f.beta), h.y, h.z)),
        (r = c.add(h)),
        (n = u.add(w));
    } else {
      const { p: t, f: o } = this.wNAF(i, e);
      (r = t), (n = o);
    }
    return JacobianPoint.normalizeZ([r, n])[0];
  }
  toAffine(t = $(this.z)) {
    const { x: e, y: r, z: n } = this,
      i = t,
      s = P(i * i),
      a = P(s * i),
      c = P(e * s),
      u = P(r * a);
    if (P(n * i) !== o) throw new Error("invZ was invalid");
    return new WindowWithPoint(c, u);
  }
}
class WindowWithPoint {
  x: bigint;
  y: bigint;
  _WINDOW_SIZE: number = 0;
  constructor(t: bigint, e: bigint) {
    this.x = t;
    this.y = e;
  }
  static fromCompressedHex(t: Uint8Array) {
    const e = 32 === t.length;
    const r = unit8array_to_bigint(e ? t : t.subarray(1));
    if (!Z(r)) {
      throw new Error("Point is not on curve");
    }
    let n = (function (t) {
      const { P: e } = f,
        r = BigInt(6),
        n = BigInt(11),
        i = BigInt(22),
        o = BigInt(23),
        c = BigInt(44),
        u = BigInt(88),
        h = (t * t * t) % e,
        w = (h * h * t) % e,
        l = (T(w, a) * w) % e,
        y = (T(l, a) * w) % e,
        d = (T(y, s) * h) % e,
        g = (T(d, n) * d) % e,
        m = (T(g, i) * g) % e,
        p = (T(m, c) * m) % e,
        E = (T(p, u) * p) % e,
        x = (T(E, c) * m) % e,
        v = (T(x, a) * w) % e,
        b = (T(v, o) * g) % e,
        A = (T(b, r) * h) % e;
      return T(A, s);
    })(h(r));
    const i = (n & o) === o;
    e ? i && (n = P(-n)) : (1 == (1 & t[0])) !== i && (n = P(-n));
    const c = new WindowWithPoint(r, n);
    return c.assertValidity(), c;
  }
  static fromUncompressedHex(t: Uint8Array) {
    const e = unit8array_to_bigint(t.subarray(1, 33)),
      r = unit8array_to_bigint(t.subarray(33, 65)),
      n = new WindowWithPoint(e, r);
    return n.assertValidity(), n;
  }
  static fromHex(t: string) {
    const e = ensure_uint8array(t);
    const r = e.length;
    const n = e[0];
    if (32 === r || (33 === r && (2 === n || 3 === n)))
      return this.fromCompressedHex(e);
    if (65 === r && 4 === n) return this.fromUncompressedHex(e);
    throw new Error(
      `Point.fromHex: received invalid point. Expected 32-33 compressed bytes or 65 uncompressed bytes, not ${r}`
    );
  }
  static BASE = new WindowWithPoint(f.Gx, f.Gy);
  toRawBytes(t = !1) {
    return hexToBytes(this.toHex(t));
  }
  toHex(t = !1) {
    const e = A(this.x);
    return t ? `${this.y & o ? "03" : "02"}${e}` : `04${e}${A(this.y)}`;
  }
  toHexX() {
    return this.toHex(!0).slice(2);
  }
  toRawX() {
    return this.toRawBytes(!0).slice(1);
  }
  assertValidity() {
    const t = "Point is not on elliptic curve",
      { x: e, y: r } = this;
    if (!Z(e) || !Z(r)) throw new Error(t);
    const n = P(r * r);
    if (P(n - h(e)) !== i) throw new Error(t);
  }
  equals(t: JacobianPoint) {
    return this.x === t.x && this.y === t.y;
  }
  negate() {
    return new WindowWithPoint(this.x, P(-this.y));
  }
  double() {
    return JacobianPoint.fromAffine(this).double().toAffine();
  }
  add(t: WindowWithPoint) {
    return JacobianPoint.fromAffine(this)
      .add(JacobianPoint.fromAffine(t))
      .toAffine();
  }
  subtract(t: WindowWithPoint) {
    return this.add(t.negate());
  }
  multiply(t: bigint) {
    return JacobianPoint.fromAffine(this).multiply(t, this).toAffine();
  }
}
// function P(t, e = f.P) {
//   const r = t % e;
//   return r >= i ? r : e + r;
// }
function $(t: bigint, e = f.P) {
  if (t === i || e <= i) {
    throw new Error(`invert: expected positive integers, got n=${t} mod=${e}`);
  }
  let r = P(t, e),
    n = e,
    s = i,
    a = o,
    c = o,
    u = i;
  for (; r !== i; ) {
    const t = n / r,
      e = n % r,
      i = s - c * t,
      o = a - u * t;
    (n = r), (r = e), (s = c), (a = u), (c = i), (u = o);
  }
  if (n !== o) throw new Error("invert: does not exist");
  return P(s, e);
}
function B(t: number | bigint) {
  const e = t.toString(16);
  return 1 & e.length ? `0${e}` : e;
}
function g(t: string) {
  return Number.parseInt(t[0], 16) >= 8 ? "00" + t : t;
}
class p {
  r: bigint;
  s: bigint;
  constructor(t: bigint, e: bigint) {
    this.r = t;
    this.s = e;
    this.assertValidity();
  }
  assertValidity() {
    const { r: t, s: e } = this;
    if (!is_valid_bigint(t)) {
      throw new Error("Invalid Signature: r must be 0 < r < n");
    }
    if (!is_valid_bigint(e)) {
      throw new Error("Invalid Signature: s must be 0 < s < n");
    }
  }
  hasHighS() {
    const t = f.n >> o;
    return this.s > t;
  }
  normalizeS() {
    return this.hasHighS() ? new p(this.r, f.n - this.s) : this;
  }
  toDERRawBytes(t = !1) {
    return hexToBytes(this.toDERHex(t));
  }
  toDERHex(t = !1) {
    const e = g(B(this.s));
    if (t) {
      return e;
    }
    const r = g(B(this.r));
    const n = B(r.length / 2);
    const i = B(e.length / 2);
    return `30${B(r.length / 2 + e.length / 2 + 4)}02${n}${r}02${i}${e}`;
  }
  toCompactRawBytes() {
    return hexToBytes(this.toCompactHex());
  }
  toCompactHex() {
    return A(this.r) + A(this.s);
  }
}
function A(private_key: bigint) {
  if (private_key > u) {
    throw new Error("Expected number < 2^256");
  }
  return private_key.toString(16).padStart(64, "0");
}
function D(t: Uint8Array, e: bigint, r: bigint) {
  const n = unit8array_to_bigint(t);
  if (!is_valid_bigint(n)) {
    return;
  }
  const { n: s } = f;
  const a = WindowWithPoint.BASE.multiply(n);
  const c = P(a.x, s);
  if (c === i) {
    return;
  }
  const u = P($(n, s) * P(e + r * c, s), s);
  if (u === i) {
    return;
  }
  const h = new p(c, u);
  return { sig: h, recovery: (a.x === h.r ? 0 : 2) | Number(a.y & o) };
}
function Y(
  t: { sig: p; recovery: number },
  e: Partial<{
    recovered: boolean;
    der: boolean;
    extraEntropy: unknown;
  }> = {}
) {
  let { sig: r, recovery: n } = t;
  const {
    canonical: i,
    der: o,
    recovered: s,
  } = Object.assign({ canonical: !0, der: !0 }, e);
  i && r.hasHighS() && ((r = r.normalizeS()), (n ^= 1));
  const a = o ? r.toDERRawBytes() : r.toCompactRawBytes();
  return s ? [a, n] : a;
}

async function sign(
  encoded_payload: Uint8Array,
  private_key: Uint8Array,
  r: Partial<{
    recovered: boolean;
    der: boolean;
    extraEntropy?: Uint8Array;
  }> = {}
) {
  const { seed, m, d } = Q(encoded_payload, private_key, r.extraEntropy);
  let s;
  const a = new V();
  for (await a.reseed(seed); !(s = D(await a.generate(), m, d)); ) {
    await a.reseed();
  }
  return Y(s, r);
}
export async function get_signature(payload: string, private_key: Uint8Array) {
  const uint8Array = new Uint8Array(payload.length);
  for (let i = 0; i < payload.length; i += 1) {
    uint8Array[i] = payload.charCodeAt(i);
  }
  const encoded_payload = await ht.sha256(uint8Array);
  const rr = await sign(encoded_payload, private_key, {
    recovered: !0,
    der: !1,
  });
  const [c, u] = rr as [Uint8Array, number];
  const d = "".concat(ht.bytesToHex(c), "0").concat(u.toString());
  return d;
}
