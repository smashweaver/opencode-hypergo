# Learning guide

A guided tour of this repository for learning how **OpenCode v2 custom agents** and **server plugins** work. Read the official docs alongside each file; every source file also carries a `LEARN` header pointing at the relevant sections.

## Core documentation

| Topic | Link |
|-------|------|
| Agents (custom agents, modes, options) | https://opencode.ai/docs/agents/ |
| Permissions (ordered rules, effects) | https://opencode.ai/docs/permissions/ |
| Plugins — configure & load | https://opencode.ai/docs/plugins/ |
| Building a plugin (package layout) | https://opencode.ai/docs/build/plugins |
| Server plugin API (transforms, hooks, tools) | https://opencode.ai/docs/build/plugins/server |

## The mental model

1. **A plugin is a package with a server part.** The `exports["."]` entry points at a TypeScript file that default-exports `Plugin.define({ id, setup })`. OpenCode loads it into the server and calls `setup(ctx)` once. → [build/plugins](https://opencode.ai/docs/build/plugins)
2. **Transforms edit registry state.** `ctx.agent.transform`, `ctx.tool.transform`, `ctx.model.transform`, … give an editor whose `add`/`update`/`remove` calls change what OpenCode sees. Transforms are synchronous and replayed in order. → [build/plugins/server#agent](https://opencode.ai/docs/build/plugins/server)
3. **Agents are profiles.** An agent = system prompt + `mode` (`primary`/`subagent`/`all`) + ordered `permissions` + optional model/display fields. `orchestrator` is `primary`; the other three are `subagent`s launched through the `subagent` tool. → [agents](https://opencode.ai/docs/agents/)
4. **Permissions are ordered rules.** `{ action, resource, effect }`, **last matching rule wins** — broad rule first, exceptions after. Every agent also inherits the built-in base policy. → [permissions](https://opencode.ai/docs/permissions/)
5. **Hooks intercept live operations.** The session `context` hook runs before each agent-loop model call and may edit the outgoing `tools`, `system`, `messages`, `options` for that request only. → [build/plugins/server#hooks](https://opencode.ai/docs/build/plugins/server)
6. **Custom tools assert their own permissions.** A tool's `execute` receives OpenCode-supplied identity (never model-controlled) and can call `ctx.permission.assert` to evaluate the session's rules before doing anything sensitive. → [build/plugins/server#permissions](https://opencode.ai/docs/build/plugins/server)

## File map

| File | What it teaches | Docs |
|------|-----------------|------|
| `package.json` | Plugin package layout: `"type": "module"`, `exports["."]` = server part, dependency pinned to `@opencode/plugin` 2.4.1 | [build/plugins](https://opencode.ai/docs/build/plugins) |
| `src/index.ts` | Plugin entrypoint: `Plugin.define`, `setup(ctx)`, agent transform + `editor.update` upsert, tool transform + `editor.add`, `ctx.permission.assert`, session `context` hook | [build/plugins/server](https://opencode.ai/docs/build/plugins/server) |
| `src/roles.mjs` | Agent definitions as data; deny-by-default ordered permission rules; deny-all + scoped allows | [agents](https://opencode.ai/docs/agents/), [permissions](https://opencode.ai/docs/permissions/) |
| `src/tool-policy.mjs` | The `context` hook in practice: filtering the model-visible tool record per request | [build/plugins/server](https://opencode.ai/docs/build/plugins/server) |
| `src/runner.mjs` | The non-OpenCode half: a grant CLI (`grant`/`close`) and a bubblewrap+prlimit sandbox; identity flows from the plugin context only | [permissions](https://opencode.ai/docs/permissions/) (identity side) |
| `src/assets/*.md` | The `system` prompt text for each role (the Markdown body equivalent of a Markdown agent file) | [agents#system](https://opencode.ai/docs/agents/) |
| `tests/roles.test.mjs` | Model-free tests of the packaged data (`node --test`) | — |

## Two sequences worth tracing

**Plugin load**
1. A consuming project lists this package in `opencode.json(c).plugins` → [plugins](https://opencode.ai/docs/plugins/)
2. OpenCode loads `src/index.ts` (the `exports["."]` server part) and calls `setup(ctx)`
3. The agent transform upserts the four roles; the tool transform adds `hypergo_spike`; the `context` hook is registered
4. `opencode debug agents` shows the effective registry

**A `hypergo_spike` call**
1. The model (as `researcher`/`reviewer`) calls the tool; OpenCode passes validated input + context (`sessionID`, `agent`, `messageID`, `callID`)
2. The tool filter (`context` hook) is what made the tool visible only to inspectors
3. `execute` calls `ctx.permission.assert` with that identity — a deny ends the call
4. The runner re-checks the identity against the stored grant, then runs the script in the sandbox
5. Result `content` returns to the model

## Try it

```sh
npm test                      # or: bun test
opencode debug agents         # in a project that loads this plugin
```

## Exercises

1. Add a fifth role that may `read` but not `grep`, and dispatch nothing.
2. Change `orchestrator` to also allow `subagent: build`, and predict which rule wins.
3. Extend `filterTools` to also hide `websearch` from inspectors, then add a test.
4. Register a second tool that logs its `context.agent` and compare with `opencode debug agents`.
