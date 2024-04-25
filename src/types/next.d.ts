declare module "next" {
  export type NextApiRequest = {
    headers: Record<string, string>;
    body: Record<string, string>;
    body: unknown;
  };
  export interface NextApiResponse<T> {
    status(code: number): {
      json(v: any): T;
    };
  }
}
