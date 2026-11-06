import { randomUUID } from "node:crypto";
import {
  nextQuotaChange,
  prepareState,
  retryAfterMs,
  selectAccount,
  waitForGroup,
  windowPressure,
} from "../domain/policy.ts";
import { checkAbort, type Lease, type RouterConfig, RouterError } from "../domain/types.ts";
import type { Clock, StateStore } from "../ports.ts";

function capacityUnavailable() {
  return new RouterError(
    "capacity",
    "Account router capacity unavailable within maxWaitMs. Respect cooldowns or increase queue duration.",
  );
}

export class AccountRouter {
  readonly owner = randomUUID();

  constructor(
    readonly config: RouterConfig,
    private readonly store: StateStore,
    private readonly clock: Clock,
    private readonly pid = process.pid,
  ) {}

  async acquire(available: ReadonlySet<string>, signal?: AbortSignal): Promise<Lease> {
    const deadline =
      this.config.maxWaitMs === null
        ? Number.POSITIVE_INFINITY
        : this.clock.now() + this.config.maxWaitMs;
    const ticketId = randomUUID();
    let queued = false;
    try {
      for (;;) {
        checkAbort(signal);
        queued = true;
        const result = await this.store.transaction((state) => {
          checkAbort(signal);
          const now = this.clock.now();
          if (this.config.maxWaitMs !== null && this.config.maxWaitMs > 0 && now > deadline)
            throw capacityUnavailable();
          prepareState(state, this.config, now, (pid) => this.clock.isProcessAlive(pid));
          const groupIds = [
            ...new Set(
              this.config.accounts
                .filter(
                  (a) =>
                    a.enabled && available.has(a.id) && !state.disabledAccountIds.includes(a.id),
                )
                .map((a) => a.quotaGroup),
            ),
          ];
          if (groupIds.length === 0) return { waitMs: Number.POSITIVE_INFINITY };
          let ticket = state.waiters.find((entry) => entry.id === ticketId);
          if (!ticket) {
            ticket = { id: ticketId, owner: this.owner, pid: this.pid, groupIds };
            state.waiters.push(ticket);
          } else ticket.groupIds = groupIds;
          const position = state.waiters.findIndex((entry) => entry.id === ticketId);
          const blocked = new Set(
            state.waiters.slice(0, position).flatMap((entry) => entry.groupIds),
          );
          const selected = selectAccount(state, this.config, available, now, blocked);
          if (!selected.accountId) return selected;
          const account = this.config.accounts.find((a) => a.id === selected.accountId);
          const group = state.groups.find((g) => g.id === account?.quotaGroup);
          if (!account || !group) throw new RouterError("state", "Invalid account reservation.");
          const lease: Lease = {
            id: randomUUID(),
            accountId: account.id,
            groupId: group.id,
            owner: this.owner,
            pid: this.pid,
            startedAt: now,
          };
          group.starts.push(now);
          group.starts.sort((a, b) => a - b);
          state.leases.push(lease);
          state.waiters = state.waiters.filter((entry) => entry.id !== ticketId);
          state.lastAccountId = account.id;
          return { lease, waitMs: 0 };
        }, signal);
        if ("lease" in result) {
          queued = false;
          return result.lease;
        }
        if (!Number.isFinite(result.waitMs))
          throw new RouterError(
            "credentials",
            "No eligible account credentials. Check references or use /router-enable for a disabled account.",
          );
        const remaining = deadline - this.clock.now();
        if (remaining <= 0) throw capacityUnavailable();
        await this.clock.sleep(Math.min(Math.max(1, result.waitMs), remaining, 250), signal);
      }
    } finally {
      if (queued)
        await this.store.transaction((state) => {
          state.waiters = state.waiters.filter(
            (entry) => entry.id !== ticketId || entry.owner !== this.owner,
          );
        });
    }
  }

  async release(lease: Lease): Promise<void> {
    await this.store.transaction((state) => {
      state.leases = state.leases.filter((l) => l.id !== lease.id || l.owner !== this.owner);
    });
  }

