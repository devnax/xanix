import "express";

declare global {
  namespace Express {
    interface Request {
      page: {
        setTitle(title: string): void;
        setMeta(name: string, content: string): void;
        setStyle(href: string): void;
        setScript(
          src: string,
          type?: string,
          placement?: "head" | "body",
        ): void;
      };
    }
  }
}

export {};
