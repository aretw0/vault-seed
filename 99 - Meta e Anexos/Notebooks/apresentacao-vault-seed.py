import marimo

__generated_with = "0.23.8"
app = marimo.App(
    width="medium",
    layout_file="layouts/apresentacao-vault-seed.slides.json",
)


@app.cell
def _():
    import json
    import os
    from collections import Counter
    from textwrap import dedent

    import marimo as mo

    return Counter, dedent, json, mo, os


@app.cell
def _(json, os):
    try:
        import pyodide  # type: ignore  # noqa: F401
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
def _(Counter, notes):
    status_counts = Counter((note.get("status") or "sem status") for note in notes)
    folder_counts = Counter(note["folder"] for note in notes)
    tag_counts = Counter(tag for note in notes for tag in note.get("tags", []))
    return folder_counts, status_counts, tag_counts


@app.cell
def _(data, mo, notes):
    mo.md(
        f"""
        # vault-seed

        Um vault local-first com site, automação e notebooks no mesmo repositório.

        **{len(notes)} notas** no snapshot atual · gerado em `{data['generated'][:10]}`
        """
    )
    return


@app.cell
def _(dedent, mo):
    mo.md(
        dedent(
            """
            ## A tese

            O vault não é só uma pasta de Markdown. Ele é um sistema versionado para pensar, publicar, automatizar e analisar o próprio conhecimento.

            A stack fica visível e reaproveitável: Git, GitHub Actions, Astro, Obsidian, VS Code/Foam, Marimo e agentes de terminal.
            """
        ).strip()
    )
    return


@app.cell
def _(dedent, mo):
    mo.md(
        dedent(
            """
            ## O que vem junto

            | Camada | Papel |
            | --- | --- |
            | Notas Markdown | conhecimento editável localmente |
            | Astro/Starlight | site publicado a partir do vault |
            | GitHub Actions | validação e publicação automática |
            | Marimo | Lab interativo para leitura e análise |
            | Agentes | edição assistida via arquivos, comandos e diff |
            """
        ).strip()
    )
    return


@app.cell
def _(dedent, mo):
    mo.md(
        dedent(
            """
            ## Local-first

            O trabalho diário acontece no computador: notas, notebooks, scripts e commits. O site publicado é um artefato empacotado dessa base local.

            Isso reduz dependência de plataformas, facilita revisão por Git e deixa automações determinísticas.
            """
        ).strip()
    )
    return


@app.cell
def _(dedent, mo):
    mo.md(
        dedent(
            """
            ## Lab

            O Lab usa Marimo para transformar o vault em dados exploráveis.

            - localmente: Python roda no computador com `pnpm run notebooks:dev`;
            - publicado: HTML WebAssembly roda no navegador;
            - layouts nativos do Marimo permitem modos vertical, grid e slides;
            - PDF em slides pode ser gerado sob demanda quando fizer parte de uma entrega.
            """
        ).strip()
    )
    return


@app.cell
def _(folder_counts, mo, notes, status_counts, tag_counts):
    mo.md(
        f"""
        ## Snapshot atual

        | Métrica | Valor |
        | --- | ---: |
        | Notas no vault | {len(notes)} |
        | Pastas com notas | {len(folder_counts)} |
        | Status distintos | {len(status_counts)} |
        | Tags distintas | {len(tag_counts)} |
        """
    )
    return


@app.cell
def _(folder_counts, mo):
    _top_folders = "\n".join(
        f"- **{folder or 'raiz'}**: {count} notas"
        for folder, count in folder_counts.most_common(6)
    )
    mo.md(f"## Onde o conhecimento está\n\n{_top_folders}")
    return


@app.cell
def _(dedent, mo):
    mo.md(
        dedent(
            """
            ## Governança

            Criar um notebook não publica esse notebook.

            A publicação passa pelo manifesto `.site/lab.notebooks.json`. Slides e outros formatos são artefatos gerados sob demanda, não entradas automáticas do site.
            """
        ).strip()
    )
    return


@app.cell
def _(dedent, mo):
    mo.md(
        dedent(
            """
            ## Próximo passo

            A partir daqui, o vault-seed passa a ser uma base para:

            - distribuir um vault pronto para uso;
            - publicar documentação viva;
            - criar notebooks de análise;
            - separar ETL local de visualização empacotada.
            """
        ).strip()
    )
    return


@app.cell
def _(mo):
    mo.md(
        "## 🧭 Lane de entendimento\n\n"
        "Use esta trilha para transformar a apresentação em roteiro operacional da comunidade:"
    )

    mo.md(
        "### Nível inicial — contexto\n\n"
        "- Entender os contratos do template e onde cada superfície é gerada;\n"
        "- Garantir que a mensagem central apareça no primeiro nível do site."
    )

    mo.md(
        "### Nível intermediário — operação\n\n"
        "- Traduzir objetivos em rotinas de publicação, review e revisão de datasets;\n"
        "- Conectar slides, docs e notas em um mesmo ciclo de manutenção."
    )

    mo.md(
        "### Nível avançado — governança contínua\n\n"
        "- Atualizar este notebook em cada ciclo de release;\n"
        "- Fechar evidências de maturidade em contratos e trilhas de onboarding."
    )

    mo.md(
        "### Nível de excelência — comunicação institucional\n\n"
        "- Transformar os checkpoints em um playbook reutilizável para novos mantenedores;\n"
        "- Medir clareza e adoção dos trilhos por etapa (ex.: leitura, decisão, revisão).\n"
        "- Fechar um ciclo semestrais de revisão de narrativa e alinhamento de contratos."
    )
    return


if __name__ == "__main__":
    app.run()
