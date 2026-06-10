import marimo

__generated_with = "0.23.9"
app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo

    return (mo,)


@app.cell
def _():
    from _lab_notebook_runtime import (
        lab_runtime_context,
        load_lab_manifest,
        read_lab_dataset,
    )

    manifest = load_lab_manifest()
    outbox = read_lab_dataset("outbox-publicacao", manifest)
    context = lab_runtime_context()
    return context, manifest, outbox


@app.cell
def _(context, mo, outbox):
    policy = outbox.get("policy", {})
    mo.vstack([
        mo.md(f"""
# Outbox multi-canal

Modo atual: **{"WASM · browser" if context["isPackaged"] else "local · Python"}**

| Capacidade | WASM | Local | CI |
|---|:---:|:---:|:---:|
| Itens por canal e status | ✓ | ✓ | ✓ |
| Tabela de candidatos com filtro | ✓ | ✓ | ✓ |
| Modelo mínimo de frontmatter | ✓ | ✓ | ✓ |
| Prévia de thread social (conteúdo real) | — | ✓ | — |
| Checklist interativo de publicação | — | ✓ | — |

- candidatos: **{outbox.get("itemCount", 0)}**
- revisão humana obrigatória: **{policy.get("humanReviewRequired", True)}**
- dry-run primeiro: **{policy.get("dryRunFirst", True)}**
- coletado em: `{outbox.get("collectedAt", "—")}`
"""),
    ])
    return


@app.cell
def _(mo, outbox):
    import altair as alt
    import pandas as pd

    items = outbox.get("items", [])
    channel_rows = []
    for item in items:
        for ch in item.get("channels") or []:
            channel_rows.append({
                "canal": ch,
                "status": item.get("publicationStatus") or item.get("status") or "draft",
            })

    if channel_rows:
        ch_df = pd.DataFrame(channel_rows)
        ch_summary = ch_df.groupby(["canal", "status"]).size().reset_index(name="notas")

        _status_colors = {"published": "#22c55e", "ready": "#3b82f6", "draft": "#f59e0b"}
        _domain = ch_df["status"].unique().tolist()
        _range = [_status_colors.get(s, "#94a3b8") for s in _domain]

        chart_channels = (
            alt.Chart(ch_summary)
            .mark_bar()
            .encode(
                x=alt.X("notas:Q"),
                y=alt.Y("canal:N", sort="-x", title=None),
                color=alt.Color(
                    "status:N",
                    scale=alt.Scale(domain=_domain, range=_range),
                ),
                tooltip=["canal:N", "status:N", "notas:Q"],
            )
            .properties(height=max(80, len(ch_df["canal"].unique()) * 28), title="Notas por canal e status")
        )
        channel_result = mo.vstack([
            mo.md("## Itens por canal"),
            mo.ui.altair_chart(chart_channels),
        ])
    else:
        channel_result = mo.vstack([
            mo.md("## Itens por canal"),
            mo.callout(
                mo.md(
                    "Nenhum item no outbox ainda. Adicione `outbox: true` e `channels: [site, rss]` "
                    "ao frontmatter de uma nota para que ela apareça aqui."
                ),
                kind="info",
            ),
        ])
    channel_result
    return alt, items, pd


@app.cell
def _(items, mo, pd):
    _channel_opts = sorted({ch for item in items for ch in (item.get("channels") or [])})
    channel_filter = mo.ui.dropdown(
        options=["Todos"] + _channel_opts,
        value="Todos",
        label="Filtrar por canal",
    )
    mo.vstack([
        mo.md("## Candidatos"),
        channel_filter,
    ])
    return (channel_filter,)


@app.cell
def _(channel_filter, items, mo, pd):
    def _row(item):
        return {
            "título": item.get("title"),
            "status": item.get("publicationStatus") or item.get("status"),
            "canais": ", ".join(item.get("channels") or []),
            "privacidade": item.get("privacy"),
            "arquivo": item.get("path"),
        }

    if not items:
        mo.md("_Nenhum candidato no outbox._")
    elif channel_filter.value == "Todos":
        mo.ui.table(pd.DataFrame([_row(i) for i in items]))
    else:
        _filtered = [i for i in items if channel_filter.value in (i.get("channels") or [])]
        mo.ui.table(pd.DataFrame([_row(i) for i in _filtered]) if _filtered else pd.DataFrame())
    return


