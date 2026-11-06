import { describe, expect, it } from "vitest";
import { prepareState, selectAccount } from "../src/domain/policy.ts";
import type { RouterConfig } from "../src/domain/types.ts";
import { emptyState } from "../src/domain/types.ts";
import { poolConfig } from "./helpers.ts";

describe("L1 EWMA latency selection", () => {
  function makeState(config: RouterConfig) {
    const state = emptyState();
    prepareState(state, config, 100000, () => true);
    return state;
  }

  it("selects lower-EWMA account when pressures are equal", () => {
    const config = poolConfig(2);
    const state = makeState(config);
    state.latEWMA = { "account-0": 200, "account-1": 800 };
    const result = selectAccount(state, config, new Set(["account-0", "account-1"]), 100000);
    expect(result.accountId).toBe("account-0");
  });

  it("prefers lower-pressure account over lower latency", () => {
    const config = poolConfig(2);
    const state = makeState(config);
    state.latEWMA = { "account-0": 100, "account-1": 900 };
    // Add a lease to account-0 to increase its pressure
    state.leases.push({
      id: "lease-1",
      accountId: "account-0",
      groupId: "group-0",
      owner: "owner",
      pid: 1,
      startedAt: 99000,
    });
    const result = selectAccount(state, config, new Set(["account-0", "account-1"]), 100000);
    // account-1 has 0 pressure, account-0 has pressure > 0
    expect(result.accountId).toBe("account-1");
  });

  it("falls back to cursor when both pressure and latency are zero", () => {
    const config = poolConfig(2);
    const state = makeState(config);
    state.lastAccountId = "account-0";
    const result = selectAccount(state, config, new Set(["account-0", "account-1"]), 100000);
    expect(result.accountId).toBe("account-1");
  });

  it("handles fresh accounts (EWMA=0) correctly", () => {
    const config = poolConfig(2);
    const state = makeState(config);
    const result = selectAccount(state, config, new Set(["account-0", "account-1"]), 100000);
    expect(result.accountId).toBeDefined();
  });

  it("ignores disabled accounts", () => {
    const config = poolConfig(2);
    const state = makeState(config);
    state.disabledAccountIds = ["account-0"];
    state.latEWMA = { "account-0": 100, "account-1": 900 };
    const result = selectAccount(state, config, new Set(["account-0", "account-1"]), 100000);
    expect(result.accountId).toBe("account-1");
  });

  it("EWMA does not override quota pressure", () => {
    const config = poolConfig(2);
    const state = makeState(config);
    state.latEWMA = { "account-0": 50, "account-1": 5000 };
    // Account-0 is at full pressure (maxConcurrent=1, 1 lease)
    state.leases.push({
      id: "lease-1",
      accountId: "account-0",
      groupId: "group-0",
      owner: "owner",
      pid: 1,
      startedAt: 99000,
    });
    const result = selectAccount(state, config, new Set(["account-0", "account-1"]), 100000);
    // account-1 should win despite higher EWMA because it has lower pressure
    expect(result.accountId).toBe("account-1");
  });
});
