import { BaseDomain } from "@/domains/base";
import { DatabaseStore } from "@/domains/store/index";
import { Result } from "@/types/index";

import { pushdeer_send } from "./clients/push_deer";
import { PushClientTypes } from "./constants";
import { SendPayload } from "./types";

enum Events {}
type TheTypesOfEvents = {};

type NotifyProps = {
  type: number;
  token: string;
  store: DatabaseStore;
};

export class Notify extends BaseDomain<TheTypesOfEvents> {
  static New(options: Partial<NotifyProps>) {
    const { type, token, store } = options;
    if (type === undefined) {
      return Result.Err("请指定推送客户端");
    }
    if (token === undefined) {
      return Result.Err("请传入客户端token");
    }
    if (store === undefined) {
      return Result.Err("缺少数据库实例");
    }
    return Result.Ok(
      new Notify({
        type,
        token,
        store,
      })
    );
  }

  store: NotifyProps["store"];
  type: number;
  token: string;

  constructor(props: { _name?: string } & NotifyProps) {
    super(props);

    const { store, type = PushClientTypes.PushDeer, token } = props;
    this.store = store;
    this.type = type;
    this.token = token;
  }

  send(msg: SendPayload) {
    // console.log("[DOMAIN]notify - send", msg);
    if (this.type === PushClientTypes.PushDeer) {
      return pushdeer_send(msg, this.token);
    }
    return Promise.resolve(Result.Err("推送异常"));
  }
}
