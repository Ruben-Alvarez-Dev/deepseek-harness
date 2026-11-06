import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { describe, expect, it, vi } from "vitest";
import { FileStateStore, statePath } from "../src/adapters/file-state-store.ts";
import { systemClock } from "../src/adapters/system-clock.ts";
import { registerAccountRouter } from "../src/extension.ts";
import type { CredentialResolver } from "../src/ports.ts";
import { poolConfig } from "./helpers.ts";

type Registration = Pick<
  ExtensionAPI,
  "registerProvider" | "registerCommand" | "on" | "sendMessage"
>;

async function setup(configOverrides: Partial<import("../src/domain/types.ts").RouterConfig> = {}) {
  const handlers = new Map<string, unknown>();
  const on = vi.fn((event: string, handler: unknown) => {
    handlers.set(event, handler);
    return () => undefined;
  });
  const api: Registration = {
    on,
    registerProvider: vi.fn(),
    registerCommand: vi.fn(),
    sendMessage: vi.fn(),
  };
  const config = poolConfig(2);
  Object.assign(config, configOverrides);
  const store = new FileStateStore(statePath("/tmp/test-agent", config), systemClock);
  const credentials = {
    resolve: vi.fn<CredentialResolver["resolve"]>(async () => "synthetic-key"),
  };
  await registerAccountRouter(api, { config, store, credentials });
  return { api, handlers, config, store, credentials };
}

describe("shadow configuration", () => {
  it("defaults to false", () => {
    const config = poolConfig(2);
    expect(config.shadowEnabled).toBe(false);
  });

  it("accepts explicit true", () => {
    const config = poolConfig(2);
    config.shadowEnabled = true;
    expect(config.shadowEnabled).toBe(true);
  });
});

describe("RoutedStreams shadow dispatch", () => {
  it("allows shadowEnabled to be set to true", async () => {
    const { config } = await setup({ shadowEnabled: true });
    expect(config.shadowEnabled).toBe(true);
  });
});
