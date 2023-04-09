import { Result } from "@/types";
import {
  fetch_user_profile,
  get_token,
  login,
  validate_member_token,
} from "./services";

export class CurUser {
  _is_login: boolean = false;
  user: {
    username: string;
    avatar: string;
    token: string;
  } | null = null;
  token: string = "";
  values: Partial<{ email: string; password: string }> = {};

  constructor() {
    if (typeof window === "undefined") {
      return;
    }
    const user = JSON.parse(localStorage.getItem("user") || "null");
    this._is_login = !!user;
    this.user = user;
    this.token = user ? user.token : "";
  }
  get is_login() {
    return this._is_login;
  }
  input_email(value: string) {
    this.values.email = value;
  }
  input_password(value: string) {
    this.values.password = value;
  }
  async login() {
    const { email, password } = this.values;
    if (!email) {
      return Result.Err("Missing email");
    }
    if (!password) {
      return Result.Err("Missing password");
    }
    const r = await login({ email, password });
    if (r.error) {
      this.notice_error(r);
      return r;
    }
    // this.values = {};
    this._is_login = true;
    this.user = r.data;
    this.token = r.data.token;
    localStorage.setItem("user", JSON.stringify(r.data));
    return Result.Ok(r.data);
  }
  /**
   * 以成员身份登录
   */
  async login_in_member(token: string) {
    if (this._is_login) {
      return Result.Ok(this.user);
    }
    const r = await validate_member_token(token);
    if (r.error) {
      this.notice_error(r);
      return r;
    }
    const t = r.data.token;
    this.user = {
      username: "",
      avatar: "",
      token: t,
    };
    this._is_login = true;
    localStorage.setItem("user", JSON.stringify(r.data));
    this.token = t;
    return Result.Ok({ ...this.user });
  }
  logout() {}
  async register() {
    const { email, password } = this.values;
    if (!email) {
      return Result.Err("Missing email");
    }
    if (!password) {
      return Result.Err("Missing password");
    }
    // const r = await login({ email, password });
    // this.values = {};
    // if (r.error) {
    //   this.notice_error(r);
    //   return r;
    // }
    // this.user = r.data;
    // this.token = r.data.token;
    // localStorage.setItem("user", JSON.stringify(r.data));
    return Result.Ok(null);
  }
  async fetch_profile() {
    if (!this._is_login) {
      return Result.Err("请先登录");
    }
    const r = await fetch_user_profile();
    if (r.error) {
      return r;
    }
    console.log(r.data);
  }

  notice_error(result: Result<null> | string) {
    if (typeof result === "string") {
      alert(result);
      return;
    }
    alert(result.error.message);
  }
}

export const user = new CurUser();
