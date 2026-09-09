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
  checkMobileReleaseVersion,
  checkReleaseVersion,
  readMobileReleaseVersion,
  readReleaseVersion,
  setMobileReleaseVersion,
  setReleaseVersion,
} from "./release-version.mjs";

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "anarlog-release-version-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "apps/watch/apple"), { recursive: true });
  mkdirSync(join(root, "apps/mobile"), { recursive: true });
  mkdirSync(join(root, "scripts"));
  copyFileSync(
    new URL("./release-version.mjs", import.meta.url),
    join(root, "scripts/release-version.mjs"),
  );
  writeFileSync(
    join(root, "apps/mobile/package.json"),
    `${JSON.stringify({ name: "@anlg/mobile", version: "0.1.0" }, null, 2)}\n`,
  );
  setReleaseVersion("1.4.23", root);
  setMobileReleaseVersion("0.1.0", root);
  return root;
}

test("a version bump updates the desktop product version and native watch configuration together", (t) => {
  const root = fixture(t);
  setReleaseVersion("1.5.0", root);
  assert.equal(readReleaseVersion(root), "1.5.0");
  assert.equal(checkReleaseVersion("1.5.0", root), "1.5.0");
  assert.match(
    readFileSync(join(root, "apps/watch/apple/Version.xcconfig"), "utf8"),
    /^MARKETING_VERSION = 1\.5\.0$/m,
  );
  assert.equal(readMobileReleaseVersion(root), "0.1.0");
});

test("a mobile version bump does not change desktop or watch", (t) => {
  const root = fixture(t);
  writeFileSync(
    join(root, "apps/mobile/package.json"),
    '{\n  "name": "@anlg/mobile",\n  "version": "0.1.0",\n  "expo": { "buildFromSource": ["expo-audio"] }\n}\n',
  );
  setMobileReleaseVersion("0.2.0", root);
  assert.equal(readMobileReleaseVersion(root), "0.2.0");
  assert.equal(checkMobileReleaseVersion("0.2.0", root), "0.2.0");
  assert.match(
    readFileSync(join(root, "apps/mobile/package.json"), "utf8"),
    /"version": "0\.2\.0"/,
  );
  assert.match(
    readFileSync(join(root, "apps/mobile/package.json"), "utf8"),
    /"buildFromSource": \["expo-audio"\]/,
  );
  assert.equal(readReleaseVersion(root), "1.4.23");
  assert.match(
    readFileSync(join(root, "apps/watch/apple/Version.xcconfig"), "utf8"),
    /^MARKETING_VERSION = 1\.4\.23$/m,
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
    assert.throws(
      () => setMobileReleaseVersion(version, root),
      /major.minor.patch/,
    );
    assert.equal(checkReleaseVersion("1.4.23", root), "1.4.23");
    assert.equal(checkMobileReleaseVersion("0.1.0", root), "0.1.0");
  }
});

test("a desktop release check does not require the mobile version", (t) => {
  const root = fixture(t);
  const result = spawnSync(
    process.execPath,
    [join(root, "scripts/release-version.mjs"), "--check", "1.5.0"],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /does not match the desktop release version 1.4.23/,
  );
  assert.equal(checkReleaseVersion("1.4.23", root), "1.4.23");
  assert.equal(checkMobileReleaseVersion("0.1.0", root), "0.1.0");
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

test("CI catches a stale mobile package version", (t) => {
  const root = fixture(t);
  writeFileSync(
    join(root, "apps/mobile/package.json"),
    `${JSON.stringify({ name: "@anlg/mobile", version: "9.9.9" }, null, 2)}\n`,
  );
  assert.throws(
    () => checkMobileReleaseVersion(undefined, root),
    /Mobile package version 9\.9\.9 is out of sync/,
  );
  setMobileReleaseVersion("0.1.0", root);
  assert.equal(checkMobileReleaseVersion(undefined, root), "0.1.0");
});

test("the version command resolves its repository independently of the working directory", (t) => {
  const root = fixture(t);
  const desktop = spawnSync(
    process.execPath,
    [join(root, "scripts/release-version.mjs"), "1.5.1"],
    { cwd: tmpdir(), encoding: "utf8" },
  );
  assert.equal(desktop.status, 0, desktop.stderr);
  assert.equal(checkReleaseVersion("1.5.1", root), "1.5.1");
  const mobile = spawnSync(
    process.execPath,
    [join(root, "scripts/release-version.mjs"), "--mobile", "0.3.0"],
    { cwd: tmpdir(), encoding: "utf8" },
  );
  assert.equal(mobile.status, 0, mobile.stderr);
  assert.equal(checkMobileReleaseVersion("0.3.0", root), "0.3.0");
});

test("the checked-in watch version matches the desktop release", () => {
  assert.equal(checkReleaseVersion(), readReleaseVersion());
});

test("the checked-in mobile package version matches the mobile release", () => {
  assert.equal(checkMobileReleaseVersion(), readMobileReleaseVersion());
});
