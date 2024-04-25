declare const DEBUG: boolean;

declare global {
  namespace next {
    export type NextApiRequest = {
      body: unknown;
    };
  }
}

export {};
