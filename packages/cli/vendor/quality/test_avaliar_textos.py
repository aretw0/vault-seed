#!/usr/bin/env python3
"""Testes unitários para scripts/avaliar_textos.py.

Execução:
  uv run python scripts/test_avaliar_textos.py
  python scripts/test_avaliar_textos.py
"""
import sys
import os
import unittest
from pathlib import Path

sys.path.insert(0, os.path.dirname(__file__))
from avaliar_textos import (
    Finding,
    build_effective_config,
    evaluate,
    read_frontmatter_field,
    severity_counts,
    strip_frontmatter,
)

# ---------------------------------------------------------------------------
# Minimal config fixture — mirrors the shape of quality-rules.json
# ---------------------------------------------------------------------------
MINIMAL_CONFIG = {
    "riskPatterns": [],
    "mechanicalOpeners": {"windowParagraphs": 8, "phrases": []},
    "repetitionHeuristics": {
        "paragraphStarter": {"enabled": False},
        "sentenceStarter": {"enabled": False},
        "parallelCopula": {"enabled": False},
        "paragraphTemplate": {"enabled": False},
    },
    "longSentenceWords": 0,
    "profiles": {"default": {}, "ultra-rigor": {"longSentenceWords": 10}},
    "audiences": {
        "iniciante": {"longSentenceWords": 8},
        "todos": {},
    },
}

FULL_HEURISTICS_CONFIG = {
    **MINIMAL_CONFIG,
    "mechanicalOpeners": {
        "windowParagraphs": 8,
        "phrases": ["Além disso", "Por fim", "Também é"],
    },
    "repetitionHeuristics": {
        "paragraphStarter": {
            "enabled": True,
            "ngramWords": 2,
            "windowParagraphs": 5,
            "minOccurrencesInWindow": 3,
            "minWordLength": 2,
            "ignoreStarters": [],
        },
        "sentenceStarter": {
            "enabled": True,
            "ngramWords": 3,
            "windowSentences": 6,
            "minOccurrencesInWindow": 3,
            "minWordLength": 2,
            "ignoreStarters": [],
        },
        "parallelCopula": {
            "enabled": True,
            "starterWords": 2,
            "minWordLength": 2,
            "maxFindings": 5,
        },
        "paragraphTemplate": {"enabled": False},
    },
    "longSentenceWords": 15,
}

NOTE_PATH = Path("40 - Recursos/exemplo.md")


def make_note(body: str, frontmatter: str = "status: draft") -> str:
    return f"---\n{frontmatter}\n---\n\n{body}"


# ---------------------------------------------------------------------------
# strip_frontmatter
# ---------------------------------------------------------------------------
class TestStripFrontmatter(unittest.TestCase):
    def test_strips_yaml_block(self):
        text = "---\nstatus: draft\n---\n\nCorpo da nota."
        body, offset = strip_frontmatter(text)
        self.assertIn("Corpo da nota.", body)
        self.assertNotIn("status", body)

    def test_offset_matches_frontmatter_lines(self):
        text = "---\nstatus: draft\nauthor: x\n---\n\nLinha."
        _, offset = strip_frontmatter(text)
        self.assertEqual(offset, 4)

    def test_no_frontmatter_returns_full_text(self):
        text = "# Título\n\nTexto sem frontmatter."
        body, offset = strip_frontmatter(text)
        self.assertIn("Título", body)
        self.assertEqual(offset, 0)

    def test_strips_bom(self):
        text = "﻿---\nstatus: draft\n---\n\nCorpo."
        body, _ = strip_frontmatter(text)
        self.assertFalse(body.startswith("﻿"))
        self.assertIn("Corpo.", body)


# ---------------------------------------------------------------------------
# read_frontmatter_field
# ---------------------------------------------------------------------------
class TestReadFrontmatterField(unittest.TestCase):
    def test_reads_simple_field(self):
        text = "---\nstatus: draft\nauthor: ada\n---\nCorpo."
        self.assertEqual(read_frontmatter_field(text, "status"), "draft")
        self.assertEqual(read_frontmatter_field(text, "author"), "ada")

    def test_returns_none_for_missing_field(self):
        text = "---\nstatus: draft\n---\nCorpo."
        self.assertIsNone(read_frontmatter_field(text, "audience"))

    def test_returns_none_without_frontmatter(self):
        text = "# Sem frontmatter"
        self.assertIsNone(read_frontmatter_field(text, "status"))


# ---------------------------------------------------------------------------
# severity_counts
# ---------------------------------------------------------------------------
class TestSeverityCounts(unittest.TestCase):
    def test_groups_by_severity(self):
        findings = [
            Finding("fail", "r1", "msg"),
            Finding("warn", "r2", "msg"),
            Finding("warn", "r3", "msg"),
            Finding("info", "r4", "msg"),
        ]
        counts = severity_counts(findings)
        self.assertEqual(counts["fail"], 1)
        self.assertEqual(counts["warn"], 2)
        self.assertEqual(counts["info"], 1)

    def test_empty_findings(self):
        counts = severity_counts([])
        self.assertEqual(counts, {"fail": 0, "warn": 0, "info": 0})


