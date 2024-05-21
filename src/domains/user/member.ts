import Joi from "joi";

// @todo Domain 不能引入状态
import { app } from "@/store/index";
import { User } from "@/domains/user";
import { DatabaseStore } from "@/domains/store";
import { DataStore } from "@/domains/store/types";
import { Result, resultify } from "@/types/index";
import { parseJSONStr, random_string, r_id } from "@/utils/index";

import { Credentials } from "./services";
import { prepare, parse_token, compare } from "./utils";
import { encode_token } from "./jwt";
import { AuthenticationProviders } from "@/constants";
import { WeappClient } from "./weapp";

type UserUniqueID = string;
type MemberProps = {
  id: string;
  remark: string;
  email: string | null;
  permissions: string[];
  token: string;
  user: User;
  store: DataStore;
};

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
    return Result.Ok(new Member({ id, remark: member.remark, email: member.email, permissions, token, user, store }));
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
        email: member.email,
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
        email: member_token.member.email,
        permissions: [],
        token,
        user,
        store,
      })
    );
  }
  /** 创建一个「用户」，以及可以用于登录的「邮箱」账号 */
  static async Create(
    values: {
      email?: string;
      password?: string;
      /** 邀请码 */
      code?: string;
      user_id: string;
    },
    store: DatabaseStore
  ) {
    const { email, password: pw, code } = values;
    const schema = Joi.object({
      email: Joi.string().email().message("邮箱错误").required(),
      password: Joi.string().pattern(new RegExp(".{6,12}")).message("密码长度必须大于6位小于12位").required(),
      code: Joi.string().allow(""),
    });
    const r = await resultify(schema.validateAsync.bind(schema))({
      email,
      password: pw,
      code,
    });
    if (r.error) {
      return Result.Err(r.error);
    }
    const inviter_code_r = await (async () => {
      if (code) {
        const inviter_code = await store.prisma.invitation_code.findFirst({
          where: {
            id: code,
          },
          include: {
            inviter: {
              include: {
                user: true,
              },
            },
          },
        });
        if (!inviter_code) {
          return Result.Err("没有匹配的记录");
        }
        if (inviter_code.invitee_id) {
          return Result.Err("邀请码已失效");
        }
        return Result.Ok(inviter_code);
      }
      return Result.Ok(null);
    })();
    if (inviter_code_r.error) {
      return Result.Err(inviter_code_r.error.message);
    }
    const inviter_code = inviter_code_r.data;
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
    const { password, salt } = await prepare(pw!);
    const nickname = email!.split("@").shift()!;
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
        inviter_id: inviter_code ? inviter_code.inviter_id : null,
        authentications: {
          create: {
            id: r_id(),
            provider: AuthenticationProviders.Credential,
            provider_id: email!,
            provider_arg1: password,
            provider_arg2: salt,
          },
        },
      },
    });
    if (inviter_code) {
      await store.prisma.invitation_code.update({
        where: {
          id: inviter_code.id,
        },
        data: {
          invitee_id: created_member.id,
        },
      });
    }
    const { id: member_id } = created_member;
    const res = await User.Token({ id: member_id });
    if (res.error) {
      return Result.Err(res.error);
    }
    const token = res.data;
    return Result.Ok({
      id: member_id,
      email: created_member.email,
      token,
      permissions: [],
    });
  }
  /** 后台直接创建一个「用户」，没有账号 */
  static async CreateWithoutAccount(
    values: {
      remark: string;
      user_id: string;
    },
    store: DatabaseStore
  ) {
    const created_member = await store.prisma.member.create({
      data: {
        id: r_id(),
        remark: values.remark,
        email: null,
        user_id: values.user_id,
        setting: {
          create: {
            id: r_id(),
            data: "{}",
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
    const created_token = await store.prisma.member_token.create({
      data: {
        id: r_id(),
        token,
        member_id,
      },
    });
    return Result.Ok({
      id: member_id,
      token: {
        id: created_token.id,
        code: token,
      },
    });
  }
  static async ValidateWithAuthentication(
    values: { provider: AuthenticationProviders; provider_id?: string; provider_arg1?: string; user_id: string },
    store: DataStore
  ) {
    const { provider } = values;
    if (provider === AuthenticationProviders.Credential) {
      const { provider_id, provider_arg1 } = values;
      const schema = Joi.object({
        email: Joi.string().email().message("邮箱错误").required(),
        password: Joi.string().pattern(new RegExp(".{6,12}")).message("密码长度必须大于6位小于12位").required(),
      });
      const r = await resultify(schema.validateAsync.bind(schema))({
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
      let permissions: string[] = [];
      const json_res = parseJSONStr(credential.member.permission);
      if (json_res.data) {
        permissions = json_res.data as unknown as string[];
      }
      const member = new Member({
        id: member_id,
        remark: credential.member.remark,
        email: credential.member.email,
        permissions,
        token,
        user,
        store,
      });
      return Result.Ok(member);
    }
    if (provider === AuthenticationProviders.Weapp) {
      const { provider_id } = values;
      if (!provider_id) {
        return Result.Err("缺少 code 参数");
      }
      const $weapp = WeappClient({ app });
      const r1 = await $weapp.code2session(provider_id);
      if (r1.error) {
        return Result.Err(r1.error.message);
      }
      const { openid, unionid, session_key } = r1.data;
      // console.log('111', openid, unionid, r1);
      if (!openid && !unionid) {
        return Result.Err("服务器异常", 3001);
      }
      const member = await (async () => {
        const existing = await store.prisma.member_authentication.findFirst({
          where: { provider: AuthenticationProviders.Weapp, provider_id: unionid || openid },
          include: {
            member: {
              include: {
                user: true,
              },
            },
          },
        });
        if (existing) {
          return existing.member;
        }
        const random_name = r_id();
        const created_member = await store.prisma.member.create({
          data: {
            id: r_id(),
            name: random_name,
            remark: random_name,
            email: null,
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
                provider: AuthenticationProviders.Weapp,
                provider_id: unionid || openid,
                provider_arg1: openid,
                provider_arg2: session_key,
              },
            },
          },
        });
        return created_member;
      })();
      // console.log(member);
      const member_id = member.id;
      const res = await User.Token({ id: member_id });
      if (res.error) {
        return Result.Err(res.error);
      }
      const token = res.data;
      const r2 = await User.Get({ id: member.user_id }, store);
      if (r2.error) {
        return Result.Err(r2.error.message);
      }
      const user = r2.data;
      const ins = new Member({
        id: member_id,
        remark: member.remark,
        email: member.email,
        permissions: [],
        token,
        user,
        store,
      });
      return Result.Ok(ins);
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
  /** 修改指定邮箱密码 */
  static async ChangePassword(values: Partial<{ email: string; password: string }>, store: DatabaseStore) {
    const { email, password: pw } = values as Credentials;
    const existing = await store.prisma.member_authentication.findFirst({
      where: { provider: AuthenticationProviders.Credential, provider_id: email },
    });
    if (!existing) {
      return Result.Err("该邮箱未注册");
    }
    const { password, salt } = await prepare(pw);
    const update_res = await store.prisma.member_authentication.update({
      where: {
        id: existing.id,
      },
      data: {
        provider_arg1: password,
        provider_arg2: salt,
      },
    });
    return Result.Ok({});
  }

  /** 用户 id */
  id: UserUniqueID;
  nickname: string = "unknown";
  remark: string = "unknown";
  email: string | null = null;
  permissions: string[] = [];
  avatar: string | null = null;
  /** JWT token */
  token: string;
  user: User;
  store: DataStore;

  constructor(options: MemberProps) {
    const { id, remark, email, permissions, token, user, store } = options;
    this.id = id;
    this.remark = remark;
    this.email = email;
    this.permissions = permissions;
    this.token = token;
    this.user = user;
    this.store = store;
  }
  /**
   * 没有设置过邮箱密码
   * 补全邮箱和密码
   */
  async patch_credential(values: { email?: string; password?: string }) {
    const { email, password: pw } = values as Credentials;
    const schema = Joi.object({
      email: Joi.string().email().message("邮箱错误").required(),
      password: Joi.string()
        .pattern(new RegExp("^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[^ws]).{8,24}$"))
        .message("密码格式错误，必须包含大写字母和数字")
        .required(),
    });
    const r = await resultify(schema.validateAsync.bind(schema))({
      email,
      password: pw,
    });
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
      return Result.Err("该邮箱已被使用");
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
    await this.store.prisma.member.update({
      where: {
        id: this.id,
      },
      data: {
        email,
      },
    });
    return Result.Ok(created);
  }
  /**
   * 已经有邮箱和密码了，只是进行更新
   * 更新邮箱和密码
   */
  async update_credential(values: { email?: string; password?: string }) {
    const { email, password: pw } = values as Credentials;
    const schema = Joi.object({
      email: Joi.string().email().message("邮箱错误").required(),
      password: Joi.string().min(6).max(12).required(),
    });
    const r = await resultify(schema.validateAsync.bind(schema))({
      email,
      password: pw,
    });
    if (r.error) {
      return Result.Err(r.error);
    }
    const account = await this.store.prisma.member_authentication.findFirst({
      where: { provider: AuthenticationProviders.Credential, provider_id: email, member_id: this.id },
      include: {
        member: true,
      },
    });
    if (account) {
      return Result.Err("该邮箱已被使用");
    }
    const { password, salt } = await prepare(pw);
    const member = await this.store.prisma.member.findFirst({
      where: { id: this.id },
      include: {
        authentications: {
          where: {
            provider: AuthenticationProviders.Credential,
          },
        },
      },
    });
    if (!member) {
      return Result.Err("不存在该成员");
    }
    const e = member.authentications[0];
    if (!e) {
      return Result.Err("成员没有该凭证");
    }
    const created = await this.store.prisma.member_authentication.update({
      where: {
        id: e.id,
      },
      data: {
        provider: AuthenticationProviders.Credential,
        provider_id: email,
        provider_arg1: password,
        provider_arg2: salt,
        member_id: this.id,
      },
    });
    await this.store.prisma.member.update({
      where: {
        id: this.id,
      },
      data: {
        email,
      },
    });
    return Result.Ok(created);
  }
  /**
   * 更新邮箱
   */
  async update_credential_email(values: { email?: string }) {
    const { email } = values as Credentials;
    const schema = Joi.object({
      email: Joi.string().email().message("邮箱错误").required(),
    });
    const r = await resultify(schema.validateAsync.bind(schema))({
      email,
    });
    if (r.error) {
      return Result.Err(r.error);
    }
    const account = await this.store.prisma.member_authentication.findFirst({
      where: { provider: AuthenticationProviders.Credential, provider_id: email, member_id: this.id },
      include: {
        member: true,
      },
    });
    if (account) {
      return Result.Err("该邮箱已被使用");
    }
    const member = await this.store.prisma.member.findFirst({
      where: { id: this.id },
      include: {
        authentications: {
          where: {
            provider: AuthenticationProviders.Credential,
          },
        },
      },
    });
    if (!member) {
      return Result.Err("不存在该成员");
    }
    await (async () => {
      const e = member.authentications[0];
      if (!e) {
        await this.store.prisma.member_authentication.create({
          data: {
            id: r_id(),
            provider: AuthenticationProviders.Credential,
            provider_id: email,
            member_id: this.id,
          },
        });
        return;
      }
      const created = await this.store.prisma.member_authentication.update({
        where: {
          id: e.id,
        },
        data: {
          provider: AuthenticationProviders.Credential,
          provider_id: email,
          member_id: this.id,
        },
      });
    })();
    await this.store.prisma.member.update({
      where: {
        id: this.id,
      },
      data: {
        email,
      },
    });
    return Result.Ok({});
  }
  /**
   * 更新密码
   */
  async update_credential_pwd(values: { password?: string }) {
    const { password: pw } = values as Credentials;
    const schema = Joi.object({
      password: Joi.string().min(6).max(12).required(),
    });
    const r = await resultify(schema.validateAsync.bind(schema))({
      password: pw,
    });
    if (r.error) {
      return Result.Err(r.error);
    }
    const { password, salt } = await prepare(pw);
    const member = await this.store.prisma.member.findFirst({
      where: { id: this.id },
      include: {
        authentications: {
          where: {
            provider: AuthenticationProviders.Credential,
          },
        },
      },
    });
    if (!member) {
      return Result.Err("不存在该成员");
    }
    const e = member.authentications[0];
    if (!e) {
      return Result.Err("请先设置邮箱");
    }
    // console.log(e);
    await this.store.prisma.member_authentication.update({
      where: {
        id: e.id,
      },
      data: {
        provider_arg1: password,
        provider_arg2: salt,
      },
    });
    return Result.Ok({});
  }
}
