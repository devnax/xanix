export type CachedModule = {
  module: string;
  name: string;
  resolved: string;
  exports: string[];
  default: boolean;
};

export type CachedMap = Map<string, CachedModule>;
