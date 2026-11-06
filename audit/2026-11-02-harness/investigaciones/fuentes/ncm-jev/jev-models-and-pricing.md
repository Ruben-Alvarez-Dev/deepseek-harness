---
title: "Models, aliases, pricing, rate limits, context"
type: reference
tags: [models, pricing, rate-limits, context-length, jev]
created: 2026-09-17
updated: 2026-10-28
confidence: high
sources:
  - raw/docs/models.md
  - raw/docs/images.md
  - raw/docs/primitives__box.md
  - raw/docs/concepts__state.md
  - raw/site/blog-jev-1-14.txt
  - raw/site/openapi.json
  - raw/docs/api__errors.md
  - raw/docs/api.md
  - raw/sitemap.xml
jev_version: "jev-1.14.0"
summary: "Jev 1.14 and 1.13 model IDs, aliases (jev-latest -> jev-1.14.0 since 2026-10-24), $42/Btok input-only pricing, per-org rate limits, 64k/32k context, experimental 262k long context."
---

# Models, aliases, pricing, rate limits, context

> **TL;DR** Two current models: `jev-1.14.0` (available from 2026-10-14) and `jev-1.13.0`. Both aliases, `jev-latest` (the SDK default) and `jev-preview`, now point to `jev-1.14.0`; `jev-latest` moved from `jev-1.13.0` between the 2026-10-21 and 2026-10-24 captures, so unpinned code now runs 1.14. Pin `jev-1.13.0` to keep the old model (thresholds tuned on 1.13 may shift). Both cost $42 per Btok / $0.042 per Mtok on **input tokens only**; output tokens are free. Context: 64k tokens per request, 32k for `state` plus any one question; an experimental header raises both to 262k. Rate limits are now set per organization and shown in the console (the fixed 100K tok/s and 80 req/s figures left the docs on 2026-10-14). Images are an experimental, header-gated input on both models.

## Current models

| | Jev 1.14 | Jev 1.13 |
|---|---|---|
| Model ID | `jev-1.14.0` | `jev-1.13.0` |
| Price (per Btok / per Mtok) | $42 / $0.042 | $42 / $0.042 |
| Context length | 64k per-request / 32k per-question | 64k per-request / 32k per-question |
| Input | Text | Text |

(Table reproduced from raw/docs/models.md; unchanged from the 2026-10-15 to the 2026-10-24 capture.) "Jev 1.14 is the newest Jev release, available from October 14, 2026." Every model is served by the same endpoint, `POST /v1/systemone`; the request's `model` field selects which one handles the call. See [[reference/http-api]].

What differs between the two, per TypeSafe:

| Point | Jev 1.14 | Jev 1.13 | Source |
|---|---|---|---|
| Change vs previous release | "small, subtle improvements to everything"; "we expect the largest gain in multi-lingual support" | — | raw/site/blog-jev-1-14.txt (claim, no numbers published) |
| Images (experimental, header-gated) | Yes | Yes ("Jev 1.13 and Jev 1.14 both accept images") | raw/docs/images.md |
| `box` question type (experimental, header-gated) | Yes | No ("Box questions need Jev 1.14", raw/docs/images.md; since the 2026-10-24 capture the Box page no longer says so and its example sends `jev-latest`) | raw/docs/images.md, raw/docs/primitives__box.md |
| Long context (experimental, header-gated) | Yes | Yes | raw/docs/models.md |

