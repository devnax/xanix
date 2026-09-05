import { getClientRuntimeFileName, uid } from "../../include/utils.js";

const HEARDER_VALUE = uid(Math.random().toString(36), 32);

const defines = ({
  mode,
  isClient,
}: {
  mode: "development" | "production";
  isClient: boolean;
}) => {
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
export default defines;
