import { Result } from "@/types/index";

import { get_ip_address } from "../utils";

export async function start(options: { dev: boolean; port: number; pathname: string; assets: string }): Promise<
  Result<{
    host: string;
    port: number;
    pathname: string;
  }>
> {
  const { dev, pathname, assets, port = 3000 } = options;
  //   const { pathname } = options;
  //   await setup_database({ dir: DATABASE_PATH, filename: DATABASE_FILENAME });
  //   await check_database_initialized();
  // const handle = app.getRequestHandler();

  const host = get_ip_address();
  // const host = "0.0.0.0";

  return new Promise((resolve) => {});
}
