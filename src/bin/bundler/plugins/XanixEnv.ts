import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import type { Plugin } from "rollup";
import replace from "@rollup/plugin-replace";

export interface XanixEnvPluginOptions {
  /**
   * Build environment.
   *
   * development → .env + .env.dev
   * production  → .env + .env.prod
   */
  mode?: "development" | "production";

  /**
   * Whether this is a client build.
   */
  isClient?: boolean;
}

export default function XanixEnvPlugin(
  options: XanixEnvPluginOptions = {},
): Plugin {
  const root = process.cwd();
  const mode = options.mode ?? "development";
  const isClient = options.isClient ?? false;
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

  const envs = {
    __XANIX_CLIENT__: JSON.stringify(isClient),
    "process.env.NODE_ENV": JSON.stringify(mode),
    ...(isClient ? clientEnv : serverEnv),
  };

  return replace({
    preventAssignment: true,
    values: envs,
  });
}
