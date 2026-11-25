/**
 * LEARN: Model-visible tool filtering for the session "context" hook.
 *
 * OpenCode hands this plugin the `tools` record that is about to be sent to
 * the model; deleting a key removes the tool from the model's view for that
 * request. This is defense in depth — the role permission rules in roles.mjs
 * already gate what the tools may DO; this filters what the model can SEE.
 *
 * The event is per model call: edits affect only the outgoing request, never
 * persisted configuration or other sessions.
 *
 * DOCS
 * - Session "context" hook (mutable event, per-request scope):
 *     https://opencode.ai/docs/build/plugins/server (section "Hooks" → "Sessions")
 */
const inspectionTools = new Set(["read", "grep", "glob", "hypergo_spike"]);

export function filterTools(agent, tools) {
  if (agent === "researcher" || agent === "reviewer") {
    for (const name of Object.keys(tools)) {
      if (!inspectionTools.has(name) && !(agent === "researcher" && name === "webfetch")) {
        delete tools[name];
      }
    }
  } else {
    delete tools.hypergo_spike;
  }
}
