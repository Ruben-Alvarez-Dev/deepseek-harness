import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import lockfile from "proper-lockfile";
import { parseConfig } from "../config.ts";
import {
  checkAbort,
  emptyState,
  type RouterConfig,
  RouterError,
  type RouterState,
} from "../domain/types.ts";
import type { Clock, StateStore } from "../ports.ts";
import { systemClock } from "./system-clock.ts";

const ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/;
const safeId = (value: unknown): value is string => typeof value === "string" && ID.test(value);
const timestamp = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exact = (value: Record<string, unknown>, keys: string[]) =>
  Object.keys(value).sort().join(",") === keys.sort().join(",");

function corrupt(): never {
  throw new RouterError(
    "state",
    "Account router state is corrupt; refusing to reset quota history.",
  );
}

export function decodeState(contents: string): RouterState {
  let value: unknown;
  try {
    value = JSON.parse(contents);
  } catch {
    corrupt();
  }
  if (!record(value) || (value.version !== 1 && value.version !== 2 && value.version !== 3))
    corrupt();
  let v = value as Record<string, unknown>;
  const keys = ["version", "lastAccountId", "groups", "disabledAccountIds", "leases"];
  if (v.version === 1) v = { ...v, version: 2, waiters: [] };
  if (v.version === 2) {
    // L1 (2026-10-12) added startedAt to leases for EWMA latency tracking. Leases written
    // before that change carried only five keys; without migration every pre-L1 state file
    // fails closed as corrupt and the router becomes unusable. A migrated lease belongs to a
    // process that is almost certainly gone (prepareState purges dead pids), so 0 is safe:
    // it is only ever read for latency measurement of a live request, never for one migrated.
    const leases = Array.isArray(v.leases) ? (v.leases as unknown[]) : [];
    v = {
      ...v,
      version: 3,
      latEWMA: {},
      leases: leases.map((lease) =>
        record(lease) && !Object.hasOwn(lease, "startedAt") ? { ...lease, startedAt: 0 } : lease,
      ),
    };
  }
  if (!exact(v, [...keys, "waiters", "latEWMA"])) corrupt();
  value = v;
  if (
    !record(value) ||
    !(value.lastAccountId === null || safeId(value.lastAccountId)) ||
    !Array.isArray(value.groups) ||
    !Array.isArray(value.leases) ||
    !Array.isArray(value.waiters) ||
    value.waiters.length > 10000 ||
    !Array.isArray(value.disabledAccountIds)
  )
    corrupt();
  const ids = new Set<string>();
  for (const group of value.groups) {
    if (
      !record(group) ||
      !exact(group, ["id", "policy", "starts", "cooldownUntil"]) ||
      !safeId(group.id) ||
      ids.has(group.id) ||
      !timestamp(group.cooldownUntil) ||
      !Array.isArray(group.starts) ||
      !group.starts.every(timestamp) ||
      !record(group.policy) ||
      group.policy.id !== group.id
    )
      corrupt();
    ids.add(group.id);
    const starts = group.starts;
    if (starts.some((start, index) => index > 0 && start < (starts[index - 1] ?? 0))) corrupt();
    try {
      parseConfig({
        version: 1,
        accounts: [{ id: "check", quotaGroup: group.id, credential: { env: "CHECK" } }],
        quotaGroups: [group.policy],
      });
    } catch {
      corrupt();
    }
  }
  const leases = new Set<string>();
  for (const lease of value.leases) {
    if (
      !record(lease) ||
      !exact(lease, ["id", "accountId", "groupId", "owner", "pid", "startedAt"]) ||
      !safeId(lease.id) ||
      leases.has(lease.id) ||
      !safeId(lease.accountId) ||
      !safeId(lease.groupId) ||
      !safeId(lease.owner) ||
      !timestamp(lease.pid) ||
      lease.pid === 0 ||
      !ids.has(lease.groupId)
    )
      corrupt();
    leases.add(lease.id);
  }
  const tickets = new Set<string>();
  for (const ticket of value.waiters) {
    if (
      !record(ticket) ||
      !exact(ticket, ["id", "owner", "pid", "groupIds"]) ||
      !safeId(ticket.id) ||
      tickets.has(ticket.id) ||
      !safeId(ticket.owner) ||
      !timestamp(ticket.pid) ||
      ticket.pid === 0 ||
      !Array.isArray(ticket.groupIds) ||
      ticket.groupIds.length === 0 ||
      ticket.groupIds.length > 100 ||
      !ticket.groupIds.every((id) => safeId(id) && ids.has(id)) ||
      new Set(ticket.groupIds).size !== ticket.groupIds.length
    )
      corrupt();
    tickets.add(ticket.id);
  }
  if (
    !value.disabledAccountIds.every(safeId) ||
    new Set(value.disabledAccountIds).size !== value.disabledAccountIds.length
  )
    corrupt();
  return value as unknown as RouterState;
}

