import PocketBase from "pocketbase";

export const pocket_base = new PocketBase(process.env.POCKET_BASE_HOST);
