import Joi from "joi";

import { prisma } from "@/store";
import { Result, resultify } from "@/types";
import { random_string } from "@/utils";

import { Credentials } from "./services";
import { compare, prepare } from "./utils";
import { encode_token } from "./jwt";

const credentialsSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().pattern(new RegExp("^[a-zA-Z0-9]{8,30}$")).required(),
});

export class User {
  nickname: string = "unknown";
  /** token 秘钥 */
  secret: string;

  constructor(options: Partial<{ secret: string }>) {
    const { secret = "FLIX" } = options;
    if (!secret) {
      throw new Error("Missing token secret");
    }
    this.secret = secret;
  }

  /** 补全信息 */
  async register(values: Partial<{ email: string; password: string }>) {
    const r = await resultify(
      credentialsSchema.validateAsync.bind(credentialsSchema)
    )(values);
    if (r.error) {
      return Result.Err(r.error);
    }
    const { email, password: pw } = values as Credentials;
    const existing_user = await prisma.credential.findUnique({
      where: { email },
    });
    if (existing_user !== null) {
      return Result.Err("该邮箱已注册");
    }
    const { password, salt } = await prepare(pw);
    const created_user = await prisma.user.create({
      data: {
        id: random_string(15),
      },
    });
    const { id: user_id } = created_user;
    const nickname = email.split("@").shift();
    await prisma.credential.create({
      data: {
        id: random_string(15),
        user_id: created_user.id,
        email,
        password,
        salt,
      },
    });
    await prisma.profile.create({
      data: {
        id: random_string(15),
        user_id: created_user.id,
        nickname,
      },
    });
    const token = await encode_token({
      token: {
        id: created_user.id,
      },
      secret: this.secret,
    });
    return Result.Ok({
      id: user_id,
      token,
    });
  }
  /** 密码登录 */
  async login_with_password(
    values: Partial<{ email: string; password: string }>
  ) {
    const r = await resultify(
      credentialsSchema.validateAsync.bind(credentialsSchema)
    )(values);
    if (r.error) {
      return Result.Err(r.error);
    }
    const { email, password } = values as Credentials;
    const credential = await prisma.credential.findUnique({
      where: { email },
      include: {
        user: true,
      },
    });
    if (credential === null) {
      return Result.Err("该邮箱不存在");
    }
    const matched = await compare(credential, password);
    if (!matched) {
      return Result.Err("密码错误");
    }
    const { id: user_id } = credential.user;
    const token = await encode_token({
      token: {
        id: user_id,
      },
      secret: this.secret,
    });
    return Result.Ok({ id: user_id, token });
  }
}
