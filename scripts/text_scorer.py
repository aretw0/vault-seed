#!/usr/bin/env python3
"""Deterministic text quality scorer. No external dependencies.

Accepts any plain text — markdown notes, feed summaries, prose fragments.
Entry points:
  score_text(text, config, source="") -> (findings, metrics)
  severity_counts(findings) -> {"fail": N, "warn": N, "info": N}

Configuration is driven by a dict matching quality-rules.json schema.
See quality-rules.json at the vault root for reference.
"""

from __future__ import annotations

import copy
import datetime as _dt
import re
import unicodedata
from collections import deque
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable


@dataclass
class Finding:
    severity: str
    rule: str
    message: str
    line: int | None = None
    snippet: str | None = None


WORD_RE = re.compile(r"[\wÀ-ÖØ-öø-ÿ]+(?:[-'][\wÀ-ÖØ-öø-ÿ]+)?", re.UNICODE)
HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*$", re.MULTILINE)

PT_FUNCTION_WORDS = {
    "a", "as", "o", "os", "um", "uma", "uns", "umas",
    "de", "do", "da", "dos", "das",
    "em", "no", "na", "nos", "nas",
    "por", "para", "com", "sem", "sob", "sobre", "entre",
    "e", "ou", "mas", "que", "se", "como",
    "ao", "aos", "à", "às",
    "tambem", "também", "ja", "já", "nao", "não",
    "isso", "essa", "esse", "esta", "este", "esses", "essas",
}


def normalize_text(value: str) -> str:
    value = unicodedata.normalize("NFKD", value)
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    return value.casefold()


def deep_merge(base: dict[str, Any], overlay: dict[str, Any]) -> dict[str, Any]:
    out = copy.deepcopy(base)
    for key, value in overlay.items():
        if isinstance(value, dict) and isinstance(out.get(key), dict):
            out[key] = deep_merge(out[key], value)
        else:
            out[key] = copy.deepcopy(value)
    return out


def strip_frontmatter(text: str) -> tuple[str, int]:
    """Return body without YAML frontmatter and the original line offset."""
    raw = text.lstrip("﻿")
    if raw.startswith("---\n"):
        end = raw.find("\n---\n", 4)
        if end != -1:
            cut = end + len("\n---\n")
            return raw[cut:], raw[:cut].count("\n")
    return raw, 0


def read_frontmatter_field(text: str, field: str) -> str | None:
    """Extract a scalar YAML field from frontmatter without a YAML parser."""
    raw = text.lstrip("﻿")
    if not raw.startswith("---\n"):
        return None
    end = raw.find("\n---\n", 4)
    if end == -1:
        return None
    fm = raw[4:end]
    pattern = re.compile(rf"^{re.escape(field)}\s*:\s*(.+?)\s*$", re.MULTILINE)
    m = pattern.search(fm)
    if not m:
        return None
    return m.group(1).strip().strip('"').strip("'")


def line_map(text: str, offset: int = 0) -> list[tuple[int, str]]:
    return [(idx, line) for idx, line in enumerate(text.splitlines(), start=1 + offset)]


def word_count(text: str) -> int:
    return len(WORD_RE.findall(text))


def find_literal_lines(text: str, term: str, offset: int = 0) -> list[tuple[int, str]]:
    norm_term = normalize_text(term)
    return [
        (ln, line.strip())
        for ln, line in line_map(text, offset=offset)
        if norm_term in normalize_text(line)
    ]


def find_regex_lines(text: str, pattern: str, flags: int = re.IGNORECASE, offset: int = 0) -> list[tuple[int, str]]:
    rx = re.compile(pattern, flags)
    return [
        (ln, line.strip())
        for ln, line in line_map(text, offset=offset)
        if rx.search(line)
    ]


def extract_paragraphs(text: str, offset: int = 0) -> list[tuple[int, str]]:
    paragraphs: list[tuple[int, str]] = []
    cur: list[str] = []
    start_line: int | None = None
    for line_no, line in line_map(text, offset=offset):
        if not line.strip():
            if cur and start_line is not None:
                paragraphs.append((start_line, " ".join(s.strip() for s in cur).strip()))
                cur = []
                start_line = None
            continue
        if start_line is None:
            start_line = line_no
        cur.append(line)
    if cur and start_line is not None:
        paragraphs.append((start_line, " ".join(s.strip() for s in cur).strip()))
    return paragraphs


def prose_paragraphs(text: str, offset: int = 0) -> list[tuple[int, str]]:
    """Non-heading, non-bullet, non-table, non-code paragraphs."""
    prose: list[tuple[int, str]] = []
    for line_no, para in extract_paragraphs(text, offset=offset):
        stripped = para.lstrip()
        if not stripped:
            continue
        if stripped.startswith(("#", "- ", "* ", "|", "```")):
            continue
        prose.append((line_no, para))
    return prose


