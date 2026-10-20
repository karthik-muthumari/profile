# Agent Teams — Master Reference Guide

> Purpose: a working reference for designing and running effective Claude Code agent teams in this project.
> Source: https://code.claude.com/docs/en/agent-teams (fetched 2026-10-20). Agent teams are **experimental**; re-check the source page when behavior seems different from what is written here.
>
> Sections marked **(Playbook)** are practical guidance derived from the documented behavior, not verbatim doc claims.

---

## 1. TL;DR

- One session is the **lead**; it spawns **teammates**, each a full independent Claude Code session with its own context window.
- Teammates **message each other directly** and (when the Task tools are available) share a **task list** they claim work from.
- Use teams when parallel exploration adds real value: research, review, competing-hypothesis debugging, new modules with clean file ownership, cross-layer work.
- Do **not** use teams for sequential work, same-file edits, or heavily dependent tasks. Use one session or subagents instead.
- Costs scale roughly linearly with teammate count. Start with **3–5 teammates**, **5–6 tasks per teammate**.
- Teammates **do not inherit the lead's conversation**. The spawn prompt is their only task-specific context. Make it rich.
- Give each teammate a **disjoint set of files**. Two teammates editing one file overwrite each other.

---

## 2. Enabling

Agent teams are off by default. Enable with the env var, in shell or `settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

**Status in this project:** already set in `.claude/settings.local.json`.

Notes:
- Without the variable: no team is set up, no team directories are written, Claude doesn't spawn or propose teammates.
- Requires an **interactive** session. With `-p` (non-interactive, including Agent SDK), Claude does not spawn teammates; a named subagent runs as an ordinary subagent.
- **Side effect of enabling:** Claude may name subagents on its own, and while teams are enabled a *named* subagent launches as a **teammate**. Teams can form without you asking. Claude Code doesn't ask for confirmation on launch.
- To turn this off, set the var to `"0"` (takes effect immediately for the next subagent; no new session needed). A `0` in user settings beats a shell export, but project/local settings, `--settings`, and managed settings are applied later and can still re-enable it.

---

## 3. Teams vs. subagents vs. other options

| | Subagents | Agent teams |
| :- | :- | :- |
| Context | Own window; result returns to caller | Own window; fully independent |
| Communication | Return result to caller (named subagents can also message each other) | Teammates message each other directly |
| Coordination | Main agent manages everything | Self-coordination via messages + shared task list |
| Best for | Focused tasks where only the result matters | Complex work needing discussion, challenge, collaboration |
| Token cost | Lower (results summarized back) | Higher (each teammate is a separate instance) |

Other lighter options listed in the docs:
- **Cross-session messaging** — sessions you run yourself pass findings between each other, no team.
- **Git worktrees** — manual parallel sessions, no automated coordination.

### Decision checklist (Playbook)

Use a **team** if most of these are true:
- [ ] Work splits into 3+ pieces that can proceed without waiting on each other
- [ ] Teammates benefit from seeing/challenging each other's findings
- [ ] Each piece can own distinct files (or is read-only research/review)
- [ ] The extra token cost is justified by speed or quality

Use **subagents** if you just need a worker to go do a thing and report back.
Use **a single session** if the work is sequential, tightly coupled, or lives in the same few files.

---

## 4. Architecture

| Component | Role |
| :- | :- |
| **Team lead** | Main session; spawns teammates, coordinates, synthesizes. Fixed for the session's lifetime. |
| **Teammates** | Separate Claude Code instances working assigned tasks |
| **Task list** | Shared work items; teammates claim and complete them |
| **Mailbox** | Inter-agent messaging |

### Storage

| What | Location | Lifetime |
| :- | :- | :- |
| Team config | `~/.claude/teams/{team-name}/config.json` | Removed when session ends |
| Mailboxes | `~/.claude/teams/{team-name}/inboxes/{agent-name}.json` | With team dir |
| Task list | `~/.claude/tasks/{team-name}/` | **Stays on disk** after session; governed by `cleanupPeriodDays` |

- `{team-name}` = `session-` + first 8 chars of the session ID.
- **Don't hand-edit or pre-author the team config** — it holds runtime state (session IDs, tmux pane IDs) and is overwritten. There is **no project-level team config**; `.claude/teams/teams.json` is just an ordinary file.
- To define reusable roles, use **subagent definitions** (section 7).
- Config has a `members` array (name, agent ID, agent type). Lead's type is always `team-lead`. Teammates can read it to discover each other.
- Mailbox entries are validated on read; malformed ones are reported and removed, valid ones still delivered. A message is only reported "sent" if the mailbox write succeeded; otherwise the sender gets an error.

### Tasks

- States: **pending → in progress → completed**.
- Tasks can **depend** on other tasks; a task with unresolved dependencies can't be claimed. Completing a task automatically unblocks dependents.
- Assignment: **lead assigns** explicitly, or teammates **self-claim** the next unassigned, unblocked task. Claiming uses **file locking** to avoid races.
- Agents *without* the Task tools coordinate by messages only.

---

## 5. Starting and controlling a team

### 5.1 Starting

Describe the task and the teammates in natural language:

```text
I'm designing a CLI tool that helps developers track TODO comments across
their codebase. Spawn three teammates to explore this from different angles:
one on UX, one on technical architecture, one playing devil's advocate.
```

- Claude may use **subagents** instead of a team. Subagents show in the same agent panel, so the panel doesn't prove a team formed. If you wanted a team, ask again and **explicitly say "agent team"**.
- For predictable names to reference later, **tell the lead what to call each teammate** in the spawn instruction. Otherwise the lead names them.

### 5.2 Agent panel (in-process mode)

Teammates are listed below the prompt input.

| Key | Action |
| :- | :- |
| Up / Down | Select a teammate |
| Enter | Open teammate transcript and message it directly |
| Esc | Clear selection; while viewing a teammate, **interrupts its current turn** |
| `x` | Stop the selected teammate |
| Ctrl+T | Toggle the task list |

Panel behavior:
- Idle rows hide 30s after *every* agent in the panel is idle; they reappear on the teammate's next turn. Hidden ≠ stopped; still addressable by name.
- With >3 idle teammates, extras collapse into an `N idle agents` row (Enter expands, Esc collapses).
- Working, failed, and currently viewed teammates always keep their rows.

While viewing a teammate: plain text and skills go to the **teammate**; built-in commands go to the **lead**.
- `/compact`, `/clear`, `/rewind` act on the lead's conversation → confirmation required.
- `/model` and `/fast` set the **lead's** model/fast mode → blocked from this view.
- A teammate's model and fast mode are **fixed at spawn**.

### 5.3 Display modes

| Mode | Behavior | Requirements |
| :- | :- | :- |
| `in-process` (default) | All teammates inside main terminal, via agent panel | Any terminal |
| `auto` | Split panes if already in tmux, or iTerm2 with `it2` installed; else in-process | — |
| `tmux` | Split panes; auto-detects tmux vs iTerm2 | tmux or iTerm2+`it2` |
| `iterm2` | iTerm2 native panes explicitly; errors with install hint if `it2` missing | `it2` CLI |

Set persistently in `~/.claude/settings.json`:

```json
{ "teammateMode": "auto" }
```

Or per session (experimental flag, not in `--help`):

```bash
claude --teammate-mode auto
```

Setup:
- **tmux:** install via package manager. Works best on macOS; `tmux -CC` in iTerm2 is the suggested entry point.
- **iTerm2:** install `it2` CLI (https://github.com/mkusaka/it2), then enable **iTerm2 → Settings → General → Magic → Enable Python API**.
- Split panes are **not supported** in VS Code's integrated terminal, Windows Terminal, or Ghostty.

### 5.4 Specifying teammates and models

```text
Spawn 4 teammates to refactor these modules in parallel. Use Sonnet for
each teammate.
```

Model selection order (first that applies wins):
1. Model named in your spawn prompt for that teammate
2. The `model` in the subagent definition (if spawned from one; `inherit` = lead's model)
3. `CLAUDE_CODE_SUBAGENT_MODEL` env var, if set to anything but `inherit`
4. The lead's current model

Details:
- `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1` (v2.1.257+) skips sources 1–2: every teammate uses `CLAUDE_CODE_SUBAGENT_MODEL` (if not `inherit`), else the lead's model.
- Before v2.1.251, `CLAUDE_CODE_SUBAGENT_MODEL` came first.
- `teammateDefaultModel` was **removed** (v2.1.234). Name the model in the prompt instead.
- Org `availableModels` allowlist is enforced: a blocked family alias (e.g. `opus`) falls to the newest permitted version of that family on Anthropic API / Claude Platform on AWS; any other blocked value falls back to the lead's model (trying `CLAUDE_CODE_SUBAGENT_MODEL` first if set).
- Teammates inherit the lead's **effort level** by default (split-pane from v2.1.186).

### 5.5 Plan-before-implement

Put the **lead in plan mode first**, then ask for the teammate:

```text
Spawn an architect teammate to refactor the authentication module.
```

- The teammate works read-only until its plan is ready, then sends a plan-approval request to the lead.
- **Caveat:** Claude Code auto-approves the plan in the lead's session as soon as it arrives — the lead does *not* review it. Edits/commands afterward still go through normal permission prompts. Don't rely on plan approval as a real human review gate.

### 5.6 Shutting down

```text
Ask the researcher teammate to shut down
```

- Lead sends a shutdown request; the teammate can approve or reject with an explanation.
- Teammates finish their current request/tool call first, so shutdown can be slow.
- Shared team directories are cleaned automatically at session end (task list dir persists; see section 4).

### 5.7 Quality-gate hooks

| Hook | Fires | Exit code 2 does |
| :- | :- | :- |
| `TeammateIdle` | Teammate about to go idle | Sends feedback, keeps teammate working |
| `TaskCreated` | Task being created | Blocks creation, sends feedback |
| `TaskCompleted` | Task being marked complete | Blocks completion, sends feedback |

Good fits (Playbook): `TaskCompleted` running tests/lint before a task may close; `TeammateIdle` pushing a teammate to finish unfinished checklist items.

---

## 6. Context, communication, and permissions

### Context
- Each teammate loads the same project context as a normal session: **CLAUDE.md, MCP servers, skills**.
- If the lead was started with `--setting-sources`, teammates use the same restricted sources (split-pane teammates did not before v2.1.281).
- Teammates get the **spawn prompt only** — **no lead conversation history**.

### Communication
- Messages are delivered automatically; the lead doesn't poll.
- **Idle notifications** go to the lead with the teammate's final answer (or error text if the turn ended on an API error).
- Messaging is **one recipient per message**; to reach everyone, send one per recipient.
- A message from lead/teammate wakes an in-process teammate that's waiting to retry a failed API request.
- If the lead messages an in-process teammate that's no longer running, Claude Code revives it in-session and restores its saved conversation. This does **not** happen after a session resume.

### Permissions
- Teammates start with the **lead's permission mode**, except `dontAsk` (not inherited). `--dangerously-skip-permissions` on the lead propagates to all teammates.
- You can change an individual teammate's mode **after** spawn, but **cannot set per-teammate modes at spawn**.
- Teammate permission prompts **bubble up to the lead** — approve them there.
- Inter-agent messages are labeled as coming from another Claude session, **not the user**. A teammate can't approve a prompt or grant consent for you, and a denied action can't be relayed to another teammate to bypass the check.
- In **auto mode**, the classifier treats relayed approval claims as untrusted and reviews every inter-agent message (including shutdown and plan-approval messages) before delivery; blocked messages never arrive.

### Token / cache behavior
- Usage scales with active teammates (see https://code.claude.com/docs/en/costs#agent-team-token-costs).
- In-process teammate requests use a **5-minute** prompt-cache TTL by default (even on subscription). Set `subagentPromptCacheTtl` to `1h` to extend; 1-hour cache writes bill at a higher rate.

---

## 7. Reusable roles via subagent definitions

Define a role once (project, user, managed, or plugin scope) and use it as both a subagent and a teammate:

```text
Spawn a teammate using the security-reviewer agent type to audit the auth module.
```

What gets applied from the definition:

| Field | Behavior |
| :- | :- |
| `tools` | Teammate limited to this list. In-process: `SendMessage` added; with Task tools available, `TaskCreate/Get/List/Update` added too |
| `model` | Used in either mode when spawn prompt names none |
| `disallowedTools` | In-process only. Removed from the set; `SendMessage` and Task tools stay regardless |
| `effort` | In-process only |
| `autoCompactWindow` | In-process only (v2.1.296+); ignored for split-pane |
| Body | In-process: **appended** to default system prompt. Split-pane: **replaces** default system prompt |
| `skills` | **Not applied** in either mode; teammate loads skills from project/user settings |
| `mcpServers` | Split-pane only; in-process ignores it and uses project/user MCP servers |

Trust caveat: when a teammate is revived, a definition from `.claude/agents/` or an `--add-dir` directory is re-applied **only if you've trusted that exact folder** (trusting a parent doesn't count). Otherwise it returns with none of the definition's tools/instructions.

### Role-library ideas to create in `.claude/agents/` (Playbook)
- `security-reviewer` — read-only tools, focused on auth/injection/secrets, outputs severity-rated findings
- `perf-reviewer` — read-only, looks at hot paths / bundle size / render cost
- `test-reviewer` — read-only, assesses coverage and missing cases
- `devils-advocate` — read-only, challenges assumptions and others' claims
- `implementer` — edit tools, constrained to an owned file set (stated in the spawn prompt)
- `researcher` — web/doc tools only, no edit tools

---

## 8. Best practices

### 8.1 Spawn prompts must carry the context
Teammates know CLAUDE.md but nothing from your conversation. Include: scope (paths), goal, constraints, known facts about the stack, and the exact output format.

```text
Spawn a security reviewer teammate with the prompt: "Review the authentication module
at src/auth/ for security vulnerabilities. Focus on token handling, session
management, and input validation. The app uses JWT tokens stored in
httpOnly cookies. Report any issues with severity ratings."
```

### 8.2 Team size
- Start at **3–5**. "Three focused teammates often outperform five scattered ones."
- No hard cap, but cost is linear, coordination overhead grows, returns diminish.
- Example from docs: 15 independent tasks → start with 3 teammates.

### 8.3 Task sizing
- **Too small:** coordination overhead > benefit.
- **Too large:** long stretches without check-ins; wasted-effort risk.
- **Right:** self-contained unit with a clear deliverable (a function, a test file, a review).
- Aim for **5–6 tasks per teammate**. If the lead creates too few tasks, ask it to split further.

### 8.4 Avoid file conflicts
One owner per file/directory. State ownership explicitly in each spawn prompt.

### 8.5 Make the lead wait
The lead sometimes starts implementing itself. Counter with:

```text
Wait for your teammates to complete their tasks before proceeding
```

### 8.6 Start with read-only work
New to teams? Begin with PR review, library research, or bug investigation before parallel implementation.

### 8.7 Monitor and steer
Check in, redirect, synthesize as results arrive. Unattended runs raise wasted-effort risk.

### 8.8 Reduce permission friction
Pre-approve common operations in permission settings **before** spawning, since prompts bubble up to the lead.

---

## 9. Proven patterns

### 9.1 Parallel code review
Distinct lenses so teammates don't overlap; lead synthesizes.

```text
Spawn three teammates to review PR #142:
- One focused on security implications
- One checking performance impact
- One validating test coverage
Have them each review and report findings.
```

### 9.2 Competing-hypotheses debugging
Fights anchoring: a single investigator finds one plausible cause and stops. Adversarial teammates make the surviving theory more likely to be the real one.

```text
Users report the app exits after one message instead of staying connected.
Spawn 5 agent teammates to investigate different hypotheses. Have them talk to
each other to try to disprove each other's theories, like a scientific
debate. Update the findings doc with whatever consensus emerges.
```

### 9.3 Multi-perspective design exploration
UX / architecture / devil's advocate (the first-team example in section 5.1).

### 9.4 Parallel module build (Playbook)
Lead decomposes → one teammate per module, each with an explicit file-ownership list → shared interface/contract agreed first (as an early task others depend on) → integration + test task blocked on all modules.

### 9.5 Cross-layer feature (Playbook)
Frontend / backend / tests teammates; task dependencies enforce "API contract → implementations → integration tests".

---

## 10. Prompt templates (Playbook)

**Generic team spawn**
```text
Create an agent team to <goal>. Spawn <N> teammates:
- <name-1>: <role>. Owns: <paths>. Deliverable: <output>.
- <name-2>: <role>. Owns: <paths>. Deliverable: <output>.
Use <model> for each. Context they need: <stack facts, constraints, links>.
Create tasks with dependencies where order matters, aim for ~5 tasks each.
Do not implement anything yourself; wait for teammates to finish, then
synthesize into <format>.
```

**Adversarial investigation**
```text
Spawn <N> teammates, each owning one hypothesis: <h1>, <h2>, ...
Each must (1) gather evidence for its theory, (2) try to disprove at least
one other teammate's theory by messaging them. Report the surviving
hypothesis with evidence and what was ruled out.
```

**Review with named roles**
```text
Spawn teammates named "sec", "perf", "tests" to review <target>. Read-only —
no edits. Each reports findings as: severity, file:line, issue, suggested fix.
Lead merges and de-duplicates.
```

**Planning gate** (switch lead to plan mode first)
```text
Spawn an architect teammate to plan <change>. It should propose file-level
changes and risks before touching code.
```

---

## 11. Troubleshooting

| Symptom | Likely cause / fix |
| :- | :- |
| Teammates not appearing | In-process: check agent panel, arrow keys + Enter. Row may be hidden (idle) — message the teammate by name. Task may have been too simple for Claude to bother with a team. For split panes: `which tmux`; for iTerm2: `it2` installed + Python API enabled. |
| Got subagents, not a team | Re-ask and explicitly say "agent team". Subagents share the same panel. |
| Claude spawns teammates when you wanted subagents | Set `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` to `"0"`; check for a higher-precedence source (project/local settings, `--settings`, managed) that sets it to `1`. |
| Too many permission prompts | Pre-approve common ops in permission settings before spawning. |
| Teammate stopped after an error | Open its transcript; give new instructions, or spawn a replacement. A message wakes a teammate waiting on API retry. |
| Lead declared done too early | Tell it to keep going / wait for teammates. |
| Task stuck, blocks dependents | Teammate didn't mark it complete. Verify the work is done, update status manually or have the lead nudge. |
| Lead messaging teammates that no longer exist | After `/resume` or `/rewind` in-process teammates are gone. Tell the lead to spawn new ones. |
| Orphaned tmux session | `tmux ls` then `tmux kill-session -t <session-name>` |
| Mailbox write error | See https://code.claude.com/docs/en/errors#failed-to-write-to-a-teammates-inbox (disk full / dir not writable) |
| Teammate lost its agent definition tools | Folder not trusted — see trust caveat in section 7 |

---

## 12. Limitations (as documented)

- **No session resumption** for in-process teammates (`/resume`, `/rewind` don't restore them).
- **Task status can lag** — teammates sometimes fail to mark tasks complete.
- **Shutdown can be slow** — current request/tool call finishes first.
- **One team per session** — no extra named teams, no sharing across sessions.
- **No nested teams** — teammates can't spawn teammates; only the lead manages the team.
- **No background subagents from in-process teammates** — a teammate's subagents run in the foreground; `background: true` definitions error, `run_in_background: true` errors or silently runs foreground.
- **Lead is fixed** — can't promote a teammate or transfer leadership.
- **Permissions set at spawn** — inherited from the lead; can be changed per teammate afterward only.
- **Split panes need tmux or iTerm2** — not VS Code terminal, Windows Terminal, or Ghostty.

---

## 13. Quick-reference cheat sheet

```text
ENABLE      env CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1   (0 to disable)
DISPLAY     teammateMode: in-process | auto | tmux | iterm2   /  --teammate-mode
KEYS        ↑/↓ select · Enter open · Esc clear/interrupt · x stop · Ctrl+T tasks
MODEL ORDER spawn prompt > definition.model > CLAUDE_CODE_SUBAGENT_MODEL > lead
SIZE        3–5 teammates · 5–6 tasks each · disjoint files
HOOKS       TeammateIdle · TaskCreated · TaskCompleted  (exit 2 = block + feedback)
FILES       ~/.claude/teams/{session-xxxxxxxx}/config.json  (deleted at end)
            ~/.claude/teams/{team}/inboxes/{agent}.json
            ~/.claude/tasks/{team}/                         (persists)
ROLES       .claude/agents/*.md  → reusable as subagent AND teammate
REMEMBER    no lead history for teammates · plan approval is auto · no nesting
```

---

## 14. Pre-flight checklist before spawning (Playbook)

1. Is a team actually warranted (section 3)? Are pieces independent?
2. Is each teammate's **file ownership** disjoint, or are they read-only?
3. Does each spawn prompt include **scope, context, constraints, output format**?
4. Are teammates **named** so I can address them later?
5. Is the **model** specified (cheaper model for mechanical work)?
6. Are common **permissions pre-approved**?
7. Are **dependencies** between tasks stated (contracts before implementations, integration last)?
8. Told the lead to **wait** and **synthesize**, not implement?
9. Any **hooks** needed as quality gates?
10. Plan to **monitor** and steer rather than walk away?
