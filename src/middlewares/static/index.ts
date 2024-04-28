import type { ReadStream } from "fs";
import { createReadStream, existsSync, lstatSync } from "fs";
import type { Context, MiddlewareHandler } from "hono";
import { getMimeType } from "hono/utils/mime";
import path from "path";

export type ServeStaticOptions = {
  /**
   * Root path, relative to current working directory.
   * (absolute paths are not supported)
   */
  root?: string;
  path?: string;
  /**
   * default is 'index.html'
   */
  index?: string;
  rewriteRequestPath?: (path: string) => string;
  onNotFound?: (path: string, c: Context) => void | Promise<void>;
};

const createStreamBody = (stream: ReadStream) => {
  const body = new ReadableStream({
    start(controller) {
      stream.on("data", (chunk) => {
        controller.enqueue(chunk);
      });
      stream.on("end", () => {
        controller.close();
      });
    },
    cancel() {
      stream.destroy();
    },
  });
  return body;
};

export const static_serve = (options: ServeStaticOptions = { root: "" }): MiddlewareHandler => {
  return async (c, next) => {
    // Do nothing if Response is already set
    if (c.finalized) {
      return next();
    }
    const url = new URL(c.req.url);
    //     console.log(url);
    const filename = options.path ?? decodeURIComponent(url.pathname);
    let path = get_filepath({
      filename: options.rewriteRequestPath ? options.rewriteRequestPath(filename) : filename,
      root: options.root,
      defaultDocument: options.index ?? "index.html",
    });
    // console.log(path);
    if (!path) {
      return next();
    }
    //     path = `./${path}`;
    if (!existsSync(path)) {
      await options.onNotFound?.(path, c);
      return next();
    }

    const mimeType = getMimeType(path);
    if (mimeType) {
      c.header("Content-Type", mimeType);
    }

    const stat = lstatSync(path);
    const size = stat.size;

    if (c.req.method == "HEAD" || c.req.method == "OPTIONS") {
      c.header("Content-Length", size.toString());
      c.status(200);
      return c.body(null);
    }

    const range = c.req.header("range") || "";

    if (!range) {
      c.header("Content-Length", size.toString());
      return c.body(createStreamBody(createReadStream(path)), 200);
    }

    c.header("Accept-Ranges", "bytes");
    c.header("Date", stat.birthtime.toUTCString());

    const parts = range.replace(/bytes=/, "").split("-", 2);
    const start = parts[0] ? parseInt(parts[0], 10) : 0;
    let end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    if (size < end - start + 1) {
      end = size - 1;
    }

    const chunksize = end - start + 1;
    const stream = createReadStream(path, { start, end });

    c.header("Content-Length", chunksize.toString());
    c.header("Content-Range", `bytes ${start}-${end}/${stat.size}`);

    return c.body(createStreamBody(stream), 206);
  };
};

type FilePathOptions = {
  filename: string;
  root?: string;
  defaultDocument?: string;
};

export const get_filepath = (options: FilePathOptions): string | undefined => {
  let filename = options.filename;
  const defaultDocument = options.defaultDocument || "index.html";

  if (filename.endsWith("/")) {
    // /top/ => /top/index.html
    filename = filename.concat(defaultDocument);
  } else if (!filename.match(/\.[a-zA-Z0-9]+$/)) {
    // /top => /top/index.html
    filename = filename.concat("/" + defaultDocument);
  }

  const path = get_filepath_without_default_document({
    root: options.root,
    filename,
  });

  return path;
};

export const get_filepath_without_default_document = (options: Omit<FilePathOptions, "defaultDocument">) => {
  let root = options.root || "";
  let filename = options.filename;

  if (/(?:^|[\/\\])\.\.(?:$|[\/\\])/.test(filename)) {
    return;
  }

  // /foo.html => foo.html
  filename = filename.replace(/^\.?[\/\\]/, "");

  // foo\bar.txt => foo/bar.txt
  filename = filename.replace(/\\/, "/");

  // assets/ => assets
  root = root.replace(/\/$/, "");

  // ./assets/foo.html => assets/foo.html
  let p = root ? [root, filename].join("/") : filename;
  p = p.replace(/^\.\//, "");

  return p;
};