**Docs inconsistency (2026-10-15 capture, unchanged on 2026-10-24).** The models table lists Input as "Text" for both models, and the Input bullet says Jev "does not accept audio or video", while raw/docs/images.md documents image input on both models behind the `TypeSafe-Danger-Zone-Images: true` header. raw/docs/concepts__state.md likewise now says only "Audio and video are not supported (yet)". Read "Text" as the default, production input; images are experimental (see [Input](#input)).

## Aliases

| Alias | Points to (2026-10-24 capture) | Meaning (verbatim) |
|---|---|---|
| `jev-latest` | `jev-1.14.0` | "The most recent stable, official release. The default in our client SDKs, and the name the examples in these docs use." |
| `jev-preview` | `jev-1.14.0` | "The most recent release, official or not. Moves ahead of `jev-latest` when a preview build is available." |

Warning on the page (verbatim): "`jev-preview` currently points to the same model as `jev-latest`. There is no preview build available right now."

**The move happened.** TypeSafe's 1.14 blog post (2026-10-14): "`jev-latest` will be updated to `jev-1.14.0` in a week. `jev-1.13.0` will be available for a while." The docs table changed between the 2026-10-21 and 2026-10-24 captures (Models page sitemap lastmod 2026-10-23T22:20Z); the exact day the API alias moved is not published. Code that sends `jev-latest`, including every SDK call that uses the default and every docs example, is now answered by `jev-1.14.0` with no code change. Check the response's `model` field to see which version answered. Confidence thresholds tuned on 1.13 may shift (inferred from the alias guidance below); re-run your labelled set on 1.14 or pin `jev-1.13.0`.

Alias behavior (raw/docs/models.md):

- An alias moves when a new release ships, "so its answers can change without any change to your code."
- Each response's `model` field gives the versioned ID that answered, so you can log which model produced each result.
- "If you have tuned confidence thresholds against one version, send that version's ID instead of the alias, and switch to the new version when you are ready." Pinning `jev-1.13.0` keeps the pre-move behavior.
- `jev-latest` is the SDK default (`DEFAULT_MODEL = "jev-latest"` in both SDKs; `TYPESAFE_DEFAULT_MODEL` overrides it; see [[reference/environment-variables]]).
- The experimental `box` type needs Jev 1.14 (raw/docs/images.md). Until the 2026-10-24 capture the Box page said "send `jev-preview` or `jev-1.14.0`"; since then that sentence is gone and its example sends `jev-latest`, which now resolves to `jev-1.14.0` (raw/docs/primitives__box.md). A `box` request pinned to `jev-1.13.0` is still outside what the docs support (inferred).

**Superseded (kept for history).**

| Window (by capture) | `jev-latest` | `jev-preview` | Source |
|---|---|---|---|
| until the 2026-10-14 docs update | `jev-1.13.0` | `jev-1.13.0` (same warning text as today) | raw/docs/models.md before git `328b9b4` |
| 2026-10-15 to the 2026-10-21 capture | `jev-1.13.0` | `jev-1.14.0` (warning removed) | git `328b9b4` to `0ee07ab` |
| since the 2026-10-24 capture | `jev-1.14.0` | `jev-1.14.0` (warning back) | raw/docs/models.md (git `7ab72d5`) |

## Pricing

| Item | Value | Source note |
|---|---|---|
| Price per Btok (billion tokens) | $42, both models | raw/docs/models.md |
| Price per Mtok (million tokens) | $0.042, both models | raw/docs/models.md |
| Billed on | Input tokens only | "You pay per input token." |
| Output tokens | Free | "Output tokens are free." Restated in raw/site/openapi.json: "Output tokens are currently free of charge." |
| Unit definitions | "A Btok is a billion tokens and an Mtok is a million tokens." | raw/docs/models.md |
| Images (experimental) | Billed as input tokens at the same per-token price; no separate image charge; included in `usage.input_tokens` | raw/docs/images.md. TypeSafe: "We'll be providing guidance on estimating image token usage soon." |
| Long context (experimental) | Same per-token price | "Long context costs the same per token as any other request." (raw/docs/models.md) |
| Where counted | `usage.input_tokens` / `usage.output_tokens` in the response | raw/site/openapi.json (`Usage`) |

Cross-check: the consistency cookbooks encode `TYPESAFE_PRICE = (0.042, 0.00)` — dollars per 1M input tokens and per 1M output tokens — labelled "Historical TypeSafe rate, as of 2026-08" (raw/docs/cookbooks__consistency_choice_cookbook.md, raw/docs/cookbooks__consistency_noul_cookbook.md). That matches $0.042/Mtok input and free output.

Currency and billing mechanics live in the MCA: Fees are in US dollars, usage is metered against TypeSafe-managed Credits, and "the rate at which Credits are consumed may vary based on account settings, including the model used" (raw/site/typesafe-ai-legal_mca.txt §8). See [[reference/legal-and-data]].

## Rate limits

Current text (raw/docs/models.md, 2026-10-15 capture): "Rate limits are set per organization. Your organization's current limits are in the developer console" (`https://console.typesafe.ai/rate-limits`). "Limits are measured in tokens per second and requests per second. A request over either limit returns `429 Too Many Requests`. Our client SDKs retry these requests by default, waiting longer between each attempt, and follow the `retry-after` header when the response includes one." "Higher limits are available on custom and enterprise plans." Since the 2026-10-28 capture: "To request a higher limit, fill out the rate limit increase request form" (`https://support.typesafe.ai/forms/rate-limit-increase-request`); it said "Contact sales@typesafe.ai" before.

The docs no longer publish a number. Look up your organization's limits in the console; do not hardcode any figure below as a client-side budget. Implement backoff and treat `429` as normal. Images have no separate rate limits: "a request with images counts against the same limits as any other request" (raw/docs/images.md). Full retry semantics in [[reference/rate-limits-and-errors]].

**History of the published figures** (superseded; community probes and experiments dated in each window were measured against these):

| Window (by capture) | Published limit | Source |
|---|---|---|
| until the 2026-09-29 capture | 250,000 tokens per second / 1,200 requests per minute | raw/docs/models.md at git `ce641f4` |
| 2026-09-30 capture to 2026-10-02 | 100K tokens per second / 40 requests per second (sitemap lastmod 2026-09-29T23:51Z) | git `72c325c` |
| 2026-10-02 to the 2026-10-14 docs update | 100K tokens per second / 80 requests per second (sitemap lastmod 2026-10-02T21:41Z, captured 2026-10-04) | git `ddf0ae5` |
| since the 2026-10-14 docs update (captured 2026-10-15) | per organization, shown in the console; no number in the docs | raw/docs/models.md |

The "Rate limits are adjusting dynamically" warning ("the limits above can change without notice ... as upcoming large GPU deals land") was also removed on 2026-10-14; the sales contact for higher limits stays.

## Context length

| Limit | Name in the docs | Default | With the long-context header (experimental) | Covers |
|---|---|---|---|---|
| Per request | `per_request_context` | 64k tokens | 262k tokens | `state` plus **all** questions combined |
| Per question | `per_question_context` | 32k tokens | 262k tokens | `state` plus **any one** question |

Mechanism (verbatim): "Jev ingests the `state` once and evaluates every question against it in parallel." "There is no separate limit on the number of questions in a request. Any number of questions is allowed as long as the request fits both limits." (raw/docs/models.md)

Because `state` is counted in both limits, a large `state` shrinks both the per-question headroom and the number of questions that fit. Image tokens count toward both limits too, and an image referenced in several places counts once per use (raw/docs/images.md). A request past either limit returns `400` with `max_tokens_exceeded` (raw/docs/api__errors.md; see [[reference/rate-limits-and-errors]]). Packing many questions into one request is the [[patterns/fan-out]] pattern; accuracy changes as `state` grows are documented in [[concepts/jaggedness-jev-1-13]].

(Wording note: before 2026-10-14 the docs called the second limit "32k tokens for `state` plus the longest question"; the new name and "any one question" describe the same rule.)

### Long context (experimental, header-gated)

"Long context is off by default and works on both Jev 1.14 and Jev 1.13. To turn it on, send the `TypeSafe-Danger-Zone-Long-Context: true` header with each request that needs it. With the header, the per-request context and the per-question context are both 262k tokens. Requests without the header keep the default limits." (raw/docs/models.md)

```bash
curl https://api.typesafe.ai/v1/systemone \
  -H "Authorization: Bearer $TYPESAFE_API_KEY" \
  -H "Content-Type: application/json" \
  -H "TypeSafe-Danger-Zone-Long-Context: true" \
  -d '{
    "model": "jev-latest",
    "state": "<a long contract, transcript, or record>",
    "questions": {
      "has_termination_clause": {
        "type": "noul",
        "instructions": "Does the `state` include a clause that lets either party end the agreement early?"
      }
    }
  }'
```

(Verbatim from raw/docs/models.md; replace the `state` placeholder with your text.)

When not to use it: TypeSafe says it "is slower and less accurate than staying within the default limits, so turn it on only for requests that need it." The blog adds that Jev "is less reliable on longer contexts" and that TypeSafe "strongly recommend[s] limiting context length" (raw/site/blog-jev-1-14.txt). TypeSafe labels this a "danger zone" flag: experimental, not production. The OpenAPI spec declares the header with the single allowed value `"true"` (raw/site/openapi.json). The 32 MiB request body limit still applies ([[reference/http-api]]).

## Input

Default, production input: natural-language text, "sent as a string, a JSON object, or an array of text values. It does not accept audio or video. Convert those into text or structured fields before you send them as `state`." (raw/docs/models.md) See [[concepts/state]].

**Images (experimental, header-gated).** PNG or JPEG images can go anywhere text can go (`state`, `instructions`, `criteria`) on both Jev 1.14 and Jev 1.13, but only with the `TypeSafe-Danger-Zone-Images: true` header on each request that contains one, and images are listed in a top-level `assets` map. TypeSafe: "Images and Box questions aren't yet up to our standards to call ready for production"; the format, answers and limits "can change between releases" (raw/docs/images.md). The blog warns that "all models (Jev included) perform worse on multimodality over pure text" (raw/site/blog-jev-1-14.txt). Wire format, limits and errors: [[reference/http-api]].

**Superseded.** Until the 2026-10-14 docs update the table read "Text only. String, JSON object, or array of text values. No image, audio, or video input.", and the guidance said to pre-process "images, audio, video, binaries" into text. Images are no longer in that list; audio and video still are.

## Deprecation policy

**No formal deprecation policy is published yet.** What the sources say (2026-10-15):

- **Stated intent (blog, not policy):** "We intend to give 60 days warning before `jev-1.13.0` is formally deprecated, and 30 days for `jev-1.14.0`. We'll release a deprecation policy prior to this." (raw/site/blog-jev-1-14.txt) No deprecation date is announced for either model.
- Aliases move when a new release ships; pin a versioned ID if you need stability (raw/docs/models.md).
- The MCA §2.5 (Updates): TypeSafe "may from time to time update the Services," which "may result in the API's becoming incompatible with a Customer Application," and TypeSafe "will use commercially reasonable efforts to provide advance notice of any updates to the API that TypeSafe believes will materially and adversely impact Customer's ability to integrate" (raw/site/typesafe-ai-legal_mca.txt).
- Precedent for a hard break: the preview endpoint `/preview/evaluation` was replaced outright by `/v1/systemone`, and the old `typesafe-client` Python package "no longer works against the API" (raw/docs/migrating-to-v1.md). See [[reference/migrating-to-v1]].

## Language support

English is the primary training language and, per raw/docs/models.md, "where accuracy is currently best". Other languages, including CJK scripts, are handled but not equally well; raw/docs/models.md advises testing on your own content before relying on Jev for a non-English workload and paying close attention to [[concepts/confidence]] when routing. TypeSafe expects Jev 1.14's "largest gain in multi-lingual support" (raw/site/blog-jev-1-14.txt; no numbers published).

## Customizing Jev

Jev is not fine-tuned or LoRA-adapted with customer data; it is trained with RLCD to return calibrated decisions, and the same weights serve every account (raw/docs/models.md). You shape answers through the request:

- proprietary content, records, and reference material go in `state` ([[concepts/state]]);
- domain rules and boundary cases go in each question's `instructions` and `criteria` ([[concepts/advanced-structure]], [[concepts/how-to-build]]);
- broad judgments are decomposed into atomic questions and combined in code ([[patterns/composite-scoring]], [[cookbooks/autoresearch-feature-discovery]]).

## Data handling

"Jev is not trained on customer requests or responses." Zero data retention (ZDR) is offered for enterprise customers. The 1.14 blog also announces an opt-in that lets TypeSafe use your queries to find model jaggedness, without training on them. Details and citations in [[reference/legal-and-data]].

## Listing models

`GET /v1/models` returns the names your account can send in the `model` field, each with a description and a release date. "It currently lists the aliases. Versioned IDs such as `jev-1.14.0` are accepted by the `model` field whether or not they appear in the list." (raw/docs/models.md)

| Response field | Type | Required | Description |
|---|---|---|---|
| `models` | `array` | Yes | One entry per model or alias. |
| `models[].name` | `string` | Yes | The model ID or alias, as accepted by the `model` field. |
| `models[].description` | `string` | Yes | What the model is for. |
| `models[].release_date` | `string` | Yes | When the model or alias was released (`YYYY-MM-DD`). |

```bash
curl https://api.typesafe.ai/v1/models \
  -H "Authorization: Bearer $TYPESAFE_API_KEY"
```

```python
from typesafe_sdk import TypeSafeClient

with TypeSafeClient() as client:
    for model in client.models.list().models:
        print(model.name, model.release_date, model.description)
```

```typescript
import { TypeSafeClient } from "@typesafe-ai/sdk";

const client = new TypeSafeClient();
const models = await client.models.list();
for (const model of models) {
  console.log(model.name, model.release_date, model.description);
}
```

(All three snippets verbatim from raw/docs/models.md. Note the shape difference between the SDKs: the Python call returns an object with a `.models` list, the JS call returns an iterable of models directly.)

The OpenAPI example release date for `jev-latest` is `2026-09-15` (raw/site/openapi.json), which matches the Jev launch date.

## Contacts

| Need | Contact | Source |
|---|---|---|
| Your organization's rate limits | `https://console.typesafe.ai/rate-limits` | raw/docs/models.md |
| Higher rate limits, custom/enterprise plans | Rate limit increase request form, `https://support.typesafe.ai/forms/rate-limit-increase-request` (since the 2026-10-28 capture; sales@typesafe.ai before) | raw/docs/models.md |
| Zero data retention (ZDR) | Support request form, `https://support.typesafe.ai/forms/support-request` (since the 2026-10-28 capture; sales@typesafe.ai from the 2026-09-25 capture; privacy@typesafe.ai until 2026-09-24) | raw/docs/legal.md |
| Experimental features: what you build and what breaks | TypeSafe Discord (`https://discord.gg/typesafe`) | raw/docs/images.md |
| Support | support@typesafe.ai | raw/site/typesafe-ai-legal_mca.txt §3 |

## Related

- [[concepts/images]] — experimental, header-gated image input (`assets`)
- [[concepts/box]] — experimental `box` questions (Jev 1.14)
- [[reference/http-api]] — how to send `model`, headers, `assets` and read the answer
- [[reference/rate-limits-and-errors]] — what to do on `400`, `413`, `415`, `429` and `529`
- [[reference/legal-and-data]] — training, retention, credits
- [[entities/jev]] — the model as an entity
- [[concepts/jaggedness-jev-1-13]] — known failure modes of Jev 1.13 (no 1.14 jaggedness page published as of 2026-10-24)
- [[patterns/fan-out]] — packing many questions into one request
- [[concepts/state]] — what `state` may contain

## Sources

- raw/docs/models.md (https://docs.typesafe.ai/models)
- raw/docs/images.md (https://docs.typesafe.ai/images)
- raw/docs/primitives__box.md (https://docs.typesafe.ai/primitives/box)
- raw/docs/concepts__state.md (https://docs.typesafe.ai/concepts/state)
- raw/site/blog-jev-1-14.txt (https://typesafe.ai/blog/jev-1-14) — "Jev: For the builders AND dreamers", 2026-10-14
- raw/site/openapi.json (https://api.typesafe.ai/openapi.json)
- raw/docs/api__errors.md (https://docs.typesafe.ai/api/errors) — request rules, compression, status codes, rate-limit handling (since 2026-10-20; the same text was on raw/docs/api.md before)
- raw/docs/api.md (https://docs.typesafe.ai/api)
- raw/sitemap.xml (https://docs.typesafe.ai/sitemap.xml) — Models page lastmod 2026-10-23T22:20Z (2026-10-24 capture); earlier 2026-10-20T00:26Z, 2026-10-14T21:29Z; earlier lastmods 2026-10-02T21:41Z (git `ddf0ae5`) and 2026-09-29T23:51Z (git `72c325c`)
- raw/docs/legal.md (https://docs.typesafe.ai/legal)
- raw/site/typesafe-ai-legal_mca.txt (https://typesafe.ai/legal/mca)
