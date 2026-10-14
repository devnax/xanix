import { watch, type RolldownWatcher, type WatchOptions } from "rolldown";

export type ChangeKind = "create" | "update" | "delete";

export interface GroupChange {
  /** absolute file path */
  id: string;
  event: ChangeKind;
  /** names of watchers that reported this file (1 = single, 2+ = shared) */
  watchers: string[];
  /** true when more than one watcher reported the same file */
  shared: boolean;
}

export interface WatchGroupOptions {
  /** called once per unique file, after ALL watchers finished building */
  onChange: (change: GroupChange) => void | Promise<void>;
  /** optional: called once with every deduped change */
  onBatch?: (changes: GroupChange[]) => void | Promise<void>;
  /** optional: forward rolldown's event stream, tagged with watcher name */
  onEvent?: (name: string, event: any) => void;
}

export interface WatchGroup {
  watchers: Record<string, RolldownWatcher>;
  close: () => Promise<void>;
}

export function watchGroup(
  configs: Record<string, WatchOptions>,
  { onChange, onBatch, onEvent }: WatchGroupOptions,
): WatchGroup {
  const pending = new Map<
    string,
    { event: ChangeKind; sources: Set<string> }
  >();
  const busy = new Set<string>(); // watchers currently building
  let flushing = false;

  const flush = async () => {
    if (flushing) return;
    flushing = true;
    try {
      // loop: changes may arrive while handlers run
      while (pending.size && !busy.size) {
        const batch: GroupChange[] = [...pending].map(
          ([id, { event, sources }]) => ({
            id,
            event,
            watchers: [...sources],
            shared: sources.size > 1,
          }),
        );
        pending.clear();

        for (const change of batch) {
          try {
            await onChange(change);
          } catch (e) {
            console.error(`[watchGroup] onChange failed for ${change.id}`, e);
          }
        }
        if (onBatch) {
          try {
            await onBatch(batch);
          } catch (e) {
            console.error("[watchGroup] onBatch failed", e);
          }
        }
      }
    } finally {
      flushing = false;
    }
  };

  const record = (name: string, id: string, event: ChangeKind) => {
    const entry = pending.get(id);
    if (entry) {
      entry.sources.add(name);
      entry.event = event; // latest event wins
    } else {
      pending.set(id, { event, sources: new Set([name]) });
    }
  };

  const watchers: Record<string, RolldownWatcher> = {};

  for (const [name, options] of Object.entries(configs)) {
    const w = watch(options);
    w.on("change", (id, { event }) => record(name, id, event as ChangeKind));
    w.on("event", (e: any) => {
      if (e.code === "START" || e.code === "BUNDLE_START") {
        busy.add(name);
      } else if (e.code === "END" || e.code === "ERROR") {
        busy.delete(name);
        flush(); // runs only when no watcher is building
        if (e.code === "ERROR") {
          console.error(`[watchGroup] watcher ${name} encountered an error`, e);
        }
      }
      onEvent?.(name, e);
    });
    watchers[name] = w;
  }

  return {
    watchers,
    close: async () => {
      pending.clear();
      busy.clear();
      await Promise.all(Object.values(watchers).map((w) => w.close()));
    },
  };
}
