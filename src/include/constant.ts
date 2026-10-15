export const IS_SERVER =
  typeof __XANIX_SERVER__ !== "undefined" && __XANIX_SERVER__;
export const IS_CLIENT = !IS_SERVER;
export const IS_DEVELOPMENT =
  typeof __XANIX_DEV__ !== "undefined" && __XANIX_DEV__;

export const IS_PRODUCTION =
  typeof __XANIX_PROD__ !== "undefined" && __XANIX_PROD__;
