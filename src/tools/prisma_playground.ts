import path from "path";
import fs from "fs";

// @ts-ignore
import resolve from "resolve/sync";

type Mod = {
  filepath: string;
  content: string;
  imports: Mod[];
};

function load_file(filepath: string) {
  const file_content = fs.readFileSync(filepath, "utf-8");
  const regexp = /from ['"]([^'"]{1,})['"];{0,1}/g;
  const r1 = file_content.match(regexp);
  const entry: Mod = {
    filepath,
    content: file_content,
    imports: [],
  };
  //   console.log("load file", filepath);
  //   console.log(file_content.slice(0, 100));
  if (!r1) {
    return entry;
  }
  for (let i = 0; i < r1.length; i += 1) {
    (() => {
      const r1_str = r1[i];
      const regexp = /from ['"]([^'"]{1,})['"];{0,1}/;
      const r2 = r1_str.match(regexp);
      if (!r2) {
        return;
      }
      const module_path = (() => {
        const s = r2[1];
        if (s.endsWith(".d.ts")) {
          return s;
        }
        return [s, "d.ts"].join(".");
      })();
      const file = (() => {
        if (module_path.match(/^\./)) {
          return {
            // 相对路径
            type: 1,
            filepath: module_path,
          };
        }
        if (module_path.match(/^\//)) {
          return {
            // 绝对路径
            type: 2,
            filepath: module_path,
          };
        }
        return {
          // node_modules 模块
          type: 3,
          filepath: module_path,
        };
      })();
      //       console.log("file", file);
      if (file.type === 1) {
        const basedir = path.parse(filepath).dir;
        const filepath2 = resolve(file.filepath, {
          basedir,
        });
        // console.log("1", filepath, file.filepath, basedir, filepath2);
        entry.imports.push(load_file(filepath2));
        return;
      }
      if (file.type === 3) {
        const filepath2 = resolve(file.filepath);
        entry.imports.push(load_file(filepath2));
        return;
      }
    })();
  }
  return entry;
}

function main() {
  const filepath = path.resolve(process.cwd(), "node_modules/.prisma/client/index.d.ts");
  const r = load_file(filepath);
  console.log(r);
}
main();
