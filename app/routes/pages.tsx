import { Router } from "express";
import HomePage from "../pages/Home";
const router = Router();

router.get("/", (req, res) => {
  res.send(<HomePage />);
});
export default router;
