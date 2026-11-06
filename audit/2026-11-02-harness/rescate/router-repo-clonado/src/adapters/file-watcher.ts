import { type FSWatcher, watch } from "node:fs";

export type Unwatch = () => void;

/**
 * Watches the directory that holds a state file so atomic tmp+rename rewrites still produce
 * events (file-level watches do not survive renames on Linux). Bursts are coalesced into one
 * debounced callback per watcher; the watcher is non-persistent so it never keeps Pi alive.
 */
export function watchDirectoryEvents(
  directory: string,
  onData: () => void,
  debounceMs = 120,
): Unwatch {
  let pending: ReturnType<typeof setTimeout> | undefined;
  let watcher: FSWatcher;
  try {
    watcher = watch(directory, { persistent: false }, () => {
      if (pending !== undefined) clearTimeout(pending);
      pending = setTimeout(() => {
        pending = undefined;
        onData();
      }, debounceMs);
      pending.unref?.();
    });
  } catch {
    return () => undefined;
  }
  watcher.on("error", () => undefined);
  return () => {
    if (pending !== undefined) clearTimeout(pending);
    watcher.close();
  };
}
