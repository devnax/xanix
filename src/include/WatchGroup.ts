import { resolve, sep } from "node:path";
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

export interface GroupEnd {
  /** deduped changes that led to this build cycle (empty on the initial build) */
  changes: GroupChange[];
  /** errors reported by watchers during this cycle */
  errors: { watcher: string; error: unknown }[];
  /** true for the first build cycle after the watch started */
  initial: boolean;
}

export interface WatchGroupOptions {
  /** called once, after ALL watchers finished their FIRST build; never again on changes */
  onReady?: (info: { watchers: string[] }) => void | Promise<void>;
  /** called once, the first time any watcher starts building */
  onStart?: (info: { watchers: string[] }) => void | Promise<void>;
  /** called once per unique file, after ALL watchers finished building */
  onChange?: (change: GroupChange) => void | Promise<void>;
  /** called once per cycle with every deduped change */
  onBatch?: (changes: GroupChange[]) => void | Promise<void>;
  /** called after ALL watchers finished building (every cycle, incl. the initial one) */
  onEnd?: (info: GroupEnd) => void | Promise<void>;
  /** forward rolldown's event stream, tagged with watcher name */
  onEvent?: (name: string, event: any) => void;
  /** log every change/event with its watcher name */
  debug?: boolean;
  /**
   * files inside any watcher's output dir (build results) are not reported as
   * changes, so a build can't trigger onChange for its own output. default true
   */
  ignoreOutputs?: boolean;
  /** extra filter: return true to ignore a changed file */
  ignore?: (id: string) => boolean;
}

export interface WatchGroup {
  watchers: Record<string, RolldownWatcher>;
  close: () => Promise<void>;
}

export function watchGroup(
  configs: Record<string, WatchOptions>,
  {
    onReady,
    onStart,
    onChange,
    onBatch,
    onEnd,
    onEvent,
    debug,
    ignoreOutputs = true,
    ignore,
  }: WatchGroupOptions,
): WatchGroup {
  // absolute output locations of every watcher
  const outPaths: string[] = [];
  for (const o of Object.values(configs)) {
    for (const out of ([] as any[]).concat((o as any).output ?? [])) {
      if (out?.dir) outPaths.push(resolve(out.dir));
      if (out?.file) outPaths.push(resolve(out.file));
    }
  }
  const isIgnored = (id: string) => {
    if (ignore?.(id)) return true;
    if (!ignoreOutputs) return false;
    const p = resolve(id);
    return outPaths.some((o) => p === o || p.startsWith(o + sep));
  };

  const pending = new Map<
    string,
    { event: ChangeKind; sources: Set<string> }
  >();
  const busy = new Set<string>(); // watchers currently building
  let errors: GroupEnd["errors"] = [];
  let started = false;
  let dirty = false; // a build happened since the last onEnd
  let initial = true;
  let settling = false;

  // Callbacks are fired, not awaited: a slow or never-resolving callback
  // (e.g. one that starts a long-running server) must not block the group.
  const safe = (label: string, fn?: () => unknown) => {
    const fail = (e: unknown) =>
      console.error(`[watchGroup] ${label} failed`, e);
    try {
      const r: any = fn?.();
      if (r && typeof r.then === "function") r.then(undefined, fail);
    } catch (e) {
      fail(e);
    }
  };

  const settle = async () => {
    if (settling) return;
    settling = true;
    try {
      // loop: changes may arrive while handlers run
      while (!busy.size && (pending.size || dirty)) {
        const changes: GroupChange[] = [...pending].map(
          ([id, { event, sources }]) => ({
            id,
            event,
            watchers: [...sources],
            shared: sources.size > 1,
          }),
        );
        pending.clear();

        for (const change of changes) {
          await safe(`onChange(${change.id})`, () => onChange?.(change));
        }
        if (changes.length) await safe("onBatch", () => onBatch?.(changes));

        if (dirty) {
          dirty = false;
          const info: GroupEnd = { changes, errors, initial };
          errors = [];
          const wasInitial = initial;
          initial = false;
          if (wasInitial) {
            await safe("onReady", () =>
              onReady?.({ watchers: Object.keys(configs) }),
            );
          }
          await safe("onEnd", () => onEnd?.(info));
        }
      }
    } finally {
      settling = false;
    }
  };

  const record = (name: string, id: string, event: ChangeKind) => {
    if (isIgnored(id)) {
      if (debug) console.log(`[watchGroup] ignored ${name} ${event} ${id}`);
      return;
    }
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
    // also listen through the plugin `watchChange` hook, which rolldown calls
    // for every watched file (entry or imported); records dedupe by file id
    const plugin = {
      name: `watch-group:${name}`,
      watchChange(id: string, { event }: { event: ChangeKind }) {
        if (debug)
          console.log(`[watchGroup] watchChange ${name} ${event} ${id}`);
        record(name, id, event);
      },
    };
    const w = watch({
      ...options,
      plugins: [options.plugins, plugin],
    } as WatchOptions);
    w.on("change", (id, { event }) => {
      if (debug) console.log(`[watchGroup] change ${name} ${event} ${id}`);
      record(name, id, event as ChangeKind);
    });
    w.on("event", (e: any) => {
      if (debug) console.log(`[watchGroup] event ${name} ${e.code}`);
      if (e.code === "START" || e.code === "BUNDLE_START") {
        busy.add(name);
        dirty = true;
        if (!started) {
          started = true;
          safe("onStart", () => onStart?.({ watchers: Object.keys(configs) }));
        }
      } else if (e.code === "END" || e.code === "ERROR") {
        busy.delete(name);
        if (e.code === "ERROR") {
          errors.push({ watcher: name, error: e.error });
          console.error(`[watchGroup] watcher ${name} encountered an error`, e);
        }
        settle(); // runs only when no watcher is building
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

// ---- usage ----
// const group = watchGroup(
//   {
//     client: { input: "src/client.ts", output: { dir: "dist/client" } },
//     server: { input: "src/server.ts", output: { dir: "dist/server" } },
//   },
//   {
//     onStart: () => console.log("watch started"),
//     onChange: ({ id, watchers, shared }) =>
//       console.log(shared ? "[both]" : `[${watchers[0]}]`, id),
//     onEnd: ({ changes, errors, initial }) =>
//       console.log(initial ? "initial build done" : `rebuilt (${changes.length} files)`, errors.length ? "with errors" : ""),
//   },
// );
