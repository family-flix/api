import Joi from "joi";

import { Drive } from "@/domains/drive";
import { List } from "@/domains/list";
import { AliyunDrivePayload } from "@/domains/aliyundrive/types";
import { Result, resultify } from "@/types";
import { random_string } from "@/utils";
import { store } from "@/store";

import { Credentials } from "./services";
import { compare, prepare, parse_token } from "./utils";
import { encode_token } from "./jwt";

const credentialsSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().pattern(new RegExp("^[a-zA-Z0-9]{8,30}$")).required(),
});

type UserUniqueID = string;

export class User {
  /** 用户 id */
  id: UserUniqueID;
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
    if (!token) {
      return Result.Err("缺少 token");
    }
    const r = await parse_token({
      token,
      secret: User.SECRET,
    });
    if (r.error) {
      return Result.Err(r.error);
    }
    const id = r.data.id as UserUniqueID;
    const existing = await store.find_user({ id });
    if (existing.error) {
      return Result.Err(existing.error);
    }
    if (!existing.data) {
      return Result.Err("token 已失效");
    }
    const user = new User({ id, token });
    return Result.Ok(user);
  }
  static async NewWithPassword(values: Partial<{ email: string; password: string }>) {
    const r = await resultify(credentialsSchema.validateAsync.bind(credentialsSchema))(values);
    if (r.error) {
      return Result.Err(r.error);
    }
    const { email, password } = values as Credentials;
    const credential = await store.prisma.credential.findUnique({
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
    const user = new User({ id: user_id, token });
    return Result.Ok(user);
  }
  static async Add(values: Partial<{ email: string; password: string }>) {
    const r = await resultify(credentialsSchema.validateAsync.bind(credentialsSchema))(values);
    if (r.error) {
      return Result.Err(r.error);
    }
    const { email, password: pw } = values as Credentials;
    const existing_user = await store.prisma.credential.findUnique({
      where: { email },
    });
    if (existing_user !== null) {
      return Result.Err("该邮箱已注册");
    }
    const { password, salt } = await prepare(pw);
    const created_user = await store.prisma.user.create({
      data: {
        id: random_string(15),
      },
    });
    const { id: user_id } = created_user;
    const nickname = email.split("@").shift();
    await store.prisma.credential.create({
      data: {
        id: random_string(15),
        user_id: created_user.id,
        email,
        password,
        salt,
      },
    });
    await store.prisma.profile.create({
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
  /** 生成一个 token */
  static async Token({ id }: { id: string }) {
    try {
      const token = await encode_token({
        token: {
          id,
        },
        secret: User.SECRET,
      });
      return Result.Ok(token);
    } catch (err) {
      const e = err as Error;
      return Result.Err(e);
    }
  }

  constructor(options: { id: string; token: string }) {
    const { id, token } = options;
    // if (!token) {
    //   throw new Error("缺少 token 参数");
    // }
    this.id = id;
    this.token = token;
  }
  /** 补全信息 */
  async register(values: Partial<{ email: string; password: string }>) {}
  /** 密码登录 */
  async login_with_password(values: Partial<{ email: string; password: string }>) {}

  /** 添加云盘 */
  async add_drive(body: { payload: AliyunDrivePayload }) {
    const { payload } = body;
    return Drive.Add({ payload, user_id: this.id });
  }
  /** 根据 id 获取一个 Drive 实例 */
  async get_drive(id?: string) {
    if (!id) {
      return Result.Err("缺少 drive id 参数");
    }
    return Drive.New({ id, user_id: this.id });
  }
  /** 按分页返回该用户所有网盘 */
  async list_drives_with_pagination(
    params: Partial<{
      page: string;
      page_size: string;
    }>
  ) {
    const { page = 1, page_size = 10 } = params;
    const core = new List(store.prisma.drive, {
      page: Number(page),
      page_size: Number(page_size),
      search: {
        user_id: this.id,
      },
    });
    return core.fetch();
  }
}
