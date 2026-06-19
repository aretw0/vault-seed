import marimo

__generated_with = "0.23.9"
app = marimo.App(width="medium", layout_file="layouts/visao-geral.slides.json")


@app.cell
def _():
    import sys
    from pathlib import Path
    _this_dir = Path(__file__).resolve().parent
    _runtime_dir = (
        _this_dir.parent
        if (_this_dir.parent / "_lab_notebook_runtime.py").exists()
        else _this_dir
    )
    if str(_runtime_dir) not in sys.path:
        sys.path.insert(0, str(_runtime_dir))
    import marimo as mo
    from _lab_notebook_runtime import lab_runtime_context, load_lab_manifest, read_lab_dataset

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
    tag_count = len(profile["tags"])
    collected_at = profile.get("collectedAt", "")[:10]
    return collected_at, folder_count, note_count, tag_count


@app.cell
def _(collected_at, mo, note_count, tier):
    mo.md(f"""
    # vault-seed

    Conhecimento como código: vault versionado, site, notebooks e automação
    no mesmo repositório Git — sem dependência de plataformas proprietárias.

    **{note_count} notas** no snapshot{f' · coletado em `{collected_at}`' if collected_at else ''} · *{tier}*
    """)
    return


@app.cell
def _(mo):
    mo.md("""
    ## O problema

    Seu conhecimento está espalhado entre ferramentas que não conversam entre si.
    Notas em um app, publicações em outro, dados em uma planilha, automações
    presas em serviços que podem mudar de preço ou desaparecer.

    A alternativa: **tudo em arquivos de texto aberto, versionados no Git,
    que você controla localmente e pode hospedar em qualquer lugar.**
    """)
    return


@app.cell
def _(mo):
    mo.md("""
    ## A solução: vault local-first

    Um repositório Git que é ao mesmo tempo:

    - **Vault de notas** — Markdown editável no Obsidian, VS Code ou qualquer editor
    - **Site publicado** — gerado a partir das notas, sem CMS externo
    - **Lab de análise** — notebooks Marimo que rodam localmente e no navegador
    - **Plataforma de publicação** — outbox multi-canal com revisão antes de enviar

    Tudo auditável, tudo versionado, tudo portátil.
    """)
    return


@app.cell
def _(mo):
    mo.md("""
    ## Organização PARA

    | Pasta | Conteúdo |
    | --- | --- |
    | `10 - Diário` | entradas diárias e registros de contexto |
    | `20 - Projetos` | projetos ativos com objetivo e prazo |
    | `30 - Áreas` | responsabilidades contínuas sem prazo |
    | `40 - Recursos` | referências, conceitos, notas de leitura |
    | `50 - Arquivo` | material encerrado ou inativo |
    | `90 - Modelos` | templates para novas notas |
    | `99 - Meta e Anexos` | onboarding, workflows, notebooks, configuração |

    A estrutura é convenção, não regra. Você adapta ao seu fluxo.
    """)
    return


@app.cell
def _(mo):
    mo.md("""
    ## A stack

    | Camada | Componente | Papel |
    | --- | --- | --- |
    | Notas | Markdown + Git | conhecimento editável em formato aberto |
    | Editor | Obsidian / VS Code | leitura, escrita e navegação por links |
    | Site | Astro + Starlight | publicação a partir do vault, zero lock-in |
    | CI/CD | GitHub Actions | validação, build e deploy automáticos |
    | Lab | Marimo | análise WASM, local e CI no mesmo código |
    | Automação | dgk-cli | ETL, export, publicação e integração com agentes |
    | Agentes | Claude / Pi / Codex | edição assistida via arquivos e diff |

    Cada componente é substituível. O vault não depende de nenhum deles especificamente.
    """)
    return


@app.cell
def _(folder_count, mo, note_count, tag_count):
    mo.md(f"""
    ## Este vault em números

    | Métrica | Valor |
    | --- | ---: |
    | Notas | **{note_count}** |
    | Pastas com conteúdo | **{folder_count}** |
    | Tags distintas | **{tag_count}** |

    Esses dados são gerados a partir do snapshot `vault-data.json` — o mesmo
    que alimenta todos os notebooks do Lab.
    """)
    return


@app.cell
def _(mo):
    mo.md("""
    ## Soberania de dados

    - **Formato aberto**: Markdown lido por qualquer ferramenta, hoje e daqui a 20 anos
    - **Git como backbone**: histórico completo, diff legível, colaboração sem lock-in
    - **CI auditável**: todo dado gerado rastreia até o script que o produziu
    - **Distribuível**: o vault inteiro cabe em um repositório clonável
    - **Agnóstico de provedor**: GitHub hoje, qualquer host Git amanhã

    O trabalho diário acontece no computador. O site é artefato derivado —
    nunca o contrário.
    """)
    return


@app.cell
def _(mo):
    mo.md("""
    ## Como começar

    1. Use este repositório como template no GitHub
    2. O workflow `initialize.yml` prepara o vault no primeiro push
    3. Clone o repositório e abra no Obsidian ou VS Code
    4. Explore os notebooks com `dgk lab <nome>`
    5. Publique o site com `pnpm run site:build` e GitHub Pages

    O template cuida da infraestrutura. O conhecimento é seu.
    """)
    return


@app.cell
def _(mo):
    mo.md("""
    ## Fechamento

    O vault-seed é uma base inicial, não uma promessa de automação mágica.
    Ele entrega convenções, validações e caminhos de publicação para que você
    possa evoluir o próprio sistema sem perder rastreabilidade.
    """)
    return


if __name__ == "__main__":
    app.run()
