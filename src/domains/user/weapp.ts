import { HttpClientCore } from "@/domains/http_client/index";
import { connect } from "@/domains/http_client/provider.axios";
import { Application } from "@/domains/application/index";
import { Result } from "@/types/index";

export function WeappClient<
  T extends { root_path: string; env: Record<string, string | undefined>; args: Record<string, any> }
>(props: { app: Application<T> }) {
  const {
    app: { env },
  } = props;

  const client = new HttpClientCore({
    hostname: "https://api.weixin.qq.com",
    process(v: { errcode: number; errmsg: string }) {
//       console.log("process in weapp", v);
      const { errcode, errmsg, ...rest } = v;
      if (errcode && errcode !== 0) {
        return Result.Err(errmsg);
      }
      return Result.Ok(rest);
    },
  });
  connect(client);

  return {
    code2session(code: string) {
      const query = {
        appid: env.WEAPP_ID,
        secret: env.WEAPP_SECRET,
        js_code: code,
        grant_type: "authorization_code",
      };
      return client.get<{ openid: string; session_key: string; unionid: string }>("/sns/jscode2session", query);
    },
  };
}
