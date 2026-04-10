from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
JOBS_DIR = ROOT / "claude" / "jobs"
DEFAULT_ARTIFACTS_DIR = ROOT / "claude" / "reviews" / "runs"
DEFAULT_ALLOWED_TOOLS = ["Read", "Glob", "Grep"]
PERMISSION_MODES = ("default", "acceptEdits", "bypassPermissions", "auto", "dontAsk", "plan")
SAFE_RUN_ID_PATTERN = re.compile(r"[^A-Za-z0-9._-]+")


def load_job_specs() -> dict[str, dict[str, Any]]:
    specs: dict[str, dict[str, Any]] = {}
    if not JOBS_DIR.exists():
        return specs

    for path in sorted(JOBS_DIR.glob("*.json")):
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            print(f"Invalid job spec JSON: {path}: {exc}", file=sys.stderr)
            raise SystemExit(2) from exc
        job_type = payload.get("job_type") or path.stem
        payload["job_type"] = job_type
        payload["path"] = str(path)
        specs[job_type] = payload
    return specs


JOB_SPECS = load_job_specs()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run Claude Code CLI in headless mode using local Claude authentication.",
    )
    parser.add_argument("prompt", nargs="?", help="prompt text to send to Claude; use --prompt-file or stdin")
    parser.add_argument("--prompt-file", type=Path, help="read the prompt from a UTF-8 text file")
    parser.add_argument("--cwd", type=Path, default=ROOT, help="working directory Claude can access")
    parser.add_argument("--job-type", choices=sorted(JOB_SPECS), help="standardized harness job type")
    parser.add_argument("--system-prompt", help="optional system prompt for Claude CLI")
    parser.add_argument("--append-system-prompt", help="optional extra system prompt appended to defaults")
    parser.add_argument("--permission-mode", choices=PERMISSION_MODES, help="Claude Code CLI permission mode")
    parser.add_argument("--allowed-tool", action="append", default=[], help="additional allowed tool rule")
    parser.add_argument("--disallowed-tool", action="append", default=[], help="additional blocked tool rule")
    parser.add_argument("--model", help="optional Claude model override")
    parser.add_argument("--effort", choices=("low", "medium", "high", "max"), help="optional effort level")
    parser.add_argument("--output-format", choices=("text", "json"), default="json", help="Claude CLI output format")
    parser.add_argument("--artifacts-dir", type=Path, default=DEFAULT_ARTIFACTS_DIR, help="structured run artifact directory")
    parser.add_argument("--run-id", help="optional stable run identifier")
    parser.add_argument("--no-artifact", action="store_true", help="skip writing structured artifact JSON")
    parser.add_argument(
        "--print-command",
        action="store_true",
        help="print the claude command to stderr before execution",
    )
    return parser.parse_args()


def resolve_prompt(args: argparse.Namespace) -> tuple[str, str]:
    if args.prompt and args.prompt_file:
        print("Use either a positional prompt or --prompt-file, not both.", file=sys.stderr)
        raise SystemExit(2)

    if args.prompt_file:
        return args.prompt_file.read_text(encoding="utf-8").strip(), f"file:{args.prompt_file}"

    if args.prompt:
        return args.prompt.strip(), "argument"

    if not sys.stdin.isatty():
        return sys.stdin.read().strip(), "stdin"

    print("Provide a prompt via argument, --prompt-file, or stdin.", file=sys.stderr)
    raise SystemExit(2)


