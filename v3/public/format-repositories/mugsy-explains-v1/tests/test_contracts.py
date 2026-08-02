from __future__ import annotations

import json
import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path


PACKAGE = Path(__file__).resolve().parents[1]


class MugsyCreativeContractTest(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = Path(tempfile.mkdtemp(prefix="wiggly-mugsy-contract-"))
        self.root = self.temp / "kit"
        shutil.copytree(PACKAGE, self.root, ignore=shutil.ignore_patterns("downloads", "final", "__pycache__"))
        self.env = {**os.environ, "PYTHONPYCACHEPREFIX": str(self.temp / "pycache")}

    def tearDown(self) -> None:
        shutil.rmtree(self.temp)

    def run_runner(self, *args: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            ["python3", "runner.py", *args],
            cwd=self.root,
            env=self.env,
            capture_output=True,
            text=True,
            check=False,
        )

    def read_json(self, name: str) -> dict:
        return json.loads((self.root / name).read_text())

    def write_json(self, name: str, value: dict) -> None:
        (self.root / name).write_text(json.dumps(value, indent=2) + "\n")

    def test_approved_example_passes_free_contracts(self) -> None:
        concepts = self.run_runner("concepts")
        self.assertEqual(concepts.returncode, 0, concepts.stderr)
        self.assertIn('"review-required"', concepts.stdout)
        self.assertEqual(len(json.loads(concepts.stdout)["concepts"]), 5)

        proof_board = self.run_runner("proof-board")
        self.assertEqual(proof_board.returncode, 0, proof_board.stderr)
        self.assertTrue((self.root / "run" / "review" / "proof-board.jpg").is_file())

        validation = self.run_runner("validate")
        self.assertEqual(validation.returncode, 0, validation.stderr)
        self.assertIn('"providerCalls": 0', validation.stdout)

    def test_brief_change_invalidates_concept_approval(self) -> None:
        brief = self.read_json("brief.json")
        brief["plainEnglish"] += " Changed after approval."
        self.write_json("brief.json", brief)
        result = self.run_runner("validate")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("concept approval is stale", result.stderr)

    def test_visual_change_invalidates_proof_approval(self) -> None:
        plan = self.read_json("visual-plan.json")
        plan["proofs"][0]["proves"] += " Changed after approval."
        self.write_json("visual-plan.json", plan)
        result = self.run_runner("validate")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("proof-board approval is stale", result.stderr)

    def test_script_change_invalidates_script_approval_before_proofs(self) -> None:
        content = self.read_json("content.json")
        content["lessons"][0]["sentences"][3]["text"] = "A prompt asks AI for one output."
        content["lessons"][0]["sentences"][3]["chunks"] = ["A prompt asks AI", "for one output"]
        self.write_json("content.json", content)
        result = self.run_runner("proof-board")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("script approval is stale", result.stderr)

    def test_story_arc_must_be_setup_mechanism_payoff(self) -> None:
        concepts = self.read_json("concepts.json")
        concepts["concepts"][0]["comparisonPlan"][1]["beat"] = "setup"
        self.write_json("concepts.json", concepts)
        result = self.run_runner("concepts")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("must escalate through", result.stderr)

    def test_final_sentence_must_match_approved_takeaway(self) -> None:
        content = self.read_json("content.json")
        content["lessons"][2]["sentences"][4]["text"] = "The system is reusable."
        content["lessons"][2]["sentences"][4]["chunks"] = ["The system is reusable"]
        self.write_json("content.json", content)
        result = self.run_runner("approve-script", "--human-review", "pass")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("finalTakeaway", result.stderr)

    def test_final_takeaway_must_be_memorable_length(self) -> None:
        concepts = self.read_json("concepts.json")
        concepts["concepts"][0]["finalTakeaway"] = (
            "This deliberately long final takeaway keeps adding abstract corporate words until no ordinary viewer "
            "could repeat it after hearing it once."
        )
        self.write_json("concepts.json", concepts)
        result = self.run_runner("concepts")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("16 words or fewer", result.stderr)

    def test_ad_cta_is_rejected_before_voice(self) -> None:
        content = self.read_json("content.json")
        content["lessons"][2]["sentences"][4] = {
            "role": "explain_b",
            "text": "Sign up now.",
            "chunks": ["Sign up now"],
        }
        self.write_json("content.json", content)
        result = self.run_runner("validate")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("ad-like CTA language", result.stderr)


if __name__ == "__main__":
    unittest.main()
