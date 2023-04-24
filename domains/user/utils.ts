import crypto from "crypto";
import { Algorithms } from "./types";

// @see https://github.com/lukeed/uid
export function uid(len?: number): string {
  var str = "",
    num = len || 11,
    arr = randomize(num);
  while (num--) str += ALPHANUM[arr[num] & 63];
  return str;
}

export function toHEX(input: ArrayBuffer): string {
  let i = 0,
    output = "",
    arr = new Uint8Array(input);
  for (; i < arr.length; i++) output += HEX[arr[i]];
  return output;
}

export type SALT = UID<128>;
export type PASSWORD = UID<64>;
export type TOKEN = UID<100>;

/**
 * Generate a new `UID<128>` value.
 * @NOTE This is a `user`-specific password salter.
 */
export const salt = () => uid(128) as SALT;

/**
 * Hash a raw `password` string.
 * Applies `PBKDF2` with a SHA256 hexadecimal digest.
 */
export function hash(password: string, salt: SALT): Promise<PASSWORD> {
  return PBKDF2("SHA-256", password, salt, 1000, 64).then(
    toHEX
  ) as Promise<PASSWORD>;
}

/**
 * Determine if the incoming `password` matches the `User.password` value.
 */
export async function compare(
  user: {
    salt: string;
    password: string;
  },
  password: PASSWORD | string
): Promise<boolean> {
  return (await hash(password, user.salt as SALT)) === user.password;
}

/**
 * Prepare a new password for storage
 */
export async function prepare(password: string) {
  const token = salt();
  const hashed = await hash(password, token);
  return { salt: token, password: hashed };
}

/**
 * 开始「忘记密码」流程
 * Insert a new `reset::{token}` document.
 * @NOTE Initiates the "Password Reset" pipeline.
 */
// export async function forgot(user): Promise<boolean> {
// Create new TOKENs until find unused value
//   const token = await utils.until(toUID, find);

// Persist the TOKEN value to storage; auto-expire after 12 hours (in secs)
//   await database.write(toKID(token), user.uid, { expirationTtl: 12 * 60 * 60 });
//   await client.

// TODO: send email to `user.email` with reset link

//   return true;
// }

import { Crypto } from "@peculiar/webcrypto";
import { Result, resultify } from "@/types";
import { decode_token } from "./jwt";

// import type { Algorithms } from "@/lib/utils/types";

// import { encode } from "./index";

const crypto1 = new Crypto();

export function keyload(
  algo: Algorithms.Keying,
  secret: string,
  scopes: KeyUsage[]
): Promise<CryptoKey> {
  return crypto1.subtle.importKey("raw", encode(secret), algo, false, scopes);
}

export async function PBKDF2(
  digest: Algorithms.Digest,
  password: string,
  salt: string,
  iters: number,
  length: number
): Promise<ArrayBuffer> {
  const key = await keyload("PBKDF2", password, ["deriveBits"]);

  const algo: Pbkdf2Params = {
    name: "PBKDF2",
    salt: encode(salt),
    iterations: iters,
    hash: digest,
  };

  return crypto1.subtle.deriveBits(algo, key, length << 3);
}

export type UID<N extends number> = { 0: string; length: N } & string;

