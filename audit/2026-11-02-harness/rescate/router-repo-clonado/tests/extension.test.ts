import { createModels } from "@earendil-works/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { describe, expect, it, vi } from "vitest";
import { PiCredentialResolver } from "../src/adapters/credentials.ts";
import { FOOTER_MAX_WIDTH } from "../src/adapters/footer-label.ts";
import { registerAccountRouter } from "../src/extension.ts";
import type { CredentialResolver } from "../src/ports.ts";
import { FakeClock, MemoryStore, poolConfig } from "./helpers.ts";

type Registration = Pick<
  ExtensionAPI,
  "registerProvider" | "registerCommand" | "on" | "sendMessage"
>;

async function setup(
  clock?: import("../src/ports.ts").Clock,
  watchDirectory?: (directory: string, onData: () => void) => () => void,
) {
  const handlers = new Map<string, unknown>();
  const on = vi.fn((event: string, handler: unknown) => {
    handlers.set(event, handler);
    return () => undefined;
  });
  const api: Registration = {
    on,
    registerProvider: vi.fn((_provider: unknown, _config?: unknown) => undefined),
    registerCommand: vi.fn<ExtensionAPI["registerCommand"]>(),
    sendMessage: vi.fn<ExtensionAPI["sendMessage"]>(),
  };
  const config = poolConfig(1);
  const store = new MemoryStore();
  const credentials = {
    resolve: vi.fn<CredentialResolver["resolve"]>(async () => "synthetic-key"),
  };
  const fetch = vi.spyOn(globalThis, "fetch");
  const provider = await registerAccountRouter(api, {
    config,
    store,
    credentials,
    clock,
    watchDirectory,
  });
  return { api, provider, credentials, store, fetch, handlers };
}

function context(mode: "tui" | "rpc" | "json") {
  const ui = { notify: vi.fn(), setStatus: vi.fn() };
  // Only UI/model fields are used by these handlers; CLI tests below exercise real host contexts.
  const ctx = {
    mode,
    hasUI: mode !== "json",
    model: { provider: "account-router", id: "agnes-3.0-flash" },
    ui,
  } as unknown as ExtensionContext;
  return { ctx, ui };
}