def split_sentences(text: str) -> Iterable[str]:
    non_table = [ln for ln in text.splitlines() if not ln.lstrip().startswith("|")]
    compact = re.sub(r"\s+", " ", "\n".join(non_table))
    for sentence in re.split(r"(?<=[.!?])\s+", compact):
        s = sentence.strip()
        if s:
            yield s


def sentence_units(paragraphs: list[tuple[int, str]]) -> list[tuple[int, str]]:
    units: list[tuple[int, str]] = []
    for line_no, para in paragraphs:
        for sentence in split_sentences(para):
            units.append((line_no, sentence))
    return units


def paragraph_template(value: str, max_words: int = 12) -> str:
    """Abstract syntactic template from paragraph opening clause."""
    clause = re.split(r"[,;:]", value, maxsplit=1)[0]
    words = [normalize_text(w) for w in WORD_RE.findall(clause)][:max_words]
    if not words:
        return ""
    return " ".join(w if (w in PT_FUNCTION_WORDS or len(w) <= 3) else "#" for w in words)


def score_text(text: str, config: dict[str, Any], source: str = "") -> tuple[list[Finding], dict[str, Any]]:
    """Score any text for quality signals.

    Works on markdown notes (YAML frontmatter stripped automatically) and
    plain text alike (feed summaries, e-mail bodies, any prose).
    Returns (findings, metrics) — same contract as the former evaluate().
    """
    findings: list[Finding] = []
    body, line_offset = strip_frontmatter(text)
    words = word_count(body)

    metrics: dict[str, Any] = {
        "source": source,
        "words": words,
        "generatedAt": _dt.datetime.now().isoformat(timespec="seconds"),
    }

    # Generic risk patterns
    for pattern in config.get("riskPatterns", []):
        for line_no, snippet in find_regex_lines(body, pattern["regex"], flags=re.IGNORECASE | re.UNICODE, offset=line_offset):
            findings.append(Finding(pattern.get("severity", "warn"), pattern["id"], pattern.get("description", "Padrão detectado."), line_no, snippet))

    prose = prose_paragraphs(body, offset=line_offset)

    # Mechanical openers
    mechanical = config.get("mechanicalOpeners", {})
    phrases = [p for p in mechanical.get("phrases", []) if str(p).strip()]
    if phrases:
        window = int(mechanical.get("windowParagraphs", 8) or 8)
        watch = [(p, normalize_text(p)) for p in phrases]
        last_seen: dict[str, tuple[int, int]] = {}
        hits: list[dict[str, Any]] = []
        for idx, (line_no, para) in enumerate(prose):
            para_norm = normalize_text(para)
            for phrase_raw, phrase_norm in watch:
                if not para_norm.startswith(phrase_norm):
                    continue
                prev = last_seen.get(phrase_norm)
                if prev is not None and (idx - prev[0]) <= window:
                    findings.append(Finding(
                        "warn", "mechanical-opener-repeat",
                        f"Abertura mecânica repetida em proximidade: {phrase_raw!r} (janela {window} parágrafos).",
                        line_no, para[:220],
                    ))
                    hits.append({"phrase": phrase_raw, "line": line_no, "previousLine": prev[1], "distanceParagraphs": idx - prev[0]})
                last_seen[phrase_norm] = (idx, line_no)
        if hits:
            metrics["mechanicalOpenerRepeats"] = hits

    # Paragraph starter repetition
    rep = config.get("repetitionHeuristics", {}).get("paragraphStarter", {})
    if rep.get("enabled", True):
        ngram_words = int(rep.get("ngramWords", 2) or 2)
        window = int(rep.get("windowParagraphs", 12) or 12)
        min_occ = int(rep.get("minOccurrencesInWindow", 3) or 3)
        min_word_len = int(rep.get("minWordLength", 2) or 2)
        ignore = {normalize_text(p) for p in rep.get("ignoreStarters", []) if str(p).strip()}
        queues: dict[str, deque[tuple[int, int]]] = {}
        hits = []
        for idx, (line_no, para) in enumerate(prose):
            words_list = [normalize_text(w) for w in WORD_RE.findall(para) if len(normalize_text(w)) >= min_word_len]
            if len(words_list) < ngram_words:
                continue
            starter = " ".join(words_list[:ngram_words])
            if starter in ignore:
                continue
            q = queues.setdefault(starter, deque())
            q.append((idx, line_no))
            while q and (idx - q[0][0]) > window:
                q.popleft()
            if len(q) == min_occ:
                first_idx, first_line = q[0]
                findings.append(Finding(
                    "warn", "paragraph-starter-repeat",
                    f"Abertura de parágrafo repetida: '{starter}' apareceu {min_occ} vezes em {window} parágrafos.",
                    line_no, para[:220],
                ))
                hits.append({"starter": starter, "line": line_no, "firstLineInWindow": first_line, "occurrences": min_occ})
        if hits:
            metrics["paragraphStarterRepeats"] = hits

    # Sentence starter repetition
    sent_rep = config.get("repetitionHeuristics", {}).get("sentenceStarter", {})
    if sent_rep.get("enabled", True):
        ngram_words = int(sent_rep.get("ngramWords", 3) or 3)
        window = int(sent_rep.get("windowSentences", 10) or 10)
        min_occ = int(sent_rep.get("minOccurrencesInWindow", 3) or 3)
        min_word_len = int(sent_rep.get("minWordLength", 2) or 2)
        ignore = {normalize_text(p) for p in sent_rep.get("ignoreStarters", []) if str(p).strip()}
        units = sentence_units(prose)
        queues = {}
        hits = []
        for idx, (line_no, sentence) in enumerate(units):
            words_list = [normalize_text(w) for w in WORD_RE.findall(sentence) if len(normalize_text(w)) >= min_word_len]
            if len(words_list) < ngram_words:
                continue
            starter = " ".join(words_list[:ngram_words])
            if starter in ignore:
                continue
            q = queues.setdefault(starter, deque())
            q.append((idx, line_no))
            while q and (idx - q[0][0]) > window:
                q.popleft()
            if len(q) == min_occ:
                first_idx, first_line = q[0]
                findings.append(Finding(
                    "warn", "sentence-starter-repeat",
                    f"Abertura de frase repetida: '{starter}' apareceu {min_occ} vezes em {window} frases.",
                    line_no, sentence[:220],
                ))
                hits.append({"starter": starter, "line": line_no, "firstLineInWindow": first_line, "occurrences": min_occ})
        if hits:
            metrics["sentenceStarterRepeats"] = hits

    # Parallel copula
    copula = config.get("repetitionHeuristics", {}).get("parallelCopula", {})
    if copula.get("enabled", True):
        starter_words = int(copula.get("starterWords", 2) or 2)
        min_word_len = int(copula.get("minWordLength", 2) or 2)
        max_hits = int(copula.get("maxFindings", 5) or 5)
        total_hits = 0
        for line_no, para in prose:
            sentences = list(split_sentences(para))
            for i in range(len(sentences) - 1):
                s1, s2 = sentences[i].strip(), sentences[i + 1].strip()
                if not s1 or not s2:
                    continue
                w1 = [normalize_text(w) for w in WORD_RE.findall(s1) if len(w) >= min_word_len]
                w2 = [normalize_text(w) for w in WORD_RE.findall(s2) if len(w) >= min_word_len]
                if len(w1) < starter_words or len(w2) < starter_words:
                    continue
                if " ".join(w1[:starter_words]) != " ".join(w2[:starter_words]):
                    continue
                if not re.search(r"\b[Éé]\b", s1, re.UNICODE) or not re.search(r"\b[Éé]\b", s2, re.UNICODE):
                    continue
                starter = " ".join(w1[:starter_words])
                findings.append(Finding(
                    "warn", "parallel-copula-repeat",
                    f"Estrutura frasal repetitiva em sequência: '{starter} ... é ...'.",
                    line_no, f"{s1} {s2}"[:220],
                ))
                total_hits += 1
                if total_hits >= max_hits:
                    break
            if total_hits >= max_hits:
                break
        if total_hits:
            metrics["parallelCopulaRepeats"] = total_hits

    # Paragraph template repetition
    tpl_rep = config.get("repetitionHeuristics", {}).get("paragraphTemplate", {})
    if tpl_rep.get("enabled", True):
        window = int(tpl_rep.get("windowParagraphs", 14) or 14)
        min_occ = int(tpl_rep.get("minOccurrencesInWindow", 4) or 4)
        max_words = int(tpl_rep.get("maxWords", 12) or 12)
        min_literals = int(tpl_rep.get("minLiteralTokens", 3) or 3)
        ignore_templates = {normalize_text(t) for t in tpl_rep.get("ignoreTemplates", []) if str(t).strip()}
        queues = {}
        hits = []
        for idx, (line_no, para) in enumerate(prose):
            tpl = paragraph_template(para, max_words=max_words)
            if not tpl or normalize_text(tpl) in ignore_templates:
                continue
            if len([tok for tok in tpl.split() if tok != "#"]) < min_literals:
                continue
            q = queues.setdefault(tpl, deque())
            q.append((idx, line_no))
            while q and (idx - q[0][0]) > window:
                q.popleft()
            if len(q) == min_occ:
                first_idx, first_line = q[0]
                findings.append(Finding(
                    "warn", "paragraph-template-repeat",
                    f"Cadência de abertura repetida: template '{tpl}' apareceu {min_occ} vezes em {window} parágrafos.",
                    line_no, para[:220],
                ))
                hits.append({"template": tpl, "line": line_no, "firstLineInWindow": first_line, "occurrences": min_occ})
        if hits:
            metrics["paragraphTemplateRepeats"] = hits

    # Long sentences
    long_limit = int(config.get("longSentenceWords", 0) or 0)
    if long_limit:
        long_sentences = sorted(
            [(word_count(s), s) for s in split_sentences(body) if word_count(s) > long_limit],
            reverse=True,
        )
        metrics["longSentences"] = [{"words": wc, "sentence": s} for wc, s in long_sentences[:10]]
        for wc, sentence in long_sentences[:5]:
            findings.append(Finding("info", "long-sentence", f"Frase longa com {wc} palavras (> {long_limit}).", None, sentence[:240]))

    return findings, metrics


