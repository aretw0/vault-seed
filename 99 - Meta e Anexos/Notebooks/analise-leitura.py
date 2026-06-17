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
        fetch_local_url_text,
        lab_runtime_context,
        load_lab_manifest,
        read_lab_dataset,
        write_local_json_snapshot,
        write_local_markdown_note,
    )

    manifest = load_lab_manifest()
    leitura = read_lab_dataset("lista-leitura", manifest)
    context = lab_runtime_context()
    return context, fetch_local_url_text, leitura, manifest, write_local_json_snapshot, write_local_markdown_note


@app.cell
def _(context, leitura, mo):
    mo.vstack([
        mo.md(f"""
# Lista de leitura

Modo atual: **{"WASM · browser" if context["isPackaged"] else "local · Python"}**

| Capacidade | WASM | Local | CI |
|---|:---:|:---:|:---:|
| Lista curada do bundle | ✓ | ✓ | ✓ |
| Gráfico por tópico e status | ✓ | ✓ | ✓ |
| Enriquecimento OpenGraph ao vivo | — | ✓ | — |
| Salvar lista enriquecida no vault | — | ✓ | — |
| Criar nota de leitura por URL | — | ✓ | — |

- itens: **{leitura.get("itemCount", 0)}**
- coletado em: `{leitura.get("collectedAt", "—")[:10]}`
"""),
    ])
    return


@app.cell
def _(leitura, mo):
    import altair as alt
    import pandas as pd

    items = leitura.get("items", [])
    topic_summary = leitura.get("topicSummary", [])
    status_summary = leitura.get("statusSummary", [])

    if topic_summary and status_summary:
        topic_df = pd.DataFrame(topic_summary)
        status_df = pd.DataFrame(status_summary)

        _status_colors = {"lido": "#22c55e", "para ler": "#3b82f6", "em andamento": "#f59e0b"}
        _domain = status_df["status"].tolist()
        _range = [_status_colors.get(s, "#94a3b8") for s in _domain]

        chart_topic = (
            alt.Chart(topic_df)
            .mark_bar()
            .encode(
                x=alt.X("count:Q", title="itens"),
                y=alt.Y("topic:N", sort="-x", title=None),
                tooltip=["topic:N", "count:Q"],
            )
            .properties(height=max(60, len(topic_df) * 28), title="Itens por tópico")
        )
        chart_status = (
            alt.Chart(status_df)
            .mark_arc(innerRadius=40)
            .encode(
                theta=alt.Theta("count:Q"),
                color=alt.Color(
                    "status:N",
                    scale=alt.Scale(domain=_domain, range=_range),
                ),
                tooltip=["status:N", "count:Q"],
            )
            .properties(width=200, height=200, title="Status")
        )
        dist_result = mo.vstack([
            mo.md("## Distribuição"),
            mo.hstack([mo.ui.altair_chart(chart_topic), mo.ui.altair_chart(chart_status)]),
        ])
    else:
        dist_result = mo.md("_Sem dados de resumo._")
    dist_result
    return alt, items, pd


@app.cell
def _(items, mo, pd):
    _status_opts = sorted({i.get("status", "") for i in items if i.get("status")})
    _topic_opts = sorted({i.get("topic", "") for i in items if i.get("topic")})

    status_filter = mo.ui.dropdown(options=["Todos"] + _status_opts, value="Todos", label="Status")
    topic_filter = mo.ui.dropdown(options=["Todos"] + _topic_opts, value="Todos", label="Tópico")

    mo.vstack([
        mo.md("## Itens"),
        mo.hstack([status_filter, topic_filter]),
    ])
    return status_filter, topic_filter


@app.cell
def _(items, mo, pd, status_filter, topic_filter):
    _filtered = [
        i for i in items
        if (status_filter.value == "Todos" or i.get("status") == status_filter.value)
        and (topic_filter.value == "Todos" or i.get("topic") == topic_filter.value)
    ]
    _rows = [
        {
            "título": i.get("title"),
            "tópico": i.get("topic"),
            "status": i.get("status"),
            "tags": ", ".join(i.get("tags") or []),
            "url": i.get("url"),
        }
        for i in _filtered
    ]
    mo.ui.table(pd.DataFrame(_rows)) if _rows else mo.md("_Nenhum item com esses filtros._")
    return


@app.cell
def _(context, fetch_local_url_text, items, mo):
    if not context["isLocal"]:
        enrich_result = mo.vstack([
            mo.md("## Enriquecimento OpenGraph (local)"),
            mo.callout(
                mo.md(
                    "Execute localmente para buscar título e descrição reais de cada URL "
                    "usando a biblioteca padrão do Python — sem dependências novas."
                ),
                kind="info",
            ),
        ])
    else:
        run_enrich = mo.ui.checkbox(label="Buscar OpenGraph de todos os itens", value=False)
        enrich_result = mo.vstack([
            mo.md("## Enriquecimento OpenGraph (local)"),
            mo.md(
                "Cada URL é buscada com `fetch_local_url_text` para extrair título e prévia de texto. "
                "Ative apenas quando quiser atualizar os metadados — faz uma requisição HTTP por item."
            ),
            run_enrich,
        ])

    enrich_result
    return


