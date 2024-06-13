/**
 * 注册的监听器
 */
import mitt, { EventType, Handler } from "mitt";

let _uid = 0;
export function uid() {
  _uid += 1;
  return _uid;
}
// 这里必须给 Tip 显示声明值，否则默认为 0，会和其他地方声明的 Events 第一个 Key 冲突
enum BaseEvents {
  Tip = "__tip",
  Destroy = "__destroy",
}
type TheTypesOfBaseEvents = {
  [BaseEvents.Tip]: {
    icon?: unknown;
    text: string[];
  };
  [BaseEvents.Destroy]: void;
};
type BaseDomainEvents<E> = TheTypesOfBaseEvents & E;

export function base<Events extends Record<EventType, unknown>>() {
  const emitter = mitt<BaseDomainEvents<Events>>();
  let listeners: (() => void)[] = [];

  return {
    off<Key extends keyof BaseDomainEvents<Events>>(event: Key, handler: Handler<BaseDomainEvents<Events>[Key]>) {
      emitter.off(event, handler);
    },
    on<Key extends keyof BaseDomainEvents<Events>>(event: Key, handler: Handler<BaseDomainEvents<Events>[Key]>) {
      const unlisten = () => {
        listeners = listeners.filter((l) => l !== unlisten);
        this.off(event, handler);
      };
      listeners.push(unlisten);
      emitter.on(event, handler);
      return unlisten;
    },
    emit<Key extends keyof BaseDomainEvents<Events>>(event: Key, value?: BaseDomainEvents<Events>[Key]) {
      emitter.emit(event, value as any);
    },
    destroy() {
      for (let i = 0; i < listeners.length; i += 1) {
        const off = listeners[i];
        off();
      }
      this.emit(BaseEvents.Destroy, null as any);
    },
  };
}

export class BaseDomain<Events extends Record<EventType, unknown>> {
  /** 用于自己区别同名 Domain 不同实例的标志 */
  _unique_id: string = "BaseDomain";
  debug: boolean = false;

  _emitter = mitt<BaseDomainEvents<Events>>();
  listeners: Record<string | number, (() => void)[]> = {};

  constructor(
    props: Partial<{
      // unique_id: string;
      // debug: boolean;
    }> = {}
  ) {
    // @ts-ignore
    const { _unique_id, debug } = props;
    if (_unique_id) {
      this._unique_id = _unique_id;
    }
  }
  uid() {
    return uid();
  }
  log(...args: unknown[]) {
    if (!this.debug) {
      return [];
    }
    // const error = new Error();
    // const lineNumber = error.stack.split("\n")[2].trim().split(" ")[1];
    // console.log(error.stack.split("\n"));
    return [
      `%c CORE %c ${this._unique_id} %c`,
      "color:white;background:#dfa639;border-top-left-radius:2px;border-bottom-left-radius:2px;",
      "color:white;background:#19be6b;border-top-right-radius:2px;border-bottom-right-radius:2px;",
      "color:#19be6b;",
      ...args,
    ];
  }
  errorTip(...args: unknown[]) {
    if (!this.debug) {
      return;
    }
    console.log(
      `%c CORE %c ${this._unique_id} %c`,
      "color:white;background:red;border-top-left-radius:2px;border-bottom-left-radius:2px;",
      "color:white;background:#19be6b;border-top-right-radius:2px;border-bottom-right-radius:2px;",
      "color:#19be6b;",
      ...args
    );
  }
  off<Key extends keyof BaseDomainEvents<Events>>(event: Key, handler: Handler<BaseDomainEvents<Events>[Key]>) {
    this._emitter.off(event, handler);
  }
  offEvent<Key extends keyof BaseDomainEvents<Events>>(k: Key) {
    const listeners = this.listeners[k as string] || [];
    for (let i = 0; i < listeners.length; i += 1) {
      const off = listeners[i];
      off();
    }
  }
  on<Key extends keyof BaseDomainEvents<Events>>(event: Key, handler: Handler<BaseDomainEvents<Events>[Key]>) {
    const unlisten = () => {
      const listeners = this.listeners[event as string] || [];
      this.listeners[event as string] = listeners.filter((l) => l !== unlisten);
      this.off(event, handler);
    };
    const listeners = (this.listeners[event as string] || []) as (() => void)[];
    listeners.push(unlisten);
    this._emitter.on(event, handler);
    return unlisten;
  }
  emit<Key extends keyof BaseDomainEvents<Events>>(event: Key, value?: BaseDomainEvents<Events>[Key]) {
    // @ts-ignore
    this._emitter.emit(event, value);
  }
  tip(content: { icon?: unknown; text: string[] }) {
    // @ts-ignore
    this._emitter.emit(BaseEvents.Tip, content);
    return content.text.join("\n");
  }
  /** 主动销毁所有的监听事件 */
  destroy() {
    // this.log(this.name, "destroy");
    Object.keys(this.listeners).map((k) => {
      const listeners = this.listeners[k as string] || [];
      for (let i = 0; i < listeners.length; i += 1) {
        const off = listeners[i];
        off();
      }
    });
    this.emit(BaseEvents.Destroy);
  }
  onTip(handler: Handler<TheTypesOfBaseEvents[BaseEvents.Tip]>) {
    return this.on(BaseEvents.Tip, handler);
  }
  onDestroy(handler: Handler<TheTypesOfBaseEvents[BaseEvents.Destroy]>) {
    return this.on(BaseEvents.Destroy, handler);
  }

  get [Symbol.toStringTag]() {
    return "Domain";
  }
}

// This can live anywhere in your codebase:
export function applyMixins(derivedCtor: any, constructors: any[]) {
  constructors.forEach((baseCtor) => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
      Object.defineProperty(
        derivedCtor.prototype,
        name,
        Object.getOwnPropertyDescriptor(baseCtor.prototype, name) || Object.create(null)
      );
    });
  });
}

export type { Handler };
