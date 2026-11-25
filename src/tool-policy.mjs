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
