/**
 * LEARN: Plugin entrypoint — the "server part" of an OpenCode v2 plugin.
 *
 * WHAT HAPPENS TO THIS FILE
 * When a project lists this package under `plugins` in `opencode.json(c)`,
 * OpenCode loads this file into its server process and calls `setup(ctx)`
 * once. `ctx` is a client-like handle onto the running server plus
 * plugin-only extensions: transforms, hooks, and permission APIs.
 *
 * This plugin does three things in `setup`:
 *   1. Registers four custom agents (roles) via an agent transform.
 *   2. Registers one custom tool (`hypergo_spike`) via a tool transform.
 *   3. Installs a session "context" hook that filters model-visible tools.
 *
 * DOCS
 * - Configure/load plugins:        https://opencode.ai/docs/plugins/
 * - Plugin package layout:         https://opencode.ai/docs/build/plugins
 * - Server plugin API (all of it): https://opencode.ai/docs/build/plugins/server
 * - Agents (modes, options):       https://opencode.ai/docs/agents/
 * - Permission rules:              https://opencode.ai/docs/permissions/
 */
import { Plugin } from "@opencode/plugin";
import { roles } from "./roles.mjs";
import { runSpike } from "./runner.mjs";
import { filterTools } from "./tool-policy.mjs";

const toolName = "hypergo_spike";

export default Plugin.define({
  id: "opencode-hypergo",
  async setup(ctx) {
    // LEARN: agent transform. `editor.update(id, fn)` edits an agent draft in
    // place; on this release (2.4.1) an update to a MISSING id materializes
    // that agent in the registry — an observed behavior, not a documented
    // guarantee. All fields we touch exist on Agent.Info; optional ones
    // (`model`, `steps`, `color`) are cleared so a colliding definition
    // cannot leak stale values.
    // Docs: https://opencode.ai/docs/build/plugins/server (section "Agent")
    //       https://opencode.ai/docs/agents/ (agent options and merging)
    await ctx.agent.transform((editor) => {
      for (const role of roles) {
        editor.update(role.id, (agent) => {
          // Clear optional fields from a colliding older definition so the
          // packaged role does not inherit stale values. `request` is always
          // reset below, so it is not deleted here.
          delete agent.model;
          // delete agent.request;
          delete agent.steps;
          delete agent.color;
          Object.assign(agent, {
            id: role.id,
            name: role.id,
            request: { settings: {}, headers: {}, body: {} },
            description: role.description,
            mode: role.mode,
            hidden: false,
            system: role.system,
            permissions: role.permissions,
          });
        });
      }
    });

    // LEARN: tool transform. `editor.add` REGISTERS a new tool (agents use
    // `update` to upsert; tools need `add` to be created). The definition has
    // a JSON-schema `input`, `options` (codemode: false = never wrap this in
    // Code Mode), and an `execute` handler. `execute` receives the validated
    // input plus a context carrying OpenCode-supplied identity
    // (sessionID/agent/messageID/callID) and an AbortSignal.
    // Docs: https://opencode.ai/docs/build/plugins/server (section "Tools")
    await ctx.tool.transform((editor) => editor.add({
      name: toolName,
      description: "Execute a bounded shell experiment in your assigned isolated scratch run. Read /input; write /work. Requires a grant from your orchestrator.",
      options: { codemode: false },
      input: {
        type: "object",
        additionalProperties: false,
        required: ["task", "script"],
        properties: {
          task: { type: "string" },
          script: { type: "string" },
        },
      },
      execute: async (input, context) => {
        // LEARN: permission.assert evaluates the session's ordered permission
        // rules for (action, resources). Identity comes from OpenCode's
        // context — never from model-controlled tool input — so the model
        // cannot choose which role or session a grant belongs to. `source`
        // ties the prompt to this exact tool call; `save: []` stores nothing
        // on "allow always". Let deny/ask errors propagate.
        // Docs: https://opencode.ai/docs/build/plugins/server (section "Permissions")
        //       https://opencode.ai/docs/permissions/ (rules, effects, matching)
        await ctx.permission.assert({
          sessionID: context.sessionID,
          agent: context.agent,
          source: { type: "tool", messageID: context.messageID, id: context.id },
          action: toolName,
          resources: ["*"],
          save: [],
        });
        return { content: await runSpike(input as { task: string; script: string }, context) };
      },
    }));

    // LEARN: session "context" hook. It runs for every agent-loop model
    // request and may edit `event.system`, `event.messages`, `event.tools`,
    // and `event.options` for that outgoing call only — persisted config is
    // untouched. We use it to remove tools the model should not see at all
    // (defense in depth on top of the role permission rules above).
    // Docs: https://opencode.ai/docs/build/plugins/server (section "Hooks" →
    //       "Sessions" → model requests / "context")
    // Restrict the model-visible tools as well as the role permission rules:
    // session/worktree utilities may not check edit or shell permissions.
    await ctx.session.hook("context", (event) => filterTools(event.agent, event.tools));
  },
});
