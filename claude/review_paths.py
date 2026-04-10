from __future__ import annotations

import argparse
import subprocess
import sys
from datetime import datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Review concrete files or directories with Claude CLI headless mode.",
    )
    parser.add_argument(
        "--path",
        action="append",
        default=[],
        help="file or directory path inside the repository to review; repeatable",
    )
    parser.add_argument(
        "--context-path",
        action="append",
        default=[],
        help="additional context path inside the repository; repeatable",
    )
    parser.add_argument("--cwd", type=Path, default=ROOT, help="repository root")
    parser.add_argument("--job-type", default="review", help="job type to use when invoking claude/run.sh")
    parser.add_argument("--run-id", help="optional stable run id")
    parser.add_argument("--model", help="optional Claude model override")
    parser.add_argument("--effort", choices=("low", "medium", "high", "max"), help="optional effort level")
    parser.add_argument(
        "--mode",
        choices=("quick", "full"),
        default="quick",
        help="review depth; quick focuses on 핵심 이슈, full asks Claude to inspect more broadly",
    )
    parser.add_argument(
        "--change-summary",
        help="optional short summary of what was changed or generated before this review",
    )
    return parser.parse_args()


def validate_repo_path(cwd: Path, raw_path: str) -> str:
    target = (cwd / raw_path).resolve()
    try:
        target.relative_to(cwd)
    except ValueError as exc:
        print(f"Path must stay inside repository root: {raw_path}", file=sys.stderr)
        raise SystemExit(2) from exc
    if not target.exists():
        print(f"Path does not exist: {raw_path}", file=sys.stderr)
        raise SystemExit(2)
    return str(target.relative_to(cwd))


def build_prompt(
    target_paths: list[str],
    context_paths: list[str],
    change_summary: str | None,
    repo_root: Path,
    mode: str,
) -> str:
    review_scope_line = (
        "핵심 버그와 위험 중심으로 짧게 리뷰하라."
        if mode == "quick"
        else "필요하면 관련 파일과 문서를 더 넓게 따라가며 구조와 동작 위험까지 함께 리뷰하라."
    )
    report_lines = (
        [
            "리뷰 형식:",
            "1. 핵심 이슈 최대 3개",
            "2. 약한 가정 또는 열린 질문",
            "3. 바로 필요한 검증 항목",
        ]
        if mode == "quick"
        else [
            "리뷰 형식:",
            "1. 가능한 경우 파일 참조를 포함해 심각도 순으로 이슈를 정리",
            "2. 열린 질문 또는 약한 가정",
            "3. 누락된 검증 단계 또는 테스트",
            "4. 불확실성이 남으면 다음에 확인할 파일 또는 흐름",
        ]
    )
    lines = [
        "AGENTS.md를 먼저 읽어라.",
        "",
        "지정된 저장소 경로의 현재 구현 결과물을 리뷰하라.",
        f"저장소 루트: {repo_root}",
        "git diff 기준으로 리뷰하지 말고, 현재 코드 자체를 기준으로 리뷰하라.",
        "필요하면 관련 파일과 저장소 내부 문서를 스스로 찾아 읽어라.",
        review_scope_line,
        "DB 가정이 필요하면 저장소 루트 modular.db를 런타임 기준 DB로 간주하라.",
        "파일은 수정하지 마라.",
        "최종 응답은 반드시 한국어로 작성하라.",
        "",
        "주요 리뷰 대상:",
    ]
    lines.extend(f"- {path}" for path in target_paths)

    if context_paths:
        lines.extend(["", "추가 컨텍스트 경로:"])
        lines.extend(f"- {path}" for path in context_paths)

    if change_summary:
        lines.extend(["", "호출자가 제공한 변경 요약:", change_summary])

    lines.extend(["", *report_lines])
    return "\n".join(lines).strip()


def main() -> None:
    args = parse_args()
    cwd = args.cwd.resolve()
    target_paths = [validate_repo_path(cwd, raw_path) for raw_path in args.path]
    context_paths = [validate_repo_path(cwd, raw_path) for raw_path in args.context_path]

    if not target_paths:
        print("Provide at least one --path to review.", file=sys.stderr)
        raise SystemExit(2)

    prompt = build_prompt(target_paths, context_paths, args.change_summary, cwd, args.mode)
    run_id = args.run_id or f"{datetime.now().strftime('%Y%m%d-%H%M%S')}-paths-review"
    command = [
        "python3",
        str(cwd / "claude" / "run_cli.py"),
        "--cwd",
        str(cwd),
        "--job-type",
        args.job_type,
        "--run-id",
        run_id,
        "--output-format",
        "json",
        prompt,
    ]
    if args.model:
        command.extend(["--model", args.model])
    if args.effort:
        command.extend(["--effort", args.effort])

    completed = subprocess.run(command, cwd=cwd, text=True)
    raise SystemExit(completed.returncode)


if __name__ == "__main__":
    main()
