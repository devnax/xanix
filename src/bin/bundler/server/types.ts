export type WatcherOptions = {
  rootEntry: string;
  onChange: (files: string[], duration: number) => Promise<void>;
  onReady: (duration: number) => Promise<void>;
};
