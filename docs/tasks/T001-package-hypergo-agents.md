# T001 — Package HyperGo roles for OpenCode

- **ID:** `opencode-hypergo:T001`
- **Repository:** `opencode-hypergo`
- **Nature:** `feature`
- **Revision:** `r1` (green field)
- **State:** `Review`
- **Supersedes:** —
- **Assignee:** OpenCode native worker `openai/gpt-6-luna#high`; status reconciliation session `ses_deabc749fffetq881uW3b4csh1`.
- **Reviewer:** CTO review; independent review not required for this bounded status reconciliation.
- **Next Action Owner:** CTO
- **Next Action / Blocker:** CTO review; real-session scratch-tool behavior and scratch isolation/evidence remain unverified.
- **Evidence & Limits:** Jason confirms the plugin is loaded in this project. The project-local config points to the plugin checkout, and `opencode debug agents` from the lab working directory emitted the four HyperGo role IDs. This does not verify scratch-tool execution or isolation.
- **Updated:** `2026-11-26`

## Status reconciliation assignment

- Revision: r1 status-only reconciliation; baseline plugin `92dfba0fca346a6ba557e509f9a9676e1a1f1157`.
- Native OpenCode worker `openai/gpt-6-luna#high`, explicitly selected by Jason. CTO review; independent review is not required for this bounded record reconciliation.
- Jason confirmed this checkout replaces the older plugin repository and reports that the plugin is live. Inspect the current checkout and relevant local configuration to describe what is actually evidenced. Record owner confirmation separately from direct checks; do not imply independent review or real-session scratch-tool verification without evidence.
- Scope: this task record only. Preserve existing content and historical claims; do not change plugin code, configuration, other task records, or Git history. Stop if the facts or scope conflict.
- Acceptance: an accurate current status and explicit evidence/limits, with commands and exact diff returned for CTO review.
- D-60: pre-assignment bytes retained at `/tmp/opencode/task-status-reconcile-20261126003053/T001.md`, SHA-256 `2b1c04a879bcecf6cf1c6d698e14cea03793a84b0406a275ede8d565b1b517df`, matching the original before this edit; retain through review.

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

## Status reconciliation (r1)

Jason confirms this checkout replaces the older plugin repository and reports that the plugin is live. This is owner confirmation, not runtime evidence establishing where it is loaded.

Direct checks on 2026-11-26 found:

- The checkout at baseline `92dfba0fca346a6ba557e509f9a9676e1a1f1157` contains the plugin entrypoint, packaged role definitions, runner, tool policy, and five model-free tests.
- The active user-level `/home/jason/.config/opencode/opencode.jsonc` has no `plugins` entry. The only plugin reference found in that earlier, limited configuration inspection was in `/home/jason/.config/hypergo/retired-lab-config-J1hjhtdk/opencode.jsonc`, which is explicitly under a retired config directory; it did not include the project-local config later supplied by Jason.
- `opencode debug agents` from this checkout succeeded but showed only OpenCode's built-in agents; it did not show the HyperGo roles. This verifies the plugin was not loaded in that invocation, not that it is unused in another project.
- `npm test` passed all 5 tests. These tests do not exercise a live plugin load, a real child session, the scratch tool, or scratch evidence.

The historical implementation description and its original `Complete` state are retained in the task history; the current reconciliation is `Review` pending CTO review. No independent review or real-session scratch-tool verification is claimed.

### Project-local load correction — 2026-11-26

The earlier statement that no project-specific live configuration was found was based on a limited inspection and is corrected here. Jason supplied `/home/jason/Desktop/hypergo-lab/.opencode/opencode.jsonc` and confirms the plugin is loaded in this project. The file lists `"plugins": ["../opencode-hypergo"]`; resolving that relative path reaches `/home/jason/Desktop/hypergo-lab/opencode-hypergo`, a symlink to `/home/jason/tools/opencode-hypergo`.

Running `opencode debug agents` with working directory `/home/jason/Desktop/hypergo-lab` exited successfully and emitted the `orchestrator`, `worker`, `researcher`, and `reviewer` agents. This is direct registry output for that invocation, distinct from Jason's confirmation; it does not establish the exact effective configuration source or precedence. It does not test a real child session, `hypergo_spike`, scratch isolation, or scratch evidence.

