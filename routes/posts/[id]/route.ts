import { Router } from "express";

export const router: any = Router();

export const getCategory = router.get("/category", (req, res) => {
  res.send("Category page");
});

export const createPost = router.post("/", (req, res) => {
  res.send("Create Post");
});

export const get = (req, res) => {
  res.send(`Post ID: ${req.params.id}`);
};

export const use = (req, res) => {
  res.send(`Updating Post ID: ${req.params.id}`);
};

const data = await getCategory();
