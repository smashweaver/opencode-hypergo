/**
 * LEARN: Model-free tests. These run with plain `node --test` (or `bun test`)
 * and check the packaged DATA, not a live OpenCode server: role ids/modes,
 * the ordered permission rules, and what the "context" hook leaves in the
 * model-visible tool record. To verify against a real server instead, load
 * the plugin in a project and run `opencode debug agents`.
 *
 * DOCS
 * - Agents / permissions concepts these tests encode:
 *     https://opencode.ai/docs/agents/
 *     https://opencode.ai/docs/permissions/
 */
import assert from "node:assert/strict";
import test from "node:test";
import { roles } from "../src/roles.mjs";
import { filterTools } from "../src/tool-policy.mjs";

const ids = ["orchestrator", "worker", "researcher", "reviewer"];

test("packages exactly the four named roles with the expected modes and descriptions", () => {
  assert.deepEqual(roles.map((role) => role.id), ids);
  assert.deepEqual(roles.map((role) => role.mode), ["primary", "subagent", "subagent", "subagent"]);
  assert.ok(roles.every((role) => role.description.length > 0 && role.system.length > 0));
  assert.ok(roles.every((role) => !("model" in role)), "model selection must inherit from explicit dispatcher assignment");
});

test("orchestrator can dispatch only the three delegated role names", () => {
  assert.deepEqual(roles[0].permissions.slice(-4), [
    { action: "subagent", resource: "*", effect: "deny" },
    { action: "subagent", resource: "worker", effect: "allow" },
    { action: "subagent", resource: "researcher", effect: "allow" },
    { action: "subagent", resource: "reviewer", effect: "allow" },
  ]);
});

test("worker cannot delegate or ask questions", () => {
  assert.deepEqual(roles[1].permissions.slice(-2), [
    { action: "subagent", resource: "*", effect: "deny" },
    { action: "question", resource: "*", effect: "deny" },
  ]);
});

test("research and review roles deny by default and retain only scoped grants", () => {
  for (const id of ["researcher", "reviewer"]) {
    const role = roles.find((entry) => entry.id === id);
    assert.deepEqual(role.permissions.slice(4, 5), [{ action: "*", resource: "*", effect: "deny" }]);
    assert.ok(role.permissions.some((rule) => rule.action === "read" && rule.effect === "allow"));
    assert.ok(role.permissions.some((rule) => rule.action === "read" && rule.resource === "*.env" && rule.effect === "deny"));
    assert.ok(role.permissions.some((rule) => rule.action === "read" && rule.resource === "*.env.*" && rule.effect === "deny"));
    assert.ok(role.permissions.some((rule) => rule.action === "glob" && rule.effect === "allow"));
    assert.ok(role.permissions.some((rule) => rule.action === "grep" && rule.effect === "allow"));
    assert.ok(role.permissions.some((rule) => rule.action === "hypergo_spike" && rule.effect === "allow"));
  }
  assert.ok(roles.find((role) => role.id === "researcher").permissions.some(
    (rule) => rule.action === "webfetch" && rule.resource === "https://*" && rule.effect === "allow",
  ));
  assert.ok(!roles.find((role) => role.id === "reviewer").permissions.some((rule) => rule.action === "webfetch"));
});

test("tool filtering removes write, shell, session and worktree tools for inspectors", () => {
  const available = () => Object.fromEntries(
    ["read", "grep", "glob", "hypergo_spike", "webfetch", "edit", "write", "shell", "session_create", "worktree_create"]
      .map((name) => [name, {}]),
  );
  for (const id of ["researcher", "reviewer"]) {
    const tools = available();
    filterTools(id, tools);
    assert.deepEqual(Object.keys(tools).sort(), (
      id === "researcher"
        ? ["read", "grep", "glob", "hypergo_spike", "webfetch"]
        : ["read", "grep", "glob", "hypergo_spike"]
    ).sort());
  }
  for (const id of ["orchestrator", "worker"]) {
    const tools = available();
    filterTools(id, tools);
    assert.ok(!("hypergo_spike" in tools), `${id} must not see the scratch tool`);
  }
});
