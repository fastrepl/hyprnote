import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmod, mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const launcher = fileURLToPath(
  new URL("./launch-native-dev-qa.sh", import.meta.url),
);
const runner = fileURLToPath(
  new URL("./run-native-dev-qa.sh", import.meta.url),
);
const resetter = fileURLToPath(
  new URL("./reset-native-qa-permissions.sh", import.meta.url),
);

async function fixture() {
  const directory = await mkdtemp(path.join(tmpdir(), "anarlog-native-qa-"));
  const appBundle = path.join(directory, "Anarlog Dev.app");
  const fakeOpen = path.join(directory, "open");

  await mkdir(appBundle);
  await writeFile(fakeOpen, "#!/usr/bin/env bash\nprintf '%s\\n' \"$@\"\n");
  await chmod(fakeOpen, 0o755);

  for (const command of ["uname", "pgrep", "tccutil"]) {
    const executable = path.join(directory, command);
    await writeFile(
      executable,
      `#!/usr/bin/env bash
case "\${0##*/}" in
  uname) printf '%s\\n' "\${ANARLOG_QA_TEST_OS:-Darwin}" ;;
  pgrep)
    [[ "$1" == "-x" && ( "$2" == "anarlog-dev" || "$2" == "anarlog-staging" ) ]] || exit 3
    exit "\${ANARLOG_QA_TEST_PROCESS_STATUS:-1}"
    ;;
  tccutil)
    printf 'tccutil %s %s %s\\n' "$1" "$2" "$3"
    [[ "$2" != "\${ANARLOG_QA_TEST_FAILED_SERVICE:-}" ]] || exit 1
    ;;
esac
`,
    );
    await chmod(executable, 0o755);
  }

  return {
    appBundle,
    directory,
    launch(environment = {}) {
      const childEnvironment = {
        ...process.env,
        ANARLOG_QA_OPEN_EXECUTABLE: fakeOpen,
        ...environment,
      };
      if (!("ONBOARDING" in environment)) {
        delete childEnvironment.ONBOARDING;
      }

      return spawnSync(launcher, [appBundle], {
        encoding: "utf8",
        env: childEnvironment,
      });
    },
    reset(channel, environment = {}) {
      return spawnSync(resetter, [channel], {
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${directory}${path.delimiter}${process.env.PATH}`,
          ...environment,
        },
      });
    },
  };
}

test("launches the app bundle through LaunchServices with QA probes", async (t) => {
  const harness = await fixture();
  t.after(() => rm(harness.directory, { force: true, recursive: true }));

  const result = harness.launch();

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.stdout.trim().split("\n"), [
    "-W",
    "--env",
    "AUDIO_SYNC_PROBE=1",
    "--env",
    "LISTENER_DEBUG=1",
    "--env",
    "NO_AEC=",
    "--env",
    "ONBOARDING=",
    harness.appBundle,
  ]);
});

test("refuses the old in-process reset before launching", async (t) => {
  const harness = await fixture();
  t.after(() => rm(harness.directory, { force: true, recursive: true }));

  const result = harness.launch({ ONBOARDING: "1" });

  assert.equal(result.status, 2);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /reset-native-qa-permissions.sh dev/);
});

test("rejects ONBOARDING before the Dev build or preflight", () => {
  const result = spawnSync(runner, ["--launch-only"], {
    encoding: "utf8",
    env: { ...process.env, ONBOARDING: "1" },
  });

  assert.equal(result.status, 2);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /reset-native-qa-permissions.sh dev/);
});

for (const channel of ["dev", "staging"]) {
  test(`resets all requested permissions for the closed ${channel} app`, async (t) => {
    const harness = await fixture();
    t.after(() => rm(harness.directory, { force: true, recursive: true }));

    const result = harness.reset(channel);

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(result.stdout.trim().split("\n").slice(0, -1), [
      `tccutil reset Microphone com.hyprnote.${channel}`,
      `tccutil reset AudioCapture com.hyprnote.${channel}`,
      `tccutil reset ScreenCapture com.hyprnote.${channel}`,
      `tccutil reset Accessibility com.hyprnote.${channel}`,
      `tccutil reset Calendar com.hyprnote.${channel}`,
      `tccutil reset Reminders com.hyprnote.${channel}`,
    ]);
    assert.match(result.stdout, /Launch normally/);
  });
}

for (const channel of ["stable", "com.hyprnote.staging", "", "staging extra"]) {
  test(`refuses an unsupported reset target ${JSON.stringify(channel)}`, async (t) => {
    const harness = await fixture();
    t.after(() => rm(harness.directory, { force: true, recursive: true }));

    const result = harness.reset(channel);

    assert.equal(result.status, 2);
    assert.equal(result.stdout, "");
  });
}

for (const status of ["0", "2"]) {
  test(`does not reset when process inspection returns ${status}`, async (t) => {
    const harness = await fixture();
    t.after(() => rm(harness.directory, { force: true, recursive: true }));

    const result = harness.reset("staging", {
      ANARLOG_QA_TEST_PROCESS_STATUS: status,
    });

    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
  });
}

test("does not reset on a non-macOS host", async (t) => {
  const harness = await fixture();
  t.after(() => rm(harness.directory, { force: true, recursive: true }));

  const result = harness.reset("staging", { ANARLOG_QA_TEST_OS: "Linux" });

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /requires macOS/);
});

test("a failed permission reset stops preparation without reporting success", async (t) => {
  const harness = await fixture();
  t.after(() => rm(harness.directory, { force: true, recursive: true }));

  const result = harness.reset("staging", {
    ANARLOG_QA_TEST_FAILED_SERVICE: "AudioCapture",
  });

  assert.equal(result.status, 1);
  assert.deepEqual(result.stdout.trim().split("\n"), [
    "tccutil reset Microphone com.hyprnote.staging",
    "tccutil reset AudioCapture com.hyprnote.staging",
  ]);
});
