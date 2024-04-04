/**
 * @file 调用 api 获取数据
 */
import axios from "axios";
import { PrismaClient } from "@prisma/client";

import { BaseDomain, Handler } from "@/domains/base";
import { HttpClientCore } from "@/domains/http_client";
import { connect } from "@/domains/http_client/provider.axios";
import { Result } from "@/types/index";

import { DataStore } from "./types";

type DriveRecord = {
  id: string | number;
  unique_id: string;
  drive_token_id: string | number;
};
type DriveTokenRecord = {
  id: string | number;
  data: string;
};

enum Events {
  StateChange,
}
type TheTypesOfEvents = {
  [Events.StateChange]: APIStoreState;
};
type APIStoreState = {};
type APIStoreProps = {
  hostname: string;
  token: string;
};

export class APIStore extends BaseDomain<TheTypesOfEvents> implements DataStore {
  token: string;

  client: HttpClientCore;

  get state(): APIStoreState {
    return {};
  }

  constructor(props: Partial<{ _name: string }> & APIStoreProps) {
    super(props);

    const { hostname = "https://media.funzm.com", token } = props;

    this.token = token;
    const _client = new HttpClientCore({
      hostname,
      headers: {
        Authorization: `${token}`,
      },
    });
    connect(_client);
    // this.client = _client;
    // @ts-ignore
    this.client = {
      // ..._client,
      async post<T>(...args: Parameters<typeof _client.post>) {
        const r = await _client.post<{ code: number; msg: string; data: T }>(...args);
        if (r.error) {
          return Result.Err(r.error.message);
        }
        const { code, msg, data } = r.data;
        if (code !== 0) {
          return Result.Err(msg, code);
        }
        return Result.Ok(data as T);
      },
      async get<T>(...args: Parameters<typeof _client.get>) {
        const r = await _client.get<{ code: number; msg: string; data: T }>(...args);
        if (r.error) {
          return Result.Err(r.error.message);
        }
        const { code, msg, data } = r.data;
        if (code !== 0) {
          return Result.Err(msg, code);
        }
        return Result.Ok(data as T);
      },
    };
  }
  // @ts-ignore
  prisma: PrismaClient = {
    // user: {
    //   findFirst() {
    //     return {} as any;
    //   },
    // },
    // settings: {
    //   update() {
    //     return {} as any;
    //   },
    // },
    // file: {
    //   deleteMany() {
    //     return {} as any;
    //   },
    // },
    // tmp_file: {
    //   create() {
    //     return {} as any;
    //   },
    //   findFirst() {
    //     return {} as any;
    //   },
    //   deleteMany() {
    //     return {} as any;
    //   },
    // },
    // resource_sync_task: {
    //   update() {
    //     return {} as any;
    //   },
    // },
    drive: {
      // @ts-ignore
      findFirst: async (params: {
        where: { unique_id: string; id: string | number };
        include?: { drive_token?: boolean };
      }) => {
        const { where, include = {} } = params;
        const { unique_id, id } = where;
        const { drive_token } = include;
        const r = await this.client.post("https://media.funzm.com/api/v1/drive/find_first", {
          where: { id, unique_id },
          include: { drive_token },
        });
        if (r.error) {
          throw new Error(r.error.message);
        }
        return r.data;
      },
      // @ts-ignore
      update: async (params: {
        where: { unique_id: string; id: string | number };
        data?: { drive_token?: { data: string; expired_at: string } };
      }) => {
        const { where, data = {} } = params;
        const { unique_id, id } = where;
        const { drive_token } = data;
        const r = await this.client.post("https://media.funzm.com/api/v1/drive/update", {
          where: { id, unique_id },
          data: { drive_token },
        });
        if (r.error) {
          throw new Error(r.error.message);
        }
        return r.data;
      },
    },
  };
  //   find_drive(where: Partial<{ unique_id: string; id: string | number }>) {
  //     const { id, unique_id } = where;
  //     if (unique_id !== undefined) {
  //       const r = this.drives.find((d) => String(d.unique_id) === String(unique_id));
  //       if (r) {
  //         return Result.Ok(r);
  //       }
  //     }
  //     if (id !== undefined) {
  //       const r = this.drives.find((d) => String(d.id) === String(id));
  //       if (r) {
  //         return Result.Ok(r);
  //       }
  //     }
  //     return Result.Ok(null);
  //   }
  //   create_drive(data: Omit<DriveRecord, "id"> & { drive_token: Omit<DriveTokenRecord, "id"> }) {
  //     const p = omit(data, ["drive_token"]);
  //     const drive_token_id = this.uuid();
  //     this.tokens.push({
  //       id: drive_token_id,
  //       ...data.drive_token,
  //     });
  //     this.drives.push({
  //       id: this.uuid(),
  //       ...p,
  //       drive_token_id,
  //     });
  //     this.emit(Events.StateChange, { ...this.state });
  //     return Result.Ok(null);
  //   }
  //   create_drive_token(data: Omit<DriveTokenRecord, "id">) {
  //     this.tokens.push({
  //       id: this.uuid(),
  //       ...data,
  //     });
  //     this.emit(Events.StateChange, { ...this.state });
  //     return Result.Ok(null);
  //   }
  //   update_drive(id: string | number, payload: Partial<DriveRecord>) {
  //     const matched_index = this.drives.findIndex((d) => String(d.id) === String(id));
  //     if (matched_index === -1) {
  //       return null;
  //     }
  //     this.drives[matched_index] = {
  //       ...this.drives[matched_index],
  //       ...payload,
  //     };
  //     this.emit(Events.StateChange, { ...this.state });
  //     return Result.Ok(this.drives[matched_index]);
  //   }
  //   find_aliyun_drive_token(where: { id: string | number }) {
  //     const { id } = where;
  //     const r = this.tokens.find((t) => String(t.id) === String(id));
  //     if (r) {
  //       return Result.Ok(r);
  //     }
  //     return Result.Ok(null);
  //   }
  //   /** 更新 token */
  //   update_aliyun_drive_token(id: string | number, payload: Partial<unknown>) {
  //     const matched_index = this.tokens.findIndex((d) => String(d.id) === String(id));
  //     if (matched_index === -1) {
  //       return null;
  //     }
  //     this.tokens[matched_index] = {
  //       ...this.tokens[matched_index],
  //       ...payload,
  //     };
  //     this.emit(Events.StateChange, { ...this.state });
  //     return Result.Ok(this.tokens[matched_index]);
  //   }

  onStateChange(handler: Handler<TheTypesOfEvents[Events.StateChange]>) {
    return this.on(Events.StateChange, handler);
  }
}