function lastFooter(ui: { setStatus: ReturnType<typeof vi.fn> }): string {
  const call = ui.setStatus.mock.calls.filter((c) => c[0] === "account-router").at(-1);
  return typeof call?.[1] === "string" ? call[1] : "";
}
const ESC = String.fromCharCode(27);
const plain = (text: string) => text.replace(new RegExp(`${ESC}\\[[0-9;]*m`, "g"), "");
function rgbOf(text: string): [number, number, number] {
  const match = new RegExp(`${ESC}\\[38;2;(\\d+);(\\d+);(\\d+)m`).exec(text);
  if (!match) throw new Error("Missing truecolor footer colour.");
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

async function event(handlers: Map<string, unknown>, name: string, ctx: ExtensionContext) {
  const handler = handlers.get(name);
  if (typeof handler !== "function") throw new Error("Missing event fixture");
  await handler({ type: name }, ctx);
}

describe("standard native Pi registration", () => {
  it("registers through public APIs without resolving secrets or dispatching factory-time HTTP", async () => {
    const { api, provider, credentials, fetch, store } = await setup();
    expect(provider.id).toBe("account-router");
    expect(api.registerProvider).toHaveBeenCalledWith(provider);
    expect(credentials.resolve).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(store.state.groups).toEqual([]);
    fetch.mockRestore();
  });

  it("sanitizes historical context even after switching to another provider", async () => {
    const { handlers, fetch } = await setup();
    try {
      const handler = handlers.get("context");
      if (typeof handler !== "function") throw new Error("Missing context handler");
      const messages = [
        { role: "user", content: "fixture" },
        { role: "assistant", content: [{ type: "toolCall", id: "", name: "", arguments: {} }] },
        { role: "toolResult", toolCallId: "", toolName: "", content: [] },
      ];
      const before = structuredClone(messages);
      const { ctx } = context("json");
      const result = await handler(
        { type: "context", messages },
        {
          ...ctx,
          model: { provider: "other-provider", id: "fixture" },
        },
      );
      expect(result.messages).toHaveLength(2);
      expect(result.messages[1].content).toEqual([]);
      expect(messages).toEqual(before);
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      fetch.mockRestore();
    }
  });

  it("appears in native available-model catalog when configured, and disappears when no keys resolve", async () => {
    const { provider, credentials, fetch } = await setup();
    const models = createModels();
    models.setProvider(provider);
    expect((await models.getAvailable("account-router")).map((m) => m.id)).toEqual([
      "agnes-3.0-flash",
      "agnes-2.5-flash",
    ]);
    credentials.resolve.mockImplementation(async () => undefined);
    expect(await models.getAvailable("account-router")).toEqual([]);
    fetch.mockRestore();
  });

  it("honors native provider-scoped environment during authentication", async () => {
    const { api, fetch } = await setup();
    const provider = await registerAccountRouter(api, {
      config: poolConfig(1),
      store: new MemoryStore(),
      credentials: new PiCredentialResolver("/nonexistent", {}),
    });
    const models = createModels({
      authContext: { env: async () => undefined, fileExists: async () => false },
    });
    models.setProvider(provider);
    expect(await models.getAuth("account-router")).toBeUndefined();
    expect(
      (await models.getAuth("account-router", { env: { TEST_KEY_0: "synthetic-scoped-only" } }))
        ?.auth.apiKey,
    ).toBe("account-router-managed-credentials");
    fetch.mockRestore();
  });

  it.each(["tui", "rpc", "json"] as const)(
    "reports status through standard Pi methods in %s mode",
    async (mode) => {
      const { api, fetch } = await setup();
      const { ctx, ui } = context(mode);
      const commands = vi.mocked(api.registerCommand).mock.calls;
      const handler = commands.find(([name]) => name === "router-status")?.[1].handler;
      if (!handler) throw new Error("Missing status command");
      await handler("", ctx as Parameters<typeof handler>[1]);
      if (mode === "json") {
        expect(ui.notify).not.toHaveBeenCalled();
        expect(api.sendMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            customType: "account-router-status",
            content: expect.stringContaining("remaining"),
          }),
          { triggerTurn: false },
        );
      } else {
        expect(ui.notify).toHaveBeenCalledWith(expect.stringContaining("group-0"), "info");
        expect(api.sendMessage).not.toHaveBeenCalled();
      }
      expect(fetch).not.toHaveBeenCalled();
      fetch.mockRestore();
    },
  );

  it("enables an account without resetting history and provides safe command errors", async () => {
    const { api, store, fetch } = await setup();
    store.state.disabledAccountIds = ["account-0"];
    const { ctx, ui } = context("tui");
    const handler = vi
      .mocked(api.registerCommand)
      .mock.calls.find(([name]) => name === "router-enable")?.[1].handler;
    if (!handler) throw new Error("Missing enable command");
    await handler("account-0", ctx as Parameters<typeof handler>[1]);
    expect(store.state.disabledAccountIds).toEqual([]);
    await handler("unknown", ctx as Parameters<typeof handler>[1]);
    expect(ui.notify).toHaveBeenLastCalledWith("Unknown configured account ID.", "error");
    fetch.mockRestore();
  });

  it("shows a dense gradient label next to the model, shuts down idempotently and reopens", async () => {
    const { handlers, fetch, store } = await setup();
    const { ctx, ui } = context("tui");
    await event(handlers, "session_start", ctx);
    const label = lastFooter(ui);
    expect(plain(label)).toBe("#1/1 agnes-3.0-flash");
    const [r, g] = rgbOf(label);
    expect(g).toBeGreaterThan(r); // idle pool renders green
    await event(handlers, "session_shutdown", ctx);
    await event(handlers, "session_shutdown", ctx);
    expect(ui.setStatus).toHaveBeenLastCalledWith("account-router", undefined);
    expect(store.state.groups.map((group) => group.id)).toEqual(["group-0"]);
    await event(handlers, "session_start", ctx);
    expect(plain(lastFooter(ui))).toBe("#1/1 agnes-3.0-flash");
    fetch.mockRestore();
  });

  it("encodes usage as a continuous colour and anomalies as glyphs within the width cap", async () => {
    const clock = new FakeClock();
    const { handlers, fetch, store } = await setup(clock);
    const { ctx, ui } = context("tui");
    await event(handlers, "session_start", ctx);
    const idle = rgbOf(lastFooter(ui));
    await store.transaction((state) => {
      const group = state.groups[0];
      if (group) group.starts = [99000, 99100, 99200, 99300, 99400, 99500, 99600, 99700];
    });
    await vi.waitFor(() => expect(rgbOf(lastFooter(ui))).not.toEqual(idle));
    const busy = rgbOf(lastFooter(ui));
    expect(busy[0]).toBeGreaterThan(idle[0]);
    expect(busy[1]).toBeLessThanOrEqual(idle[1]);
    await store.transaction((state) => {
      const group = state.groups[0];
      if (group) group.cooldownUntil = 112000;
      state.waiters.push({ id: "t1", owner: "peer", pid: 4242, groupIds: ["group-0"] });
      state.disabledAccountIds.push("account-0");
    });
    await vi.waitFor(() =>
      expect(plain(lastFooter(ui))).toBe("#\u2013/1 agnes-3.0\u2026 \u23f31\u274412s\u26a01"),
    );
    expect([...plain(lastFooter(ui))].length).toBeLessThanOrEqual(FOOTER_MAX_WIDTH);
    const { ctx: otherCtx, ui: otherUi } = context("tui");
    (otherCtx as unknown as { model?: unknown }).model = {
      provider: "agnes-ai",
      id: "agnes-3.0-flash",
    };
    await event(handlers, "model_select", otherCtx);
    expect(otherUi.setStatus).toHaveBeenLastCalledWith("account-router", undefined);
    await event(handlers, "session_shutdown", ctx);
    fetch.mockRestore();
  });

  it("refreshes from real events only: own commits, sibling writes and the next quota boundary", async () => {
    const interval = vi.spyOn(globalThis, "setInterval");
    const clock = new FakeClock();
    let sibling: (() => void) | undefined;
    const { handlers, fetch, store } = await setup(clock, (_dir, onData) => {
      sibling = onData;
      return () => {
        sibling = undefined;
      };
    });
    const { ctx, ui } = context("tui");
    await event(handlers, "session_start", ctx);
    expect(plain(lastFooter(ui))).toBe("#1/1 agnes-3.0-flash");
    // Another Pi process writes the shared file: no commit in this process, only the watcher fires.
    const group = store.state.groups[0];
    if (!group) throw new Error("Missing group fixture.");
    group.cooldownUntil = clock.time + 40;
    const calls = ui.setStatus.mock.calls.length;
    sibling?.();
    await vi.waitFor(() => expect(plain(lastFooter(ui))).toContain("\u27441s"));
    expect(ui.setStatus.mock.calls.length).toBe(calls + 1);
    // Time passes: the one-shot boundary timer re-renders exactly when the cooldown ends.
    clock.time += 40;
    await vi.waitFor(() => expect(plain(lastFooter(ui))).toBe("#1/1 agnes-3.0-flash"), {
      timeout: 1000,
    });
    // Re-render requests with unchanged content are suppressed.
    const settled = ui.setStatus.mock.calls.length;
    sibling?.();
    await new Promise((done) => setTimeout(done, 20));
    expect(ui.setStatus.mock.calls.length).toBe(settled);
    expect(interval).not.toHaveBeenCalled();
    await event(handlers, "session_shutdown", ctx);
    expect(sibling).toBeUndefined();
    interval.mockRestore();
    fetch.mockRestore();
  });
});
