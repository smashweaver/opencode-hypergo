# T001 — Package HyperGo roles for OpenCode

- **ID:** `opencode-hypergo:T001`
- **Repository:** `opencode-hypergo`
- **Nature:** `feature`
- **Revision:** `r1` (green field)
- **State:** `Complete`

**Scope.** A project-local OpenCode V2 server plugin that registers the HyperGo `orchestrator`, `worker`, `researcher`, and `reviewer` roles plus the restricted `hypergo_spike` tool. The package loads from a local directory in a consuming project's `opencode.json` plugin list and touches no user-level config, global profiles, or other repositories.

**Roles.**

- `orchestrator` (primary) — delegates only to `worker`, `researcher`, and `reviewer`.
- `worker` (subagent) — cannot delegate or ask questions.
- `researcher` (subagent) — deny-by-default; scoped read/glob/grep/webfetch (https)/hypergo_spike.
- `reviewer` (subagent) — deny-by-default; scoped read/glob/grep/hypergo_spike (no webfetch).

Roles do not pin models; dispatchers select an explicit authorized `provider/model#variant` for each child.

**Spike runner.** Grants are prepared by the orchestrator via `src/runner.mjs` (`grant`/`close`). Scripts run inside bubblewrap with prlimit resource caps, read-only `/input`, writable `/work` only. Tool identity comes from OpenCode-supplied session and agent context, never from tool input. The runner blocks rather than falling back to host execution when isolation utilities are unavailable.

**Tool policy.** A context hook restricts model-visible tools: inspectors keep only `read`, `grep`, `glob`, and `hypergo_spike` (plus `webfetch` for researcher); `hypergo_spike` is hidden from orchestrator and worker.

**Load.** Add the local package directory to a project's `opencode.json` or `opencode.jsonc` plugins list:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["../opencode-hypergo"]
}
```

No global plugin installation or package-manager install is needed. Requires OpenCode 2.4.1, a Node runtime supported by that release, and Linux with `/usr/bin/bwrap` and `/usr/bin/prlimit` for spike execution. To inspect the effective registry, run `opencode debug agents` in the project.

**Checks.** `npm test` runs 5 model-free tests covering role assignments, ordered permissions, and model-facing tool filtering. All pass.
