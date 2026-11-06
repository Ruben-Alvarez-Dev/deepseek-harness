import {
  type GroupState,
  type Lease,
  type RouterConfig,
  RouterError,
  type RouterState,
} from "./types.ts";

export function prepareState(
  state: RouterState,
  config: RouterConfig,
  now: number,
  alive: (pid: number) => boolean,
): void {
  state.leases = state.leases.filter((lease) => alive(lease.pid));
  state.waiters = state.waiters.filter((ticket) => alive(ticket.pid));
  for (const group of state.groups) {
    const horizon = Math.max(...group.policy.limits.map((limit) => limit.windowMs));
    group.starts = group.starts.filter((start) => start > now - horizon);
  }
  for (const policy of config.quotaGroups) {
    let group = state.groups.find((g) => g.id === policy.id);
    if (!group) {
      group = { id: policy.id, policy: structuredClone(policy), starts: [], cooldownUntil: 0 };
      state.groups.push(group);
    }
    if (JSON.stringify(group.policy) !== JSON.stringify(policy)) {
      if (
        group.starts.length ||
        group.cooldownUntil > now ||
        state.leases.some((l) => l.groupId === group.id)
      ) {
        throw new RouterError(
          "state",
          "Conflicting quota policies with retained usage. Keep shared group policies consistent.",
        );
      }
      group.policy = structuredClone(policy);
    }
  }
}

export function waitForGroup(group: GroupState, leases: Lease[], now: number): number {
  let wait = Math.max(0, group.cooldownUntil - now);
  if (leases.filter((lease) => lease.groupId === group.id).length >= group.policy.maxConcurrent) {
    wait = Math.max(wait, 250);
  }
  for (const limit of group.policy.limits) {
    const starts = group.starts.filter((start) => start > now - limit.windowMs);
    if (starts.length >= limit.requests) {
      const blockingStart = starts[starts.length - limit.requests];
      if (blockingStart !== undefined) wait = Math.max(wait, blockingStart + limit.windowMs - now);
    }
  }
  return wait;
}

/**
 * Pool saturation in [0,1] at `now`: worst limit utilisation plus in-flight leases vs
 * concurrency. 0 means the pool can dispatch right now; 1 means every new request queues.
 */
export function groupPressure(group: GroupState, leases: Lease[], now: number): number {
  let pressure = 0;
  const activeLeases = leases.filter((lease) => lease.groupId === group.id).length;
  pressure = Math.max(pressure, activeLeases / group.policy.maxConcurrent);
  for (const limit of group.policy.limits) {
    if (limit.requests <= 0) continue;
    const used = group.starts.filter((start) => start > now - limit.windowMs).length;
    pressure = Math.max(pressure, used / limit.requests);
  }
  return Math.min(1, pressure);
}

/** Rolling-window utilisation only (ignores in-flight concurrency): "how much of the RPM is used". */
export function windowPressure(group: GroupState, now: number): number {
  let pressure = 0;
  for (const limit of group.policy.limits) {
    if (limit.requests <= 0) continue;
    const used = group.starts.filter((start) => start > now - limit.windowMs).length;
    pressure = Math.max(pressure, used / limit.requests);
  }
  return Math.min(1, pressure);
}

/** Earliest future instant at which a cooldown ends or a window slot frees up, if any. */
export function nextQuotaChange(groups: readonly GroupState[], now: number): number | undefined {
  let next: number | undefined;
  for (const group of groups) {
    const candidates: number[] = [];
    if (group.cooldownUntil > now) candidates.push(group.cooldownUntil);
    for (const limit of group.policy.limits) {
      let oldest: number | undefined;
      for (const start of group.starts)
        if (start > now - limit.windowMs && (oldest === undefined || start < oldest))
          oldest = start;
      if (oldest !== undefined) candidates.push(oldest + limit.windowMs);
    }
    for (const at of candidates) if (at > now && (next === undefined || at < next)) next = at;
  }
  return next;
}

export function selectAccount(
  state: RouterState,
  config: RouterConfig,
  available: ReadonlySet<string>,
  now: number,
  blockedGroups: ReadonlySet<string> = new Set(),
): { accountId?: string; waitMs: number; pressure?: number } {
  // Dispatch to the least-pressured eligible pool; this is a policy, not a measured SOTA claim.
  // Ties fall back to the rotation cursor so identical pools still rotate fairly.
  // More heavily used pools are left behind while another eligible pool has more headroom.
  // L1: EWMA latency is used as a tiebreaker when pressures are equal.
  const cursor = config.accounts.findIndex((account) => account.id === state.lastAccountId);
  let minimum = Number.POSITIVE_INFINITY;
  let best:
    | { account: (typeof config.accounts)[number]; pressure: number; latEWMA: number }
    | undefined;
  let sawPending = false;
  for (let offset = 1; offset <= config.accounts.length; offset++) {
    const account = config.accounts[(cursor + offset) % config.accounts.length];
    if (
      !account?.enabled ||
      !available.has(account.id) ||
      state.disabledAccountIds.includes(account.id)
    )
      continue;
    const group = state.groups.find((g) => g.id === account.quotaGroup);
    if (!group) throw new RouterError("state", "Missing quota group state.");
    const waitMs = blockedGroups.has(group.id)
      ? Math.max(250, waitForGroup(group, state.leases, now))
      : waitForGroup(group, state.leases, now);
    if (waitMs === 0) {
      const pressure = groupPressure(group, state.leases, now);
      const latEWMA = state.latEWMA[account.id] ?? 0;
      // Select by lowest pressure; if tied, prefer lower EWMA latency.
      const isNewBest =
        best === undefined ||
        pressure < best.pressure ||
        (pressure === best.pressure && latEWMA < best.latEWMA);
      if (isNewBest) best = { account, pressure, latEWMA };
      continue;
    }
    sawPending = true;
    minimum = Math.min(minimum, waitMs);
  }
  if (best !== undefined) return { accountId: best.account.id, waitMs: 0, pressure: best.pressure };
  if (sawPending) return { waitMs: minimum };
  return { waitMs: Number.POSITIVE_INFINITY };
}

export function retryAfterMs(header: string | null, now: number): number | undefined {
  if (!header) return undefined;
  const value = header.trim();
  if (/^\d+(\.\d+)?$/.test(value)) {
    const ms = Math.ceil(Number(value) * 1000);
    return Number.isSafeInteger(ms) && Number.isSafeInteger(now + ms) ? ms : undefined;
  }
  // Date.parse accepts bare numbers and other non-HTTP formats; require an HTTP-date shape.
  if (!/^[A-Za-z]{3}, \d{2} [A-Za-z]{3} \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(value)) return undefined;
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - now) : undefined;
}
