const path = require("path");
const fs = require("fs");

const ncc = require("@vercel/ncc");

const ROOT_DIR = process.cwd();
const modules = [
  {
    name: "@panva/hkdf",
    pathname: "@panva/hkdf/dist/node/cjs/index.js",
  },
  // {
  //   name: "@prisma/client",
  //   pathname: "@prisma/client/index.js",
  // },
  {
    name: "jose",
    pathname: "jose/dist/node/cjs/index.js",
  },
  {
    name: "axios",
    pathname: "axios/dist/node/axios.cjs",
  },
  {
    name: "uuid",
    pathname: "uuid/dist/index.js",
  },
];

async function run() {
  for (let i = 0; i < modules.length; i += 1) {
    const m = modules[i];
    const { name, pathname } = m;
    const { code, map, assets } = await ncc(path.join(ROOT_DIR, "node_modules", pathname), {
      filterAssetBase: ROOT_DIR, // default
      minify: false, // default
      sourceMap: false, // default
      assetBuilds: false, // default
      sourceMapRegister: true, // default
      watch: false, // default
      license: "", // default does not generate a license file
      target: "es2015", // default
      v8cache: false, // default
      quiet: true, // default
      debugLog: false, // default
    });
    const moduleRootPath = path.join(path.join(ROOT_DIR, "modules"));
    const modulePath = path.join(moduleRootPath, name);
    const filepath = path.join(modulePath, `index.js`);
    // console.log(filepath);
    await ensure(filepath);
    fs.writeFileSync(filepath, code);
    // fs.writeFileSync(
    //   path.join(modulePath, "package.json"),
    //   JSON.stringify(
    //     {
    //       name,
    //       version: "1.0.0",
    //       main: `${name}.js`,
    //     },
    //     null,
    //     2
    //   )
    // );
  }
}

function access(filepath) {
  return new Promise((resolve) => {
    fs.access(filepath, (err) => {
      if (err) {
        const e = err;
        return resolve([null, new Error(e.message)]);
      }
      return resolve([null, null]);
    });
  });
}
function mkdir(filepath) {
  return new Promise((resolve) => {
    fs.mkdir(filepath, (err) => {
      if (err) {
        const e = err;
        return resolve([null, new Error(e.message)]);
      }
      return resolve([null, null]);
    });
  });
}
/**
 * 确保某个路径必然存在
 * @param filepath
 */
async function ensure(filepath, next = []) {
  const { ext, dir } = path.parse(filepath);
  const is_file = ext !== undefined && ext !== "";
  if (is_file) {
    filepath = dir;
  }
  const [, error] = await access(filepath);
  if (error) {
    const need_to_create = path.dirname(filepath);
    await ensure(need_to_create, next.concat(filepath));
    return;
  }
  const the_dir_prepare_create = next.pop();
  if (the_dir_prepare_create) {
    await mkdir(the_dir_prepare_create);
    await ensure(filepath, next);
  }
}

run();
