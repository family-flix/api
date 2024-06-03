import fs from "fs";
import path from "path";

import Debug from "@prisma/debug";
import { enginesVersion } from "@prisma/engines-version";
import type { BinaryTarget } from "@prisma/get-platform";

import { BinaryDownloadConfiguration, download } from "./download";
import { BinaryType } from "./BinaryType";

const debug = Debug("prisma:download");
const base_dir = path.join(process.cwd());
const lock_filepath = path.join(base_dir, "download-lock");
let created_lock_file = false;

const DEFAULT_CLI_QUERY_ENGINE_BINARY_TYPE = BinaryType.QueryEngineLibrary;
function getCliQueryEngineBinaryType(): BinaryType {
  const envCliQueryEngineType = process.env.PRISMA_CLI_QUERY_ENGINE_TYPE;
  if (envCliQueryEngineType) {
    if (envCliQueryEngineType === "binary") {
      return BinaryType.QueryEngineBinary;
    }
    if (envCliQueryEngineType === "library") {
      return BinaryType.QueryEngineLibrary;
    }
  }
  return DEFAULT_CLI_QUERY_ENGINE_BINARY_TYPE;
}

async function main() {
  if (fs.existsSync(lock_filepath) && parseInt(fs.readFileSync(lock_filepath, "utf-8"), 10) > Date.now() - 20_000) {
    debug(`Lock file already exists, so we're skipping the download of the prisma binaries`);
  } else {
    createLockFile();
    let binaryTargets: string[] | undefined;
    if (process.env.PRISMA_CLI_BINARY_TARGETS) {
      binaryTargets = process.env.PRISMA_CLI_BINARY_TARGETS.split(",");
    }
    const cliQueryEngineBinaryType = getCliQueryEngineBinaryType();

    const binaries: BinaryDownloadConfiguration = {
      [cliQueryEngineBinaryType]: base_dir,
      [BinaryType.SchemaEngineBinary]: base_dir,
    };

    await download({
      binaries,
      version: enginesVersion,
      showProgress: true,
      failSilent: true,
      binaryTargets: binaryTargets as BinaryTarget[],
    }).catch((e) => debug(e));

    cleanupLockFile();
  }
}

function createLockFile() {
  created_lock_file = true;
  fs.writeFileSync(lock_filepath, Date.now().toString());
}

function cleanupLockFile() {
  if (created_lock_file) {
    try {
      if (fs.existsSync(lock_filepath)) {
        fs.unlinkSync(lock_filepath);
      }
    } catch (e) {
      debug(e);
    }
  }
}

export function download_engines() {
  return new Promise((resolve) => {
    main()
      .then(() => {
        resolve([null, true]);
      })
      .catch((e) => {
        resolve([e, null]);
      });
    process.on("beforeExit", () => {
      cleanupLockFile();
    });
    process.once("SIGINT", () => {
      cleanupLockFile();
      console.log("download failed?");
      //     process.exit();
    });
  });
}
