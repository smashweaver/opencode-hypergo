import { Plugin } from "@opencode/plugin";
import { roles } from "./roles.mjs";
import { runSpike } from "./runner.mjs";
import { filterTools } from "./tool-policy.mjs";

const toolName = "hypergo_spike";

export default Plugin.define({
  id: "opencode-hypergo",
  async setup(ctx) {
    // The public AgentEditor.update transform upserts: a missing ID becomes
    // discoverable in the same location registry. Probe-tested on OpenCode
    // 2.4.1; use only the public transform API.
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
        // OpenCode supplies identity and cancellation; the model cannot choose
        // the role or session that a grant belongs to.
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

    // Restrict the model-visible tools as well as the role permission rules:
    // session/worktree utilities may not check edit or shell permissions.
    await ctx.session.hook("context", (event) => filterTools(event.agent, event.tools));
  },
});
