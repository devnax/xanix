import { Request, Response } from "express";

const middleware = (req: Request, res: Response, next: () => void) => {
  // Your middleware logic here
  console.log("from root");

  next();
};

export default middleware;