# ---------------------------------------------------------------------------
# evaluate — risk patterns
# ---------------------------------------------------------------------------
class TestEvaluateRiskPatterns(unittest.TestCase):
    def _config_with_pattern(self, pattern_id, regex, severity="warn"):
        cfg = {**MINIMAL_CONFIG, "riskPatterns": [{"id": pattern_id, "regex": regex, "severity": severity}]}
        return cfg

    def test_detects_draft_marker(self):
        cfg = self._config_with_pattern("draft-markers", r"(?-i:\bTODO\b|\bFIXME\b)", "warn")
        text = make_note("Este parágrafo tem um TODO no meio.")
        findings, _ = evaluate(text, cfg, NOTE_PATH)
        rules = [f.rule for f in findings]
        self.assertIn("draft-markers", rules)

    def test_no_finding_on_clean_text(self):
        cfg = self._config_with_pattern("draft-markers", r"(?-i:\bTODO\b)", "warn")
        text = make_note("Texto completamente limpo sem marcadores.")
        findings, _ = evaluate(text, cfg, NOTE_PATH)
        self.assertEqual(len(findings), 0)

    def test_snippet_is_populated(self):
        cfg = self._config_with_pattern("test-rule", r"\bpendente\b", "warn")
        text = make_note("Esta nota tem algo pendente aqui.")
        findings, _ = evaluate(text, cfg, NOTE_PATH)
        self.assertTrue(len(findings) > 0)
        self.assertIsNotNone(findings[0].snippet)


# ---------------------------------------------------------------------------
# evaluate — long sentences
# ---------------------------------------------------------------------------
class TestEvaluateLongSentences(unittest.TestCase):
    def test_flags_long_sentence(self):
        cfg = {**MINIMAL_CONFIG, "longSentenceWords": 10}
        long = " ".join(["palavra"] * 15) + "."
        text = make_note(long)
        findings, metrics = evaluate(text, cfg, NOTE_PATH)
        self.assertTrue(any(f.rule == "long-sentence" for f in findings))
        self.assertTrue(len(metrics.get("longSentences", [])) > 0)

    def test_no_flag_within_limit(self):
        cfg = {**MINIMAL_CONFIG, "longSentenceWords": 20}
        short = " ".join(["palavra"] * 10) + "."
        text = make_note(short)
        findings, _ = evaluate(text, cfg, NOTE_PATH)
        self.assertFalse(any(f.rule == "long-sentence" for f in findings))

    def test_zero_limit_disables_check(self):
        cfg = {**MINIMAL_CONFIG, "longSentenceWords": 0}
        long = " ".join(["palavra"] * 50) + "."
        text = make_note(long)
        findings, _ = evaluate(text, cfg, NOTE_PATH)
        self.assertFalse(any(f.rule == "long-sentence" for f in findings))


# ---------------------------------------------------------------------------
# evaluate — mechanical openers
# ---------------------------------------------------------------------------
class TestEvaluateMechanicalOpeners(unittest.TestCase):
    def _make_paragraphs(self, *paras):
        return "\n\n".join(paras)

    def test_flags_repeated_opener_in_window(self):
        cfg = {
            **FULL_HEURISTICS_CONFIG,
            "repetitionHeuristics": {**FULL_HEURISTICS_CONFIG["repetitionHeuristics"],
                                      "paragraphStarter": {"enabled": False},
                                      "sentenceStarter": {"enabled": False},
                                      "parallelCopula": {"enabled": False}},
        }
        paras = self._make_paragraphs(
            "Além disso, o primeiro ponto é relevante para o tema.",
            "O segundo parágrafo fala de outra coisa completamente diferente.",
            "O terceiro parágrafo introduz mais contexto sobre o assunto.",
            "Além disso, o quarto ponto reforça a ideia anterior com evidências.",
        )
        text = make_note(paras)
        findings, _ = evaluate(text, cfg, NOTE_PATH)
        self.assertTrue(any(f.rule == "mechanical-opener-repeat" for f in findings))

    def test_no_flag_opener_outside_window(self):
        cfg = {
            **FULL_HEURISTICS_CONFIG,
            "mechanicalOpeners": {"windowParagraphs": 2, "phrases": ["Além disso"]},
            "repetitionHeuristics": {**FULL_HEURISTICS_CONFIG["repetitionHeuristics"],
                                      "paragraphStarter": {"enabled": False},
                                      "sentenceStarter": {"enabled": False},
                                      "parallelCopula": {"enabled": False}},
        }
        paras = self._make_paragraphs(
            "Além disso, primeiro ponto aqui.",
            "Parágrafo dois sem abertura mecânica.",
            "Parágrafo três também neutro.",
            "Além disso, quarto ponto — mas fora da janela de 2.",
        )
        text = make_note(paras)
        findings, _ = evaluate(text, cfg, NOTE_PATH)
        self.assertFalse(any(f.rule == "mechanical-opener-repeat" for f in findings))


