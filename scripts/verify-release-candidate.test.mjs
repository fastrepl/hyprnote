import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(
  new URL("./verify-release-candidate.sh", import.meta.url),
);

test("only a checked-out, merged candidate with matching workflow identity can ship", () => {
  const cwd = mkdtempSync(path.join(tmpdir(), "anarlog-release-candidate-"));
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: "Test",
    GIT_AUTHOR_EMAIL: "test@example.com",
    GIT_COMMITTER_NAME: "Test",
    GIT_COMMITTER_EMAIL: "test@example.com",
  };
  const git = (...args) =>
    execFileSync("git", args, {
      cwd,
      env,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  const verify = (candidate, workflowSha = candidate) =>
    spawnSync("bash", [script, candidate], {
      cwd,
      env: { ...env, GITHUB_SHA: workflowSha },
      encoding: "utf8",
    });
  try {
    git("init");
    git(
      "-c",
      "commit.gpgsign=false",
      "commit",
      "--allow-empty",
      "-m",
      "candidate",
    );
    const candidate = git("rev-parse", "HEAD");
    git(
      "-c",
      "commit.gpgsign=false",
      "commit",
      "--allow-empty",
      "-m",
      "new development",
    );
    const main = git("rev-parse", "HEAD");
    git("update-ref", "refs/remotes/origin/main", main);
    git("checkout", "--detach", candidate);
    assert.equal(
      verify(candidate).status,
      0,
      "main may advance while a candidate is tested",
    );
    assert.notEqual(
      verify(candidate, main).status,
      0,
      "workflow must execute the tested source",
    );
    assert.notEqual(
      verify(main).status,
      0,
      "checkout must match the candidate",
    );
    git(
      "-c",
      "commit.gpgsign=false",
      "commit",
      "--allow-empty",
      "-m",
      "unmerged feature",
    );
    assert.notEqual(
      verify(git("rev-parse", "HEAD")).status,
      0,
      "unmerged commits cannot ship",
    );
    assert.notEqual(
      verify("main").status,
      0,
      "mutable refs cannot substitute for a SHA",
    );
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
