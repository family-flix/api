import { HttpClientCore } from "@/domains/http_client/index";
import { connect } from "@/domains/http_client/provider.axios";
import { request_factory } from "@/domains/request/utils";
import { RequestCore } from "@/domains/request/index";
import { Application } from "@/domains/application/index";
import { Result } from "@/types/index";

const weapp_request = request_factory({
  hostnames: {
    prod: "https://api.weixin.qq.com",
  },
  process(r: Result<{ errcode: number; errmsg: string }>) {
    if (r.error) {
      return r;
    }
    const { errcode, errmsg, ...rest } = r.data;
    if (errcode && errcode !== 0) {
      return Result.Err(errmsg, errcode);
    }
    return Result.Ok(rest);
  },
});

export function WeappClient<
  T extends { root_path: string; env: Record<string, string | undefined>; args: Record<string, any> }
>(props: { app: Application<T> }) {
  const {
    app: { env },
  } = props;

  const client = new HttpClientCore({});
  connect(client);
  function code2session(opt: { code: string }) {
    const { code } = opt;
    const query = {
      appid: env.WEAPP_ID,
      secret: env.WEAPP_SECRET,
      js_code: code,
      grant_type: "authorization_code",
    };
    return weapp_request.get<{ openid: string; session_key: string; unionid: string }>("/sns/jscode2session", query);
  }
  const $code2session = new RequestCore(code2session, { client });

  return {
    code2session(code: string) {
      return $code2session.run({ code });
    },
  };
}
