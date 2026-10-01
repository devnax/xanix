import { Router } from "express";
import HomePage from "../pages/Home";
import AboutPage from "../pages/About";
const router = Router();

router.get("/", (req, res) => {
  res.send(<HomePage title="Yes" />);
});
router.get("/about", (req, res) => {
  res.send(<AboutPage />);
});

export default router;
