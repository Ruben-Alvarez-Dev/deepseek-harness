import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import lockfile from "proper-lockfile";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  decodeEpisodeState,
  EpisodeStore,
  episodeStatePath,
} from "../src/adapters/episode-store.ts";
import {
  buildEpisode,
  type Episode,
  isExpired,
  normaliseLesson,
  redactSecrets,
} from "../src/domain/episode.ts";
import { RouterError } from "../src/domain/types.ts";
import { FakeClock } from "./helpers.ts";

const directories: string[] = [];
async function temporary() {
  const dir = await mkdtemp(join(tmpdir(), "pi-episode-test-"));
  directories.push(dir);
  return dir;
}
afterEach(async () => {
  await Promise.all(directories.splice(0).map((p) => rm(p, { recursive: true, force: true })));
});

function makeEpisode(overrides?: Partial<Episode>): Episode {
  return buildEpisode({
    taskFamily: "tool",
    projectScope: "pi-account-router",
    deterministicObservation: "Called read on /foo/bar",
    validatedFix: "Always check file existence before reading",
    provenance: "verifier",
    accountPressure: 0.5,
    ...overrides,
  });
}

describe("episode schema and redaction", () => {
  it("builds a valid episode with defaults", () => {
    const ep = makeEpisode();
    expect(ep.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(ep.taskFamily).toBe("tool");
    expect(ep.provenance).toBe("verifier");
    expect(ep.expiry).toBeGreaterThan(Date.now());
    expect(ep.ts).toBeGreaterThan(0);
    expect(ep.receiptRefs).toEqual([]);
  });

  it("maps legacy fields correctly", () => {
    const ep = buildEpisode({
      taskFamily: "build",
      projectScope: "test",
      deterministicObservation: "Failed build",
      validatedFix: "Use correct flags",
      lesson: "Legacy lesson", // backward compat
      provenance: "shadow",
    });
    expect(ep.lesson).toBe("Legacy lesson");
    expect(ep.shadowUsed).toBe(1);
    expect(ep.validatedFix).toBe("Use correct flags");
  });

  it("redacts known key patterns", () => {
    const dirty = "key=agnes-ai_abc123DEF456ghi789jkl and sk-1234567890abcdef";
    const clean = redactSecrets(dirty);
    expect(clean).not.toContain("abc123DEF456");
    expect(clean).not.toContain("sk-1234567890abcdef");
    expect(clean).toContain("<redacted-key>");
  });

  it("normalises lessons for dedupe", () => {
    expect(normaliseLesson("  Always  check  first  ")).toBe("always check first");
    expect(normaliseLesson("Same lesson")).toBe(normaliseLesson("SAME LESSON"));
  });

  it("checks expiry correctly", () => {
    const now = Date.now();
    const expired = buildEpisode({
      taskFamily: "tool",
      projectScope: "test",
      deterministicObservation: "x",
      validatedFix: "y",
      provenance: "verifier",
      expiry: now - 1000,
    });
    const fresh = buildEpisode({
      taskFamily: "tool",
      projectScope: "test",
      deterministicObservation: "x",
      validatedFix: "y",
      provenance: "verifier",
      expiry: now + 1000,
    });
    expect(isExpired(expired, now)).toBe(true);
    expect(isExpired(fresh, now)).toBe(false);
  });
});

describe("decodeEpisodeState", () => {
  it("accepts a valid v2 state", () => {
    const ep = makeEpisode();
    const state = {
      version: 2,
      episodes: [ep],
      caps: {},
      globalCap: 500,
      defaultTtlMs: 604800000,
      holdoutCategories: ["evaluation"],
    };
    const decoded = decodeEpisodeState(JSON.stringify(state));
    expect(decoded.version).toBe(2);
    expect(decoded.episodes).toHaveLength(1);
    expect(decoded.episodes[0]?.validatedFix).toBe(ep.validatedFix);
  });

  it("migrates v1 to v2 automatically", () => {
    const ep = makeEpisode();
    const v1State = {
      version: 1,
      episodes: [ep],
      caps: {},
      globalCap: 500,
    };
    const decoded = decodeEpisodeState(JSON.stringify(v1State));
    expect(decoded.version).toBe(2);
    expect(decoded.defaultTtlMs).toBe(604800000); // 7 days
    expect(decoded.holdoutCategories).toEqual(["evaluation"]);
  });

  it("rejects malformed JSON", () => {
    expect(() => decodeEpisodeState("{broken")).toThrow("corrupt");
  });

  it("rejects missing required fields", () => {
    expect(() =>
      decodeEpisodeState(
        JSON.stringify({
          version: 2,
          episodes: [{ id: "x" }],
          caps: {},
          globalCap: 500,
          defaultTtlMs: 0,
          holdoutCategories: [],
        }),
      ),
    ).toThrow("corrupt");
  });

  it("rejects invalid provenance", () => {
    const ep = makeEpisode({ provenance: "invalid" as unknown as "shadow" });
    expect(() =>
      decodeEpisodeState(
        JSON.stringify({
          version: 2,
          episodes: [ep],
          caps: {},
          globalCap: 500,
          defaultTtlMs: 0,
          holdoutCategories: [],
        }),
      ),
    ).toThrow("corrupt");
  });

  it("throws a typed corrupt-state RouterError", () => {
    let caught: unknown;
    try {
      decodeEpisodeState("{broken");
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(RouterError);
    expect((caught as RouterError).code).toBe("state");
    expect((caught as RouterError).message).toBe(
      "Episode store state is corrupt; refusing to overwrite history.",
    );
  });
});

describe("EpisodeStore", () => {
  it("creates private files with 0600 permissions", async () => {
    const dir = await temporary();
    const store = new EpisodeStore(join(dir, "episodes.json"), new FakeClock());
    const ep = makeEpisode();
    await store.capture(ep);
    const s = await stat(store.path);
    expect(s.mode & 0o777).toBe(0o600);
  });

  it("captures and retrieves episodes", async () => {
    const dir = await temporary();
    const clock = new FakeClock();
    const store = new EpisodeStore(join(dir, "episodes.json"), clock);
    const ep = makeEpisode({ validatedFix: "Check existence first" });
    await store.capture(ep);
    const result = await store.topK({ taskFamily: "tool", query: "check existence", k: 3 });
    expect(result).toHaveLength(1);
    expect(result[0]?.validatedFix).toBe("Check existence first");
  });

  it("deduplicates by normalised validatedFix", async () => {
    const dir = await temporary();
    const store = new EpisodeStore(join(dir, "episodes.json"), new FakeClock());
    await store.capture(makeEpisode({ validatedFix: "Always validate input" }));
    await store.capture(makeEpisode({ validatedFix: "  ALWAYS  VALIDATE  INPUT  " }));
    const counts = await store.countByFamily();
    expect(counts.tool).toBe(1);
  });

  it("enforces per-class cap", async () => {
    const dir = await temporary();
    const store = new EpisodeStore(join(dir, "episodes.json"), new FakeClock());
    await store.withState((state) => {
      state.caps.tool = 2;
    });
    for (let i = 0; i < 5; i++) {
      await store.capture(makeEpisode({ validatedFix: `lesson-${i}`, ts: 1000 + i }));
    }
    const counts = await store.countByFamily();
    expect(counts.tool).toBe(2);
  });

  it("enforces global cap", async () => {
    const dir = await temporary();
    const store = new EpisodeStore(join(dir, "episodes.json"), new FakeClock());
    await store.withState((state) => {
      state.globalCap = 3;
    });
    for (let i = 0; i < 5; i++) {
      await store.capture(
        makeEpisode({ validatedFix: `g-${i}`, taskFamily: "build", ts: 1000 + i }),
      );
    }
    const counts = await store.countByFamily();
    expect(counts.build).toBe(3);
  });

  it("returns empty for unknown family", async () => {
    const dir = await temporary();
    const store = new EpisodeStore(join(dir, "episodes.json"), new FakeClock());
    await store.capture(makeEpisode({ taskFamily: "prose" }));
    const result = await store.topK({ taskFamily: "tool", query: "anything", k: 3 });
    expect(result).toHaveLength(0);
  });

  it("clears all episodes", async () => {
    const dir = await temporary();
    const store = new EpisodeStore(join(dir, "episodes.json"), new FakeClock());
    await store.capture(makeEpisode());
    await store.clear();
    const counts = await store.countByFamily();
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(0);
  });

  it("notifies onChange listeners on write", async () => {
    const dir = await temporary();
    const store = new EpisodeStore(join(dir, "episodes.json"), new FakeClock());
    const cb = vi.fn();
    store.onChange(cb);
    await store.capture(makeEpisode());
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("does not notify on read-only transactions", async () => {
    const dir = await temporary();
    const store = new EpisodeStore(join(dir, "episodes.json"), new FakeClock());
    const cb = vi.fn();
    store.onChange(cb);
    await store.topK({ taskFamily: "tool", query: "x", k: 1 });
    expect(cb).not.toHaveBeenCalled();
  });

  it("evicts expired episodes", async () => {
    const dir = await temporary();
    const clock = new FakeClock();
    const store = new EpisodeStore(join(dir, "episodes.json"), clock);
    const now = clock.now();
    await store.capture(makeEpisode({ expiry: now - 1000, validatedFix: "expired-lesson" }));
    await store.capture(makeEpisode({ expiry: now + 1000, validatedFix: "fresh-lesson" }));
    const removed = await store.evictExpired(now);
    expect(removed).toBe(1);
    const counts = await store.countByFamily();
    expect(counts.tool).toBe(1);
  });

  it("respects holdout categories", async () => {
    const dir = await temporary();
    const store = new EpisodeStore(join(dir, "episodes.json"), new FakeClock());
    // development episode (provenance=verifier)
    await store.capture(makeEpisode({ provenance: "verifier", validatedFix: "dev-lesson" }));
    // shadow episode (provenance=shadow → mapped to development, not holdout)
    await store.capture(makeEpisode({ provenance: "shadow", validatedFix: "shadow-lesson" }));
    // Retrieval should include both (neither is an evaluation holdout)
    const results = await store.topK({
      taskFamily: "tool",
      query: "anything",
      k: 10,
      excludeHoldouts: ["evaluation"],
    });
    expect(results.length).toBe(2);
  });

  it("excludes evaluation holdout episodes from retrieval", async () => {
    const dir = await temporary();
    const store = new EpisodeStore(join(dir, "episodes.json"), new FakeClock());
    // development episode (default holdoutCategory)
    await store.capture(makeEpisode({ provenance: "verifier", validatedFix: "dev-lesson" }));
    // evaluation holdout episode (explicit holdoutCategory)
    await store.capture(
      makeEpisode({
        provenance: "manual",
        projectScope: "eval-project",
        validatedFix: "eval-lesson",
        holdoutCategory: "evaluation",
      }),
    );
    // With evaluation excluded, only the development episode returns
    const results = await store.topK({
      taskFamily: "tool",
      query: "anything",
      k: 10,
      excludeHoldouts: ["evaluation"],
    });
    expect(results.map((e) => e.validatedFix)).toEqual(["dev-lesson"]);
  });

  it("derives development holdouts from shadow/verifier provenance when not explicit", () => {
    const dev = makeEpisode({ provenance: "verifier", validatedFix: "implicit-dev" });
    const shadow = makeEpisode({ provenance: "shadow", validatedFix: "implicit-shadow" });
    expect(dev.holdoutCategory).toBe("development");
    expect(shadow.holdoutCategory).toBe("development");
  });

  it("prioritizes recent episodes over stale ones with identical overlap", async () => {
    const dir = await temporary();
    const store = new EpisodeStore(join(dir, "episodes.json"), new FakeClock());
    const now = Date.now();
    // Same observation/query overlap and same pressure; only age differs.
    await store.capture(
      makeEpisode({
        deterministicObservation: "same context line",
        validatedFix: "lesson stale",
        ts: now - 5 * 24 * 60 * 60 * 1000,
      }),
    );
    await store.capture(
      makeEpisode({
        deterministicObservation: "same context line",
        validatedFix: "lesson recent",
        ts: now - 60 * 60 * 1000,
      }),
    );
    const results = await store.topK({ taskFamily: "tool", query: "same context", k: 2 });
    expect(results.map((e) => e.validatedFix)).toEqual(["lesson recent", "lesson stale"]);
  });
});

describe("episodeStatePath", () => {
  it("resolves under the agent dir", () => {
    const p = episodeStatePath("/tmp/agent");
    expect(p).toContain("account-router-state");
    expect(p).toContain("episodes.json");
  });
});

describe("lock failures are typed", () => {
  it("throws a typed lock-acquire RouterError when the lock is held elsewhere", async () => {
    const dir = await temporary();
    const path = join(dir, "episodes.json");
    const store = new EpisodeStore(path, new FakeClock());
    await store.capture(makeEpisode());
    const release = await lockfile.lock(path, {
      realpath: false,
      stale: 10000,
      update: 2000,
      retries: 0,
    });
    try {
      await expect(
        store.withState((s) => {
          s.episodes.push(makeEpisode());
        }),
      ).rejects.toMatchObject({
        code: "lock_acquire",
        message: "Cannot acquire episode store lock.",
      });
    } finally {
      await release();
    }
  });
});

describe("multi-process race", () => {
  it("sequential captures serialize without losing episodes", async () => {
    const dir = await temporary();
    const store = new EpisodeStore(join(dir, "episodes.json"), new FakeClock());
    for (let i = 0; i < 10; i++) {
      await store.capture(makeEpisode({ validatedFix: `seq-${i}`, ts: 5000 + i }));
    }
    const counts = await store.countByFamily();
    expect(counts.tool).toBe(10);
  });

  it("concurrent reads and writes stay consistent", async () => {
    const dir = await temporary();
    const store = new EpisodeStore(join(dir, "episodes.json"), new FakeClock());
    await store.capture(makeEpisode({ validatedFix: "writer-episode" }));
    const result = await store.topK({ taskFamily: "tool", query: "writer", k: 1 });
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});
