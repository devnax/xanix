import { Router } from "express";
import HomePage from "../pages/Home";
import AboutPage from "../pages/About";
import { withAuth } from "../pages/Home/auth";
const router = Router();

router.get("/", (req, res) => {
  res.send(<HomePage title="Yes" />);
});

router.get("/about", (req, res) => {
  console.log("about page");

  res.send(<AboutPage />);
});

router.get("/api", withAuth(), (req, res) => {
  res.json({ message: "API endpoint" });
});

export default router;
