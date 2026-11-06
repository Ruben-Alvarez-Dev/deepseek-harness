# Measured performance and objective attainment

Measured **2026-10-09 (UTC)** using actual Pi **1.1.0**, the installed router, four real configured credentials and `agnes-3.0-flash`. This is a small descriptive benchmark, not a throughput/SLA certification.

## Reproducible measurement

`PI_ROUTER_LIVE=1 npm run test:live:performance` runs one request per account, serially, with starts at least seven seconds apart, under the then-active **shared 10 RPM / concurrency-one** profile (since corrected to one 10 RPM group per key). It requests exactly integers 1–48 separated by spaces, with thinking off, no operational tools/context files/session persistence and an output cap of 256 tokens. All four final responses passed exact sequence validation and HTTP 200.

Each response reports **138 input + 135 output = 273 tokens**; successful benchmark total: **1,092 tokens**. Identical prompt/output aids comparison but does not represent long coding tasks, reasoning, image workloads or tool-heavy conversations.

Monotonic native hook timings:

- **TTFT:** native payload hook to first actual parsed text delta; excludes CLI startup and quota acquisition before that hook.
- **Inference elapsed:** payload hook to native assistant message end, including response parsing and reservation cleanup.
- **CLI wall:** complete cold child process, including startup/preparation/shutdown.
- **Effective output rate:** reported output tokens divided by inference elapsed, **including TTFT**. It is not isolated model-generation speed.

## Results

| Account ID | TTFT | Inference elapsed | Cold CLI wall | Effective output tokens/s |
| --- | ---: | ---: | ---: | ---: |
| `agnes-local` | 0.544 s | 1.611 s | 1.919 s | 83.8 |
| `agnes-msb` | 0.552 s | 1.618 s | 1.942 s | 83.4 |
| `agnes-planetary` | 4.629 s | 5.655 s | 5.963 s | 23.9 |
| `agnes-dianez` | 0.557 s | 1.624 s | 1.947 s | 83.1 |

- Median TTFT: **0.554 s**.
- Median inference elapsed: **1.621 s**; mean: **2.627 s**; range: **1.611–5.655 s**.
- Median cold CLI wall: **1.945 s**.
- Median per-request effective output rate: **83.3 tokens/s**.
- Aggregate effective rate over the sum of four inference durations: **51.4 output tokens/s**, excluding deliberate spacing between requests. This is **not** measured sustainable pool capacity.
- Visible streaming spans were **0.981–1.036 s**, with 134 content events each. The slower sample differed mainly before headers/first content, but this does not identify its underlying cause or prove that account is intrinsically slower.
- Agent-start-to-payload preparation was **23–48 ms**. It includes Pi context/auth/routing work and observer I/O; **it is not isolated router overhead**.

Evidence: `~/.pi/agent/account-router-performance.json`, mode 0600. Earlier real rotation/tool acceptance evidence remains unchanged in its separate file.

## Failed pilot—retained, not hidden

A prior pilot used a 128-token cap and reached it without completing the exact requested sequence. HTTP was 200; reported usage 138 input / 128 output; TTFT 0.578 s, inference elapsed 2.124 s. It stopped the run without replay or fallback. Output validation **failed**, so it is excluded from successful benchmark medians. The cap was corrected to 256 for a new explicit run; routing/budgets/history were not reset.

Private pilot evidence: `~/.pi/agent/account-router-performance-pilot.json`. Its original stop reason was not retained, so no unsupported finish-reason claim is made. Across this measurement work there were **five** actual requests and **1,358** reported tokens, not merely the four successful final observations.

## Objective scoreboard

| Objective | Measurable result | Status |
| --- | --- | --- |
| Standard Pi package/provider, without proxy/harness patch or bundled peers | Real CLI/package discovery, packed-peer-free runtime and mode tests | Achieved for Pi 1.1.0 |
| Four working credentials | Four distinct stored values, each used successfully against actual upstream | Achieved |
| Proactive per-inference rotation | Actual four-account cycle; persisted order across processes | Achieved |
| Preserve native context/tool continuation across accounts | Prior real inert tool executed once; next account received its result | Achieved |
| Provider-neutral routing and replaceable compatible endpoint | Same core tested against alternate compatible local endpoint | Achieved; non-OpenAI protocols not implemented |
| Shared accounting, cooldown, cancellation and cross-process safety | 100 deterministic tests, including real processes/native local transport | Verified in tests; real 429/pressure intentionally not provoked |
| Measure latency and effective delivery | Four validated observations and retained failed pilot | Achieved descriptively, no SLO/p95 guarantee |
| Increase free aggregate capacity with four accounts | Measurement on 2026-10-10 shows the free limit is per key; the profile now uses one 10 RPM group per key | **Measured; configuration corrected** |
| Faster than using one account directly | No direct baseline/control or concurrent-load experiment | **Not demonstrated** |
| Financial savings / profitable usage | Published free Flash prices, but no account billing/demand comparison | **Not demonstrated** |
| Independent daily/account budgets | No confirmed independent quota/reset data | **Not demonstrated** |

The project succeeds as a working, compatible routing extension. Its original hoped-for **capacity multiplier / economic advantage is not yet proven**. Rotation alone does not accelerate a dependent inference or tool chain. RPM counts upstream inferences, not user tasks; a task using tools can consume multiple requests.

Four samples cannot support p95, sustained success-rate, fairness over time or a reliable ranking of accounts. No latency target was specified before development, so there is no honest performance SLO to mark passed retroactively. No quota increase, key redistribution, key exposure, default-model change or pressure test was performed for this benchmark.
