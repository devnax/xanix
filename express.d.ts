import "express";

declare global {
  namespace Express {
    interface Request {
      page: {
        setTitle(title: string): void;
        setMeta(name: string, content: string): void;
      };
    }
  }
}
