# Least-pressure scheduling and an event-driven footer label

## Why

The user observed two gaps. Rotation was blind round-robin: every key gets the same share even when sibling Pi processes (or a past burst) already loaded one pool, so one key can approach its limit while others have headroom. And the footer was both noisy and polled on a timer, instead of reflecting real state changes, using more space than the model label it describes.

## What Changes

- Dispatch each inference to the **least-pressured eligible pool** (rolling-window usage and concurrency), falling back to the rotation cursor on ties so identical pools still rotate fairly. Nothing is exhausted while another pool has headroom.
- Replace the status text with a single compact label next to the model: `#<account in use>/<total> <model>`, coloured by a continuous green-to-red ramp from the pool's RPM usage, with anomaly glyphs (queued, cooldown, auth-disabled) only when present and a hard width cap.
- Drive the label only from real events: own state commits, sibling-process writes to the shared state file, model/session events and a single one-shot timer at the next instant a value changes by itself. No periodic polling.
- Read-only state transactions no longer rewrite the file, so observers never retrigger each other.

## Impact

Pi's own model indicator is rendered by the host and cannot be recoloured by an extension; the label lives in the extension status row that already exists, so the footer height is unchanged and its width is capped below the previous text.
