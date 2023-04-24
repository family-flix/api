import Joi from "joi";

import { Drive } from "@/domains/drive";
import { AliyunDrivePayload } from "@/domains/aliyundrive/types";
import { prisma } from "@/store";
import { Result, resultify } from "@/types";
import { random_string } from "@/utils";

import { Credentials } from "./services";
import { compare, prepare, parse_token } from "./utils";
import { encode_token } from "./jwt";

const credentialsSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().pattern(new RegExp("^[a-zA-Z0-9]{8,30}$")).required(),
});
const drivePayloadSchema = Joi.object({
  app_id: Joi.string().required(),
  drive_id: Joi.string().required(),
  device_id: Joi.string().required(),
  user_name: Joi.string().required(),
  avatar: Joi.string(),
  nick_name: Joi.string().allow(null, ""),
  aliyun_user_id: Joi.string().required(),
  access_token: Joi.string().required(),
  refresh_token: Joi.string().required(),
});

type UserUniqueID = string;

export class User {
  /** 用户 id */
  id: UserUniqueID | null = null;
  nickname: string = "unknown";
  /** JWT token */
  token: string;

  /** token 秘钥 */
  static SECRET = "FLIX";
  /**
   * User 类工厂函数
   * @param token
   * @returns
   */
  static async New(token?: string) {
    const user = new User({ token });
    const t = await user.ensure();
    if (t.error) {
      return Result.Err(t.error);
    }
    return Result.Ok(user);
  }

  constructor(options: Partial<{ token: string }>) {
    const { token } = options;
    if (!token) {
      throw new Error("缺少 token 参数");
    }
    this.token = token;
  }
  /** 验证 token 是否有效 */
  async ensure() {
    if (this.id !== null) {
      return Result.Ok({ id: this.id });
    }
    const r = await parse_token({
      token: this.token,
      secret: User.SECRET,
    });
    if (r.error) {
      return Result.Err(r.error);
    }
    const id = r.data.id as UserUniqueID;
    this.id = id;
    return Result.Ok({ id });
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
      secret: User.SECRET,
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
      secret: User.SECRET,
    });
    return Result.Ok({ id: user_id, token });
  }

  /** 添加云盘 */
  async add_drive(body: { payload: AliyunDrivePayload }) {
    if (this.id === null) {
      // @todo 应该直接 throw Error？
      return Result.Err("缺少 token 参数");
    }
    const { payload } = body;
    return Drive.Add({ ...payload, user_id: this.id });
  }
  /** 根据 id 获取一个 Drive 实例 */
  async get_drive(id?: string) {
    if (this.id === null) {
      return Result.Err("缺少 user id 参数");
    }
    if (!id) {
      return Result.Err("缺少 drive id 参数");
    }
    return Drive.New({ id, user_id: this.id });
  }
}
