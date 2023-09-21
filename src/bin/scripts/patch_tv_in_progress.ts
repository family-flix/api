import dayjs from "dayjs";

import { Application } from "@/domains/application";
import { DifferEffect, DiffTypes, FolderDiffer } from "@/domains/folder_differ";
import { User } from "@/domains/user";
import { Drive } from "@/domains/drive";
import { Folder } from "@/domains/folder";
import { folder_client } from "@/domains/store/utils";

const OUTPUT_PATH = "/apps/flix_prod";
const DATABASE_PATH = "file://$OUTPUT_PATH/data/family-flix.db?connection_limit=1";

const app = new Application({
  root_path: OUTPUT_PATH,
});
const store = app.store;

async function main() {
  const authorization =
    "eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..p6619wBz3PtYMtLo.WEpJdSKALkNKahy2pPN9b9aI6hGXrGTtObZxh-SHQw2TeQLz13SDcuCI0UgNfO8j2ee2df8J46GaKHeyT9evZjIhdmKdSGZJz_r-JRcNCvjfrskyTdG1aJuz7YcIaiujz6n8dApMpw.huHxm7FWjGGVuuv6f-cJ2w";
  const t_res = await User.New(authorization, store);
  if (t_res.error) {
    return;
  }
  const user = t_res.data;

  const { url, file_id, file_id_link_resource, file_name_link_resource } = {
    url: "https://www.aliyundrive.com/s/8fU9VZYfe7e",
    file_id: "64bf81836b2b93cab35647348712557552356667",
    file_id_link_resource: "64d30fbdb92734c58f044dac98d392a0dc221f4b",
    file_name_link_resource: "H 活着 VIVANT [2023][10集持续更新中]",
  };
  const drive_id = "pdhpUAR3yC4Srux";
  const drive_res = await Drive.Get({ id: drive_id, user, store });
  if (drive_res.error) {
    return;
  }
  const drive = drive_res.data;
  const client = drive.client;
  const r1 = await client.fetch_share_profile(url, { force: true });
  if (r1.error) {
    return;
  }
  const { share_id } = r1.data;

  const prev_folder = new Folder(file_id_link_resource, {
    name: file_name_link_resource,
    client: folder_client({ drive_id }, store),
  });
  const folder = new Folder(file_id, {
    name: file_name_link_resource,
    client: {
      fetch_files: async (file_id: string, options: Partial<{ marker: string; page_size: number }> = {}) => {
        return client.fetch_shared_files(file_id, {
          ...options,
          share_id,
        });
      },
    },
  });
  const differ = new FolderDiffer({
    folder,
    prev_folder,
    unique_key: "name",
    on_print: (node) => {},
  });
  await differ.run();
  console.log(differ.effects);
}

main();
