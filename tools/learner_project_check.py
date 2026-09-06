#!/usr/bin/env python3
import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

MAX_OUTPUT_CHARS = 64 * 1024
PROJECT_ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")


def safe_relative_path(value):
    if not isinstance(value, str) or not value or "\\" in value:
        raise ValueError(f"invalid relative path: {value!r}")
    path = Path(value)
    if path.is_absolute() or any(part in ("", ".", "..") for part in path.parts):
        raise ValueError(f"invalid relative path: {value!r}")
    return path


def project_file(project_root, value):
    root = project_root.resolve()
    path = root / safe_relative_path(value)
    resolved = path.resolve(strict=False)
    if resolved != root and root not in resolved.parents:
        raise ValueError(f"path leaves project root: {value}")
    if path.is_symlink():
        raise ValueError(f"symlink is not allowed in project root: {value}")
    return path


def sha256_file(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_manifest(path):
    manifest = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(manifest, dict):
        raise ValueError("manifest must be an object")
    if type(manifest.get("schemaVersion")) is not int or manifest["schemaVersion"] != 1:
        raise ValueError("schemaVersion must be 1")
    project_id = manifest.get("projectId")
    if not isinstance(project_id, str) or not PROJECT_ID_RE.fullmatch(project_id):
        raise ValueError("projectId is invalid")
    if not isinstance(manifest.get("projectVersion"), str) or not manifest["projectVersion"]:
        raise ValueError("projectVersion is missing")
    test_paths = manifest.get("testPaths")
    if not isinstance(test_paths, list) or not test_paths:
        raise ValueError("testPaths must be a non-empty array")
    for value in test_paths:
        safe_relative_path(value)
    if len(set(test_paths)) != len(test_paths):
        raise ValueError("testPaths must be unique")
    required_files = manifest.get("requiredFiles")
    if not isinstance(required_files, list):
        raise ValueError("requiredFiles must be an array")
    seen = set()
    for item in required_files:
        if not isinstance(item, dict):
            raise ValueError("required file must be an object")
        relative_path = safe_relative_path(item.get("path"))
        if str(relative_path) in seen:
            raise ValueError(f"duplicate required file: {relative_path}")
        seen.add(str(relative_path))
        expected_hash = item.get("sha256")
        if expected_hash is not None and not re.fullmatch(r"[a-f0-9]{64}", expected_hash):
            raise ValueError(f"invalid sha256 for {relative_path}")
    timeout = manifest.get("timeoutSeconds", 60)
    if type(timeout) is not int or not 1 <= timeout <= 120:
        raise ValueError("timeoutSeconds must be between 1 and 120")
    return manifest


def load_project_command(project_root, manifest):
    path = project_file(project_root, "project.json")
    project = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(project, dict):
        raise ValueError("project definition must be an object")
    if type(project.get("schemaVersion")) is not int or project["schemaVersion"] != 1:
        raise ValueError("project schemaVersion must be 1")
    if project.get("projectId") != manifest["projectId"] or str(project.get("version")) != manifest["projectVersion"]:
        raise ValueError("project definition and check manifest do not match")
    commands = project.get("allowedCommands")
    if not isinstance(commands, list) or len(commands) != 1 or not isinstance(commands[0], dict):
        raise ValueError("project must declare exactly one pytest command")
    command = commands[0]
    for test_path in manifest["testPaths"]:
        project_file(project_root, test_path)
    expected_args = ["-m", "pytest", "-q", "--disable-warnings", "--maxfail=1", *manifest["testPaths"]]
    if command.get("program") != "python" or command.get("args") != expected_args:
        raise ValueError("project pytest command does not match the check manifest")
    return [command["program"], *command["args"]]


def file_inventory(project_root, manifest):
    files = []
    for expected in manifest["requiredFiles"]:
        path = project_file(project_root, expected["path"])
        present = path.is_file()
        files.append({
            "path": expected["path"],
            "present": present,
            "sha256": sha256_file(path) if present else None,
        })
    return files


def limited(text):
    value = text.decode(errors="replace") if isinstance(text, bytes) else text or ""
    return value[:MAX_OUTPUT_CHARS], len(value) > MAX_OUTPUT_CHARS


def runner_environment():
    allowed = ("PATH", "HOME", "LANG", "LC_ALL", "TMPDIR", "SYSTEMROOT")
    return {key: os.environ[key] for key in allowed if key in os.environ}


def run_project(project_root, manifest, run=subprocess.run):
    project_root = project_root.resolve()
    display_command = load_project_command(project_root, manifest)
    files = file_inventory(project_root, manifest)
    expected_hashes = {item["path"]: item.get("sha256") for item in manifest["requiredFiles"]}
    mismatched = [item["path"] for item in files if item["present"] and expected_hashes[item["path"]] and item["sha256"] != expected_hashes[item["path"]]]
    started = time.monotonic()
    actual_command = [sys.executable, *display_command[1:]]
    status = "failed"
    exit_code = -1
    stdout = ""
    stderr = ""
    if any(not item["present"] for item in files):
        stderr = "Required project files are missing."
    elif mismatched:
        stderr = f"Required project file hashes do not match: {', '.join(mismatched)}."
    else:
        try:
            completed = run(
                actual_command,
                cwd=project_root,
                capture_output=True,
                text=True,
                timeout=manifest["timeoutSeconds"],
                check=False,
                shell=False,
                env=runner_environment(),
            )
            exit_code = completed.returncode
            stdout = completed.stdout
            stderr = completed.stderr
            status = "passed" if exit_code == 0 else "failed"
            if exit_code != 0 and "No module named pytest" in limited(stderr)[0]:
                status = "tool-missing"
        except subprocess.TimeoutExpired as error:
            status = "timeout"
            exit_code = -2
            stdout = error.stdout or ""
            stderr = error.stderr or ""
    stdout, stdout_truncated = limited(stdout)
    stderr, stderr_truncated = limited(stderr)
    return {
        "schemaVersion": 1,
        "reportId": f"report:{uuid.uuid4()}",
        "projectId": manifest["projectId"],
        "projectVersion": manifest["projectVersion"],
        "runner": "python-pytest",
        "runAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "command": display_command,
        "status": status,
        "exitCode": exit_code,
        "durationMs": round((time.monotonic() - started) * 1000),
        "stdout": stdout,
        "stderr": stderr,
        "stdoutTruncated": stdout_truncated,
        "stderrTruncated": stderr_truncated,
        "files": files,
    }


def write_report(path, report):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as handle:
            temporary = Path(handle.name)
            json.dump(report, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
        os.replace(temporary, path)
    except Exception:
        if temporary is not None:
            temporary.unlink(missing_ok=True)
        raise


def main():
    parser = argparse.ArgumentParser(description="Run the fixed pytest check for a learner project.")
    parser.add_argument("--project", required=True, type=Path)
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    project_root = args.project.resolve()
    if not project_root.is_dir():
        raise SystemExit(f"Project directory does not exist: {project_root}")
    manifest = load_manifest(args.manifest.resolve())
    report = run_project(project_root, manifest)
    write_report(args.output.resolve(), report)
    print(f"{report['status']}: {args.output} ({report['durationMs']} ms)")
    return 0 if report["status"] == "passed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
