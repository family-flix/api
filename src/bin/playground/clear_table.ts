require("dotenv").config();

import { ModelKeys } from "@/domains/store/types";
import { store } from "@/store";
import { parse_argv } from "@/utils/server";

function main() {
  const args = process.argv.slice(2);
  const options = parse_argv(args);
  const { t: table_name } = options as { t: ModelKeys };
  if (!table_name) {
    console.log("\n[ERROR]请传入要清空的表名，可选的表名有", store.table_names);
    return;
  }
  if (!store.table_names.includes(table_name)) {
    console.log(`\n[ERROR]'${table_name}' 不属于表名，请检查后重试`);
    return;
  }
  store.clear_dataset(table_name);
  //   clear_table(table_name);
}

main();
