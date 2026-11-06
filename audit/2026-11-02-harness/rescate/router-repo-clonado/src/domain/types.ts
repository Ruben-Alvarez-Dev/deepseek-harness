export interface WindowLimit {
  requests: number;
  windowMs: number;
}

export interface QuotaGroup {
  id: string;
  maxConcurrent: number;
  limits: WindowLimit[];
}

export type CredentialReference = { env: string } | { piProvider: string };

export interface Account {
  id: string;
  quotaGroup: string;
  credential: CredentialReference;
  enabled: boolean;
  /** Optional reference to a versioned provider contract ("provider/contract-vN"). */
  providerContract?: string;
}

export interface ModelSpec {
  id: string;
  name: string;
  reasoning: boolean;
  input: ("text" | "image")[];
  contextWindow: number;
  maxTokens: number;
}

export interface RouterConfig {
  version: 1;
  provider: {
    adapter: "agnes" | "openai-compatible";
    baseUrl: string;
    models: ModelSpec[];
  };
  accounts: Account[];
  quotaGroups: QuotaGroup[];
  maxWaitMs: number | null;
  rateLimitRecovery: "wait" | "error";
  requestTimeoutMs: number;
  rateLimitCooldownMs: number;
  transientCooldownMs: number;
  maxTransientRetries: number;
  /** Enable selective adversarial shadow (L3): 1 regeneration on a different account on transient failure. */
  shadowEnabled: boolean;
  /** EWMA decay factor for latency-aware selection (0-1, higher = more weight to recent). */
  latencyEWMAAlpha: number;
  /** Latency threshold (ms) above which an account is considered slow. */
  latencyThresholdMs: number;
}

export interface GroupState {
  id: string;
  policy: QuotaGroup;
  starts: number[];
  cooldownUntil: number;
}

export interface Lease {
  id: string;
  accountId: string;
  groupId: string;
  owner: string;
  pid: number;
  /** Epoch ms when the lease was acquired, for latency tracking. */
  startedAt: number;
}

export interface WaitingTicket {
  id: string;
  owner: string;
  pid: number;
  groupIds: string[];
}

export interface RouterState {
  version: 3;
  lastAccountId: string | null;
  groups: GroupState[];
  disabledAccountIds: string[];
  leases: Lease[];
  waiters: WaitingTicket[];
  /** EWMA latency per account (ms), keyed by accountId. */
  latEWMA: Record<string, number>;
}

export type RouterErrorCode =
  | "config"
  | "credentials"
  | "state"
  | "capacity"
  | "aborted"
  | "terminal_event"
  | "lock_acquire"
  | "lock_compromise";

export class RouterError extends Error {
  constructor(
    public readonly code: RouterErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "RouterError";
  }
}

export function checkAbort(signal?: AbortSignal): void {
  if (signal?.aborted) throw new RouterError("aborted", "Account router request aborted.");
}

export function emptyState(): RouterState {
  return {
    version: 3,
    lastAccountId: null,
    groups: [],
    disabledAccountIds: [],
    leases: [],
    waiters: [],
    latEWMA: {},
  };
}
