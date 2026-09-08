import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";
import { getClientRuntimeFileName, uid } from "../../include/utils.js";

const HEARDER_VALUE = uid(Math.random().toString(36), 32);

const loadEnv = async ({
  mode,
  isClient,
}: {
  mode: "development" | "production";
  isClient: boolean;
}) => {
  const root = process.cwd();
  const publicPrefix = "PUBLIC_";

  const envFiles = [
    path.resolve(root, ".env"),
    path.resolve(root, mode === "development" ? ".env.dev" : ".env.prod"),
  ];

  const env: Record<string, string> = {};
  for (const file of envFiles) {
    if (!fs.existsSync(file)) {
      continue;
    }
    const result = dotenv.parse(fs.readFileSync(file));
    Object.assign(env, result);
  }

  const clientEnv: Record<string, string> = {};
  const serverEnv: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (key.startsWith(publicPrefix)) {
      clientEnv[`process.env.${key}`] = JSON.stringify(value);
    } else {
      serverEnv[`process.env.${key}`] = JSON.stringify(value);
    }
  }

  return {
    "process.env.NODE_ENV": JSON.stringify(mode),
    __XANIX_PAGE_NAVIGATION_HEADER_VALUE__: JSON.stringify(HEARDER_VALUE),
    __XANIX_CLIENT_RUNTIME_FILE_NAME__: JSON.stringify(
      getClientRuntimeFileName(mode),
    ),
    __XANIX_CLIENT__: isClient ? "true" : "false",
    __XANIX_SERVER__: isClient ? "false" : "true",
    __XANIX_DEV__: mode === "development" ? "true" : "false",
    __XANIX_PROD__: mode === "production" ? "true" : "false",

    XANIX_NAVIGATE: JSON.stringify("xanix:navigate"),
    XANIX_NAVIGATE_START: JSON.stringify("xanix:navigate:start"),
    XANIX_NAVIGATE_END: JSON.stringify("xanix:navigate:end"),
    XANIX_NAVIGATE_RELOAD: JSON.stringify("xanix:navigate:reload"),

    XANIX_PRELOAD: JSON.stringify("xanix:preload"),
    XANIX_PRELOAD_START: JSON.stringify("xanix:preload:start"),
    XANIX_PRELOAD_END: JSON.stringify("xanix:preload:end"),
  };
};
export default loadEnv;
