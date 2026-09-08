import argparse
from contextlib import closing
import json
import os
from pathlib import Path
import queue
import sqlite3
import subprocess
import tempfile
import threading


def verify(package_root: Path, version: str):
    binaries = [
        path
        for path in package_root.rglob("anarlog-cli*")
        if path.is_file() and path.name in {"anarlog-cli", "anarlog-cli.exe"}
    ]
    if len(binaries) != 1:
        raise RuntimeError(f"Expected one packaged CLI, found {binaries}")
    binary = binaries[0].resolve()
    snapshot = (
        Path(__file__).resolve().parent.parent
        / "apps/cli/src/snapshots/anarlog_cli__mcp__tests__mcp_contract.snap"
    )
    contract = json.loads(snapshot.read_text().split("---", 2)[2])

    with tempfile.TemporaryDirectory(prefix="anarlog-cli-release-") as temporary:
        root = Path(temporary)
        database = root / "fixture.db"
        with closing(sqlite3.connect(database)) as connection:
            connection.execute("PRAGMA user_version = 0")
        env = {
            **os.environ,
            "ANARLOG_DISABLE_SENTRY": "1",
            "ANARLOG_AUTH_PATH": str(root / "auth.json"),
        }
        actual = subprocess.check_output(
            [str(binary), "--version"], text=True, env=env, timeout=30
        ).strip()
        if actual != f"anarlog {version}":
            raise RuntimeError(f"Unexpected packaged CLI version: {actual}")
        for command in [[], ["meetings"], ["proposals"], ["mcp"]]:
            subprocess.run(
                [str(binary), *command, "--help"],
                check=True,
                capture_output=True,
                env=env,
                timeout=30,
            )

        messages = queue.Queue()
        with (root / "stderr.log").open("w+") as errors:
            process = subprocess.Popen(
                [str(binary), "--db-path", str(database), "mcp"],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=errors,
                text=True,
                env=env,
            )

            def read_output():
                for line in process.stdout:
                    messages.put(line)
                messages.put(None)

            reader = threading.Thread(target=read_output, daemon=True)
            reader.start()

            def send(message):
                process.stdin.write(json.dumps({"jsonrpc": "2.0", **message}) + "\n")
                process.stdin.flush()

            def request(identifier, method, params=None):
                send({"id": identifier, "method": method, "params": params or {}})
                line = messages.get(timeout=30)
                if line is None:
                    raise RuntimeError("MCP exited before responding")
                response = json.loads(line)
                if (
                    response.get("jsonrpc") != "2.0"
                    or response.get("id") != identifier
                    or "error" in response
                    or "result" not in response
                ):
                    raise RuntimeError(f"Unexpected MCP response: {response}")
                return response["result"]

            try:
                initialized = request(
                    1,
                    "initialize",
                    {
                        "protocolVersion": "2025-11-25",
                        "capabilities": {},
                        "clientInfo": {"name": "release-verification", "version": "1"},
                    },
                )
                # Newer MCP revisions replace initialize with per-request metadata.
                if initialized["protocolVersion"] != "2025-11-25":
                    raise RuntimeError(
                        "Packaged MCP did not negotiate the initialize protocol"
                    )
                if initialized.get("instructions") != contract["instructions"]:
                    raise RuntimeError(
                        "Packaged MCP instructions differ from the contract"
                    )
                if initialized["serverInfo"] != {"name": "anarlog", "version": version}:
                    raise RuntimeError(
                        "Packaged MCP server version differs from the CLI"
                    )
                send({"method": "notifications/initialized"})
                tools = request(2, "tools/list")
                templates = request(3, "resources/templates/list")
                if tools.get("nextCursor") or templates.get("nextCursor"):
                    raise RuntimeError("Unexpected paginated discovery")
                if sorted(tools["tools"], key=lambda tool: tool["name"]) != sorted(
                    contract["tools"], key=lambda tool: tool["name"]
                ):
                    raise RuntimeError("Packaged MCP tools differ from the contract")
                if templates["resourceTemplates"] != contract["resource_templates"]:
                    raise RuntimeError(
                        "Packaged MCP resources differ from the contract"
                    )
                process.stdin.close()
                if process.wait(timeout=30) != 0:
                    raise RuntimeError("Packaged MCP did not shut down cleanly")
                reader.join(timeout=5)
                if reader.is_alive() or messages.get(timeout=5) is not None:
                    raise RuntimeError("Unexpected extra MCP stdout")
            except Exception:
                process.kill()
                process.wait(timeout=5)
                errors.seek(0)
                print(errors.read())
                raise
            finally:
                process.stdout.close()
                if not process.stdin.closed:
                    process.stdin.close()

    print(f"Verified {binary}: {actual}, help, MCP contract, and clean shutdown")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("package_root", type=Path)
    parser.add_argument("version")
    args = parser.parse_args()
    verify(args.package_root, args.version)
