import { request } from "@/utils/request";

/**
 * 用户登录
 * @param body
 * @returns
 */
export async function login(body: { email: string; password: string }) {
  console.log("[]login params", body);
  return request.post<{
    id: string;
    username: string;
    name: string;
    email: string;
    avatar: string;
    verified: string;
    created: string;
    token: string;
  }>("/api/user/login", body);
}

export async function logout(body: { email: string; password: string }) {
  console.log("[]login params", body);
  return await request.post("/api/user/logout", body);
}

export async function get_token() {
  console.log("[]login params");

  return await request.post("/api/token", {});
}

/**
 * 获取当前登录用户信息详情
 * @returns
 */
export async function fetch_user_profile() {
  return request.get("/api/user/profile");
}

/**
 * 成员通过授权链接访问首页时，验证该链接是否有效
 */
export async function validate_member_token(token: string) {
  return request.post<{ token: string }>("/api/member/validate", { token });
}
