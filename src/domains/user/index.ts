import Joi from "joi";

import { DatabaseStore } from "@/domains/store/index";
import { DataStore } from "@/domains/store/types";
import { Result, resultify, UnpackedResult } from "@/domains/result/index";
import { parseJSONStr, r_id } from "@/utils/index";
import { DEFAULT_STATS } from "@/constants/index";

import { Credentials } from "./services";
import { compare, prepare, parse_token } from "./utils";
import { encode_token } from "./jwt";

const credentialsSchema = Joi.object({
  email: Joi.string().email().message("邮箱格式错误").required(),
  password: Joi.string()
    .min(6)
    .max(20)
    .pattern(/^(?=.*[a-zA-Z])(?=.*[0-9!@#$%^&*(),.?":{}|<>])[a-zA-Z0-9!@#$%^&*(),.?":{}|<>]+$/)
    .message("密码必须是6-20个字符，只能包含字母、数字和标点符号（除空格），并且至少包含两种类型的字符")
    .required(),
});
export type UserSettings = {
  qiniu_access_token?: string;
  qiniu_secret_token?: string;
  qiniu_scope?: string;
  tmdb_token?: string;
  push_deer_token?: string;
  extra_filename_rules?: string;
  ignore_files_when_sync?: string;
  max_size_when_sync?: number;
  can_register?: boolean;
  no_need_invitation_code?: boolean;
};
type UserProps = {
  id: string;
  token: string;
  settings?: UserSettings | null;
  store: DataStore;
};
export type UserUniqueID = string;

export class User {
  /** token 秘钥 */
  static SECRET = "FLIX";
  /**
   * User 类工厂函数
   * @param token
   * @returns
   */
  static async New(token: string | undefined, store: DataStore) {
    if (!token) {
      return Result.Err("缺少 token", 900);
    }
    const r = await parse_token({
      token,
      secret: User.SECRET,
    });
    if (r.error) {
      return Result.Err(r.error.message, 900);
    }
    const id = r.data.id as UserUniqueID;
    const existing = await store.prisma.user.findFirst({
      where: {
        id,
      },
      include: {
        settings: true,
      },
    });
    if (!existing) {
      return Result.Err("无效的 token", 900);
    }
    const { settings: settings_str } = existing;
    const settings = await User.ParseSettings(settings_str);
    // 要不要生成一个新的 token？
    const user = new User({
      id,
      token,
      settings,
      store,
    });
    return Result.Ok(user);
  }
  static async GetByPassword(values: Partial<{ email: string; password: string }>, store: DatabaseStore) {
    const r = await resultify(credentialsSchema.validateAsync.bind(credentialsSchema))(values);
    if (r.error) {
      return Result.Err(r.error);
    }
    const { email, password } = values as Credentials;
    const credential = await store.prisma.credential.findUnique({
      where: { email },
      include: {
        user: {
          include: {
            settings: true,
          },
        },
      },
    });
    if (credential === null) {
      return Result.Err("该邮箱不存在", 904);
    }
    const matched = await compare(credential, password);
    if (!matched) {
      return Result.Err("密码错误");
    }
    const { id: user_id } = credential.user;
    const { settings: settings_str } = credential.user;
    const settings = await User.ParseSettings(settings_str);
    const res = await User.Token({ id: user_id });
    if (res.error) {
      return Result.Err(res.error);
    }
    const token = res.data;
    const user = new User({ id: user_id, settings, token, store });
    return Result.Ok(user);
  }
  static async Get(body: { id: string }, store: DataStore) {
    const { id } = body;
    const user = await store.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        settings: true,
      },
    });
    if (!user) {
      return Result.Err("不存在");
    }
    const { settings: settings_record } = user;
    const settings = await User.ParseSettings(settings_record);
    return Result.Ok(
      new User({
        id,
        token: "",
        settings,
        store,
      })
    );
  }
  static async Existing(body: { email: string }, store: DatabaseStore) {
    const { email } = body;
    const existing_user = await store.prisma.credential.findUnique({
      where: { email },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });
    if (existing_user) {
      const { email } = existing_user;
      const { id, profile } = existing_user.user;
      return Result.Ok({
        id,
        email,
        avatar: profile?.avatar,
        nickname: profile?.nickname,
      });
    }
    return Result.Err("不存在");
  }
  static async Create(values: Partial<{ email: string; password: string }>, store: DatabaseStore) {
    const users = await store.prisma.user.findMany({
      include: {
        credential: true,
      },
      take: 1,
      orderBy: {
        created: "asc",
      },
    });
    if (users.length !== 0) {
      return Result.Err(`已经有管理员账号了，邮箱为 ${users[0].credential?.email}`);
    }
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
    const nickname = email.split("@").shift();
    const created_user = await store.prisma.user.create({
      data: {
        id: r_id(),
        settings: {
          create: {
            id: r_id(),
            detail: "{}",
          },
        },
        credential: {
          create: {
            id: r_id(),
            email,
            password,
            salt,
          },
        },
        profile: {
          create: {
            id: r_id(),
            nickname,
          },
        },
        statistics: {
          create: {
            id: r_id(),
            data: JSON.stringify(DEFAULT_STATS),
          },
        },
      },
    });
    const { id: user_id } = created_user;
    const res = await User.Token({ id: user_id });
    if (res.error) {
      return Result.Err(res.error);
    }
    const token = res.data;
    return Result.Ok({
      id: user_id,
      token,
    });
  }
  /** 根据给定的 id 生成一个 token */
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
  /** 修改指定邮箱密码 */
  static async ChangePassword(values: Partial<{ email: string; password: string }>, store: DatabaseStore) {
    const r = await resultify(credentialsSchema.validateAsync.bind(credentialsSchema))(values);
    if (r.error) {
      return Result.Err(r.error);
    }
    const { email, password: pw } = values as Credentials;
    const existing_credential = await store.prisma.credential.findUnique({
      where: { email },
    });
    if (!existing_credential) {
      return Result.Err("该邮箱未注册");
    }
    const { id: credential_id } = existing_credential;
    const { password, salt } = await prepare(pw);
    const update_res = await store.prisma.credential.update({
      where: {
        id: credential_id,
      },
      data: {
        password,
        salt,
      },
      include: {
        user: true,
      },
    });
    const { user } = update_res;
    const res = await User.Token({ id: user.id });
    if (res.error) {
      return Result.Err(res.error);
    }
    const token = res.data;
    return Result.Ok({
      id: user.id,
      token,
    });
  }
  static async ParseSettings(settings: null | { detail: string | null }) {
    if (!settings) {
      return {};
    }
    const { detail } = settings;
    if (!detail) {
      return {};
    }
    const r = parseJSONStr<UserSettings>(detail);
    if (r.error) {
      return {};
    }
    return r.data;
  }

  /** 用户 id */
  id: UserUniqueID;
  nickname: string = "unknown";
  /** JWT token */
  token: string;
  settings: UserSettings;
  store: DataStore;

  constructor(options: UserProps) {
    const { id, token, settings, store } = options;
    this.id = id;
    this.token = token;
    this.settings = (() => {
      if (!settings) {
        return {};
      }
      const {
        qiniu_access_token,
        qiniu_secret_token,
        qiniu_scope,
        tmdb_token,
        push_deer_token,
        extra_filename_rules,
        ignore_files_when_sync,
        max_size_when_sync,
        can_register,
        no_need_invitation_code,
      } = settings;
      return {
        qiniu_access_token: qiniu_access_token ?? undefined,
        qiniu_secret_token: qiniu_secret_token ?? undefined,
        qiniu_scope: qiniu_scope ?? undefined,
        tmdb_token: tmdb_token ?? "c2e5d34999e27f8e0ef18421aa5dec38",
        push_deer_token: push_deer_token ?? undefined,
        extra_filename_rules: extra_filename_rules ?? "",
        ignore_files_when_sync,
        max_size_when_sync,
        can_register: can_register ?? false,
        no_need_invitation_code: no_need_invitation_code ?? false,
      };
    })();
    this.store = store;
  }
  /** 补全信息 */
  async register(values: Partial<{ email: string; password: string }>) {}
  /** 密码登录 */
  async login_with_password(values: Partial<{ email: string; password: string }>) {}
  async update_settings(next_settings: Record<string, unknown>) {
    this.store.prisma.settings.update({
      where: {
        user_id: this.id,
      },
      data: {},
    });
  }
  get_ignore_files() {
    const { ignore_files_when_sync = "" } = this.settings;
    if (!ignore_files_when_sync) {
      return [];
    }
    // console.log(ignore_files_when_sync);
    const rules = ignore_files_when_sync.split("\n\n").filter(Boolean);
    return rules;
  }
  get_filename_rules() {
    const { extra_filename_rules = "" } = this.settings;
    if (!extra_filename_rules) {
      return [];
    }
    const rules = extra_filename_rules.split("\n\n").map((rule) => {
      const [regexp, placeholder] = rule.split("\n");
      return {
        regexp,
        placeholder,
      };
    });
    const valid_rules = rules
      .filter((rule) => {
        const { regexp, placeholder } = rule;
        if (!regexp || !placeholder) {
          return false;
        }
        try {
          new RegExp(regexp);
        } catch (err) {
          return false;
        }
        return true;
      })
      .map((rule) => {
        return {
          replace: [rule.regexp, rule.placeholder] as [string, string],
        };
      });
    return valid_rules;
  }
}
