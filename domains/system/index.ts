export class CurSystem {
  connection: string = "unknown";
  constructor() {
    if (typeof window === "undefined") {
      return;
    }
    this.connection = this.query_network();
  }
  query_network() {
    // @ts-ignore
    if (navigator.connection) {
      // @ts-ignore
      return navigator.connection.type;
    }
    const ua = navigator.userAgent;
    const regExp = /NetType\/(\S*)/;
    const matches = ua.match(regExp);
    if (!matches) {
      return "unknown";
    }
    return matches[1];
  }
}

export const system = new CurSystem();
