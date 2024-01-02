import { Drive } from "@/domains/drive";
import { Application } from "@/domains/application";
import { User } from "@/domains/user";

async function main() {
  const app = new Application({
    root_path: "/Users/litao/Documents/workspaces/family-flix/dev-output",
  });
  const store = app.store;
  const t_res = await User.Get({ id: "c983KOZIgUtKheH" }, store);
  if (t_res.error) {
    return;
  }
  const user = t_res.data;
  const drive_id = "WHFIiV9ILBmwaAK";
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return;
  }
  const client = drive_res.data.client;
  const r = await client.ensure_dir(["_subtitle", "test", "hello"], "root");
  if (r.error) {
    console.log(r.error.message);
    return;
  }
  console.log("upload success");
  console.log(r.data);
}

main();