def severity_counts(findings: list[Finding]) -> dict[str, int]:
    counts: dict[str, int] = {"fail": 0, "warn": 0, "info": 0}
    for f in findings:
        counts[f.severity] = counts.get(f.severity, 0) + 1
    return counts


def render_markdown_report(source: str, audience: str, profile: str, findings: list[Finding], metrics: dict[str, Any]) -> str:
    counts = severity_counts(findings)
    status = "FAIL" if counts["fail"] else "PASS_WITH_WARNINGS" if counts["warn"] else "PASS"
    name = Path(source).name if source else "—"
    lines: list[str] = [
        f"# Relatório de qualidade — {name}",
        "",
        f"- **Status:** {status}",
        f"- **Gerado em:** {metrics['generatedAt']}",
        f"- **Arquivo:** `{source}`",
        f"- **Público:** {audience}",
        f"- **Perfil:** {profile}",
        f"- **Palavras:** {metrics['words']}",
        f"- **Falhas:** {counts['fail']}",
        f"- **Alertas:** {counts['warn']}",
        f"- **Informações:** {counts['info']}",
        "",
        "## Achados",
        "",
    ]
    if not findings:
        lines.append("Nenhum achado.")
    else:
        lines += [
            "| Severidade | Regra | Linha | Mensagem | Trecho |",
            "|---|---|---:|---|---|",
        ]
        for f in findings:
            snippet = (f.snippet or "").replace("|", "\\|").replace("\n", " ")
            if len(snippet) > 200:
                snippet = snippet[:197] + "..."
            lines.append(f"| {f.severity} | {f.rule} | {f.line or ''} | {f.message.replace('|', chr(92) + '|')} | {snippet} |")
    lines += [""]
    if metrics.get("longSentences"):
        lines += ["## Top frases longas", ""]
        for item in metrics["longSentences"]:
            s = item["sentence"]
            if len(s) > 300:
                s = s[:297] + "..."
            lines.append(f"- **{item['words']} palavras:** {s}")
        lines += [""]
    lines += ["## Interpretação", ""]
    if counts["fail"]:
        lines.append("Há falhas bloqueantes. Revisar antes de promover a nota.")
    elif counts["warn"]:
        lines.append("Sem falhas bloqueantes, mas há alertas que merecem revisão editorial antes de publicar.")
    else:
        lines.append("Nenhum achado automático. Recomendada revisão humana do conteúdo antes de promover.")
    lines.append("")
    return "\n".join(lines)


def walk_notes(dirs: list[str], vault_root: Path) -> list[Path]:
    notes: list[Path] = []
    for d in dirs:
        folder = vault_root / d
        if not folder.exists():
            continue
        for p in sorted(folder.rglob("*.md")):
            notes.append(p)
    return notes


def build_effective_config(base_config: dict[str, Any], profile_name: str, audience: str) -> dict[str, Any]:
    import sys
    profiles = base_config.get("profiles", {})
    if profile_name not in profiles:
        print(f"Perfil '{profile_name}' não encontrado em quality-rules.json. Usando 'default'.", file=sys.stderr)
        profile_name = "default"
    profile_cfg = profiles.get(profile_name) or {}
    profile_global = {k: v for k, v in profile_cfg.items() if k != "audienceOverrides"}
    cfg = deep_merge(base_config, profile_global)

    audiences = base_config.get("audiences", {})
    audience_cfg = audiences.get(audience) or audiences.get("todos") or {}
    cfg = deep_merge(cfg, audience_cfg)

    return cfg
