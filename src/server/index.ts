type Platform = "express";
const xanix = (platform: Platform) => {
  if (__XANIX_SERVER__) {
    if (platform === "express") {
      const { default: xanix_express } = require("./express");
      return xanix_express();
    }
  }
};
export default xanix;