@app.cell
def _(context, items, mo):
    if not context["isLocal"]:
        preview_result = mo.vstack([
            mo.md("## Prévia de thread social (local)"),
            mo.callout(
                mo.md("Execute com `uv run marimo edit` para gerar prévias de thread (Mastodon/Bluesky) a partir do conteúdo real das notas."),
                kind="info",
            ),
        ])
    else:
        import os
        import re

        _vault_root = context["cwd"]
        _social_items = [i for i in items if any(ch in (i.get("channels") or []) for ch in ("mastodon", "bluesky"))]

        def _make_thread(content, limit=270):
            chunks = []
            words = content.split()
            chunk = ""
            for word in words:
                if len(chunk) + len(word) + 1 <= limit:
                    chunk += (" " if chunk else "") + word
                else:
                    if chunk:
                        chunks.append(chunk)
                    chunk = word
            if chunk:
                chunks.append(chunk)
            return chunks

        previews = []
        for _item in _social_items[:3]:
            _path = _item.get("path", "")
            _full_path = os.path.join(_vault_root, _path) if _path else None
            _content = ""
            if _full_path and os.path.isfile(_full_path):
                try:
                    with open(_full_path, encoding="utf-8") as _f:
                        _raw = _f.read()
                    _content = re.sub(r"^---[\s\S]*?---\n", "", _raw).strip()
                    _content = re.sub(r"^#+\s.*$", "", _content, flags=re.MULTILINE).strip()
                    _content = re.sub(r"\[\[([^\]|#]+)(?:\|[^\]]+)?\]\]", r"\1", _content)
                    _content = re.sub(r"\n{3,}", "\n\n", _content).strip()
                except Exception:
                    pass

            _chunks = _make_thread(_content or _item.get("title", ""))
            _total = len(_chunks)
            _thread_text = "\n\n".join(
                f"**{i + 1}/{_total}** {chunk}" for i, chunk in enumerate(_chunks[:5])
            )
            previews.append(mo.vstack([
                mo.md(f"### {_item.get('title', '?')} → {', '.join(_item.get('channels') or [])}"),
                mo.md(_thread_text or "_sem conteúdo_"),
            ]))

        preview_result = mo.vstack([
            mo.md(f"## Prévia de thread social (local)\n\n{len(_social_items)} itens com canais sociais"),
            *(previews if previews else [mo.md("_Nenhum item com canais Mastodon ou Bluesky no outbox._")]),
        ])

    preview_result
    return


@app.cell
def _(context, items, mo):
    if not context["isLocal"] or not items:
        checklist_result = mo.vstack([
            mo.md("## Checklist de publicação (local)"),
            mo.callout(
                mo.md("Execute localmente para marcar itens como revisados antes de publicar."),
                kind="info",
            ),
        ] if not context["isLocal"] else [
            mo.md("## Checklist de publicação (local)"),
            mo.md("_Nenhum candidato no outbox._"),
        ])
    else:
        _checks = [
            mo.ui.checkbox(label=f"{item.get('title', '?')} · `{item.get('publicationStatus') or item.get('status', 'draft')}` · {', '.join(item.get('channels') or [])}")
            for item in items
        ]
        checklist_result = mo.vstack([
            mo.md(
                "## Checklist de publicação (local)\n\n"
                "Antes de publicar, confirme para cada candidato:\n"
                "licença, privacidade, links, tom e vínculo reverso na nota canônica."
            ),
            *_checks,
        ])

    checklist_result
    return


@app.cell
def _(mo):
    _preview = "\n".join([
        "---",
        "title: \"Rascunho externo - Exemplo\"",
        "status: draft",
        "outbox: true",
        "publicationStatus: draft",
        "canonical: \"[[Nota Canônica]]\"",
        "license: \"verificar\"",
        "privacy: \"private-until-published\"",
        "channels:",
        "  - rss",
        "  - mastodon",
        "---",
        "",
        "## Base canônica",
        "",
        "- ",
        "",
        "## Adaptações por canal",
        "",
        "### Mastodon/Bluesky",
        "",
        "- ",
        "",
        "### Newsletter",
        "",
        "- ",
    ])
    mo.vstack([
        mo.md(
            "## Modelo mínimo de frontmatter\n\n"
            "Adicione esses campos ao frontmatter de qualquer nota para que ela "
            "apareça no outbox. O vault permanece como fonte de verdade; "
            "os canais são adaptadores na borda.\n\n"
            f"```markdown\n{_preview}\n```"
        ),
    ])
    return


if __name__ == "__main__":
    app.run()
