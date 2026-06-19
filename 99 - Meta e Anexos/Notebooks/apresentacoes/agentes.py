import marimo

__generated_with = "0.23.9"
app = marimo.App(width="medium", layout_file="layouts/agentes.slides.json")


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

    return (mo,)


@app.cell
def _(mo):
    mo.md("""
    # Agentes e o vault

    O vault é um ambiente favorável para agentes de IA porque quase tudo que
    importa aparece como arquivo versionado.

    Agentes podem editar notas, rodar comandos e deixar diffs para revisão.
    O Git continua sendo o limite entre sugestão e mudança aceita.
    """)
    return


@app.cell
def _(mo):
    mo.md("""
    ## AGENTS.md: o contrato agnóstico

    `AGENTS.md` é o contrato operacional do repositório — lido por Codex,
    Claude, Gemini, Pi ou qualquer agente que respeite convenções de arquivo.

    O que ele define:
    - Persona e área de expertise esperada
    - Mandatos obrigatórios (Conventional Commits, template-first, segurança)
    - Fundamentos do projeto (PARA, ferramentas, fluxo de trabalho)
    - Regras de comportamento (ação direta, cross-referência, verificação)

    Um contrato único reduz instruções duplicadas e mantém a orientação junto
    do código e das notas.
    """)
    return


@app.cell
def _(mo):
    mo.md("""
    ## Pi: harness de terminal

    Pi é um coding harness de terminal criado pela Earendil Inc. (pi.dev).
    Ele opera diretamente no repositório via terminal: lê e edita arquivos,
    executa comandos e propõe diffs para revisão.

    O diferencial é a extensibilidade: o núcleo é minimal e o usuário
    adiciona capacidades via skills TypeScript, templates de prompt
    e integrações com múltiplos provedores de IA.

    No vault, Pi é uma opção para tarefas como editar notas, refatorar scripts,
    rodar validações e criar commits. O `AGENTS.md` mantém a orientação
    fora de um provider específico.
    """)
    return


@app.cell
def _(mo):
    mo.md("""
    ## Agentes no terminal

    Um agente de terminal opera diretamente no repositório:

    - Lê e edita arquivos `.py`, `.md`, `.ts`, `.json`
    - Roda comandos de validação (`pnpm run validate`, `notebooks:check`)
    - Cria commits com mensagens Conventional Commits
    - Abre PRs com descrição e test plan

    O diff é sempre revisável. Nenhuma mudança chega ao repositório
    sem passar pelo Git e pelo CI.

    `AGENTS.md` instrui o agente sobre o projeto. Arquivos de compatibilidade,
    como `CLAUDE.md`, devem apontar para essa fonte canônica.
    """)
    return


@app.cell
def _(mo):
    mo.md("""
    ## Inbox soberana de fontes

    O vault ingere fontes externas sem depender de agregadores:

    ```
    feeds-assinados.json  →  ETL local  →  .dgk/feeds-*.json
    Telegram inbox         →  telegram:inbox script  →  00 - Entrada/*.md
    scraping / OCR         →  coleta-local.py  →  snapshot local
    ```

    Cada fonte rastreia até o script que a coletou.
    A curadoria decide o que entra no vault e o que vai para a outbox.
    Você não depende de Google Reader, Feedly, ou qualquer agregador.
    """)
    return


@app.cell
def _(mo):
    mo.md("""
    ## Lab com IA: curadoria de feeds

    `curadoria-feeds-ia.py` classifica itens de feed com um provider de IA:

    ```python
    # local-only: usa get_local_secret("ANTHROPIC_API_KEY")
    for item in feeds:
        score = call_llm(item, prompt=RELEVANCE_PROMPT)
        snapshot[item.id] = score
    write_local_json_snapshot(".dgk/curadoria-feeds.json", snapshot)
    ```

    O resultado alimenta o notebook `analise-feeds.py` e a outbox.
    A chave de API fica no silo local — nunca no repositório.

    A classificação com IA é uma etapa opcional do pipeline local, não uma
    exigência para usar o vault.
    """)
    return


@app.cell
def _(mo):
    mo.md("""
    ## Princípios

    **Local-first**: o trabalho acontece no computador. A nuvem é espelho,
    não origem. Os dados são seus antes de qualquer sync.

    **Agnóstico de provider**: um modelo hoje, outro amanhã.
    GitHub agora, outro host Git depois. A interface é o arquivo.

    **Auditável**: cada transformação tem um script. Cada publicação
    tem um commit. O histórico conta a história completa.

    **Progressivo**: você começa com notas e Git.
    O Lab, a outbox e os agentes entram conforme fazem sentido.
    Nenhuma feature é obrigatória para usar o vault.
    """)
    return


@app.cell
def _(mo):
    mo.md("""
    ## O fluxo com agentes

    ```
    Nota em 00 - Entrada/
        → agente opcional revisa, enriquece, move para a pasta certa
        → Lint e CI validam
        → Frontmatter muda para published
        → Site atualiza via deploy
        → Outbox prepara publicação nos canais
        → Você aprova e dispara
    ```

    Em cada etapa: arquivo editável, diff revisável, histórico preservado.

    Agentes ajudam quando deixam rastros claros: arquivos alterados, comandos
    executados, testes rodados e decisões ainda humanas.
    """)
    return


@app.cell
def _(mo):
    mo.md("""
    ## Fechamento

    O agente não substitui o processo do vault; ele entra dentro dele.

    - `AGENTS.md` define o contrato do repositório
    - As mudanças aparecem como arquivos e diffs
    - Os comandos de validação continuam sendo o critério
    - A decisão final continua humana

    Próximo passo: usar um agente para uma tarefa pequena, revisar o diff e
    só então deixar o CI confirmar que a mudança cabe no projeto.
    """)
    return


if __name__ == "__main__":
    app.run()
