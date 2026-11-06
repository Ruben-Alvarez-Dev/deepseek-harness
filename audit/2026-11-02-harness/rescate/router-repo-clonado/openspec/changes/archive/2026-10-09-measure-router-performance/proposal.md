# Measure router performance

## Why

The user requested performance figures and measurable objective attainment. Earlier real-account acceptance captured success, rotation and usage, but not latency or throughput. Functional success must not be presented as speedup or additive capacity.

## What Changes

- Add opt-in timing observations through native Pi events, without changing production routing.
- Run four conservative real requests (one per configured account) with a reproducible, longer inert output.
- Record first-content, headers, inference and process timings, usage and effective output delivery rate.
- Publish measured objectives and unproven claims, preserving earlier live acceptance evidence.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. Development measurement and evidence only.

## Impact

Four explicit live inference requests under the existing shared 10 RPM/concurrency-one profile. No secret/header/prompt logging, quota increase, new credentials, production API or global model/default changes.
