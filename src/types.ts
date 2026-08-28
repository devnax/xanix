import "express";

declare global {
  namespace Express {
    interface Request {
      document: {
        setTitle(title: string): void;
        setMeta(name: string, content: string): void;
      };
    }
  }
}

export {};

// export type XanixDocumentData = {
//   pageId: string;
//   props: Record<string, any>;
//   title: string;
//   meta: Array<{ name: string; content: string }>;
// };
