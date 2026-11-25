# opencode-hypergo

A project-local OpenCode V2 server plugin that supplies the HyperGo
`orchestrator`, `worker`, `researcher`, and `reviewer` roles and the restricted
`hypergo_spike` tool. The package does not install or edit user-level agents,
plugins, config, grants, or other repositories.

## Requirements

- OpenCode **2.4.1** (the exact tested version).
- A Node runtime supported by the installed OpenCode release.
- Linux with `/usr/bin/bwrap` and `/usr/bin/prlimit` for authorized spike runs.
  Role discovery works without those utilities, but the runner deliberately
  blocks rather than falling back to host execution.

## Load from a project

Add the local package directory to that project's `opencode.json` or
`opencode.jsonc`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["../opencode-hypergo"]
}
```

Use a path relative to the project config, or an absolute local package path.
No global plugin installation or package-manager install is needed for local
loading. The package pins the public `@opencode/plugin` API dependency to
`2.4.1`; OpenCode loads `src/index.ts` as the server entrypoint. To inspect the
effective registry, run `opencode debug agents` in the project.

The plugin uses `ctx.agent.transform` and `editor.update(id, ...)` to define
the four role IDs in the project registry, with the package's instructions,
modes, and ordered permissions. Roles do not pin models: dispatchers select an
explicit authorized `provider/model#variant` for each child. The project-local
package only affects locations that load it.

## Role and tool boundaries

- `orchestrator` is primary and may delegate only to `worker`, `researcher`,
  and `reviewer`.
- `worker` is a subagent and cannot delegate or ask questions.
- `researcher` and `reviewer` are deny-by-default subagents with the packaged
  ordered read/search and spike grants; only researcher receives HTTPS
  `webfetch`.
- For inspectors, a context hook removes every model-visible tool except
  `read`, `grep`, `glob`, and `hypergo_spike` (plus `webfetch` for researcher).
  The tool is hidden from orchestrator and worker.
- The tool checks OpenCode-supplied session and agent identity with
  `ctx.permission.assert`, then requires a matching, unexpired runner grant.
  Identity is not accepted from tool input. Permission errors propagate.

The runner is available as the package export `opencode-hypergo/runner`, and as
`src/runner.mjs` for a direct local grant command. A grant is prepared by the
orchestrator, not by a child:

```sh
node /path/to/opencode-hypergo/src/runner.mjs grant \
  task-slug ses_CHILD_SESSION_ID researcher 5 /path/to/approved-input.txt
# When that child returns:
node /path/to/opencode-hypergo/src/runner.mjs close task-slug ses_CHILD_SESSION_ID
```

Use the actual fresh child session ID, role `researcher` or `reviewer`, and
1–60 whole minutes. Inputs must be named regular files with unique basenames;
they are snapshotted read-only at `/input`. The only persistent writable
location is that grant's `/work`, kept under `/tmp/opencode/spikes/`. Each call
is bounded by the remaining grant or 30 seconds. The runner uses bubblewrap,
read-only `/usr`, private process/network namespaces, and CPU/file/process
limits. Closing prevents further calls but intentionally retains scratch for
the evidence-retention decision. Do not place secrets, customer records, or
checkouts in a grant.

## Checks

Run the package's local, model-free tests with `npm test`. The tests check the
role assignments, instruction presence, ordered permission rules, and
model-facing tool filtering. They do not substitute for checking a real loaded
OpenCode runtime, granting a real child session, or reviewing the resulting
scratch evidence.
