#!/usr/bin/env python3
"""Avalia a prosa dos notebooks Marimo de apresentação com o mesmo motor
de scripts/avaliar_textos.py — sem isso, mo.md("...") nunca era escaneado
porque o avaliador só lê arquivos .md.

Extrai os blocos mo.md(<bloco triplo-aspas>) via ast (não regex, evita
falso parse em código Python dentro do próprio texto) e concatena por notebook,
preservando a numeração de linha original para os achados.

Uso:
  uv run python scripts/avaliar_apresentacoes.py
  uv run python scripts/avaliar_apresentacoes.py --json .dgk/qualidade-apresentacoes.json
"""

from __future__ import annotations

import argparse
import ast
import io
import json
import sys
import textwrap
from datetime import datetime
from pathlib import Path
from typing import Any

from text_scorer import build_effective_config, score_text, severity_counts

VAULT_ROOT = Path(__file__).resolve().parent.parent
PRESENTATIONS_DIR = VAULT_ROOT / "99 - Meta e Anexos" / "Notebooks" / "apresentacoes"


def extract_md_blocks(py_source: str) -> list[tuple[int, str]]:
    """Returns (start_line, dedented_text) for each mo.md(...) string-literal call."""
    tree = ast.parse(py_source)
    blocks: list[tuple[int, str]] = []
    for node in ast.walk(tree):
        if not (isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) and node.func.attr == "md"):
            continue
        if not node.args or not isinstance(node.args[0], ast.Constant) or not isinstance(node.args[0].value, str):
            continue
        raw = node.args[0].value
        leading_newlines = len(raw) - len(raw.lstrip("\n"))
        text = textwrap.dedent(raw).strip("\n")
        if text:
            # node.lineno is the line of the opening triple-quote; the first
            # content line starts `leading_newlines` lines after that.
            blocks.append((node.args[0].lineno + leading_newlines, text))
    return blocks


def build_virtual_text(blocks: list[tuple[int, str]]) -> tuple[str, list[int]]:
    """Concatenates blocks with blank-line separators; returns (text, line_map)
    where line_map[i] is the real source line for virtual line i+1."""
    virtual_lines: list[str] = []
    line_map: list[int] = []
    for start_line, text in blocks:
        for offset, line in enumerate(text.split("\n")):
            virtual_lines.append(line)
            line_map.append(start_line + offset)
        virtual_lines.append("")
        line_map.append(start_line + text.count("\n") + 1)
    return "\n".join(virtual_lines), line_map


def remap_line(line_map: list[int], virtual_line: int | None) -> int | None:
    if virtual_line is None or virtual_line < 1 or virtual_line > len(line_map):
        return None
    return line_map[virtual_line - 1]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Avalia a prosa dos notebooks de apresentação.")
    parser.add_argument("--config", default=str(VAULT_ROOT / "quality-rules.json"))
    parser.add_argument("--profile", default="default")
    parser.add_argument("--json", dest="json_out", default=str(VAULT_ROOT / ".dgk" / "qualidade-apresentacoes.json"))
    parser.add_argument("--strict", action="store_true")
    args = parser.parse_args(argv)

    config_path = Path(args.config).resolve()
    if not config_path.exists():
        print(f"quality-rules.json não encontrado: {config_path}", file=sys.stderr)
        return 2
    base_config = json.loads(config_path.read_text(encoding="utf-8"))
    cfg = build_effective_config(base_config, args.profile, "todos")

    if not PRESENTATIONS_DIR.exists():
        print(f"Pasta de apresentações não encontrada: {PRESENTATIONS_DIR}", file=sys.stderr)
        return 0

    notebooks = sorted(PRESENTATIONS_DIR.glob("*.py"))
    if not notebooks:
        print("Nenhum notebook de apresentação encontrado.", file=sys.stderr)
        return 0

    results: list[dict[str, Any]] = []
    total_fail = total_warn = 0

    for nb_path in notebooks:
        source = nb_path.read_text(encoding="utf-8-sig")
        blocks = extract_md_blocks(source)
        if not blocks:
            continue
        virtual_text, line_map = build_virtual_text(blocks)
        rel = nb_path.relative_to(VAULT_ROOT)
        findings, metrics = score_text(virtual_text, cfg, source=str(rel))
        for f in findings:
            f.line = remap_line(line_map, f.line)
        counts = severity_counts(findings)
        total_fail += counts["fail"]
        total_warn += counts["warn"]

        status = "FAIL" if counts["fail"] else "PASS_WITH_WARNINGS" if counts["warn"] else "PASS"
        if status != "PASS":
            print(f"  {status:22s} {rel}")

        results.append({
            "path": str(rel),
            "status": status,
            "counts": counts,
            "findings": [f.__dict__ for f in findings],
            "metrics": metrics,
        })

    payload = {
        "schemaVersion": 1,
        "collectedAt": datetime.now().isoformat(timespec="seconds"),
        "profile": args.profile,
        "summary": {
            "total": len(results),
            "fail": total_fail,
            "warn": total_warn,
            "pass": sum(1 for r in results if r["status"] == "PASS"),
        },
        "notebooks": results,
    }

    json_path = Path(args.json_out)
    json_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nAvaliados {len(results)} notebooks -> {total_fail} falhas, {total_warn} alertas")
    print(f"JSON: {json_path}", file=sys.stderr)

    if total_fail:
        return 1
    if args.strict and total_warn:
        return 1
    return 0


if __name__ == "__main__":
    if hasattr(sys.stdout, "buffer"):
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    raise SystemExit(main())
