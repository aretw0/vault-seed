#!/usr/bin/env python3
"""Unit tests for scripts/text_scorer.py.

Execução:
  uv run python scripts/test_text_scorer.py
  python scripts/test_text_scorer.py
"""
import sys
import os
import unittest

sys.path.insert(0, os.path.dirname(__file__))
from text_scorer import (
    Finding,
    build_effective_config,
    prose_paragraphs,
    read_frontmatter_field,
    score_text,
    severity_counts,
    strip_frontmatter,
    word_count,
)

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
    "profiles": {"default": {}},
    "audiences": {"todos": {}},
}


class TestScoreTextGeneric(unittest.TestCase):
    """score_text works on any plain text, not just vault notes."""

    def test_plain_text_no_frontmatter(self):
        text = "Este é um parágrafo simples. Sem frontmatter YAML."
        findings, metrics = score_text(text, MINIMAL_CONFIG, source="feed-item")
        self.assertIsInstance(findings, list)
        self.assertEqual(metrics["source"], "feed-item")
        self.assertGreater(metrics["words"], 0)

    def test_markdown_note_with_frontmatter(self):
        text = "---\ntitle: Test\n---\nConteúdo da nota aqui."
        findings, metrics = score_text(text, MINIMAL_CONFIG, source="nota.md")
        self.assertEqual(metrics["source"], "nota.md")
        # frontmatter should be stripped — word count is just the body
        self.assertLess(metrics["words"], 10)

    def test_empty_text_no_crash(self):
        findings, metrics = score_text("", MINIMAL_CONFIG)
        self.assertEqual(findings, [])
        self.assertEqual(metrics["words"], 0)

    def test_source_defaults_to_empty_string(self):
        _, metrics = score_text("texto", MINIMAL_CONFIG)
        self.assertEqual(metrics["source"], "")

    def test_feed_summary_scores_long_sentence(self):
        config = {**MINIMAL_CONFIG, "longSentenceWords": 5}
        long_summary = "Este feed item tem uma frase muito longa com muitas palavras desnecessárias que excedem o limite configurado."
        findings, _ = score_text(long_summary, config, source="feed/item-1")
        long_findings = [f for f in findings if f.rule == "long-sentence"]
        self.assertGreater(len(long_findings), 0)


class TestSeverityCounts(unittest.TestCase):
    def test_empty(self):
        self.assertEqual(severity_counts([]), {"fail": 0, "warn": 0, "info": 0})

    def test_mixed(self):
        findings = [
            Finding("fail", "r1", "m"),
            Finding("warn", "r2", "m"),
            Finding("warn", "r3", "m"),
            Finding("info", "r4", "m"),
        ]
        counts = severity_counts(findings)
        self.assertEqual(counts["fail"], 1)
        self.assertEqual(counts["warn"], 2)
        self.assertEqual(counts["info"], 1)


class TestStripFrontmatter(unittest.TestCase):
    def test_strips_yaml(self):
        text = "---\nkey: value\n---\nBody here."
        body, offset = strip_frontmatter(text)
        self.assertEqual(body, "Body here.")
        self.assertGreater(offset, 0)

    def test_no_frontmatter_passthrough(self):
        text = "Just plain text."
        body, offset = strip_frontmatter(text)
        self.assertEqual(body, text)
        self.assertEqual(offset, 0)


class TestProseFilter(unittest.TestCase):
    def test_skips_headings(self):
        text = "# Título\n\nParágrafo real aqui."
        prose = prose_paragraphs(text)
        self.assertEqual(len(prose), 1)
        self.assertIn("Parágrafo", prose[0][1])

    def test_skips_bullets(self):
        text = "- item um\n- item dois\n\nParágrafo."
        prose = prose_paragraphs(text)
        self.assertEqual(len(prose), 1)

    def test_plain_text_all_prose(self):
        text = "Parágrafo um.\n\nParágrafo dois.\n\nParágrafo três."
        prose = prose_paragraphs(text)
        self.assertEqual(len(prose), 3)


class TestBuildEffectiveConfig(unittest.TestCase):
    def test_unknown_profile_falls_back_to_default(self):
        cfg = build_effective_config(MINIMAL_CONFIG, "inexistente", "todos")
        self.assertIn("riskPatterns", cfg)

    def test_profile_override_applied(self):
        config = {**MINIMAL_CONFIG, "profiles": {"strict": {"longSentenceWords": 15}}}
        cfg = build_effective_config(config, "strict", "todos")
        self.assertEqual(cfg["longSentenceWords"], 15)


if __name__ == "__main__":
    unittest.main()