@app.cell
def _(context, fetch_local_url_text, items, mo, pd):
    if not context["isLocal"]:
        enriched_df_result = mo.md("")
        enriched_items = []
    else:
        try:
            run_enrich
        except NameError:
            run_enrich = None

        if run_enrich is not None and run_enrich.value:
            enriched_items = []
            errors = []
            for _item in items:
                _url = _item.get("url", "")
                if not _url:
                    enriched_items.append({**_item, "og_title": None, "og_preview": None})
                    continue
                try:
                    _page = fetch_local_url_text(_url)
                    enriched_items.append({
                        **_item,
                        "og_title": _page.get("title"),
                        "og_preview": (_page.get("textPreview") or "")[:120],
                    })
                except Exception as _exc:
                    errors.append(f"{_item.get('title', _url)}: {_exc}")
                    enriched_items.append({**_item, "og_title": None, "og_preview": None})

            _rows = [{"título": i.get("title"), "og_title": i.get("og_title"), "prévia": i.get("og_preview")} for i in enriched_items]
            parts = [mo.md(f"### {len(enriched_items)} itens enriquecidos")]
            if errors:
                parts.append(mo.callout(mo.md("Erros:\n" + "\n".join(f"- {e}" for e in errors)), kind="warn"))
            parts.append(mo.ui.table(pd.DataFrame(_rows)))
            enriched_df_result = mo.vstack(parts)
        else:
            enriched_items = []
            enriched_df_result = mo.md("")

    enriched_df_result
    return (enriched_items,)


@app.cell
def _(context, enriched_items, mo, write_local_json_snapshot):
    if not context["isLocal"] or not enriched_items:
        save_result = mo.md("")
    else:
        try:
            _result = write_local_json_snapshot(
                ".lab/lista-leitura.enriquecida.json",
                {"schemaVersion": 1, "source": "analise-leitura.py", "items": enriched_items},
            )
            save_result = mo.callout(
                mo.md(f"Lista enriquecida salva em `{_result['relativePath']}` ({_result['bytes']} bytes)."),
                kind="success",
            )
        except Exception as _exc:
            save_result = mo.callout(mo.md(f"Erro ao salvar: {_exc}"), kind="warn")

    save_result
    return


@app.cell
def _(context, items, mo, write_local_markdown_note):
    if not context["isLocal"]:
        notes_result = mo.vstack([
            mo.md("## Criar notas de leitura (local)"),
            mo.callout(
                mo.md("Execute localmente para criar uma nota de leitura no vault por item da lista."),
                kind="info",
            ),
        ])
    else:
        _para_ler = [i for i in items if i.get("status") == "para ler"]
        create_notes = mo.ui.checkbox(
            label=f"Criar {len(_para_ler)} notas de leitura em 00 - Entrada/",
            value=False,
        )
        notes_result = mo.vstack([
            mo.md(
                f"## Criar notas de leitura (local)\n\n"
                f"{len(_para_ler)} itens com status `para ler`. "
                "Cada item vira uma nota em `00 - Entrada/` com frontmatter de leitura e link canônico."
            ),
            create_notes,
        ])

    notes_result
    return


@app.cell
def _(context, items, mo, write_local_markdown_note):
    if not context["isLocal"]:
        created_result = mo.md("")
    else:
        try:
            create_notes
        except NameError:
            create_notes = None

        if create_notes is not None and create_notes.value:
            _para_ler = [i for i in items if i.get("status") == "para ler"]
            created = []
            for _item in _para_ler:
                _slug = (_item.get("title") or "sem-titulo").lower()
                import re as _re
                _slug = _re.sub(r"[^a-z0-9]+", "-", _slug).strip("-")[:60]
                _path = f"00 - Entrada/Leitura - {_slug}.md"
                _body = (
                    f"## Sobre\n\n"
                    f"- Fonte: {_item.get('url', '—')}\n"
                    f"- Tópico: {_item.get('topic', '—')}\n\n"
                    f"## Notas\n\n"
                )
                try:
                    _result = write_local_markdown_note(
                        _path,
                        _body,
                        frontmatter={
                            "title": _item.get("title"),
                            "status": "rascunho",
                            "tags": _item.get("tags") or [],
                            "source": _item.get("url"),
                            "topic": _item.get("topic"),
                        },
                    )
                    created.append({"nota": _result["relativePath"], "bytes": _result["bytes"]})
                except Exception as _exc:
                    created.append({"nota": _path, "bytes": f"erro: {_exc}"})
            created_result = mo.vstack([
                mo.md(f"### {len(created)} notas criadas"),
                mo.ui.table(created),
            ])
        else:
            created_result = mo.md("")

    created_result
    return


if __name__ == "__main__":
    app.run()