  async feedback(lease: Lease, status: number, retryAfter: string | null): Promise<void> {
    await this.store.transaction((state) => {
      const group = state.groups.find((g) => g.id === lease.groupId);
      if (!group) throw new RouterError("state", "Missing quota feedback group.");
      if (status === 401 || status === 403) {
        if (!state.disabledAccountIds.includes(lease.accountId))
          state.disabledAccountIds.push(lease.accountId);
      } else if (status === 0) {
        // Transient stream failure (network drop / early stream error): cool the group
        // so the next acquire rotates or waits instead of hammering the same group.
        const now = this.clock.now();
        group.cooldownUntil = Math.max(group.cooldownUntil, now + this.config.transientCooldownMs);
      } else if (status === 429 || status >= 500) {
        const now = this.clock.now();
        const fallback =
          status === 429 ? this.config.rateLimitCooldownMs : this.config.transientCooldownMs;
        group.cooldownUntil = Math.max(
          group.cooldownUntil,
          now + (retryAfterMs(retryAfter, now) ?? fallback),
        );
      }
    });
  }

  async enable(accountId: string): Promise<void> {
    if (!this.config.accounts.some((a) => a.id === accountId))
      throw new RouterError("config", "Unknown configured account ID.");
    await this.store.transaction((state) => {
      state.disabledAccountIds = state.disabledAccountIds.filter((id) => id !== accountId);
    });
  }

  /** Record observed latency for an account using EWMA. */
  async recordLatency(accountId: string, latencyMs: number): Promise<void> {
    await this.store.transaction((state) => {
      const alpha = this.config.latencyEWMAAlpha;
      const current = state.latEWMA[accountId] ?? 0;
      state.latEWMA[accountId] =
        current === 0 ? latencyMs : alpha * latencyMs + (1 - alpha) * current;
    });
  }

  async shutdown(): Promise<void> {
    await this.store.transaction((state) => {
      state.leases = state.leases.filter((lease) => lease.owner !== this.owner);
      state.waiters = state.waiters.filter((ticket) => ticket.owner !== this.owner);
    });
  }

  async status(available: ReadonlySet<string>) {
    return this.store.transaction((state) => {
      const now = this.clock.now();
      prepareState(state, this.config, now, (pid) => this.clock.isProcessAlive(pid));
      // The account this runtime is using right now, otherwise the one the scheduler would pick next.
      const ownLease = state.leases.find((lease) => lease.owner === this.owner);
      const shownId =
        ownLease?.accountId ?? selectAccount(state, this.config, available, now).accountId;
      const shownGroup = state.groups.find(
        (g) => g.id === this.config.accounts.find((a) => a.id === shownId)?.quotaGroup,
      );
      const changeAt = nextQuotaChange(state.groups, now);
      return {
        active:
          shownId === undefined
            ? undefined
            : {
                accountId: shownId,
                inFlight: ownLease !== undefined,
                usage: shownGroup ? windowPressure(shownGroup, now) : 0,
              },
        nextChangeInMs: changeAt === undefined ? undefined : changeAt - now,
        waiting: state.waiters.length,
        ownWaiting: state.waiters.filter((ticket) => ticket.owner === this.owner).length,
        accounts: this.config.accounts.map((account) => ({
          id: account.id,
          quotaGroup: account.quotaGroup,
          ready:
            account.enabled &&
            available.has(account.id) &&
            !state.disabledAccountIds.includes(account.id),
          disabled: state.disabledAccountIds.includes(account.id),
          inFlight: state.leases.filter((lease) => lease.accountId === account.id).length,
        })),
        groups: this.config.quotaGroups.map((policy) => {
          // A fresh state may not have recorded a group yet: report a clean, full-window view.
          const group =
            state.groups.find((g) => g.id === policy.id) ??
            ({
              id: policy.id,
              policy,
              starts: [],
              cooldownUntil: 0,
            } as (typeof state.groups)[number]);
          return {
            id: group.id,
            waitMs: waitForGroup(group, state.leases, now),
            cooldownMs: Math.max(0, group.cooldownUntil - now),
            inFlight: state.leases.filter((lease) => lease.groupId === group.id).length,
            maxConcurrent: policy.maxConcurrent,
            windows: policy.limits.map((limit) => ({
              ...limit,
              remaining: Math.max(
                0,
                limit.requests -
                  group.starts.filter((start) => start > now - limit.windowMs).length,
              ),
            })),
          };
        }),
      };
    });
  }
}
