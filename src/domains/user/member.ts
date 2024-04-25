import Joi from "joi";

import { User } from "@/domains/user";
import { DatabaseStore } from "@/domains/store";
import { DataStore } from "@/domains/store/types";
import { Result, resultify } from "@/types/index";
import { parseJSONStr, random_string, r_id } from "@/utils/index";

import { Credentials } from "./services";
import { prepare, parse_token, compare } from "./utils";
import { encode_token } from "./jwt";
import { AuthenticationProviders } from "@/constants";

const credentialsSchema = Joi.object({
  email: Joi.string().email().message("邮箱错误").required(),
  password: Joi.string().pattern(new RegExp("^[a-zA-Z0-9]{8,30}$")).message("密码错误").required(),
});

type UserUniqueID = string;
type MemberProps = { id: string; remark: string; permissions: string[]; token: string; user: User; store: DataStore };

export class Member {
  /** token 秘钥 */
  static SECRET = "FLIX";
  /**
   * User 类工厂函数
   * @param token
   * @returns
   */
  static async New(token: string | undefined, store: DatabaseStore) {
    if (!token) {
      return Result.Err("缺少 token", 900);
    }
    const r = await parse_token({
      token,
      secret: Member.SECRET,
    });
    if (r.error) {
      return Result.Err(r.error, 900);
    }
    const id = r.data.id as UserUniqueID;
    const member = await store.prisma.member.findFirst({
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
      return Result.Err("无效身份凭证", 900);
    }
    const settings = await User.ParseSettings(member.user.settings);
    const user = new User({
      id: member.user_id,
      settings,
      token: "",
      store,
    });
    let permissions: string[] = [];
    const json_res = parseJSONStr(member.permission);
    if (json_res.data) {
      permissions = json_res.data as unknown as string[];
    }
    return Result.Ok(new Member({ id, remark: member.remark, permissions, token, user, store }));
  }
  static async Get(body: { id: string }, store: DatabaseStore) {
    const { id } = body;
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
    if (!member) {
      return Result.Err("不存在");
    }
    const settings = await User.ParseSettings(member.user.settings);
    const user = new User({
      id: member.user_id,
      settings,
      token: "",
      store,
    });
    let permissions: string[] = [];
    const json_res = parseJSONStr(member.permission);
    if (json_res.data) {
      permissions = json_res.data as unknown as string[];
    }
    return Result.Ok(
      new Member({
        id,
        remark: member.remark,
        token: "",
        permissions,
        user,
        store,
      })
    );
  }
  /**
   * User 类工厂函数
   * @param id
   * @returns
   */
  static async Validate(id: string | undefined, store: DatabaseStore) {
    if (!id) {
      return Result.Err("缺少 token", 900);
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
      settings: {
        qiniu_access_token: "",
        qiniu_secret_token: "",
        qiniu_scope: "",
        tmdb_token: "",
        push_deer_token: "",
      },
      token: "",
      store,
    });
    return Result.Ok(
      new Member({
        id: member_id,
        remark: member_token.member.remark,
        permissions: [],
        token,
        user,
        store,
      })
    );
  }
  static async Create(values: { email?: string; password?: string; user_id: string }, store: DatabaseStore) {
    const { email, password: pw } = values as Credentials;
    const r = await resultify(credentialsSchema.validateAsync.bind(credentialsSchema))(values);
    if (r.error) {
      return Result.Err(r.error);
    }
    const existing_member_account = await store.prisma.member_authentication.findFirst({
      where: { provider: AuthenticationProviders.Credential, provider_id: email },
      include: {
        member: true,
      },
    });
    // @todo 这里等于是系统唯一了
    if (existing_member_account !== null) {
      return Result.Err("该邮箱已注册");
    }
    const { password, salt } = await prepare(pw);
    const nickname = email.split("@").shift()!;
    const created_member = await store.prisma.member.create({
      data: {
        id: r_id(),
        name: nickname,
        remark: nickname,
        email,
        user_id: values.user_id,
        setting: {
          create: {
            id: r_id(),
            data: "{}",
          },
        },
        authentications: {
          create: {
            id: r_id(),
            provider: AuthenticationProviders.Credential,
            provider_id: email,
            provider_arg1: password,
            provider_arg2: salt,
          },
        },
      },
    });
    const { id: member_id } = created_member;
    const res = await User.Token({ id: member_id });
    if (res.error) {
      return Result.Err(res.error);
    }
    const token = res.data;
    return Result.Ok({
      id: member_id,
      token,
    });
  }
  static async ValidateWithAuthentication(
    values: { provider: AuthenticationProviders; provider_id?: string; provider_arg1?: string },
    store: DataStore
  ) {
    const { provider } = values;
    if (provider === AuthenticationProviders.Credential) {
      const { provider_id, provider_arg1 } = values;
      const r = await resultify(credentialsSchema.validateAsync.bind(credentialsSchema))({
        email: provider_id,
        password: provider_arg1,
      });
      if (r.error) {
        return Result.Err(r.error);
      }
      const { email, password } = r.data as Credentials;
      const credential = await store.prisma.member_authentication.findFirst({
        where: { provider: AuthenticationProviders.Credential, provider_id: email },
        include: {
          member: {
            include: {
              user: true,
            },
          },
        },
      });
      if (credential === null) {
        return Result.Err("该邮箱不存在", 904);
      }
      if (credential.provider_arg1 === null || credential.provider_arg2 === null) {
        return Result.Err("信息异常");
      }
      const matched = await compare(
        {
          password: credential.provider_arg1,
          salt: credential.provider_arg2,
        },
        password
      );
      if (!matched) {
        return Result.Err("密码错误");
      }
      const member_id = credential.member_id;
      const res = await User.Token({ id: member_id });
      if (res.error) {
        return Result.Err(res.error);
      }
      const token = res.data;
      const r2 = await User.Get({ id: credential.member.user_id }, store);
      if (r2.error) {
        return Result.Err(r2.error.message);
      }
      const user = r2.data;
      const member = new Member({
        id: member_id,
        remark: credential.member.remark,
        permissions: [],
        token,
        user,
        store,
      });
      return Result.Ok(member);
    }
    return Result.Err("未知的 provider 值");
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
  nickname: string = "unknown";
  remark: string = "unknown";
  permissions: string[] = [];
  avatar: string | null = null;
  /** JWT token */
  token: string;
  user: User;
  store: DataStore;

  constructor(options: MemberProps) {
    const { id, remark, permissions, token, user, store } = options;
    this.id = id;
    this.remark = remark;
    this.permissions = permissions;
    this.token = token;
    this.user = user;
    this.store = store;
  }
  /** 补全邮箱和密码 */
  async patch_credential(values: { email?: string; password?: string }) {
    const { email, password: pw } = values as Credentials;
    const r = await resultify(credentialsSchema.validateAsync.bind(credentialsSchema))(values);
    if (r.error) {
      return Result.Err(r.error);
    }
    const existing_member_account = await this.store.prisma.member_authentication.findFirst({
      where: { provider: AuthenticationProviders.Credential, provider_id: email, member_id: this.id },
      include: {
        member: true,
      },
    });
    if (existing_member_account) {
      return Result.Err("已经有邮箱与密码了");
    }
    const { password, salt } = await prepare(pw);
    const created = await this.store.prisma.member_authentication.create({
      data: {
        id: r_id(),
        provider: AuthenticationProviders.Credential,
        provider_id: email,
        provider_arg1: password,
        provider_arg2: salt,
        member_id: this.id,
      },
    });
    return Result.Ok(created);
  }
}
