import { XanixClientEntry } from "../../types";

export type WatcherOptions = {
  rootEntry: string;
  onChange?: (files: string[], duration: number) => Promise<void>;
  onBuildEnd?: (duration: number) => void;
  onClientEntryChange: (
    id: string,
    entries: XanixClientEntry[],
  ) => Promise<void>;
  onReady?: (entries: XanixClientEntry[]) => Promise<void>;
};
