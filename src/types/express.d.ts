import "express-serve-static-core";

declare module "express-serve-static-core" {
  interface Request {
    page: {
      setTitle(title: string): void;
      setMeta(name: string, content: string): void;
    };
  }
}

export {};
