/**
 * LEARN: Standalone grant CLI + sandboxed executor — plain Node, no OpenCode
 * API. This file shows the other half of the tool-security story: OpenCode
 * only supplies WHO is calling (sessionID/agent in the tool context); this
 * runner decides WHAT they may run and WHERE.
 *
 * Two roles:
 *  - CLI (`grant`/`close`): the orchestrator's shell creates the grant file
 *    before a child session exists. A tool call can never create one.
 *  - `runSpike()`: called by the tool executor in src/index.ts AFTER
 *    `ctx.permission.assert`. It re-checks the identity against the stored
 *    grant, then runs the script inside bubblewrap with prlimit caps.
 *
 * Identity flows one way: OpenCode → plugin context → this runner. The model
 * never gets to choose the session or role a grant belongs to.
 *
 * DOCS
 * - How tool identity reaches a plugin (sessionID/agent/messageID/callID):
 *     https://opencode.ai/docs/build/plugins/server (section "Permissions")
 * - Permission rules that decide whether the tool runs at all:
 *     https://opencode.ai/docs/permissions/
 */
// Local Linux runner. Only the parent prepares grants; a tool call never creates one.
import { execFile } from "node:child_process";
import {
  constants, copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync,
  realpathSync, renameSync, writeFileSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = "/tmp/opencode/spikes";
const roles = new Set(["researcher", "reviewer"]);
const blocked = (why) => { throw new Error(`BLOCKED: ${why}`); };

function paths(task, sessionID) {
  if (typeof task !== "string" || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(task) ||
      typeof sessionID !== "string" || !/^ses_[a-zA-Z0-9_-]{1,96}$/.test(sessionID)) {
    blocked("invalid task slug or child session ID");
  }
  const taskDir = join(root, task);
  const run = join(taskDir, sessionID);
  return { taskDir, run, input: join(run, "input"), work: join(run, "work"), grant: join(run, "grant.json") };
}

function privateDir(dir, shared = false) {
  const stat = lstatSync(dir);
  if (!stat.isDirectory() || realpathSync(dir) !== dir || stat.uid !== process.getuid() ||
      (stat.mode & (shared ? 0o002 : 0o077)) !== 0) blocked(`untrusted directory: ${dir}`);
}

function existingGrant(task, sessionID) {
  const dirs = paths(task, sessionID);
  privateDir("/tmp/opencode", true);
  for (const dir of [root, dirs.taskDir, dirs.run, dirs.input, dirs.work]) privateDir(dir);
  const stat = lstatSync(dirs.grant);
  if (!stat.isFile() || stat.uid !== process.getuid() || (stat.mode & 0o077)) blocked("untrusted grant");
  return { ...dirs, lease: JSON.parse(readFileSync(dirs.grant, "utf8")) };
}

function prepare(task, sessionID, role, minutes, files) {
  const dirs = paths(task, sessionID);
  if (!roles.has(role) || !/^(?:[1-9]|[1-5][0-9]|60)$/.test(minutes)) {
    blocked("specify researcher or reviewer and a timebox of 1–60 whole minutes");
  }
  if (files.some(f => !lstatSync(f).isFile()) || new Set(files.map(f => basename(f))).size !== files.length) {
    blocked("stage only named regular files with distinct basenames");
  }
  privateDir("/tmp/opencode", true);
  for (const dir of [root, dirs.taskDir]) {
    if (!existsSync(dir)) mkdirSync(dir, { mode: 0o700 });
    privateDir(dir);
  }
  // An existing, incomplete, expired or closed run is never recycled.
  for (const dir of [dirs.run, dirs.input, dirs.work]) mkdirSync(dir, { mode: 0o700 });
  for (const f of files) copyFileSync(f, join(dirs.input, basename(f)), constants.COPYFILE_EXCL);
  const expires = Date.now() + Number(minutes) * 60_000;
  writeFileSync(dirs.grant, JSON.stringify({ task, sessionID, role, expires }), { mode: 0o600, flag: "wx" });
  return `${dirs.run} (${role}; expires ${new Date(expires).toISOString()})`;
}

export async function runSpike({ task, script }, { sessionID, agent, signal }) {
  if (!roles.has(agent)) blocked("only assigned researchers and reviewers can use a spike grant");
  if (typeof script !== "string" || !script.length || Buffer.byteLength(script) > 32_768) {
    blocked("script must be nonempty and at most 32 KiB");
  }
  let dirs;
  try { dirs = existingGrant(task, sessionID); }
  catch (err) { blocked(`no usable grant for this task/session: ${err.message}`); }
  const { lease, input, work } = dirs;
  if (lease.role !== agent || lease.sessionID !== sessionID || lease.task !== task ||
      !Number.isSafeInteger(lease.expires) || lease.expires <= Date.now()) blocked("wrong or expired grant");

  const args = [
    "--unshare-all", "--unshare-user", "--disable-userns",
    "--die-with-parent", "--new-session", "--cap-drop", "ALL", "--clearenv",
    "--ro-bind", "/usr", "/usr", "--symlink", "usr/bin", "/bin",
    "--symlink", "usr/lib", "/lib", "--symlink", "usr/lib64", "/lib64",
    "--dev", "/dev", "--proc", "/proc", "--remount-ro", "/proc",
    "--ro-bind", input, "/input", "--bind", work, "/work", "--symlink", "/work", "/tmp",
    "--remount-ro", "/", "--chdir", "/work", "--setenv", "HOME", "/work",
    "--setenv", "TMPDIR", "/work", "--setenv", "PATH", "/usr/bin:/bin",
    "--setenv", "LC_ALL", "C", "--", "/usr/bin/prlimit",
    "--cpu=20:20", "--fsize=16777216:16777216", "--nofile=128:128", "--nproc=128:128",
    "--", "/bin/sh", "-eu", "-s",
  ];
  // Pass code as stdin, never as a host shell command, path, mount or option.
  // bwrap runs a private PID/network namespace; killing the supervisor tears it down.
  return new Promise((done, fail) => {
    const proc = execFile("/usr/bin/bwrap", args, {
      cwd: "/", env: { PATH: "/usr/bin:/bin" }, encoding: "utf8", signal,
      timeout: Math.max(1, Math.min(30_000, lease.expires - Date.now())),
      killSignal: "SIGKILL", maxBuffer: 64 * 1024,
    }, (err, stdout, stderr) => {
      if (err && (err.killed || err.signal || typeof err.code !== "number")) {
        fail(new Error(`spike stopped: ${err.code ?? err.signal ?? err.message}`));
      } else {
        done(`exit=${err?.code ?? 0}\n${stdout}${stderr ? `\nstderr:\n${stderr}` : ""}`);
      }
    });
    proc.stdin.on("error", () => {}); // Early exit/cancellation is reported by execFile.
    proc.stdin.end(script);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [, , op, task, sessionID, role, minutes, ...files] = process.argv;
    if (op === "grant") console.log(prepare(task, sessionID, role, minutes, files));
    else if (op === "close" && !role) {
      const { grant, run } = existingGrant(task, sessionID);
      const closed = join(run, "closed.json");
      if (existsSync(closed)) blocked("closed record already exists");
      renameSync(grant, closed);
      console.log(`Closed ${run}; evidence retained.`);
    } else blocked("usage: grant TASK SESSION ROLE MINUTES [INPUT_FILE...] | close TASK SESSION");
  } catch (err) {
    console.error(err.message);
    process.exitCode = 1;
  }
}
