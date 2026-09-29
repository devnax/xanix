import { Router } from "express";
import HomePage from "../pages/Home";
import AboutPage from "../pages/About";
const router = Router();

router.get("/", (req, res) => {
  res.send(<HomePage />);
});
router.get("/about", (req, res) => {
  const id = "about";
  res.send(<AboutPage id={id as any} name="About" />);
});
export default router;
