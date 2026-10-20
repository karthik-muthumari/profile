---
title: "Spec-Driven Development with Claude Code"
date: 2026-09-18
summary: "How structured Markdown specs, project guardrails and reusable instructions turned an AI pair-programmer from a clever autocomplete into a dependable teammate."
tags: [AI, Claude Code, SDD, Engineering]
---

When I first started using AI coding tools, I did what everyone does: typed a wish into a chat box and hoped. Sometimes it was magic. Just as often I got confident code that quietly ignored half my conventions.

What changed my results was moving the *thinking* out of the prompt and into **files in the repo**. That is Spec-Driven Development (SDD) in a nutshell.

## The three layers

1. **Specs** — a short Markdown document per change: the problem, the behaviour, edge cases, and explicit acceptance criteria. It is the contract.
2. **Guardrails** — project-level instructions that never change per task: architecture rules, naming, testing expectations, "never do X".
3. **Reusable instructions** — small, named playbooks for repeated work (add an endpoint, write a migration, review a PR).

> The model is only as good as the context it can see. Specs make that context deliberate instead of accidental.

## A spec that works

```md
# Spec: calculate tax for a basket line

## Behaviour
- Given a line item and a jurisdiction, return the applicable rate and amount.
- Rounding happens once, at line level.

## Edge cases
- Unknown jurisdiction -> typed error, never a silent 0%.

## Acceptance
- [ ] Unit tests cover each edge case
- [ ] No new runtime dependencies
```

Notice it says *what* and *why*, not *how*. The implementation is where the assistant earns its keep, and the acceptance list is where I earn mine.

## What I learned

- **Review the spec, not just the diff.** A bad spec produces a perfectly-formed wrong answer. Ten minutes on the spec saves an hour of untangling.
- **Guardrails beat prompts.** Writing a rule once in the repo is cheaper than repeating it in every conversation.
- **Small specs, small changes.** The assistant is far more reliable when a task fits comfortably in one head — mine included.
- **Tests are part of the spec.** If acceptance criteria are not executable, they are wishes.

None of this is exotic. It is the discipline good teams already had, made explicit so that a tireless collaborator can follow it too.
