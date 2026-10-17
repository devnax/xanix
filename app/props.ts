import type { Request, Response } from "express";

export const metadata = {
  title: "Server Rendered Page s",
  description: "This page is rendered on the server",
};

export const props = async (req: Request, res: Response) => {
  return {
    message: "Hello from the server",
  };
};
