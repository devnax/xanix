import { Router } from "express";
import { register } from "../../hooks/server/index.js";
const router = Router();

router.post("/actions/:id", async (req, res) => {
  const { id } = req.params;
  const action = register.get(id);
  if (action) {
    const data = await action(req.body);
    res.json({ status: "Action received", data });
  } else {
    res.status(404).json({ status: "Action not found", id });
  }
});

export default router;
