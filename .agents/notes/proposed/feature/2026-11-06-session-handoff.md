# Agent Note: Goal-oriented session handoff

Status: proposed

English | [中文](2026-11-06-session-handoff.zh.md)

## Problem

A long session accumulates a goal, decisions, and a working set, but starting a fresh session throws all of it away: the new agent has to rediscover the task, and the operator has to repeat it by hand. Forking the session avoids the repetition but copies the entire history into the request, so the child pays the parent's full context cost from its first step. Compacting in place before continuing mutates the parent and replaces history the operator may still want. The plan's handoff front (P5) asks for a third path: a structured, goal-oriented checkpoint plus a new session that is linked to the parent, so the child starts small and can still reach the full history through existing tools.

## Proposal

`@deepseek-ai/dsh-handoff` registers `/handoff <goal>`. The command reads the live session projection (`session.deriveMessages()`), measures the context with the token meter, and renders a bounded checkpoint: goal first, then the parent session id and measured tokens, then the last request and last outcome, the recent tool calls with bounded arguments, the referenced files, and fixed guidance naming `session_event_search` and `session_trace` with the parent id. It creates a child session whose `header.parentSession` points at the parent, appends `turn/start` and one user-role message tagged `handoff-checkpoint`, and reports the child id and the measured token count. The parent is not forked, compacted, or deleted.

Measured continuation gate (deterministic proxy, no model run): three continuation tasks with five facts each. The checkpoint carries **15/15 facts** (recall 1,00), so the child needs **0 recovery searches**; a child without handoff needs **15** (one per missing fact). Six focused tests cover checkpoint bounds, linked child creation, parent immutability, usage validation, token reporting, and the gate. Nothing is mounted in shipped presets, so recorded snapshots are unchanged.

## Alternatives considered

- **Fork the parent into the child** — rejected: the child inherits the full history and its context cost, which is what the handoff exists to avoid.
- **Compact in place, then continue** — rejected: mutates the parent and destroys history the operator may still need; compaction already exists as a separate command.
- **Model-written handoff summary** — rejected: a model call adds cost, latency, and nondeterminism to a mechanical operation; the checkpoint is derived deterministically and the parent log remains the authority.
- **UI-only session duplication** — rejected: no durable `parentSession` link and no checkpoint message in the child log.

## Acceptance criteria

- `/handoff <goal>` creates a child with `header.parentSession` set, a first logged message carrying the checkpoint and parent guidance, and leaves the parent history unchanged.
- The checkpoint stays within the configured bounds and always names the parent id and the session tools.
- The continuation gate reports its recall and recovery-step numbers; an empty goal returns the usage error and creates no session.
- Focused tests, typecheck, and documentation gates pass; activation in a composition is a separate owner decision.

## Risks

- **Proxy gate** — recovery steps are counted from missing facts, not from a live model run; the number is an internal signal and a live evaluation remains the activation gate.
- **Checkpoint loss** — details beyond the bounded last exchange and working set are not carried; the guidance points to the parent log instead of pretending completeness.
- **Operator flow** — the command does not switch surfaces; the operator opens the reported child session.
- **Parent retention** — nothing disposes or compacts the parent automatically; retention stays with the operator.