// All 256 hexadecimal pairs (max index = 255)
// @see https://esbench.com/bench/60555d036c89f600a570049d
export const HEX = /*#__PURE__*/ [
  "00",
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "0a",
  "0b",
  "0c",
  "0d",
  "0e",
  "0f",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "1a",
  "1b",
  "1c",
  "1d",
  "1e",
  "1f",
  "20",
  "21",
  "22",
  "23",
  "24",
  "25",
  "26",
  "27",
  "28",
  "29",
  "2a",
  "2b",
  "2c",
  "2d",
  "2e",
  "2f",
  "30",
  "31",
  "32",
  "33",
  "34",
  "35",
  "36",
  "37",
  "38",
  "39",
  "3a",
  "3b",
  "3c",
  "3d",
  "3e",
  "3f",
  "40",
  "41",
  "42",
  "43",
  "44",
  "45",
  "46",
  "47",
  "48",
  "49",
  "4a",
  "4b",
  "4c",
  "4d",
  "4e",
  "4f",
  "50",
  "51",
  "52",
  "53",
  "54",
  "55",
  "56",
  "57",
  "58",
  "59",
  "5a",
  "5b",
  "5c",
  "5d",
  "5e",
  "5f",
  "60",
  "61",
  "62",
  "63",
  "64",
  "65",
  "66",
  "67",
  "68",
  "69",
  "6a",
  "6b",
  "6c",
  "6d",
  "6e",
  "6f",
  "70",
  "71",
  "72",
  "73",
  "74",
  "75",
  "76",
  "77",
  "78",
  "79",
  "7a",
  "7b",
  "7c",
  "7d",
  "7e",
  "7f",
  "80",
  "81",
  "82",
  "83",
  "84",
  "85",
  "86",
  "87",
  "88",
  "89",
  "8a",
  "8b",
  "8c",
  "8d",
  "8e",
  "8f",
  "90",
  "91",
  "92",
  "93",
  "94",
  "95",
  "96",
  "97",
  "98",
  "99",
  "9a",
  "9b",
  "9c",
  "9d",
  "9e",
  "9f",
  "a0",
  "a1",
  "a2",
  "a3",
  "a4",
  "a5",
  "a6",
  "a7",
  "a8",
  "a9",
  "aa",
  "ab",
  "ac",
  "ad",
  "ae",
  "af",
  "b0",
  "b1",
  "b2",
  "b3",
  "b4",
  "b5",
  "b6",
  "b7",
  "b8",
  "b9",
  "ba",
  "bb",
  "bc",
  "bd",
  "be",
  "bf",
  "c0",
  "c1",
  "c2",
  "c3",
  "c4",
  "c5",
  "c6",
  "c7",
  "c8",
  "c9",
  "ca",
  "cb",
  "cc",
  "cd",
  "ce",
  "cf",
  "d0",
  "d1",
  "d2",
  "d3",
  "d4",
  "d5",
  "d6",
  "d7",
  "d8",
  "d9",
  "da",
  "db",
  "dc",
  "dd",
  "de",
  "df",
  "e0",
  "e1",
  "e2",
  "e3",
  "e4",
  "e5",
  "e6",
  "e7",
  "e8",
  "e9",
  "ea",
  "eb",
  "ec",
  "ed",
  "ee",
  "ef",
  "f0",
  "f1",
  "f2",
  "f3",
  "f4",
  "f5",
  "f6",
  "f7",
  "f8",
  "f9",
  "fa",
  "fb",
  "fc",
  "fd",
  "fe",
  "ff",
];
export function viaHEX(input: string): Uint8Array {
  let i = 0,
    len = input.length,
    out: number[] = [];

  if (len & 1) {
    input += "0";
    len++;
  }

  for (; i < len; i += 2) {
    out.push(parseInt(input[i] + input[i + 1], 16));
  }

  return new Uint8Array(out);
}

// @see https://github.com/lukeed/uuid
export const uuid = () => crypto.randomUUID();

// Alphabet for `uid` generator
const ALPHANUM =
  /*#__PURE__*/ "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890-_";

// (ulid) Crockford's Base32
const BASE32 = /*#__PURE__*/ "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

// @see https://github.com/ulid/spec
export function ulid(): string {
  var str = "",
    num = 16,
    now = Date.now();
  var tmp: number,
    maxlen = BASE32.length;
  var arr = randomize(num);

  while (num--) {
    tmp = ((arr[num] / 255) * maxlen) | 0;
    if (tmp === maxlen) tmp = 31;
    str = BASE32.charAt(tmp) + str;
  }

  for (num = 10; num--; ) {
    tmp = now % maxlen;
    now = (now - tmp) / maxlen;
    str = BASE32.charAt(tmp) + str;
  }

  return str;
}

export function randomize(length: number): Uint8Array {
  return crypto.randomBytes(length);
}

export const Encoder = /*#__PURE__*/ new TextEncoder();
export const Decoder = /*#__PURE__*/ new TextDecoder();

export const encode = (input: string) => Encoder.encode(input);
export const decode = (input: ArrayBufferView | ArrayBuffer, stream = false) =>
  Decoder.decode(input, { stream });

export function byteLength(input?: string): number {
  return input ? Encoder.encode(input).byteLength : 0;
}

/**
 * 解析 token
 */
export async function parse_token({
  token,
  secret,
}: {
  token?: string;
  secret: string;
}) {
  if (!token) {
    return Result.Err("Missing auth token");
  }
  const user_res = await resultify(decode_token)({ token, secret });
  if (user_res.error) {
    return Result.Err(user_res.error);
  }
  const user = user_res.data;
  if (user === null) {
    return Result.Err("invalid token");
  }
  if (user.id) {
    return Result.Ok({
      id: user.id,
    });
  }
  return Result.Err("invalid token");
}
