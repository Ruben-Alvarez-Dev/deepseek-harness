import type { Model } from "@earendil-works/pi-ai";
import type { RouterConfig } from "../domain/types.ts";

export const PROVIDER_ID = "account-router";

export function routerModels(config: RouterConfig): Model<"openai-completions">[] {
  return config.provider.models.map((spec) => ({
    ...spec,
    provider: PROVIDER_ID,
    api: "openai-completions",
    baseUrl: config.provider.baseUrl,
    // Router price metadata is not an upstream billing guarantee. Override generic prices in Pi.
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    ...(config.provider.adapter === "agnes"
      ? {
          compat: {
            supportsDeveloperRole: false,
            supportsStore: false,
            supportsReasoningEffort: false,
            maxTokensField: "max_tokens" as const,
            thinkingFormat: "chat-template" as const,
            chatTemplateKwargs: { enable_thinking: { $var: "thinking.enabled" } },
          },
        }
      : {}),
  }));
}
