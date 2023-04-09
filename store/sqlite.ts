import { store_factory } from ".";
import { StoreOperation } from "./operations";

export const operation = new StoreOperation(process.env.SQLITE_DB_PATH);
export const store = store_factory(operation);
