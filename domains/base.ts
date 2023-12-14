/**
 * 注册的监听器
 */
import type { EventType, Handler } from "mitt";
import mitt from "mitt";

let _uid = 0;
function uid() {
  _uid += 1;
  return _uid;
}
// 这里必须给 Tip 显式声明值，否则默认为 0，会和其他地方声明的 Events 第一个 Key 冲突
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

export class BaseDomain<Events extends Record<EventType, unknown>> {
  _name: string = "BaseDomain";
  debug: boolean = false;

  // @ts-ignore
  _emitter = mitt<BaseDomainEvents<Events>>();
  listeners: (() => void)[] = [];

  constructor(
    params: Partial<{
      _name: string;
      debug: boolean;
    }> = {}
  ) {
    const { _name, debug = false } = params;
    if (_name) {
      this._name = _name;
    }
    this.debug = debug;
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
    const texts = [
      `%c CORE %c ${this._name} %c`,
      "color:white;background:#dfa639;border-top-left-radius:2px;border-bottom-left-radius:2px;",
      "color:white;background:#19be6b;border-top-right-radius:2px;border-bottom-right-radius:2px;",
      "color:#19be6b;",
      ...args,
    ];
    console.log(...texts);
    return texts;
  }
  error(...args: unknown[]) {
    if (!this.debug) {
      return;
    }
    console.log(
      `%c CORE %c ${this._name} %c`,
      "color:white;background:red;border-top-left-radius:2px;border-bottom-left-radius:2px;",
      "color:white;background:#19be6b;border-top-right-radius:2px;border-bottom-right-radius:2px;",
      "color:#19be6b;",
      ...args
    );
  }
  off<Key extends keyof BaseDomainEvents<Events>>(event: Key, handler: Handler<BaseDomainEvents<Events>[Key]>) {
    this._emitter.off(event, handler);
  }
  on<Key extends keyof BaseDomainEvents<Events>>(event: Key, handler: Handler<BaseDomainEvents<Events>[Key]>) {
    const unlisten = () => {
      this.listeners = this.listeners.filter((l) => l !== unlisten);
      this.off(event, handler);
    };
    this.listeners.push(unlisten);
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
  unmount() {
    // this.log(this.name, "destroy");
    for (let i = 0; i < this.listeners.length; i += 1) {
      const off = this.listeners[i];
      off();
    }
    this.emit(BaseEvents.Destroy);
  }
  onTip(handler: Handler<TheTypesOfBaseEvents[BaseEvents.Tip]>) {
    return this.on(BaseEvents.Tip, handler);
  }
  onDestroy(handler: Handler<TheTypesOfBaseEvents[BaseEvents.Destroy]>) {
    return this.on(BaseEvents.Destroy, handler);
  }

  // get [Symbol.toStringTag]() {
  //   return "Domain";
  // }
}

export { Handler };
