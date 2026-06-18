#!/usr/bin/env python3
"""Testes unitários para scripts/avaliar_apresentacoes.py.

Execução:
  uv run python scripts/test_avaliar_apresentacoes.py
  python scripts/test_avaliar_apresentacoes.py
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(__file__))
from avaliar_apresentacoes import build_virtual_text, extract_md_blocks, remap_line

SAMPLE_NOTEBOOK = '''import marimo

app = marimo.App()


@app.cell
def _(mo):
    mo.md(
        """
        # Título

        Primeira linha de prosa.
        Segunda linha de prosa.
        """
    )
    return


@app.cell
def _(mo):
    mo.md(
        """
        ## Segundo bloco

        Outra linha aqui.
        """
    )
    return
'''


class TestExtractMdBlocks(unittest.TestCase):
    def test_extracts_both_blocks(self):
        blocks = extract_md_blocks(SAMPLE_NOTEBOOK)
        self.assertEqual(len(blocks), 2)

    def test_dedents_text(self):
        blocks = extract_md_blocks(SAMPLE_NOTEBOOK)
        _, text = blocks[0]
        self.assertIn("# Título", text)
        self.assertNotIn("        # Título", text)

    def test_ignores_non_md_calls(self):
        source = '''
@app.cell
def _(mo):
    mo.ui.slider(1, 10)
    return
'''
        blocks = extract_md_blocks(source)
        self.assertEqual(blocks, [])

    def test_start_line_points_to_first_content_line_not_quote(self):
        blocks = extract_md_blocks(SAMPLE_NOTEBOOK)
        first_start_line, _ = blocks[0]
        lines = SAMPLE_NOTEBOOK.split("\n")
        self.assertNotIn('"""', lines[first_start_line - 1])
        self.assertIn("Título", lines[first_start_line - 1])


class TestLineRemapping(unittest.TestCase):
    def test_remaps_virtual_line_to_real_source_line(self):
        blocks = extract_md_blocks(SAMPLE_NOTEBOOK)
        virtual_text, line_map = build_virtual_text(blocks)
        target_idx = virtual_text.split("\n").index("Segunda linha de prosa.")
        real_line = remap_line(line_map, target_idx + 1)
        self.assertEqual(SAMPLE_NOTEBOOK.split("\n")[real_line - 1].strip(), "Segunda linha de prosa.")

    def test_out_of_range_returns_none(self):
        line_map = [10, 11, 12]
        self.assertIsNone(remap_line(line_map, 0))
        self.assertIsNone(remap_line(line_map, 99))
        self.assertIsNone(remap_line(line_map, None))


if __name__ == "__main__":
    unittest.main()
