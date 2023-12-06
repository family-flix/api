/**
 * 本地数据库，但和 prisma 接口保持一致
 */
import fs from "fs";

import debounce from "lodash/debounce";
import omit from "lodash/omit";

import { BaseDomain, Handler } from "@/domains/base";
import { Result } from "@/types";

// import { DriveRecord, DriveTokenRecord } from "./types";
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
  [Events.StateChange]: JSONFileStoreState;
};
type JSONFileStoreState = {
  drives: DriveRecord[];
  tokens: DriveTokenRecord[];
};
type JSONFileStoreProps = {
  filepath: string;
  // drives: DriveRecord[];
  // tokens: DriveTokenRecord[];
};

// console.log(AliyunBackupDriveClient);
export class JSONFileStore extends BaseDomain<TheTypesOfEvents> {
  _uuid: number;
  filepath: string;
  drives: DriveRecord[] = [];
  tokens: DriveTokenRecord[] = [];
  uuid: () => string;

  // @ts-ignore
  get state(): JSONFileStoreState {
    return {
      drives: this.drives,
      tokens: this.tokens,
    };
  }

  constructor(props: Partial<{ _name: string }> & JSONFileStoreProps) {
    super(props);

    const { filepath } = props;

    const { uuid, drives, drive_tokens } = (() => {
      try {
        const content = fs.readFileSync(filepath, "utf-8");
        return JSON.parse(content);
      } catch (err) {
        return {
          uuid: 0,
          drives: [],
          drive_tokens: [],
        };
      }
    })();
    this.filepath = filepath;
    this.drives = drives;
    this.tokens = drive_tokens;
    this._uuid = uuid;
    this.uuid = () => {
      this._uuid += 1;
      return String(this._uuid);
    };
    this.onStateChange(() => {
      this.update_json_file();
    });
  }
  prisma = {
    drive: {
      findFirst: (params: {
        where: { unique_id: string; id: string | number };
        include?: { drive_token?: boolean };
      }) => {
        const { where, include = {} } = params;
        const { unique_id } = where;
        const { drive_token } = include;
        const matched = this.drives.find((d) => String(d.unique_id) === String(unique_id));
        if (!matched) {
          return null;
        }
        if (drive_token) {
          const matched_token = this.tokens.find((d) => String(d.id) === String(matched.drive_token_id));
          if (matched_token) {
            // @ts-ignore
            matched.drive_token = matched_token;
          }
        }
        return matched;
      },
    },
  };
  find_drive(where: { unique_id: string; id: string | number }) {
    const { id, unique_id } = where;
    if (unique_id !== undefined) {
      const r = this.drives.find((d) => String(d.unique_id) === String(unique_id));
      if (r) {
        return Result.Ok(r);
      }
    }
    if (id !== undefined) {
      const r = this.drives.find((d) => String(d.id) === String(id));
      if (r) {
        return Result.Ok(r);
      }
    }
    return Result.Ok(null);
  }
  create_drive(data: Omit<DriveRecord, "id"> & { drive_token: Omit<DriveTokenRecord, "id"> }) {
    const p = omit(data, ["drive_token"]);
    const drive_token_id = this.uuid();
    this.tokens.push({
      id: drive_token_id,
      ...data.drive_token,
    });
    this.drives.push({
      id: this.uuid(),
      ...p,
      drive_token_id,
    });
    this.emit(Events.StateChange, { ...this.state });
    return Result.Ok(null);
  }
  create_drive_token(data: Omit<DriveTokenRecord, "id">) {
    this.tokens.push({
      id: this.uuid(),
      ...data,
    });
    this.emit(Events.StateChange, { ...this.state });
    return Result.Ok(null);
  }
  update_drive(id: string | number, payload: Partial<DriveRecord>) {
    const matched_index = this.drives.findIndex((d) => String(d.id) === String(id));
    if (matched_index === -1) {
      return null;
    }
    this.drives[matched_index] = {
      ...this.drives[matched_index],
      ...payload,
    };
    this.emit(Events.StateChange, { ...this.state });
    return Result.Ok(this.drives[matched_index]);
  }
  find_aliyun_drive_token(where: { id: string | number }) {
    const { id } = where;
    const r = this.tokens.find((t) => String(t.id) === String(id));
    if (r) {
      return Result.Ok(r);
    }
    return Result.Ok(null);
  }
  /** 更新 token */
  update_aliyun_drive_token(id: string | number, payload: Partial<unknown>) {
    const matched_index = this.tokens.findIndex((d) => String(d.id) === String(id));
    if (matched_index === -1) {
      return null;
    }
    this.tokens[matched_index] = {
      ...this.tokens[matched_index],
      ...payload,
    };
    this.emit(Events.StateChange, { ...this.state });
    return Result.Ok(this.tokens[matched_index]);
  }
  update_json_file = debounce(() => {
    fs.writeFileSync(
      this.filepath,
      JSON.stringify(
        {
          uuid: this._uuid,
          drives: this.drives,
          drive_tokens: this.tokens,
        },
        null,
        2
      )
    );
  }, 800);

  onStateChange(handler: Handler<TheTypesOfEvents[Events.StateChange]>) {
    return this.on(Events.StateChange, handler);
  }
}
