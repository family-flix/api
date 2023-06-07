import { createServer } from "http";
import { parse } from "url";
import { join } from "path";
// import { start } from "./commands/start";
// import { setup } from "./commands/setup";

// start();

// import { serve } from "std/http";
// import { join, parse } from "std/path";
import next from "next";

// const dev = Deno.env.get("NODE_ENV") !== "production";
// const dev = process.env.NODE_ENV !== "production";
const app = next({ dev: false });
const handle = app.getRequestHandler();

// const moduleUrl = import.meta.url;
// const moduleDir = new URL(".", moduleUrl).pathname;
// console.log(moduleDir);

// async function serveHttp(conn: Deno.Conn) {
//   const httpConn = Deno.serveHttp(conn);
//   for await (const requestEvent of httpConn) {
//     const body = `Your user-agent is:\n\n${requestEvent.request.headers.get("user-agent") ?? "Unknown"}`;
//     requestEvent.respondWith(
//       new Response(body, {
//         status: 200,
//       })
//     );
//   }
// }

async function start() {
  //   await setup_database({ dir: DATABASE_PATH, filename: DATABASE_FILENAME });
  //   await check_database_initialized();

  //   const host = get_ip_address();
  const host = "0.0.0.0";
  const port = 3100;

  app.prepare().then(async () => {
    // const server = Deno.listen({ port });
    // for await (const conn of server) {
    //   serveHttp(conn);
    // }
    createServer((req, res) => {
      const parsed_url = parse(req.url!, true);
      const { pathname } = parsed_url;

      if (pathname!.startsWith("/storage/")) {
        const imagePath = join(__dirname, pathname!);
        app.serveStatic(req, res, imagePath);
        return;
      }
      handle(req, res, parsed_url);
    }).listen(port, () => {
      console.log(`> Ready on http://${host}:${port}/admin/`);
    });
  });
}

start();