export function statePath(agentDir: string, config: RouterConfig): string {
  const namespace = createHash("sha256").update(config.provider.baseUrl).digest("hex").slice(0, 24);
  return join(agentDir, "account-router-state", `${namespace}.json`);
}

/** Local-filesystem transactions. Never hold a lock while streaming or waiting for quota. */
export class FileStateStore implements StateStore {
  private readonly changeListeners = new Set<() => void>();
  constructor(
    readonly path: string,
    private readonly clock: Clock = systemClock,
  ) {}
  /** Fires after every commit that actually rewrote the file; read-only transactions stay silent. */
  onChange(callback: () => void): () => void {
    this.changeListeners.add(callback);
    return () => this.changeListeners.delete(callback);
  }
  private notifyChange(): void {
    for (const callback of [...this.changeListeners]) callback();
  }

  private async lock(
    signal?: AbortSignal,
  ): Promise<{ release: () => Promise<void>; healthy: () => boolean }> {
    const deadline = this.clock.now() + 10000;
    for (;;) {
      checkAbort(signal);
      let compromised = false;
      try {
        const release = await lockfile.lock(this.path, {
          realpath: false,
          stale: 10000,
          update: 2000,
          retries: 0,
          onCompromised: () => {
            compromised = true;
          },
        });
        return { release, healthy: () => !compromised };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ELOCKED" || this.clock.now() >= deadline) {
          throw new RouterError("state", "Cannot acquire account router state lock.");
        }
        await this.clock.sleep(25, signal);
      }
    }
  }

  async transaction<T>(change: (state: RouterState) => T, signal?: AbortSignal): Promise<T> {
    checkAbort(signal);
    try {
      await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
    } catch {
      throw new RouterError("state", "Cannot create account router state directory.");
    }
    const lock = await this.lock(signal);
    let temporary: string | undefined;
    let result: { value: T } | undefined;
    let failure: RouterError | undefined;
    try {
      checkAbort(signal);
      let originalText: string | undefined;
      let state: RouterState;
      try {
        originalText = await readFile(this.path, "utf8");
        state = decodeState(originalText);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") state = emptyState();
        else throw error;
      }
      result = { value: change(state) };
      // Validate before writing as well; a broken caller cannot poison future quota decisions.
      const serialized = JSON.stringify(state);
      decodeState(serialized);
      // Read-only transactions (e.g. footer/status passes) must not rewrite the file: otherwise
      // sibling processes watching the file would refresh each other in an endless loop.
      if (serialized !== originalText) {
        if (!lock.healthy())
          throw new RouterError("state", "Account router state lock was compromised.");
        temporary = `${this.path}.${randomUUID()}.tmp`;
        const file = await open(temporary, "wx", 0o600);
        try {
          await file.writeFile(serialized);
          await file.sync();
        } finally {
          await file.close();
        }
        if (!lock.healthy())
          throw new RouterError("state", "Account router state lock was compromised.");
        await rename(temporary, this.path);
        temporary = undefined;
        if (process.platform !== "win32") {
          const directory = await open(dirname(this.path), "r");
          try {
            await directory.sync();
          } finally {
            await directory.close();
          }
        }
        this.notifyChange();
      }
    } catch (error) {
      failure =
        error instanceof RouterError
          ? error
          : new RouterError("state", "Account router state transaction failed.");
    } finally {
      if (temporary) await unlink(temporary).catch(() => undefined);
      try {
        await lock.release();
      } catch {
        // Preserve the primary failure, but never report success when unlock fails.
        failure ??= new RouterError("state", "Account router state lock release failed.");
      }
    }
    if (failure) throw failure;
    if (!result) throw new RouterError("state", "Account router state transaction failed.");
    return result.value;
  }
}
