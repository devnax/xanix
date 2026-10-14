import { Router } from "express";

export const router = Router();

router.get("/testing", (req, res) => {
  res.send("Hello, world!");
});
