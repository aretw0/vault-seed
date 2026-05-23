import marimo

__generated_with = "0.23.8"
app = marimo.App(width="medium")


@app.cell
def _():
    import json
    import os
    import marimo as mo

    return json, mo, os


@app.cell
def _(json, os):
    try:
        import pyodide  # type: ignore
        from pyodide.http import open_url  # type: ignore

        _raw = open_url("./vault-data.json").read()
        data = json.loads(_raw)
    except ImportError:
        _notebooks_path = os.environ.get("VAULT_NOTEBOOKS_PATH", "lab")
        _path = os.path.join(
            os.getcwd(),
            "public",
            _notebooks_path,
            "vault-data.json",
        )
        with open(_path, encoding="utf-8") as _f:
            data = json.load(_f)

    notes = data["notes"]
    return data, notes


@app.cell
def _(data, mo, notes):
    intro = mo.md(
        f"# vault-seed\n\n"
        f"Um vault local-first com site, automação e notebooks no mesmo repositório.\n\n"
        f"**{len(notes)} notas** no snapshot atual · gerado em `{data['generated'][:10]}`"
    )
    return (intro,)


@app.cell
def _(notes):
    from collections import Counter

    status_counts = Counter((note.get("status") or "sem status") for note in notes)
    folder_counts = Counter(note["folder"] for note in notes)
    tag_counts = Counter(tag for note in notes for tag in note.get("tags", []))
    return folder_counts, status_counts, tag_counts


@app.cell
def _(folder_counts, intro, mo, notes, status_counts, tag_counts):
    tese = mo.md("""
    ## A tese

    O vault não é só uma pasta de Markdown. Ele é um sistema versionado para pensar, publicar, automatizar e analisar o próprio conhecimento.

    A stack fica visível e reaproveitável: Git, GitHub Actions, Astro, Obsidian, VS Code/Foam, Marimo e agentes de terminal.
    """)

    stack = mo.md("""
    ## O que vem junto

    | Camada | Papel |
    | --- | --- |
    | Notas Markdown | conhecimento editável localmente |
    | Astro/Starlight | site publicado a partir do vault |
    | GitHub Actions | validação e publicação automática |
    | Marimo | Lab interativo para leitura e análise |
    | Agentes | edição assistida via arquivos, comandos e diff |
    """)

    local_first = mo.md("""
    ## Local-first

    O trabalho diário acontece no computador: notas, notebooks, scripts e commits. O site publicado é um artefato empacotado dessa base local.

    Isso reduz dependência de plataformas, facilita revisão por Git e deixa automações determinísticas.
    """)

    lab = mo.md("""
    ## Lab

    O Lab usa Marimo para transformar o vault em dados exploráveis.

    - localmente: Python roda no computador com `pnpm run notebooks:dev`;
    - publicado: HTML WebAssembly roda no navegador;
    - apresentações publicadas no navegador usam `mo.carousel`;
    - PDF em slides pode ser gerado sob demanda quando fizer parte de uma entrega.
    """)

    snapshot = mo.md(
        f"## Snapshot atual\n\n"
        f"| Métrica | Valor |\n"
        f"| --- | ---: |\n"
        f"| Notas no vault | {len(notes)} |\n"
        f"| Pastas com notas | {len(folder_counts)} |\n"
        f"| Status distintos | {len(status_counts)} |\n"
        f"| Tags distintas | {len(tag_counts)} |"
    )
    _top_folders = "\n".join(
        f"- **{folder or 'raiz'}**: {count} notas"
        for folder, count in folder_counts.most_common(6)
    )
    folders = mo.md(
        f"## Onde o conhecimento está\n\n"
        f"{_top_folders}"
    )

    governance = mo.md("""
    ## Governança

    Criar um notebook não publica esse notebook.

    A publicação passa pelo manifesto `.site/lab.notebooks.json`. Slides e outros formatos são artefatos gerados sob demanda, não entradas automáticas do site.
    """)

    next_step = mo.md("""
    ## Próximo passo

    A partir daqui, o vault-seed passa a ser uma base para:

    - distribuir um vault pronto para uso;
    - publicar documentação viva;
    - criar notebooks de análise;
    - separar ETL local de visualização empacotada.
    """)

    mo.carousel([
        intro,
        tese,
        stack,
        local_first,
        lab,
        snapshot,
        folders,
        governance,
        next_step,
    ])
    return


if __name__ == "__main__":
    app.run()
