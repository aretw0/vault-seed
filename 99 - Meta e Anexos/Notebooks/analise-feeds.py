import marimo

__generated_with = "0.23.9"
app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo

    return (mo,)


@app.cell
def _():
    from _lab_notebook_runtime import load_lab_manifest, read_lab_dataset

    manifest = load_lab_manifest()
    feeds = read_lab_dataset("feeds-assinados", manifest)
    return (feeds,)


@app.cell
def _(feeds, mo):
    mo.md(f"""
    # Radar de feeds

    Este notebook lê a lista OPML normalizada em `feeds-assinados.json` e
    transforma assinaturas RSS/Atom em uma superfície auditável para o Lab.

    - feeds assinados: **{feeds['subscriptionCount']}**
    - grupos OPML: **{len(feeds.get('groups', []))}**
    - fonte: `{feeds['source']}`
    - coletado em: `{feeds['collectedAt']}`
    - privacidade: `{feeds['privacy']}`
    - fingerprint: `{feeds['sha256']}`
    """)
    return


@app.cell
def _(feeds):
    from urllib.parse import urlparse

    import pandas as pd

    subscriptions = feeds.get("subscriptions", [])
    rows = []
    for subscription in subscriptions:
        url = subscription.get("xmlUrl") or ""
        html_url = subscription.get("htmlUrl") or ""
        parsed = urlparse(url if "://" in url else html_url)
        rows.append(
            {
                "titulo": subscription.get("title"),
                "feed": url,
                "site": html_url,
                "dominio": parsed.netloc or "local",
                "tipo": subscription.get("type") or "rss",
                "categorias": ", ".join(subscription.get("categories") or []),
            }
        )

    feeds_df = pd.DataFrame(rows)
    return feeds_df, pd


@app.cell
def _(feeds_df, mo):
    mo.vstack([
        mo.md("## Assinaturas"),
        mo.ui.table(feeds_df),
    ])
    return


@app.cell
def _(feeds_df, mo, pd):
    if feeds_df.empty:
        domain_df = pd.DataFrame(columns=["dominio", "feeds"])
        category_df = pd.DataFrame(columns=["categoria", "feeds"])
    else:
        domain_df = (
            feeds_df.groupby("dominio", dropna=False)
            .size()
            .reset_index(name="feeds")
            .sort_values(["feeds", "dominio"], ascending=[False, True])
        )
        category_rows = []
        for _, _category_row in feeds_df.iterrows():
            for category in str(_category_row.get("categorias") or "").split(","):
                category = category.strip()
                if category:
                    category_rows.append({"categoria": category})
        category_df = (
            pd.DataFrame(category_rows)
            .groupby("categoria")
            .size()
            .reset_index(name="feeds")
            .sort_values(["feeds", "categoria"], ascending=[False, True])
            if category_rows
            else pd.DataFrame(columns=["categoria", "feeds"])
        )

    mo.vstack([
        mo.md("## Cobertura editorial"),
        mo.ui.table(domain_df),
        mo.ui.table(category_df),
    ])
    return


@app.cell
def _(feeds_df, mo, pd):
    candidates = []
    for _, _feed_row in feeds_df.iterrows():
        title = _feed_row.get("titulo") or _feed_row.get("dominio") or "Feed"
        candidates.append(
            {
                "arquivo sugerido": f"00 - Entrada/Feed - {title}.md",
                "titulo": f"Feed - {title}",
                "fonte": _feed_row.get("feed"),
                "proximo passo": "decidir se vira fonte recorrente, nota de leitura ou descarte",
            }
        )
    candidates_df = pd.DataFrame(candidates)
    mo.vstack([
        mo.md(
            "## Candidatas para inbox soberana\n\n"
            "A tabela abaixo não cria notas automaticamente. Ela mostra o formato de "
            "triagem: feed observado → evidência → decisão humana ou agente assistido."
        ),
        mo.ui.table(candidates_df),
    ])
    return (candidates_df,)


@app.cell
def _(candidates_df, mo):
    preview = "\n".join(
        [
            "---",
            "title: \"Feed - Exemplo\"",
            "status: draft",
            "category: fonte",
            "audience: pessoal",
            "source: \"https://example.com/feed.xml\"",
            "collectedAt: \"2026-05-26T00:00:00.000Z\"",
            "license: \"verificar\"",
            "privacy: \"public\"",
            "---",
            "",
            "# Feed - Exemplo",
            "",
            "## Por que entrou no inbox",
            "",
            "- ",
            "",
            "## Evidências",
            "",
            "- Fonte: https://example.com/feed.xml",
            "",
            "## Decisão",
            "",
            "- [ ] manter como assinatura recorrente",
            "- [ ] transformar itens em notas",
            "- [ ] descartar",
        ]
    )
    mo.md(
        "## Modelo de nota derivada\n\n"
        f"```markdown\n{preview}\n```\n\n"
        f"Candidatas listadas nesta execução: **{len(candidates_df)}**."
    )
    return


@app.cell
def _(mo):
    mo.md(
        "## 🧭 Lane de entendimento\n\n"
        "Use esta trilha para evoluir o notebook de um uso pontual para uma rotina de "
        "curadoria contínua:\n\n"
        "### Nível inicial — leitura rápida\n\n"
        "- Mapear quais fontes realmente aparecem na trilha atual;\n"
        "- Classificar por domínio e tag para reduzir ruído;\n"
        "- Preparar notas candidatas sem publicar ou enviar nada automaticamente.\n\n"
        "### Nível intermediário — decisão local\n\n"
        "- Cruzar candidatas com prioridade por frequência e privacidade;\n"
        "- Transformar listas em critérios de revisão humana por pasta/público;\n"
        "- Criar checklists de triagem para revisão rápida antes de abrir o outbox.\n\n"
        "### Nível avançado — operação em ciclo\n\n"
        "- Rodar esse notebook em `notebooks:extract:local` durante o sync;\n"
        "- Comparar snapshots para detectar deriva em fontes e sinais novos;\n"
        "- Conectar os resultados ao pipeline de templates e revisão editorial.\n\n"
        "### Nível de excelência — curadoria como sistema\n\n"
        "- Fechar os pontos com trilha de decisão explícita para aprovar fontes, revisão e publicação;\n"
        "- Transformar descobertas repetidas em uma política de limpeza de ruído e uma rotina de auditoria semanal;\n"
        "- Publicar um resumo de impacto por ciclo (fontes novas, candidatos aprovados, exceções tratadas)."
    )
    return


if __name__ == "__main__":
    app.run()