def build_effective_config(args: argparse.Namespace) -> tuple[dict[str, Any] | None, list[str], list[str] | None, str]:
    job_spec = JOB_SPECS.get(args.job_type) if args.job_type else None

    if job_spec:
        spec_allowed_tools = list(job_spec.get("allowed_tools") or [])
        invalid_allowed_tools = [tool for tool in args.allowed_tool if tool not in spec_allowed_tools]
        if invalid_allowed_tools:
            print(
                f"Job type {args.job_type!r} does not allow extra tools: {', '.join(invalid_allowed_tools)}",
                file=sys.stderr,
            )
            raise SystemExit(2)

        allowed_tools = spec_allowed_tools or list(DEFAULT_ALLOWED_TOOLS)
        disallowed_tools = list(job_spec.get("disallowed_tools") or [])
        if args.disallowed_tool:
            disallowed_tools.extend(args.disallowed_tool)
        permission_mode = args.permission_mode or job_spec.get("permission_mode") or "default"
        return job_spec, allowed_tools, disallowed_tools or None, permission_mode

    return (
        None,
        args.allowed_tool or list(DEFAULT_ALLOWED_TOOLS),
        args.disallowed_tool or None,
        args.permission_mode or "default",
    )


def build_effective_prompt(prompt: str, job_spec: dict[str, Any] | None) -> str:
    if not job_spec:
        return prompt

    prompt_preamble = list(job_spec.get("prompt_preamble") or [])
    report_sections = list(job_spec.get("report_sections") or [])
    parts: list[str] = [f"Harness job type: {job_spec['job_type']}"]
    if prompt_preamble:
        parts.extend(prompt_preamble)
    if report_sections:
        parts.append("")
        parts.append("Required report sections:")
        for index, section in enumerate(report_sections, start=1):
            parts.append(f"{index}. {section}")
    parts.append("")
    parts.append("User prompt:")
    parts.append(prompt)
    return "\n".join(parts).strip()


def build_effective_system_prompt(cli_system_prompt: str | None, cli_append: str | None, job_spec: dict[str, Any] | None) -> tuple[str | None, str | None]:
    job_system_prompt = job_spec.get("system_prompt") if job_spec else None
    if job_system_prompt and cli_system_prompt:
        effective_system = f"{job_system_prompt}\n\n{cli_system_prompt}"
    else:
        effective_system = cli_system_prompt or job_system_prompt
    return effective_system, cli_append


def build_run_id(args: argparse.Namespace, job_spec: dict[str, Any] | None) -> str:
    if args.run_id:
        return sanitize_run_id(args.run_id)
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    job_label = job_spec["job_type"] if job_spec else "adhoc-cli"
    return f"{timestamp}-{job_label}"


def sanitize_run_id(value: str) -> str:
    sanitized = SAFE_RUN_ID_PATTERN.sub("_", value.strip())
    sanitized = sanitized.strip("._")
    return sanitized or "claude-run"


