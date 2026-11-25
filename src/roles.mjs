import { readFileSync } from "node:fs";

const instructions = (name) => readFileSync(new URL(`./assets/${name}.md`, import.meta.url), "utf8").trim();
const defaultPermissions = [
  { action: "*", resource: "*", effect: "allow" },
  { action: "read", resource: "*.env", effect: "ask" },
  { action: "read", resource: "*.env.*", effect: "ask" },
  { action: "read", resource: "*.env.example", effect: "allow" },
];
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
