import marimo

__generated_with = "0.23.9"
app = marimo.App(width="medium", layout_file="layouts/o-lab.slides.json")


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
    dataset_count = len(_manifest.get("datasets", []))
    return dataset_count, profile, tier


@app.cell
def _(mo, profile, tier):
    note_count = profile["noteCount"]
    collected_at = profile.get("collectedAt", "")[:10]
    mo.md(f"""
    # O Lab

    Notebooks interativos que vivem no repositório — versionados, auditáveis
    e publicáveis como HTML WebAssembly sem servidor.

    **{note_count} notas** indexadas · *{tier}*{f' · snapshot `{collected_at}`' if collected_at else ''}
    """)
    return (note_count,)


@app.cell
def _(mo):
    mo.md("""
    ## Por que Marimo em vez de Jupyter

    | Aspecto | Jupyter `.ipynb` | Marimo `.py` |
    | --- | --- | --- |
    | Formato | JSON com estado embutido | Python puro versionável |
    | Diff | ruidoso, células + outputs | legível como qualquer `.py` |
    | Execução | ordem manual, estado oculto | grafo reativo, sem estado surpresa |
    | Export | requer nbconvert externo | `marimo export html-wasm` nativo |
    | Agentes | precisam parsear JSON | leem e editam Python diretamente |

    O notebook é o arquivo. O arquivo é o notebook.
    """)
    return


@app.cell
def _(mo):
    mo.md("""
    ## Três modos de execução

    | Modo | Onde Python roda | Acesso |
    | --- | --- | --- |
    | `dgk lab <nome>` | Computador local | Filesystem · Secrets · Subprocess · OCR |
    | `marimo run` | Servidor Python | Mesmo acesso local + HTTP clients |
    | HTML WebAssembly | Navegador (Pyodide) | Dados bundled · APIs públicas · Sem secrets |

    A intenção é manter o mesmo notebook legível nos três contextos, com
    limites explícitos para o que só pode acontecer localmente.
    """)
    return


@app.cell
def _(mo):
    mo.md("""
    ## O runtime context

    ```python
    from _lab_notebook_runtime import lab_runtime_context

    ctx = lab_runtime_context()
    # ctx["isLocal"]      → True em modo local ou servidor
    # ctx["isPackaged"]   → True no HTML WebAssembly (Pyodide)
    # ctx["capabilities"] → filesystem, secrets, subprocess, ...
    ```

    Primitivas locais (write_local_json_snapshot, get_local_secret, ...)
    levantam `RuntimeError` no WASM com mensagem clara.
    Primitivas WASM (fetch_wasm_json, fetch_wasm_feed, ...)
    usam `pyfetch` do Pyodide no lugar de `urllib`.

    Testes de contrato mantêm esse vocabulário estável para os notebooks
    publicados e para o pacote de runtime.
    """)
    return


@app.cell
def _(mo):
    mo.md("""
    ## O pipeline de dados

    ```
    Notas Markdown
        ↓  generate_vault_data.mjs
    vault-data.json          ← snapshot indexado de notas, tags, links
        ↓  prepare_lab_datasets.mjs
    datasets/*.json          ← feeds, qualidade, outbox, grafo, IA
        ↓  lab.datasets.json (manifesto)
    Notebooks Marimo         ← lêem via read_lab_dataset()
        ↓  marimo export html-wasm
    /lab/*.html              ← publicados em GitHub Pages
    ```

    Coleta e transformação rodam antes da publicação (ETL local ou CI).
    O notebook publicado é camada de leitura. Coleta, escrita e segredos ficam
    antes do export, no ambiente local ou no CI.
    """)
    return


@app.cell
def _(mo):
    mo.md("""
    ## Criar um notebook

    1. Copie de `99 - Meta e Anexos/Notebooks/starters/`
    2. Renomeie em `99 - Meta e Anexos/Notebooks/`
    3. Abra com `dgk lab <nome>`
    4. Carregue dados com `read_lab_json("vault-data.json")`
    5. Valide com `pnpm run notebooks:check`

    Criar um notebook não o publica. Para publicar, adicione
    uma entrada com `"publish": true` em `.site/lab.notebooks.json`.
    """)
    return


@app.cell
def _(dataset_count, mo, note_count):
    mo.md(f"""
    ## Lab deste vault

    - **{note_count}** notas indexadas no snapshot
    - **{dataset_count}** dataset(s) declarados no manifesto
    - Notebooks publicados: análise de publicação, grafo, feeds, outbox, ETL e apresentações

    O valor está na proximidade: dados, explicação e origem continuam no mesmo
    repositório que contém as notas.
    """)
    return


@app.cell
def _(mo):
    mo.md("""
    ## Para seguir

    O Lab não é outro produto dentro do vault. Ele é a camada de leitura para
    perguntas que Markdown sozinho não responde bem.

    - O ETL prepara snapshots efêmeros e regeneráveis
    - O notebook explica o dado e seus limites
    - O HTML publicado mostra o resultado sem exigir servidor
    - O modo local fica para rede, filesystem, OCR e segredos

    A apresentação termina aqui: abra um notebook publicado, depois rode o
    mesmo notebook localmente com `dgk lab <nome>` e observe quais capacidades
    mudam.
    """)
    return


if __name__ == "__main__":
    app.run()