The earlier `opencode debug agents` invocation from `/home/jason/tools/opencode-hypergo` remains recorded accurately: it showed only built-in agents. That invocation did not exercise the supplied lab project context, so its absence of HyperGo roles was not evidence that the project-local plugin was not loaded.

## Executor return

- **T001 r1 status reconciliation:** OpenCode native worker `openai/gpt-6-luna#high`; actual model GPT-6 Luna. Returned for CTO review; current state `Review`. Jason's report that the plugin is live is recorded as owner confirmation only.
- **Reconciliation session:** `ses_deabc749fffetq881uW3b4csh1` (OpenCode native worker, actual model GPT-6 Luna). The return above remains the prior session's evidence; this follow-up only recorded the session ID and preserved the current task record before editing.
- **Baseline and scope:** plugin baseline `92dfba0fca346a6ba557e509f9a9676e1a1f1157`; only this task record was edited. The pre-edit current record was preserved at `/tmp/opencode/task-status-reconcile-20261126003053/pre-edit-current/opencode-hypergo/docs/tasks/T001-package-hypergo-agents.md`, SHA-256 `3aa362ebd4e9632117973c953d80c660ea976f6c1a69a99a31d4a0c2827a238a`; `cmp` verified equality. The assignment's pre-assignment backup remains at `/tmp/opencode/task-status-reconcile-20261126003053/T001.md`, SHA-256 `2b1c04a879bcecf6cf1c6d698e14cea03793a84b0406a275ede8d565b1b517df`.
- **Follow-up D-60:** Before recording the reconciliation session, current task bytes were preserved at `/tmp/opencode/task-status-reconcile-20261126003053/session-ses_deabc749fffetq881uW3b4csh1/opencode-hypergo/docs/tasks/T001-package-hypergo-agents.md`, SHA-256 `df7e9c02db38e79f090b44ac2f29816b9d049308d864cfae22108d3cfd4adaf4`; `cmp` verified equality. Retain through CTO review.
- **Metadata normalization preservation:** Before moving the assignment and adding the complete metadata header, current T001 bytes were copied to `/tmp/opencode/task-status-reconcile-20261126003053/metadata-normalization-20261126/opencode-hypergo/docs/tasks/T001-package-hypergo-agents.md`; SHA-256 `1488e6fab06c5e2dbfac2556b16a8c579a9a7a29cbec5593f50108fa072d9e5d`; `cmp` verified equality. Retain through CTO review.
- **Checks:** `npm test` — exit 0, 5 passed, 0 failed. `opencode debug agents` — exit 0; HyperGo roles absent from this invocation's registry. Read-only inspection of the active user config found no plugin entry; a plugin entry exists only in a retired config file.
- **Limits:** The earlier conclusion that no project-specific live configuration was found is superseded by the correction below: Jason supplied a project-local config, and the lab-context debug invocation emitted HyperGo roles. Provider entitlement, exact effective-config provenance/precedence, real-session scratch-tool execution, and scratch isolation/evidence remain unverified.
- **Working tree:** The task record was already modified before reconciliation by the appended assignment; no other files were edited. CTO review is the next action. No commit or task-index sync was performed.
- **Project-local load correction return:** OpenCode native worker `openai/gpt-6-luna#high`, session `ses_deabc749fffetq881uW3b4csh1`. Jason supplied the project config and confirmed the plugin is loaded there. Direct config inspection and path resolution, plus `opencode debug agents` from the lab working directory, are recorded above. No scratch/tool test or config change was made.
- **Correction D-60:** Before this correction, current T001 bytes were copied to `/tmp/opencode/task-status-reconcile-20261126003053/t001-live-plugin-correction/opencode-hypergo/docs/tasks/T001-package-hypergo-agents.md`; SHA-256 `4c44a1ab5d82ce2be1b79e7d40db9cd6f98f0fa8b2646613da04334b0292af82`; `cmp` verified equality. Retain through CTO review.