# ---------------------------------------------------------------------------
# evaluate — paragraph starter repetition
# ---------------------------------------------------------------------------
class TestEvaluateParagraphStarterRepeat(unittest.TestCase):
    def test_flags_repeated_ngram_starter(self):
        cfg = {
            **FULL_HEURISTICS_CONFIG,
            "mechanicalOpeners": {"windowParagraphs": 8, "phrases": []},
            "repetitionHeuristics": {
                **FULL_HEURISTICS_CONFIG["repetitionHeuristics"],
                "sentenceStarter": {"enabled": False},
                "parallelCopula": {"enabled": False},
                "paragraphStarter": {
                    "enabled": True, "ngramWords": 2, "windowParagraphs": 10,
                    "minOccurrencesInWindow": 3, "minWordLength": 2, "ignoreStarters": [],
                },
            },
        }
        paras = "\n\n".join([
            "Este texto fala sobre o tema principal desta nota.",
            "Este texto continua com mais informações sobre o assunto.",
            "Um parágrafo diferente no meio para intercalar o conteúdo.",
            "Este texto aparece pela terceira vez com o mesmo início.",
        ])
        text = make_note(paras)
        findings, _ = evaluate(text, cfg, NOTE_PATH)
        self.assertTrue(any(f.rule == "paragraph-starter-repeat" for f in findings))


# ---------------------------------------------------------------------------
# evaluate — parallel copula
# ---------------------------------------------------------------------------
class TestEvaluateParallelCopula(unittest.TestCase):
    def test_flags_sequential_copula(self):
        cfg = {
            **FULL_HEURISTICS_CONFIG,
            "mechanicalOpeners": {"windowParagraphs": 8, "phrases": []},
            "repetitionHeuristics": {
                **FULL_HEURISTICS_CONFIG["repetitionHeuristics"],
                "paragraphStarter": {"enabled": False},
                "sentenceStarter": {"enabled": False},
                "parallelCopula": {"enabled": True, "starterWords": 2, "minWordLength": 2, "maxFindings": 5},
            },
        }
        # Two consecutive sentences whose first 2 content words (len >= 2) match,
        # both containing verb "é" — "O" and "é" are filtered (len < 2).
        body = "O método central é robusto e confiável para uso em produção. O método central é escalável e pode crescer com a demanda."
        text = make_note(body)
        findings, _ = evaluate(text, cfg, NOTE_PATH)
        self.assertTrue(any(f.rule == "parallel-copula-repeat" for f in findings))


# ---------------------------------------------------------------------------
# build_effective_config — audience overrides
# ---------------------------------------------------------------------------
class TestBuildEffectiveConfig(unittest.TestCase):
    def test_audience_iniciante_applies_lower_sentence_limit(self):
        cfg = {
            **MINIMAL_CONFIG,
            "longSentenceWords": 45,
            "audiences": {"iniciante": {"longSentenceWords": 8}, "todos": {}},
        }
        effective = build_effective_config(cfg, "default", "iniciante")
        self.assertEqual(effective["longSentenceWords"], 8)

    def test_audience_todos_keeps_base_limit(self):
        cfg = {**MINIMAL_CONFIG, "longSentenceWords": 45, "audiences": {"todos": {}}}
        effective = build_effective_config(cfg, "default", "todos")
        self.assertEqual(effective["longSentenceWords"], 45)

    def test_ultra_rigor_profile_overrides_base(self):
        cfg = {
            **MINIMAL_CONFIG,
            "longSentenceWords": 45,
            "profiles": {"default": {}, "ultra-rigor": {"longSentenceWords": 10}},
        }
        effective = build_effective_config(cfg, "ultra-rigor", "todos")
        self.assertEqual(effective["longSentenceWords"], 10)

    def test_unknown_profile_falls_back_to_default(self):
        cfg = {**MINIMAL_CONFIG, "longSentenceWords": 45}
        effective = build_effective_config(cfg, "nao-existe", "todos")
        self.assertEqual(effective["longSentenceWords"], 45)

    def test_audience_override_wins_over_profile(self):
        cfg = {
            **MINIMAL_CONFIG,
            "longSentenceWords": 45,
            "profiles": {"default": {}, "ultra-rigor": {"longSentenceWords": 30}},
            "audiences": {"iniciante": {"longSentenceWords": 8}, "todos": {}},
        }
        # audience overlay is applied after profile, so iniciante (8) wins
        effective = build_effective_config(cfg, "ultra-rigor", "iniciante")
        self.assertEqual(effective["longSentenceWords"], 8)


if __name__ == "__main__":
    unittest.main(verbosity=2)
