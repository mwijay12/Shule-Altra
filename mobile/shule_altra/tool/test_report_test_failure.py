"""The CI failure reporter, tested: a log with no failure lines still reports."""
from __future__ import annotations

import unittest

from report_test_failure import escape, report


class ReportTests(unittest.TestCase):
    def test_failing_test_and_assertion_are_reported_first(self) -> None:
        lines = [
            "00:01 +3 -1: some test [E]",
            "  Expected: 'Amina'",
            "    Actual: 'Neema'",
        ]
        commands = report(lines)
        self.assertTrue(commands[0].startswith("::error::00:01 +3 -1: some test [E]"))
        self.assertIn("Expected: 'Amina'", commands[1])
        self.assertTrue(commands[-1].startswith("::error::"))

    def test_escape_protects_workflow_commands(self) -> None:
        self.assertEqual(escape("100% done\r\nnext"), "100%25 done%0D%0Anext")

    def test_a_clean_log_still_gets_one_annotation(self) -> None:
        self.assertEqual(len(report(["all good"])), 1)


if __name__ == "__main__":
    unittest.main()
