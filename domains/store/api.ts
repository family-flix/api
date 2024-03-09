/**
 * @file 调用 api 获取数据
 */
import fs from "fs";

import { PrismaClient } from "@prisma/client";
import debounce from "lodash/debounce";
import omit from "lodash/omit";

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

    const { token } = props;

    this.token = token;
    this.client = new HttpClientCore({
      hostname: "https://media.funzm.com",
      headers: {
        Authorization: `${token}`,
      },
    });
    connect(this.client);
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
    //     drive: {
    //       // @ts-ignore
    //       findFirst: (params: {
    //         where: { unique_id: string; id: string | number };
    //         include?: { drive_token?: boolean };
    //       }) => {
    //         const { where, include = {} } = params;
    //         const { unique_id } = where;
    //         const { drive_token } = include;
    //         const matched = this.drives.find((d) => String(d.unique_id) === String(unique_id));
    //         if (!matched) {
    //           return null;
    //         }
    //         if (drive_token) {
    //           const matched_token = this.tokens.find((d) => String(d.id) === String(matched.drive_token_id));
    //           if (matched_token) {
    //             // @ts-ignore
    //             matched.drive_token = matched_token;
    //           }
    //         }
    //         return matched;
    //       },
    //     },
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