def write_artifact(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def find_claude_cli() -> str:
    claude_path = shutil.which("claude")
    if not claude_path:
        print("Claude CLI not found. Install `@anthropic-ai/claude-code` first.", file=sys.stderr)
        raise SystemExit(1)
    return claude_path


def validate_cwd(cwd: Path) -> Path:
    resolved = cwd.resolve()
    if not resolved.exists() or not resolved.is_dir():
        print(f"Working directory does not exist: {resolved}", file=sys.stderr)
        raise SystemExit(2)
    try:
        resolved.relative_to(ROOT)
    except ValueError as exc:
        print(f"Working directory must stay inside repository root: {resolved}", file=sys.stderr)
        raise SystemExit(2) from exc
    return resolved


def build_command(
    claude_cli: str,
    args: argparse.Namespace,
    effective_prompt: str,
    effective_system_prompt: str | None,
    effective_append_system_prompt: str | None,
    allowed_tools: list[str],
    disallowed_tools: list[str] | None,
    permission_mode: str,
) -> list[str]:
    command = [
        claude_cli,
        "-p",
        effective_prompt,
        "--output-format",
        args.output_format,
        "--permission-mode",
        permission_mode,
        "--allowed-tools",
        ",".join(allowed_tools),
    ]
    if disallowed_tools:
        command.extend(["--disallowed-tools", ",".join(disallowed_tools)])
    if effective_system_prompt:
        command.extend(["--system-prompt", effective_system_prompt])
    if effective_append_system_prompt:
        command.extend(["--append-system-prompt", effective_append_system_prompt])
    if args.model:
        command.extend(["--model", args.model])
    if args.effort:
        command.extend(["--effort", args.effort])
    return command


def redact_command(command: list[str]) -> list[str]:
    redacted = list(command)
    if len(redacted) > 2 and redacted[1] == "-p":
        redacted[2] = "<prompt:redacted>"
    for index, token in enumerate(redacted[:-1]):
        if token in {"--system-prompt", "--append-system-prompt"}:
            redacted[index + 1] = "<prompt:redacted>"
    return redacted


def run_cli(args: argparse.Namespace, prompt: str, prompt_source: str) -> tuple[int, dict[str, Any]]:
    started_at = datetime.now().astimezone().isoformat()
    resolved_cwd = validate_cwd(args.cwd)
    job_spec, allowed_tools, disallowed_tools, permission_mode = build_effective_config(args)
    effective_prompt = build_effective_prompt(prompt, job_spec)
    effective_system_prompt, effective_append_system_prompt = build_effective_system_prompt(
        args.system_prompt,
        args.append_system_prompt,
        job_spec,
    )
    run_id = build_run_id(args, job_spec)
    claude_cli = find_claude_cli()
    command = build_command(
        claude_cli,
        args,
        effective_prompt,
        effective_system_prompt,
        effective_append_system_prompt,
        allowed_tools,
        disallowed_tools,
        permission_mode,
    )

    env = os.environ.copy()
    env.pop("ANTHROPIC_API_KEY", None)
    auth_mode = "subscription_or_local_auth"

    artifact_payload: dict[str, Any] = {
        "runner": "claude_cli",
        "run_id": run_id,
        "started_at": started_at,
        "job_type": args.job_type,
        "job_spec": job_spec,
        "cwd": str(resolved_cwd),
        "prompt_source": prompt_source,
        "prompt": prompt,
        "effective_prompt": effective_prompt,
        "system_prompt": effective_system_prompt,
        "append_system_prompt": effective_append_system_prompt,
        "permission_mode": permission_mode,
        "max_turns_requested": job_spec.get("max_turns") if job_spec else None,
        "max_turns_enforced": False,
        "allowed_tools": allowed_tools,
        "disallowed_tools": disallowed_tools,
        "model": args.model,
        "effort": args.effort,
        "output_format": args.output_format,
        "claude_command": command,
        "auth_mode": auth_mode,
    }

    if args.print_command:
        print(" ".join(redact_command(command)), file=sys.stderr)

    completed = subprocess.run(
        command,
        cwd=resolved_cwd,
        env=env,
        text=True,
        capture_output=True,
    )
    artifact_payload["finished_at"] = datetime.now().astimezone().isoformat()
    artifact_payload["exit_code"] = completed.returncode
    artifact_payload["stdout"] = completed.stdout
    artifact_payload["stderr"] = completed.stderr

    if args.output_format == "json":
        try:
            artifact_payload["parsed_output"] = json.loads(completed.stdout) if completed.stdout.strip() else None
        except json.JSONDecodeError:
            artifact_payload["parsed_output_error"] = "failed_to_parse_json_output"

    if completed.stdout:
        print(completed.stdout, end="")
    if completed.stderr:
        print(completed.stderr, end="", file=sys.stderr)

    return completed.returncode, artifact_payload


def main() -> None:
    args = parse_args()
    prompt, prompt_source = resolve_prompt(args)
    exit_code, artifact_payload = run_cli(args, prompt, prompt_source)
    if not args.no_artifact:
        artifact_path = args.artifacts_dir.resolve() / f"{artifact_payload['run_id']}.json"
        write_artifact(artifact_path, artifact_payload)
        print(f"Harness artifact saved: {artifact_path}", file=sys.stderr)
    raise SystemExit(exit_code)


if __name__ == "__main__":
    main()
