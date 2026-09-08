import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  checkReleaseVersion,
  readReleaseVersion,
  setReleaseVersion,
} from "./release-version.mjs";

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "anarlog-release-version-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "apps/watch/apple"), { recursive: true });
  mkdirSync(join(root, "scripts"));
  copyFileSync(
    new URL("./release-version.mjs", import.meta.url),
    join(root, "scripts/release-version.mjs"),
  );
  setReleaseVersion("1.4.23", root);
  return root;
}

test("a version bump updates the shared product version and native watch configuration together", (t) => {
  const root = fixture(t);
  setReleaseVersion("1.5.0", root);
  assert.equal(readReleaseVersion(root), "1.5.0");
  assert.equal(checkReleaseVersion("1.5.0", root), "1.5.0");
  assert.match(
    readFileSync(join(root, "apps/watch/apple/Version.xcconfig"), "utf8"),
    /^MARKETING_VERSION = 1\.5\.0$/m,
  );
});

test("invalid store versions cannot change the current release", (t) => {
  const root = fixture(t);
  for (const version of [
    "1.4",
    "v1.4.23",
    "01.4.23",
    "1.4.23-beta.1",
    "1.4.23+build.1",
    "1.4.23\n",
    null,
  ]) {
    assert.throws(() => setReleaseVersion(version, root), /major.minor.patch/);
    assert.equal(checkReleaseVersion("1.4.23", root), "1.4.23");
  }
});

test("a desktop release cannot use a different version from mobile and watch", (t) => {
  const root = fixture(t);
  const result = spawnSync(
    process.execPath,
    [join(root, "scripts/release-version.mjs"), "--check", "1.5.0"],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /does not match the shared release version 1.4.23/,
  );
  assert.equal(checkReleaseVersion("1.4.23", root), "1.4.23");
});

test("CI catches a stale generated watch version", (t) => {
  const root = fixture(t);
  writeFileSync(
    join(root, "apps/watch/apple/Version.xcconfig"),
    "MARKETING_VERSION = 0.1.0\n",
  );
  assert.throws(
    () => checkReleaseVersion(undefined, root),
    /Watch version is out of sync/,
  );
  setReleaseVersion("1.4.23", root);
  assert.equal(checkReleaseVersion(undefined, root), "1.4.23");
});

test("the version command resolves its repository independently of the working directory", (t) => {
  const root = fixture(t);
  const result = spawnSync(
    process.execPath,
    [join(root, "scripts/release-version.mjs"), "1.5.1"],
    { cwd: tmpdir(), encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(checkReleaseVersion("1.5.1", root), "1.5.1");
});

test("the checked-in watch version matches the shared release", () => {
  assert.equal(checkReleaseVersion(), readReleaseVersion());
});
