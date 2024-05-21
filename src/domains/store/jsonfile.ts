/**
 * @file 本地数据库，但和 prisma 接口保持一致
 */
import fs from "fs";

import debounce from "lodash/debounce";

import { BaseDomain, Handler } from "@/domains/base";

import { DataStore, DriveRecord, DriveTokenRecord } from "./types";
import { MemoryStore } from "./memory";

enum Events {
  StateChange,
}
type TheTypesOfEvents = {
  [Events.StateChange]: JSONFileStoreState;
};
type JSONFileStoreState = {
  drives: DriveRecord[];
  drive_tokens: DriveTokenRecord[];
};
type JSONFileStoreProps = {
  filepath: string;
};

export class JSONFileStore extends BaseDomain<TheTypesOfEvents> implements DataStore {
  private filepath: string;

  private $memory: MemoryStore;

  get state(): JSONFileStoreState {
    return {
      drives: this.$memory.drives,
      drive_tokens: this.$memory.drive_tokens,
    };
  }
  get prisma() {
    return this.$memory.prisma;
  }

  constructor(props: Partial<{ _name: string }> & JSONFileStoreProps) {
    super(props);

    const { filepath } = props;

    const { drives, drive_tokens } = (() => {
      try {
        const content = fs.readFileSync(filepath, "utf-8");
        const d = JSON.parse(content);
        return {
          drives: d.drives || [],
          drive_tokens: d.tokens || [],
        };
      } catch (err) {
        return {
          drives: [],
          drive_tokens: [],
        };
      }
    })();
    this.filepath = filepath;
    this.$memory = new MemoryStore({
      drives,
      drive_tokens,
    });
    this.$memory.onStateChange((v) => {
      this.update_json_file();
      this.emit(Events.StateChange, v);
    });
  }
  find_drive(where: Partial<{ unique_id: string; id: string | number }>) {
    this.$memory.find_drive(where);
  }
  update_drive(id: string | number, payload: Partial<DriveRecord>) {
    this.$memory.update_drive(id, payload);
  }
  find_aliyun_drive_token(where: { id: string | number }) {
    this.$memory.find_aliyun_drive_token(where);
  }
  /** 更新 token */
  update_aliyun_drive_token(id: string | number, payload: Partial<unknown>) {
    this.$memory.update_aliyun_drive_token(id, payload);
  }
  update_json_file_force() {
    const content = JSON.stringify(
      {
        drives: this.$memory.drives,
        drive_tokens: this.$memory.drive_tokens,
      },
      null,
      2
    );
    fs.writeFileSync(this.filepath, content);
  }
  update_json_file = debounce(() => {
    this.update_json_file_force();
  }, 800);

  list_with_cursor() {
    return Promise.resolve({
      next_marker: null,
      list: [],
    });
  }

  onStateChange(handler: Handler<TheTypesOfEvents[Events.StateChange]>) {
    return this.on(Events.StateChange, handler);
  }
}
