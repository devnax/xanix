declare global {
  namespace Express {
    interface Request {
      session: {
        [name: string]: any;
      };
    }
  }
}

export {};
