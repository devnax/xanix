import type { Request, Response, NextFunction } from "express";
const middleware = (req: Request, res: Response, next: NextFunction) => {
  console.log(`Request URL: ${req.url}`);
  next();
};

export default middleware;
