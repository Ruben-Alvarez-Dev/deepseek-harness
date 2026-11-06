# Design

- **Selection**: `selectAccount` scores dispatch-ready accounts by `groupPressure` (max of window utilisation and lease/concurrency utilisation) and picks the minimum; scanning starts after the rotation cursor so ties keep fair round-robin. When nothing is ready it still returns the smallest wait. Agnes exposes no rate-limit headers (only `x-litellm-response-cost-tool-usage`), so client-side balancing over shared state is the only available signal.
- **Observed display value**: the label colour uses window usage only (not the transient in-flight lease), so a running request does not turn the label red.
- **Reactivity**: `StateStore.onChange` (fires only after a commit that rewrote the file) covers own mutations; a non-persistent directory watcher covers sibling processes, debounced; `status()` returns `nextChangeInMs` (cooldown end or window slot freeing) for one re-armed `setTimeout`. Identical renders are suppressed; overlapping refreshes coalesce.
- **No feedback loop**: `FileStateStore.transaction` skips the write when the serialized state is unchanged.
- **Width**: visible label capped at 24 columns; the model name is shortened before anomaly glyphs are dropped.
