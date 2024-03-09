export class BizError extends Error {
  message: string;
  code?: string | number;
  data: unknown | null = null;

  constructor(msg: string, code?: string | number, data: unknown = null) {
    super(msg);

    this.message = msg;
    this.code = code;
    this.data = data;
  }
}
