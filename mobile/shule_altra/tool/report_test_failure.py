#!/usr/bin/env python3
"""Turn a failed `flutter test` log into GitHub annotations.

The default workflow output truncates the interesting part of a test log, which
turns a one-line assertion failure into a hunt. This script prints the failing
test names and their Expected/Actual lines first, as individual annotations, then
the whole log in chunks that fit inside GitHub's per-annotation limit.

Reads $RUNNER_TEMP/flutter-test.log. Never edits or deletes anything.
"""
from __future__ import annotations

import os
from pathlib import Path

# GitHub silently drops an annotation whose message is too long, so the log is
# split well below that limit. A dropped annotation is worse than none: it looks
# like the failure was never reported.
CHUNK = 3_500


def escape(text: str) -> str:
    return text.replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")


def report(lines: list[str]) -> list[str]:
    """The exact `::error::` commands for a failing test log."""
    out: list[str] = []
    for line in lines:
        stripped = line.strip()
        if "[E]" in stripped or stripped.startswith(("Expected:", "Actual:", "Which:")):
            out.append("::error::" + escape(stripped)[:900])
            if len(out) >= 40:
                break

    body = "\n".join(lines)
    for start in range(0, len(body), CHUNK):
        out.append("::error::" + escape(body[start : start + CHUNK]))
    return out


def main() -> None:
    path = Path(os.environ["RUNNER_TEMP"]) / "flutter-test.log"
    lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    for command in report(lines):
        print(command)


if __name__ == "__main__":
    main()
