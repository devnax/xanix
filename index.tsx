import express from "express";
import PagesRouter from "./app/routes/pages";
import { scanFileRoutes } from "./src/bin/libs/scanFileRoutes.js";

const app = express();

app.get("/routes", async (req, res) => {
  const files = await scanFileRoutes("./app");
  res.json(files);
});
app.use("/", PagesRouter);
app.listen(3000, () => {
  // console.log("Server running: http://localhost:3000");
});
