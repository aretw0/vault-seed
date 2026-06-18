#!/usr/bin/env python3
"""Avaliador determinístico de qualidade de escrita para notas do vault.

Uso típico:
  uv run python scripts/avaliar_textos.py
  uv run python scripts/avaliar_textos.py --note "40 - Recursos/Jardim digital.md"
  uv run python scripts/avaliar_textos.py --profile ultra-rigor --json .dgk/qualidade-textos.json

Sem dependências externas. Lê as regras em quality-rules.json na raiz do vault.
Engine: scripts/text_scorer.py
"""

from __future__ import annotations

import argparse
import io
import datetime as _dt
import json
import sys
from pathlib import Path
from typing import Any

from text_scorer import (
    Finding,
    build_effective_config,
    deep_merge,
    normalize_text,
    read_frontmatter_field,
    render_markdown_report,
    score_text,
    severity_counts,
    strip_frontmatter,
    walk_notes,
    word_count,
)


def evaluate(text: str, config: dict[str, Any], note_path: Path) -> tuple[list[Finding], dict[str, Any]]:
    """Compatibility wrapper — delegates to score_text with note path as source."""
    findings, metrics = score_text(text, config, source=str(note_path))
    metrics["note"] = metrics.pop("source", str(note_path))
    return findings, metrics


def main(argv: list[str] | None = None) -> int:
    vault_root = Path(__file__).resolve().parent.parent
    default_config = vault_root / "quality-rules.json"
    default_output = vault_root / ".dgk" / "qualidade-textos.json"

    parser = argparse.ArgumentParser(description="Avalia qualidade de escrita das notas do vault.")
    parser.add_argument("--config", default=str(default_config))
    parser.add_argument("--profile", default="default")
    parser.add_argument("--note", help="Avaliar apenas esta nota (relativa à raiz do vault)")
    parser.add_argument("--json", dest="json_out", default=str(default_output), help="Saída JSON (batch)")
    parser.add_argument("--report", help="Escrever relatório Markdown desta nota (requer --note)")
    parser.add_argument("--strict", action="store_true")
    parser.add_argument(
        "--only-published",
        action="store_true",
        help="Avaliar apenas notas com status: published no frontmatter (uso em CI)",
    )
    args = parser.parse_args(argv)

    config_path = Path(args.config).resolve()
    if not config_path.exists():
        print(f"quality-rules.json não encontrado: {config_path}", file=sys.stderr)
        return 2
    base_config = json.loads(config_path.read_text(encoding="utf-8"))

    if args.note:
        note_path = (vault_root / args.note).resolve()
        if not note_path.exists():
            print(f"Nota não encontrada: {note_path}", file=sys.stderr)
            return 2
        text = note_path.read_text(encoding="utf-8")
        audience = read_frontmatter_field(text, "audience") or "todos"
        cfg = build_effective_config(base_config, args.profile, audience)
        rel = note_path.relative_to(vault_root)
        findings, metrics = score_text(text, cfg, source=str(rel))
        metrics["profile"] = args.profile
        report = render_markdown_report(str(rel), audience, args.profile, findings, metrics)
        print(report)
        if args.report:
            rp = Path(args.report)
            rp.parent.mkdir(parents=True, exist_ok=True)
            rp.write_text(report, encoding="utf-8")
            print(f"\nRelatório escrito em: {rp}", file=sys.stderr)
        counts = severity_counts(findings)
        if counts["fail"]:
            return 1
        if args.strict and counts["warn"]:
            return 1
        return 0

    # Batch: walk all configured dirs
    scan_dirs = base_config.get("scanDirs", ["40 - Recursos"])
    notes = walk_notes(scan_dirs, vault_root)

    # Institutional files (README, ROADMAP, welcome note) ship with the
    # project regardless of frontmatter status — checked unconditionally,
    # bypassing --only-published.
    institutional_paths = {
        (vault_root / rel).resolve()
        for rel in base_config.get("institutionalFiles", [])
        if (vault_root / rel).exists()
    }
    for path in institutional_paths:
        if path not in notes:
            notes.append(path)

    if not notes:
        print("Nenhuma nota encontrada nas pastas configuradas em scanDirs.", file=sys.stderr)
        return 0

    results: list[dict[str, Any]] = []
    total_fail = total_warn = 0

    for note_path in notes:
        text = note_path.read_text(encoding="utf-8")
        is_institutional = note_path.resolve() in institutional_paths
        if args.only_published and not is_institutional and read_frontmatter_field(text, "status") != "published":
            continue
        audience = read_frontmatter_field(text, "audience") or "todos"
        cfg = build_effective_config(base_config, args.profile, audience)
        rel = note_path.relative_to(vault_root)
        findings, metrics = score_text(text, cfg, source=str(rel))
        counts = severity_counts(findings)
        total_fail += counts["fail"]
        total_warn += counts["warn"]

        status = "FAIL" if counts["fail"] else "PASS_WITH_WARNINGS" if counts["warn"] else "PASS"
        if status != "PASS":
            print(f"  {status:22s} {rel}")

        results.append({
            "path": str(rel),
            "audience": audience,
            "status": status,
            "counts": counts,
            "findings": [f.__dict__ for f in findings],
            "metrics": metrics,
        })

    payload = {
        "schemaVersion": 1,
        "collectedAt": _dt.datetime.now().isoformat(timespec="seconds"),
        "profile": args.profile,
        "summary": {
            "total": len(results),
            "fail": total_fail,
            "warn": total_warn,
            "pass": sum(1 for r in results if r["status"] == "PASS"),
        },
        "notes": results,
    }

    json_path = Path(args.json_out)
    json_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nAvaliadas {len(results)} notas -> {total_fail} falhas, {total_warn} alertas")
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
