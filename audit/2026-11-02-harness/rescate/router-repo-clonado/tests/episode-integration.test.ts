import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EpisodeStore } from "../src/adapters/episode-store.ts";
import { buildEpisode } from "../src/domain/episode.ts";
import { buildRetrievalSection, episodeStatePath, makeEpisodeCapture } from "../src/extension.ts";

async function temporaryDir() {
  const dir = await mkdtemp(join(tmpdir(), "pi-episode-int-test-"));
  return dir;
}

describe("makeEpisodeCapture", () => {
  it("captures on verdict, skips on undefined", async () => {
    const dir = await temporaryDir();
    const store = new EpisodeStore(join(dir, "episodes.json"));
    const capture = makeEpisodeCapture(store);
    await capture({
      taskFamily: "tool",
      projectScope: "pi-account-router",
      deterministicObservation: "Called ls",
      verdict: "fail",
      verifier: "spec",
      validatedFix: "Use ls -la for permissions",
      accountPressure: 0.3,
    });
    await capture({
      taskFamily: "tool",
      projectScope: "pi-account-router",
      deterministicObservation: "Called cat",
      verdict: undefined,
      verifier: "spec",
      validatedFix: "should not appear",
      accountPressure: 0.1,
    });
    const counts = await store.countByFamily();
    expect(counts.tool).toBe(1);
    await rm(dir, { recursive: true, force: true });
  });

  it("redacts credentials from captured episodes", async () => {
    const dir = await temporaryDir();
    const store = new EpisodeStore(join(dir, "episodes.json"));
    const capture = makeEpisodeCapture(store);
    await capture({
      taskFamily: "build",
      projectScope: "pi-account-router",
      deterministicObservation: "Built with key=agnes-ai_abc123DEF456ghi789jkl",
      verdict: "fail",
      verifier: "typecheck",
      validatedFix: "Never hardcode API keys in build flags",
      accountPressure: 0.8,
    });
    const episodes = await store.topK({ taskFamily: "build", query: "key", k: 10 });
    expect(episodes.length).toBe(1);
    expect(episodes[0]?.deterministicObservation).not.toContain("abc123DEF456");
    expect(episodes[0]?.deterministicObservation).toContain("<redacted-key>");
    await rm(dir, { recursive: true, force: true });
  });
});

describe("buildRetrievalSection", () => {
  it("returns empty section when disabled", async () => {
    const dir = await temporaryDir();
    const store = new EpisodeStore(join(dir, "episodes.json"));
    const result = await buildRetrievalSection(store, {
      taskFamily: "tool",
      query: "test",
      k: 3,
      enabled: false,
    });
    expect(result.section).toBe("");
    expect(result.count).toBe(0);
    await rm(dir, { recursive: true, force: true });
  });

  it("injects lessons within token budget", async () => {
    const dir = await temporaryDir();
    const store = new EpisodeStore(join(dir, "episodes.json"));
    await store.capture(
      buildEpisode({
        taskFamily: "tool",
        projectScope: "pi-account-router",
        deterministicObservation: "Called read on /etc/passwd",
        validatedFix: "Never read system files without explicit allowlist",
        provenance: "verifier",
        accountPressure: 0.9,
      }),
    );
    const result = await buildRetrievalSection(store, {
      taskFamily: "tool",
      query: "read file security",
      k: 3,
      enabled: true,
    });
    expect(result.count).toBeGreaterThanOrEqual(1);
    expect(result.section).toContain("Prior lessons");
    expect(result.section).toContain("Never read system files");
    // Budget check: ≤ 300 tokens ≈ 1200 chars
    expect(result.section.length).toBeLessThan(1500);
    await rm(dir, { recursive: true, force: true });
  });

  it("returns empty when no episodes match family", async () => {
    const dir = await temporaryDir();
    const store = new EpisodeStore(join(dir, "episodes.json"));
    await store.capture(
      buildEpisode({
        taskFamily: "prose",
        projectScope: "pi-account-router",
        deterministicObservation: "Wrote a paragraph",
        validatedFix: "Good writing needs editing",
        provenance: "verifier",
        accountPressure: 0.1,
      }),
    );
    const result = await buildRetrievalSection(store, {
      taskFamily: "tool",
      query: "anything",
      k: 3,
      enabled: true,
    });
    expect(result.section).toBe("");
    expect(result.count).toBe(0);
    await rm(dir, { recursive: true, force: true });
  });
});

describe("extension re-exports", () => {
  it("exports EpisodeStore and helpers", () => {
    expect(EpisodeStore).toBeDefined();
    expect(typeof episodeStatePath).toBe("function");
    expect(typeof makeEpisodeCapture).toBe("function");
    expect(typeof buildRetrievalSection).toBe("function");
  });

  it("episodeStatePath resolves under agent dir", () => {
    const p = episodeStatePath("/tmp/fake-agent");
    expect(p).toContain("account-router-state");
    expect(p).toContain("episodes.json");
  });
});
