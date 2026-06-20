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
        lab_altair_chart,
        lab_runtime_context,
        load_lab_manifest,
        read_lab_dataset,
    )

    manifest = load_lab_manifest()
    grafo = read_lab_dataset("grafo-do-vault", manifest)
    context = lab_runtime_context()
    return context, grafo, lab_altair_chart


@app.cell
def _(context, grafo, mo):
    notes = grafo.get("notes", [])
    mo.vstack([
        mo.md(f"""
    # Análise de grafo

    Modo atual: **{"WASM · browser" if context["isPackaged"] else "local · Python"}**

    | Capacidade | WASM | Local | CI |
    |---|:---:|:---:|:---:|
    | Hubs, órfãs e densidade de links | ✓ | ✓ | ✓ |
    | Links quebrados (bundle) | ✓ | ✓ | ✓ |
    | Links quebrados (verificação ao vivo) | — | ✓ | ✓ |

    - **{grafo["noteCount"]}** notas · **{grafo["linkCount"]}** links
    """),
    ])
    return (notes,)


@app.cell
def _(lab_altair_chart, mo, notes):
    import altair as alt
    import pandas as pd

    orphans = [n for n in notes if n["inbound"] == 0 and n["outbound"] == 0]
    hubs = sorted(notes, key=lambda n: n["inbound"], reverse=True)[:10]
    hubs_df = pd.DataFrame(hubs)[["title", "folder", "inbound", "outbound"]]

    base_hubs = alt.Chart(hubs_df)
    chart_hubs = lab_altair_chart(
        (
            base_hubs
            .mark_bar()
            .encode(
                x=alt.X("inbound:Q", title="links recebidos"),
                y=alt.Y("title:N", sort="-x", title=None),
                color=alt.value("#1b5e3b"),
                tooltip=["title:N", "folder:N", "inbound:Q", "outbound:Q"],
            )
            + base_hubs
            .mark_text(align="left", baseline="middle", dx=4)
            .encode(
                x=alt.X("inbound:Q"),
                y=alt.Y("title:N", sort="-x"),
                text=alt.Text("inbound:Q"),
                color=alt.value("#3d3935"),
            )
        )
        .properties(height=max(80, len(hubs_df) * 28), title="Top 10 hubs (mais referenciadas)")
    )

    mo.vstack([
        mo.md(f"## Hubs e órfãs\n\nAs barras mostram quantos links internos apontam para cada nota. **{len(hubs)} hubs** mais referenciadas · **{len(orphans)} notas órfãs** (sem links de entrada ou saída)"),
        mo.ui.altair_chart(chart_hubs),
    ])
    return alt, orphans, pd


@app.cell
def _(mo, orphans, pd):
    orphans_df = pd.DataFrame(orphans)[["title", "folder", "status"]] if orphans else pd.DataFrame()
    mo.vstack([
        mo.md(f"### Notas órfãs ({len(orphans)})"),
        mo.ui.table(orphans_df) if not orphans_df.empty else mo.md("_Nenhuma nota órfã._"),
    ])
    return


@app.cell
def _(alt, lab_altair_chart, mo, notes, pd):
    from collections import defaultdict

    density_map = defaultdict(lambda: {"notas": 0, "links_saida": 0})
    for _n in notes:
        _f = _n["folder"]
        density_map[_f]["notas"] += 1
        density_map[_f]["links_saida"] += _n["outbound"]

    density_df = pd.DataFrame([
        {
            "pasta": folder,
            "notas": v["notas"],
            "links/nota": round(v["links_saida"] / v["notas"], 2) if v["notas"] else 0,
        }
        for folder, v in density_map.items()
    ]).sort_values("links/nota", ascending=False)

    chart_density = lab_altair_chart(
        alt.Chart(density_df)
        .mark_bar()
        .encode(
            x=alt.X("links/nota:Q", title="links de saída por nota"),
            y=alt.Y("pasta:N", sort="-x", title=None),
            color=alt.value("#2d7a4d"),
            tooltip=["pasta:N", "notas:Q", "links/nota:Q"],
        )
        .properties(height=max(60, len(density_df) * 28), title="Densidade de links por pasta")
    )
    mo.vstack([
        mo.md("## Densidade de links"),
        mo.ui.altair_chart(chart_density),
    ])
    return


@app.cell
def _(mo, notes, pd):
    broken = [
        {"nota": n["title"], "pasta": n["folder"], "link quebrado": bl}
        for n in notes
        for bl in n.get("brokenLinks", [])
    ]
    broken_df = pd.DataFrame(broken) if broken else pd.DataFrame()
    mo.vstack([
        mo.md(f"## Links quebrados\n\n{len(broken)} links apontam para notas que não existem no bundle."),
        mo.ui.table(broken_df) if not broken_df.empty else mo.md("_Nenhum link quebrado detectado._"),
    ])
    return


@app.cell
def _(context, mo, pd):
    if not context["isLocal"]:
        live_check_result = mo.vstack([
            mo.md("## Verificação ao vivo de links (local)"),
            mo.callout(
                mo.md("Execute com `uv run marimo edit` para verificar links contra o vault atual no disco."),
                kind="info",
            ),
        ])
    else:
        import os
        import re

        _vault_root = context["cwd"]
        _slug_re = re.compile(r"\[\[([^\]|#]+)")

        def _slugify(title):
            import unicodedata
            t = unicodedata.normalize("NFD", title).encode("ascii", "ignore").decode()
            return re.sub(r"[^a-z0-9-/]", "", re.sub(r"\s+", "-", t.lower().strip()))

        _all_slugs = set()
        for _root_dir, _, _files in os.walk(_vault_root):
            for _f in _files:
                if _f.endswith(".md"):
                    _all_slugs.add(_slugify(os.path.splitext(_f)[0]))

        live_broken = []
        for _root_dir, _, _files in os.walk(_vault_root):
            for _fname in _files:
                if not _fname.endswith(".md"):
                    continue
                try:
                    with open(os.path.join(_root_dir, _fname), encoding="utf-8") as _fp:
                        _text = _fp.read()
                    for _match in _slug_re.findall(_text):
                        if _slugify(_match.strip()) not in _all_slugs:
                            live_broken.append({"nota": _fname, "link": _match.strip()})
                except Exception:
                    pass

        live_broken_df = pd.DataFrame(live_broken) if live_broken else pd.DataFrame()
        live_check_result = mo.vstack([
            mo.md(f"## Verificação ao vivo de links (local)\n\n{len(live_broken)} links para notas inexistentes no disco."),
            mo.ui.table(live_broken_df) if not live_broken_df.empty else mo.md("_Nenhum link quebrado ao vivo._"),
        ])

    live_check_result
    return


if __name__ == "__main__":
    app.run()
