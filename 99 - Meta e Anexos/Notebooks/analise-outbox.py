import marimo

__generated_with = "0.23.8"
app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo

    return mo


@app.cell
def _():
    from _lab_notebook_runtime import load_lab_manifest, read_lab_dataset

    manifest = load_lab_manifest()
    outbox = read_lab_dataset("outbox-publicacao", manifest)
    return manifest, outbox


@app.cell
def _(mo, outbox):
    policy = outbox.get("policy", {})
    mo.md(
        f"# Outbox soberana\n\n"
        f"Este notebook mostra a fila de rascunhos que podem sair do vault para "
        f"outros canais. A regra é simples: **o vault continua sendo a fonte de "
        f"verdade**; redes sociais e newsletters são adaptadores na borda.\n\n"
        f"- candidatos: **{outbox.get('itemCount', 0)}**\n"
        f"- fonte: `{outbox.get('source')}`\n"
        f"- coletado em: `{outbox.get('collectedAt')}`\n"
        f"- privacidade: `{outbox.get('privacy')}`\n"
        f"- revisão humana obrigatória: **{policy.get('humanReviewRequired')}**\n"
        f"- dry-run primeiro: **{policy.get('dryRunFirst')}**\n"
        f"- fingerprint: `{outbox.get('sha256')}`"
    )
    return


@app.cell
def _(mo, outbox):
    import pandas as pd

    channels_df = pd.DataFrame(outbox.get("channels", []))
    mo.md("## Canais como adaptadores")
    mo.ui.table(channels_df)
    return channels_df, pd


@app.cell
def _(mo, outbox, pd):
    items = outbox.get("items", [])
    rows = []
    for item in items:
        rows.append(
            {
                "titulo": item.get("title"),
                "status": item.get("status"),
                "publicação": item.get("publicationStatus"),
                "canais": ", ".join(item.get("channels") or []),
                "privacidade": item.get("privacy"),
                "licença": item.get("license"),
                "canônico": item.get("canonical"),
                "arquivo": item.get("path"),
            }
        )
    items_df = pd.DataFrame(rows)
    mo.md(
        "## Rascunhos candidatos\n\n"
        "Itens aparecem aqui quando uma nota declara `outbox: true`, "
        "`publicationStatus` ou `channels` no frontmatter. Se a tabela estiver "
        "vazia, o solo está pronto, mas ainda não há nada para distribuir."
    )
    mo.ui.table(items_df)
    return items_df


@app.cell
def _(items_df, mo):
    blocked = 0
    if not items_df.empty:
        blocked = int(
            items_df["privacidade"].astype(str).str.contains("sensitive|private", case=False, regex=True).sum()
        )
    mo.md(
        "## Checklist operacional\n\n"
        "Antes de publicar fora do vault:\n\n"
        "- [ ] confirmar que a nota canônica está correta;\n"
        "- [ ] confirmar licença, termos e privacidade;\n"
        "- [ ] gerar rascunho por canal, sem publicar automaticamente;\n"
        "- [ ] revisar tom, contexto e links;\n"
        "- [ ] registrar o link externo de volta na nota canônica.\n\n"
        f"Candidatos com privacidade sensível ou privada: **{blocked}**."
    )
    return


@app.cell
def _(mo):
    preview = "\n".join(
        [
            "---",
            "title: \"Rascunho externo - Exemplo\"",
            "status: draft",
            "outbox: true",
            "publicationStatus: draft",
            "canonical: \"[[Nota Canônica]]\"",
            "source: \"[[Nota Canônica]]\"",
            "collectedAt: \"2026-05-26T00:00:00.000Z\"",
            "sha256: \"\"",
            "license: \"verificar\"",
            "privacy: \"private-until-published\"",
            "channels:",
            "  - rss",
            "  - mastodon",
            "---",
            "",
            "# Rascunho externo - Exemplo",
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
        ]
    )
    mo.md(
        "## Modelo mínimo\n\n"
        "Use `90 - Modelos/Template - Post Externo.md` para criar um item de "
        "outbox sem acoplar o vault a nenhuma plataforma.\n\n"
        f"```markdown\n{preview}\n```"
    )
    return


@app.cell
def _(mo):
    mo.md(
        "## 🧭 Lane de entendimento\n\n"
        "Evolua esse notebook até virar um painel operacional de publicação:"
    )

    mo.md(
        "### Nível inicial — observação\n\n"
        "- Mapear itens com status pendente e identificar sinais de risco;\n"
        "- Entender política de licença e privacidade antes de qualquer distribuição."
    )

    mo.md(
        "### Nível intermediário — curadoria\n\n"
        "- Organizar candidatos por canal, revisar tom e referências;\n"
        "- Garantir vínculo reverso para a nota canônica de origem."
    )

    mo.md(
        "### Nível avançado — operação repetível\n\n"
        "- Integrar com rotinas locais de publicação em lotes;\n"
        "- Fechar evidência de revisão para cada saída (status, timestamp, operador)."
    )
    return


if __name__ == "__main__":
    app.run()
