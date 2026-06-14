import marimo

__generated_with = "0.23.9"
app = marimo.App(
    width="medium",
    layout_file="layouts/apresentacao-vault-seed.slides.json",
)


@app.cell
def _():
    import marimo as mo
    from _lab_notebook_runtime import (
        lab_runtime_context,
        load_lab_manifest,
        read_lab_dataset,
    )
    return lab_runtime_context, load_lab_manifest, mo, read_lab_dataset


@app.cell
def _(lab_runtime_context, load_lab_manifest, read_lab_dataset):
    _ctx = lab_runtime_context()
    _manifest = load_lab_manifest()
    profile = read_lab_dataset("perfil-do-vault", _manifest)
    tier = "WASM (navegador)" if not _ctx["isLocal"] else "Local (desenvolvimento)"
    return profile, tier


@app.cell
def _(profile):
    note_count = profile["noteCount"]
    folder_count = len(profile["folders"])
    status_count = len(profile["statuses"])
    tag_count = len(profile["tags"])
    collected_at = profile.get("collectedAt", "")[:10]
    return collected_at, folder_count, note_count, status_count, tag_count


@app.cell
def _(collected_at, mo, note_count, tier):
    mo.md(f"""
    # Arcabouço Modular para Gestão Soberana do Conhecimento

    Uma POC local-first: vault versionado, site, automação e notebooks no mesmo repositório.

    **{note_count} notas** no snapshot{f' · coletado em `{collected_at}`' if collected_at else ''} · *{tier}*
    """)
    return


@app.cell
def _(mo):
    mo.md(
        """
        ## O arcabouço

        O vault não é apenas uma pasta de Markdown. É um sistema modular para pensar,
        publicar, automatizar e analisar o próprio conhecimento — com soberania total
        sobre os dados e sem dependência de plataformas proprietárias.

        A stack é visível e reaproveitável: Git, GitHub Actions, Astro, Obsidian,
        VS Code/Foam, Marimo e agentes de terminal. Cada componente é substituível.
        """
    )
    return


@app.cell
def _(mo):
    mo.md(
        """
        ## O que vem junto

        | Camada | Papel |
        | --- | --- |
        | Notas Markdown | conhecimento editável localmente em formato aberto |
        | Astro/Starlight | site publicado a partir do vault, sem lock-in de plataforma |
        | GitHub Actions | validação e publicação automática e auditável |
        | Marimo | Lab interativo: análise WASM, local e CI no mesmo código |
        | dgk-cli | orquestrador de ETL, exportação e publicação |
        | Agentes | edição assistida via arquivos, comandos e diff |
        """
    )
    return


@app.cell
def _(mo):
    mo.md(
        """
        ## Soberania de dados

        O trabalho diário acontece no computador: notas, notebooks, scripts e commits.
        O site publicado é um artefato derivado dessa base local — nunca o oposto.

        - **Formato aberto**: Markdown editável por qualquer ferramenta
        - **Sem lock-in**: Git + GitHub Actions portam para qualquer provedor CI
        - **Auditável**: todo dado gerado rastreia até o script que o produziu
        - **Distribuível**: o vault inteiro cabe em um repositório Git clonável
        """
    )
    return


@app.cell
def _(mo):
    mo.md(
        """
        ## Lab interativo

        O Lab usa Marimo para transformar o vault em dados exploráveis em três camadas:

        | Camada | Onde roda | Acesso |
        | --- | --- | --- |
        | WASM | Navegador (sem servidor) | Dados bundled · Sem secrets |
        | Local | Computador do mantenedor | Filesystem · Secrets · Subprocess |
        | CI | GitHub Actions | Refresh automático · Publicação agendada |

        O mesmo código fonte gera os três modos — a detecção de tier é automática.
        """
    )
    return


@app.cell
def _(folder_count, mo, note_count, status_count, tag_count):
    mo.md(f"""
    ## Snapshot atual

    | Métrica | Valor |
    | --- | ---: |
    | Notas no vault | {note_count} |
    | Pastas com notas | {folder_count} |
    | Status distintos | {status_count} |
    | Tags distintas | {tag_count} |
    """)
    return


@app.cell
def _(mo, profile):
    _top = "\n".join(
        f"- **{f['name'] or 'raiz'}**: {f['count']} notas"
        for f in profile["folders"][:6]
    )
    mo.md(f"## Onde o conhecimento está\n\n{_top}")
    return


@app.cell
def _(mo):
    mo.md(
        """
        ## Distribuições personalizadas

        O vault é um template que produz distribuições — cada fork é uma instância
        com identidade e conteúdo próprios, mantendo a estrutura PARA (Projects,
        Areas, Resources, Archive) e os contratos de automação.

        O workflow `initialize.yml` transforma o template no vault do usuário:
        remove scaffolding, configura nome e repositório, preserva a lógica.

        A governança fica no manifesto `.site/lab.notebooks.json`: criar um notebook
        não o publica — a publicação é um ato explícito e rastreável.
        """
    )
    return


@app.cell
def _(mo):
    mo.md(
        """
        ## Orquestrador e publicação multi-canal

        O `dgk-cli` expõe o ciclo completo em subcomandos rastreáveis:

        ```
        dgk lab etl        # extrai e transforma dados do vault
        dgk lab open       # abre notebook no Marimo (modo desenvolvimento)
        dgk lab export     # exporta notebooks para HTML/WASM publicável
        dgk lab curate     # classifica feeds com Claude API
        dgk lab open-vault # abre o vault no Obsidian
        ```

        O outbox multi-canal (Mastodon, Bluesky, newsletter, Instagram) converte
        frontmatter em publicação — sem reescrever a nota, sem duplicar conteúdo.
        O grafo do vault é exportado em JSON-LD com vocabulário semântico.
        """
    )
    return


if __name__ == "__main__":
    app.run()
