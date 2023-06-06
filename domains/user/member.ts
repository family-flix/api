import Joi from "joi";
import { user } from "@prisma/client";

import { User } from "@/domains/user";
import { Result, resultify } from "@/types";
import { random_string } from "@/utils";
import { store } from "@/store";

import { Credentials } from "./services";
import { prepare, parse_token } from "./utils";
import { encode_token } from "./jwt";

const credentialsSchema = Joi.object({
  email: Joi.string().email().message("邮箱错误").required(),
  password: Joi.string().pattern(new RegExp("^[a-zA-Z0-9]{8,30}$")).message("密码错误").required(),
});

type UserUniqueID = string;
type MemberProps = { id: string; remark: string; user: User; token: string };

export class Member {
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
      secret: Member.SECRET,
    });
    if (r.error) {
      return Result.Err(r.error);
    }
    const id = r.data.id as UserUniqueID;
    const member = await store.prisma.member.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            settings: true,
          },
        },
      },
    });
    if (member === null) {
      return Result.Err("无效身份凭证");
    }
    // const member = existing;
    const user = new User({
      id: member.user_id,
      settings: member.user.settings,
      token: "",
    });
    return Result.Ok(new Member({ id, remark: member.remark, user, token }));
  }
  /**
   * User 类工厂函数
   * @param id
   * @returns
   */
  static async Validate(id?: string) {
    if (!id) {
      return Result.Err("缺少 token");
    }
    const member_token = await store.prisma.member_token.findFirst({
      where: {
        id,
      },
      include: {
        member: {
          include: {
            user: {
              include: {
                settings: true,
              },
            },
          },
        },
      },
    });
    if (member_token === null) {
      return Result.Err("无效身份凭证");
    }
    const { token, member_id } = member_token;
    const user = new User({
      id: member_token.member.user.id,
      settings: member_token.member.user.settings,
      token: "",
    });
    return Result.Ok(
      new Member({
        id: member_id,
        remark: member_token.member.remark,
        user,
        token,
      })
    );
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
      secret: Member.SECRET,
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
        secret: Member.SECRET,
      });
      return Result.Ok(token);
    } catch (err) {
      const e = err as Error;
      return Result.Err(e);
    }
  }

  /** 用户 id */
  id: UserUniqueID;
  user: User;
  nickname: string = "unknown";
  remark: string = "unknown";
  /** JWT token */
  token: string;

  constructor(options: MemberProps) {
    const { id, user, remark, token } = options;
    this.id = id;
    this.user = user;
    this.remark = remark;
    this.token = token;
  }
  /** 补全信息 */
  async register(values: Partial<{ email: string; password: string }>) {}
  /** 密码登录 */
  async login_with_password(values: Partial<{ email: string; password: string }>) {}
}
