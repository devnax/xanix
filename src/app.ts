import express from "express";
import xanix from "./xanix.js";

export const app = express();
app.use(xanix());
app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
