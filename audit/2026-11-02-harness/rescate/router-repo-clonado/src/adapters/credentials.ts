import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import {
  type Account,
  type CredentialReference,
  checkAbort,
  RouterError,
} from "../domain/types.ts";
import type { CredentialEnvironment, CredentialResolver } from "../ports.ts";

function credentialValue(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string")
    throw new RouterError("credentials", "Invalid account credential format.");
  if (!value.trim()) return undefined;
  if (/[\p{Cc}\p{Cf}]/u.test(value))
    throw new RouterError("credentials", "Invalid account credential format.");
  return value.trim();
}

/** Read-only Pi auth adapter: deliberately does not execute credential commands or refresh OAuth. */
export class PiCredentialResolver implements CredentialResolver {
  constructor(
    private readonly agentDir: string,
    private readonly environment: NodeJS.ProcessEnv = process.env,
  ) {}

  /** auth.json re-read + parse happens at most once per mtime, not once per request. */
  private authCache: { mtimeMs: number; parsed: unknown } | null = null;

  /** null when auth.json does not exist; a cached hit skips the read entirely. */
  private async statAuth(): Promise<{ mtimeMs: number; cached?: unknown } | null> {
    const s = await stat(join(this.agentDir, "auth.json"));
    const mtimeMs = s.mtimeMs;
    return this.authCache !== null && this.authCache.mtimeMs === mtimeMs
      ? { mtimeMs, cached: this.authCache.parsed }
      : { mtimeMs };
  }

  private async readAuthJson(signal?: AbortSignal): Promise<unknown> {
    let contents: string;
    let mtimeMs: number;
    try {
      const statInfo = await this.statAuth();
      if (statInfo === null) return undefined;
      mtimeMs = statInfo.mtimeMs;
      if (statInfo.cached !== undefined) return statInfo.cached;
      contents = await readFile(join(this.agentDir, "auth.json"), "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw new RouterError("credentials", "Cannot read Pi credential storage.");
    }
    checkAbort(signal);
    let parsed: unknown;
    try {
      parsed = JSON.parse(contents);
    } catch {
      throw new RouterError("credentials", "Invalid Pi credential storage JSON.");
    }
    this.authCache = { mtimeMs, parsed };
    return parsed;
  }

  async resolve(
    reference: CredentialReference,
    env?: CredentialEnvironment,
    signal?: AbortSignal,
  ): Promise<string | undefined> {
    checkAbort(signal);
    const getEnv = async (name: string) =>
      (typeof env === "function"
        ? await env(name)
        : env && Object.hasOwn(env, name)
          ? env[name]
          : undefined) ??
      (Object.hasOwn(this.environment, name) ? this.environment[name] : undefined);
    if ("env" in reference) return credentialValue(await getEnv(reference.env));
    const parsed = await this.readAuthJson(signal);
    checkAbort(signal);
    if (parsed === undefined) return undefined;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new RouterError("credentials", "Invalid Pi credential storage structure.");
    if (!Object.hasOwn(parsed, reference.piProvider)) return undefined;
    const credential = (parsed as Record<string, unknown>)[reference.piProvider];
    if (credential === undefined) return undefined;
    if (!credential || typeof credential !== "object" || Array.isArray(credential))
      throw new RouterError("credentials", "Invalid referenced Pi credential.");
    const c = credential as Record<string, unknown>;
    if (c.type !== "api_key")
      throw new RouterError(
        "credentials",
        "Only Pi API-key credentials are supported by this router; OAuth is unsupported.",
      );
    if (c.key === undefined) return undefined;
    if (typeof c.key !== "string")
      throw new RouterError("credentials", "Invalid referenced Pi API key.");
    if (c.key.startsWith("!"))
      throw new RouterError(
        "credentials",
        "Command-backed Pi credentials are unsupported; use an environment reference.",
      );
    if (c.key.startsWith("$")) {
      const match = /^\$(?:([A-Za-z_][A-Za-z0-9_]*)|\{([A-Za-z_][A-Za-z0-9_]*)\})$/.exec(c.key);
      const name = match?.[1] ?? match?.[2];
      if (!name) throw new RouterError("credentials", "Unsupported Pi credential interpolation.");
      return credentialValue(await getEnv(name));
    }
    return credentialValue(c.key);
  }
}

export async function resolveAccounts(
  accounts: readonly Account[],
  resolver: CredentialResolver,
  env?: CredentialEnvironment,
  signal?: AbortSignal,
): Promise<Map<string, string>> {
  const resolved = new Map<string, string>();
  const groupsByKey = new Map<string, string>();
  for (const account of accounts) {
    checkAbort(signal);
    if (!account.enabled) continue;
    const key = await resolver.resolve(account.credential, env, signal);
    if (!key) continue;
    const group = groupsByKey.get(key);
    if (group !== undefined && group !== account.quotaGroup)
      throw new RouterError(
        "credentials",
        "Duplicate credentials belong to different quota groups. Configure shared keys in one group.",
      );
    groupsByKey.set(key, account.quotaGroup);
    resolved.set(account.id, key);
  }
  return resolved;
}
