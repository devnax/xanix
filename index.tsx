import express from "express";
import PagesRouter from "./app/routes/pages";

const app = express();
app.use("/", PagesRouter);
app.listen(3000, () => {
  console.log("Server running: http://localhost:3000");
});
