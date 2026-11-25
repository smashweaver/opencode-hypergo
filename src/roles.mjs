/**
 * LEARN: Agent (role) definitions — pure data, no OpenCode imports.
 *
 * Each entry here becomes an OpenCode v2 agent definition (Agent.Info) when
 * src/index.ts applies it through `ctx.agent.transform` + `editor.update`.
 * An agent = system prompt + mode + permissions + optional model/display
 * fields. Markdown agent files (`.opencode/agents/<name>.md`) hold the same
 * shape; this package instead injects the definitions from code.
 *
 * PERMISSIONS ARE ORDERED — the LAST matching rule wins, so broad rules come
 * first and exceptions follow. Every agent starts with OpenCode's built-in
 * base policy (allow-all, then .env guards); agent rules are APPENDED to it,
 * not replaced.
 *
 * DOCS
 * - Agent options (mode, system, model, permissions, hidden, request):
 *     https://opencode.ai/docs/agents/
 * - Rule fields, effects, wildcards, "last matching rule wins":
 *     https://opencode.ai/docs/permissions/
 * - The default base policy every agent inherits:
 *     https://opencode.ai/docs/permissions/#defaults
 */
import { readFileSync } from "node:fs";

const instructions = (name) => readFileSync(new URL(`./assets/${name}.md`, import.meta.url), "utf8").trim();
const defaultPermissions = [
  { action: "*", resource: "*", effect: "allow" },
  { action: "read", resource: "*.env", effect: "ask" },
  { action: "read", resource: "*.env.*", effect: "ask" },
  { action: "read", resource: "*.env.example", effect: "allow" },
];
// LEARN: deny-by-default pattern — start with `deny *` then allow only what
// the role needs. Because the last matching rule wins, these allows override
// the deny for exactly their scope.
const denyAll = [{ action: "*", resource: "*", effect: "deny" }];
const read = { action: "read", resource: "*", effect: "allow" };
const noEnv = [
  { action: "read", resource: "*.env", effect: "deny" },
  { action: "read", resource: "*.env.*", effect: "deny" },
];

export const roles = [
  {
    id: "orchestrator",
    description: "Assigns bounded work, brokers research spikes, and routes worker returns to independent review",
    mode: "primary",
    permissions: [
      ...defaultPermissions,
      { action: "subagent", resource: "*", effect: "deny" },
      { action: "subagent", resource: "worker", effect: "allow" },
      { action: "subagent", resource: "researcher", effect: "allow" },
      { action: "subagent", resource: "reviewer", effect: "allow" },
    ],
    system: instructions("orchestrator"),
  },
  {
    id: "worker",
    description: "Implements one authorized task revision and returns evidence to its orchestrator",
    mode: "subagent",
    permissions: [
      ...defaultPermissions,
      { action: "subagent", resource: "*", effect: "deny" },
      { action: "question", resource: "*", effect: "deny" },
    ],
    system: instructions("worker"),
  },
  {
    id: "researcher",
    description: "A research worker that inspects sources and runs authorized disposable experiments in its own scratch directory",
    mode: "subagent",
    permissions: [
      ...defaultPermissions,
      ...denyAll,
      read,
      ...noEnv,
      { action: "glob", resource: "*", effect: "allow" },
      { action: "grep", resource: "*", effect: "allow" },
      { action: "webfetch", resource: "https://*", effect: "allow" },
      { action: "hypergo_spike", resource: "*", effect: "allow" },
    ],
    system: instructions("researcher"),
  },
  {
    id: "reviewer",
    description: "Independently reviews task results against the contract and reports actionable findings",
    mode: "subagent",
    permissions: [
      ...defaultPermissions,
      ...denyAll,
      read,
      ...noEnv,
      { action: "glob", resource: "*", effect: "allow" },
      { action: "grep", resource: "*", effect: "allow" },
      { action: "hypergo_spike", resource: "*", effect: "allow" },
    ],
    system: instructions("reviewer"),
  },
];
