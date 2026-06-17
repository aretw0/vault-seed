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
        clean_lab_text,
        extract_local_image_text,
        fetch_local_feed,
        fetch_local_url_text,
        fingerprint_data,
        get_local_secret,
        lab_runtime_context,
        load_lab_manifest,
        read_lab_dataset,
        read_lab_json,
        read_local_text_file,
        scrape_local_page_text,
        write_local_dataframe_snapshot,
        write_local_json_snapshot,
    )

    runtime_context = lab_runtime_context()
    manifest = load_lab_manifest()

    snapshot = read_lab_dataset("perfil-do-vault", manifest)
    curation = read_lab_dataset("curadoria-ia", manifest)
    runtime_sources = [
        dataset for dataset in manifest["datasets"] if dataset["kind"] == "runtime"
    ]
    return (
        clean_lab_text,
        curation,
        extract_local_image_text,
        fetch_local_feed,
        fetch_local_url_text,
        fingerprint_data,
        get_local_secret,
        manifest,
        read_lab_dataset,
        read_lab_json,
        read_local_text_file,
        runtime_context,
        runtime_sources,
        scrape_local_page_text,
        snapshot,
        write_local_dataframe_snapshot,
        write_local_json_snapshot,
    )


@app.cell
def _(curation, manifest, mo, runtime_context, snapshot):
    mode = "local" if runtime_context["isLocal"] else "empacotado no navegador"
    mo.md(
        f"# ETL soberano para o Lab\n\n"
        f"Este notebook demonstra o fluxo mínimo de soberania digital do vault: "
        f"**extrair** dados preparados, **transformar** em tabelas auditáveis "
        f"e **carregar** artefatos que a pessoa pode copiar, versionar ou "
        f"publicar sem depender de um serviço fechado.\n\n"
        f"Modo atual: **{mode}**. O mesmo notebook usa utilitários compartilhados "
        f"para ler datasets e decidir quais etapas podem rodar fora do HTML "
        f"empacotado.\n\n"
        f"- datasets no manifesto: **{manifest['datasetCount']}**\n"
        f"- notas no snapshot local: **{snapshot['noteCount']}**\n"
        f"- palavras estimadas: **{snapshot['totalWords']}**\n"
        f"- média por nota: **{snapshot['averageWords']}**\n"
        f"- notas auditadas pela IA editorial: **{curation['notesEvaluated']}**\n"
        f"- avisos editoriais não bloqueantes: **{len(curation['warnings'])}**"
    )
    return


@app.cell
def _(clean_lab_text, fingerprint_data):
    import json

    class DataTransformer:
        """Transformações pequenas, auditáveis e compatíveis com Pyodide."""

        def clean_text(self, text):
            return clean_lab_text(text)

        def note_records(self, snapshot):
            records = []
            for note in snapshot.get("largestNotes", []):
                tags = note.get("tags") or []
                records.append(
                    {
                        "title": self.clean_text(note.get("title")),
                        "folder": self.clean_text(note.get("folder")),
                        "status": self.clean_text(note.get("status")),
                        "words": int(note.get("words") or 0),
                        "tag_count": len(tags),
                        "tags": ", ".join(tags),
                    }
                )
            return records

        def dimension_records(self, snapshot):
            records = []
            for dimension, label in [
                ("folders", "pasta"),
                ("statuses", "status"),
                ("tags", "tag"),
            ]:
                for item in snapshot.get(dimension, []):
                    records.append(
                        {
                            "dimensao": label,
                            "nome": self.clean_text(item.get("name")),
                            "count": int(item.get("count") or 0),
                        }
                    )
            return records

        def prepare_for_load(self, records):
            return [
                {
                    key: value
                    for key, value in record.items()
                    if value not in (None, "", [])
                }
                for record in records
            ]

    class DataLoader:
        """Carga local: serializa resultados para cópia, versionamento ou CI."""

        def fingerprint(self, data):
            return fingerprint_data(data)

        def to_json(self, records):
            return json.dumps(records, ensure_ascii=False, indent=2)

        def to_csv(self, dataframe):
            return dataframe.to_csv(index=False)

    return DataLoader, DataTransformer


@app.cell
def _(DataLoader, DataTransformer, snapshot):
    import pandas as pd

    transformer = DataTransformer()
    loader = DataLoader()

    note_records = transformer.prepare_for_load(transformer.note_records(snapshot))
    dimension_records = transformer.prepare_for_load(
        transformer.dimension_records(snapshot)
    )
    notes_df = pd.DataFrame(note_records)
    dimensions_df = pd.DataFrame(dimension_records)

    export_payload = {
        "schemaVersion": 1,
        "source": "etl-demo.py",
        "summary": {
            "noteCount": snapshot["noteCount"],
            "totalWords": snapshot["totalWords"],
            "averageWords": snapshot["averageWords"],
        },
        "largestNotes": note_records,
        "dimensions": dimension_records,
    }
    export_json = loader.to_json(export_payload)
    export_csv = loader.to_csv(notes_df)
    snapshot_hash = loader.fingerprint(snapshot)
    return dimensions_df, export_csv, export_json, export_payload, notes_df, pd, snapshot_hash


@app.cell
def _(mo, runtime_context):
    runtime_rows = [
        {"sinal": "runtime", "valor": runtime_context["runtime"]},
        {"sinal": "isLocal", "valor": str(runtime_context["isLocal"])},
        {"sinal": "isPackaged", "valor": str(runtime_context["isPackaged"])},
        {"sinal": "canRunLocalEtl", "valor": str(runtime_context["canRunLocalEtl"])},
        {
            "sinal": "localCapabilities",
            "valor": ", ".join(
                name
                for name, enabled in runtime_context["capabilities"].items()
                if enabled
            )
            or "nenhuma",
        },
        {"sinal": "notebooksPath", "valor": runtime_context["notebooksPath"]},
    ]
    mo.md(
        "## Runtime: local vs empacotado\n\n"
        "Os utilitários do Lab permitem que qualquer notebook detecte onde está "
        "rodando. Assim, a mesma interface pode fazer exploração local quando há "
        "acesso a arquivos, Playwright, OCR ou segredos, e continuar segura quando "
        "for exportada para HTML/WASM."
    )
    return runtime_rows


@app.cell
def _(mo, pd, runtime_rows):
    mo.ui.table(pd.DataFrame(runtime_rows))
    return


@app.cell
def _(mo, pd):
    primitives = pd.DataFrame(
        [
            {
                "primitiva": "read_lab_dataset",
                "empacotado": "lê JSON publicado pelo manifesto",
                "local": "lê o mesmo snapshot em public/<lab>/assets",
                "fronteira": "segura para notebook publicado",
            },
            {
                "primitiva": "write_local_json_snapshot",
                "empacotado": "bloqueada",
                "local": "grava extract versionável no vault",
                "fronteira": "extract que toca filesystem fica local",
            },
            {
                "primitiva": "write_local_dataframe_snapshot",
                "empacotado": "bloqueada",
                "local": "grava CSV/JSON; Parquet se houver engine local",
                "fronteira": "formato pesado vira artefato local/CLI",
            },
            {
                "primitiva": "read_local_text_file / read_local_bytes_file",
                "empacotado": "bloqueada",
                "local": "lê arquivos privados do vault",
                "fronteira": "nada privado entra no HTML sem snapshot explícito",
            },
            {
                "primitiva": "fetch_local_url_text",
                "empacotado": "bloqueada",
                "local": "coleta HTML/texto com biblioteca padrão",
                "fronteira": "scraping simples sem dependência nova",
            },
            {
                "primitiva": "fetch_local_feed",
                "empacotado": "bloqueada",
                "local": "normaliza RSS/Atom como registros JSON",
                "fronteira": "assinaturas viram snapshots auditáveis",
            },
            {
                "primitiva": "scrape_local_page_text",
                "empacotado": "bloqueada",
                "local": "usa Playwright quando a página exige navegador",
                "fronteira": "dependência opcional de CLI/local",
            },
            {
                "primitiva": "extract_local_image_text",
                "empacotado": "bloqueada",
                "local": "usa OCR local quando pillow/pytesseract/tesseract existem",
                "fronteira": "binário externo fica fora do pacote publicado",
            },
            {
                "primitiva": "get_local_secret",
                "empacotado": "bloqueada",
                "local": "lê variável de ambiente sem vazar token",
                "fronteira": "credencial nunca é exportada para HTML",
            },
            {
                "primitiva": "clean_lab_text / fingerprint_data",
                "empacotado": "roda no Pyodide",
                "local": "roda igual",
                "fronteira": "transformação pura fica no notebook",
            },
        ]
    )
    mo.vstack([
        mo.md(
            "## Primitivas locais vs publicadas\n\n"
            "A regra é: transformação pura e leitura de snapshots ficam no notebook; "
            "filesystem, segredos, navegador headless, OCR e formatos pesados ficam "
            "atrás de helpers locais ou scripts CLI. Assim o HTML publicado continua "
            "leve, reprodutível e sem credenciais."
        ),
        mo.ui.table(primitives),
    ])
    return primitives,


@app.cell
def _(mo, runtime_context):
    run_file_probe = mo.ui.checkbox(label="Ler README local", value=False)
    run_static_web_probe = mo.ui.checkbox(
        label="Extrair texto de URL localmente",
        value=False,
    )
    static_web_url = mo.ui.text(
        label="URL para extract local",
        value="https://example.com",
    )
    run_local_extract = mo.ui.checkbox(
        label="Executar extract local demonstrativo",
        value=False,
    )
    run_tabular_snapshot = mo.ui.checkbox(
        label="Gravar tabela CSV local",
        value=False,
    )
    status = "disponível" if runtime_context["isLocal"] else "bloqueado no HTML publicado"
    mo.vstack([
        mo.md(
            "## Extract local, carga publicada\n\n"
            f"Status da etapa local: **{status}**. A primitiva `write_local_json_snapshot` "
            "permite que um notebook rode coleta local quando estiver no computador da "
            "pessoa e grave um snapshot JSON versionável. Depois, o site publicado lê o "
            "snapshot empacotado pelo manifesto, sem duplicar a interface do notebook."
        ),
        mo.hstack(
            [
                run_file_probe,
                run_static_web_probe,
                static_web_url,
                run_tabular_snapshot,
            ]
        ),
    ])
    return (
        run_file_probe,
        run_local_extract,
        run_static_web_probe,
        run_tabular_snapshot,
        static_web_url,
    )


@app.cell
def _(
    fetch_local_url_text,
    get_local_secret,
    mo,
    read_local_text_file,
    run_file_probe,
    run_static_web_probe,
    runtime_context,
    static_web_url,
):
    local_probe_rows = []
    if runtime_context["isLocal"]:
        token_present = bool(get_local_secret("LAB_DEMO_TOKEN"))
        local_probe_rows.append(
            {
                "probe": "segredo local",
                "resultado": "LAB_DEMO_TOKEN configurado" if token_present else "sem LAB_DEMO_TOKEN",
            }
        )
    else:
        local_probe_rows.append(
            {
                "probe": "segredo local",
                "resultado": "bloqueado no HTML publicado",
            }
        )

    if run_file_probe.value and runtime_context["isLocal"]:
        _readme = read_local_text_file("README.md")
        local_probe_rows.append(
            {"probe": "arquivo local", "resultado": f"README.md com {len(_readme)} caracteres"}
        )
    elif run_file_probe.value:
        local_probe_rows.append(
            {"probe": "arquivo local", "resultado": "bloqueado no HTML publicado"}
        )

    if run_static_web_probe.value and runtime_context["isLocal"]:
        _page = fetch_local_url_text(static_web_url.value)
        local_probe_rows.append(
            {
                "probe": "web estática local",
                "resultado": f"{_page.get('title') or 'sem título'} — {len(_page['text'])} caracteres",
            }
        )
    elif run_static_web_probe.value:
        local_probe_rows.append(
            {"probe": "web estática local", "resultado": "bloqueado no HTML publicado"}
        )

    mo.vstack([
        mo.md(
            "### Probes locais opcionais\n\n"
            "Estas ações só rodam quando a pessoa marca explicitamente no modo local. "
            "No HTML publicado, os helpers bloqueiam filesystem, rede de coleta local "
            "e segredos."
        ),
        mo.ui.table(local_probe_rows),
    ])
    return local_probe_rows,


@app.cell
def _(mo, run_local_extract, runtime_context, snapshot, write_local_json_snapshot):
    if run_local_extract.value and runtime_context["isLocal"]:
        payload = {
            "schemaVersion": 1,
            "source": "etl-demo.py",
            "kind": "extract-preview",
            "noteCount": snapshot["noteCount"],
            "totalWords": snapshot["totalWords"],
            "largestNotes": snapshot.get("largestNotes", [])[:5],
        }
        _result = write_local_json_snapshot(
            ".dgk/perfil-do-vault.extract-preview.json",
            payload,
        )
        _message = (
            f"Snapshot local escrito em `{_result['relativePath']}` "
            f"({_result['bytes']} bytes)."
        )
    elif run_local_extract.value:
        _message = "Extract local bloqueado: o HTML publicado não tem acesso ao filesystem."
    else:
        _message = "Extract local não executado nesta sessão."

    mo.md(_message)
    return


@app.cell
def _(mo, pd, runtime_context):
    if runtime_context["isLocal"]:
        local_status = "liberadas neste notebook local"
    else:
        local_status = "bloqueadas no notebook empacotado"

    capabilities = pd.DataFrame(
        [
            {
                "capacidade": "web scraping",
                "modo empacotado": "consome snapshot ou URL pública com CORS",
                "modo local": "pode usar Playwright antes do export",
                "soberania": "a coleta vira arquivo versionável",
            },
            {
                "capacidade": "arquivos e anexos",
                "modo empacotado": "lê apenas datasets publicados",
                "modo local": "pode varrer o vault e anexos privados",
                "soberania": "o dado nasce no repositório da pessoa",
            },
            {
                "capacidade": "OCR",
                "modo empacotado": "consome texto já extraído",
                "modo local": "pode chamar Tesseract ou outro binário",
                "soberania": "imagem e texto derivado ficam auditáveis",
            },
            {
                "capacidade": "APIs com credenciais",
                "modo empacotado": "não carrega segredos no HTML",
                "modo local": "pode usar variáveis de ambiente ou secret store",
                "soberania": "tokens não entram no artefato publicado",
            },
            {
                "capacidade": "transformação",
                "modo empacotado": "Python puro + pandas no Pyodide",
                "modo local": "mesmas regras, com bibliotecas extras se preciso",
                "soberania": "a regra fica visível no notebook",
            },
            {
                "capacidade": "carga",
                "modo empacotado": "JSON/CSV copiáveis e tabelas",
                "modo local": "pode gerar Parquet, imagens e snapshots pesados",
                "soberania": "artefatos portáveis e reproduzíveis",
            },
        ]
    )
    mo.vstack([
        mo.md(
            "## Curadoria ETL em uma única interface\n\n"
            f"Operações locais agora estão **{local_status}**. O ponto é evitar drift: "
            "o notebook continua sendo a bancada de trabalho, mas células que exigem "
            "capacidades não empacotáveis ficam protegidas por `require_local_runtime`."
        ),
        mo.ui.table(capabilities),
    ])
    return capabilities, local_status


@app.cell
def _(manifest, mo, pd):
    manifest_rows = []
    for dataset in manifest["datasets"]:
        manifest_rows.append(
            {
                "id": dataset["id"],
                "kind": dataset["kind"],
                "format": dataset.get("format"),
                "path": dataset.get("assetPath") or dataset.get("url"),
                "sha256": (dataset.get("sha256") or "")[:16],
            }
        )
    mo.vstack([
        mo.md("## Extract: fontes declaradas e rastreáveis"),
        mo.ui.table(pd.DataFrame(manifest_rows)),
    ])
    return


@app.cell
def _(dimensions_df, mo, notes_df):
    mo.vstack([
        mo.md(
            "## Transform: tabelas derivadas do snapshot\n\n"
            "A transformação abaixo converte JSON aninhado em tabelas pequenas. "
            "Cada regra está no notebook e pode ser revisada pela pessoa dona do vault."
        ),
        mo.ui.table(dimensions_df),
        mo.ui.table(notes_df),
    ])
    return


@app.cell
def _(
    mo,
    notes_df,
    run_tabular_snapshot,
    runtime_context,
    write_local_dataframe_snapshot,
):
    if run_tabular_snapshot.value and runtime_context["isLocal"]:
        _result = write_local_dataframe_snapshot(
            notes_df,
            ".dgk/perfil-do-vault.largest-notes.csv",
        )
        _message = (
            f"Tabela local escrita em `{_result['relativePath']}` "
            f"({_result['bytes']} bytes)."
        )
    elif run_tabular_snapshot.value:
        _message = "Carga tabular bloqueada: o HTML publicado não escreve arquivos."
    else:
        _message = "Carga tabular local não executada nesta sessão."

    mo.md(_message)
    return


@app.cell
def _(export_csv, export_json, mo, snapshot_hash):
    mo.md(
        "## Load: artefatos portáveis\n\n"
        f"Fingerprint SHA-256 do snapshot bruto: `{snapshot_hash}`\n\n"
        "O resultado transformado pode ser salvo como JSON/CSV pelo pipeline local "
        "ou copiado daqui durante uma exploração manual.\n\n"
        "### Prévia CSV\n\n"
        f"```csv\n{export_csv[:1200]}\n```\n\n"
        "### Prévia JSON\n\n"
        f"```json\n{export_json[:1200]}\n```"
    )
    return


@app.cell
def _(mo, runtime_sources):
    load_remote = mo.ui.checkbox(
        label="Carregar exemplo remoto no navegador",
        value=False,
    )
    mo.vstack([
        mo.md(
            "## Fonte remota opcional\n\n"
            "O notebook publicado também pode buscar JSON remoto em runtime, desde que "
            "a fonte aceite CORS e o visitante tenha rede. Essa etapa é opt-in para "
            "não vazar intenção de análise nem depender de terceiros por padrão."
        ),
        load_remote,
    ])
    return load_remote


@app.cell
def _(load_remote, mo, read_lab_json, runtime_sources):
    if not runtime_sources:
        message = "Nenhuma fonte remota declarada no manifesto."
    elif not load_remote.value:
        message = "A fonte remota está declarada, mas não foi carregada."
    else:
        remote = runtime_sources[0]
        data = read_lab_json(remote["url"])
        message = (
            f"Fonte carregada: **{remote['title']}**\n\n"
            f"Chaves retornadas: `{', '.join(sorted(data.keys())[:12])}`"
        )
    mo.md(message)
    return


@app.cell
def _(get_local_secret, mo, runtime_context):
    if not runtime_context["isLocal"]:
        github_result = mo.vstack([
            mo.md("## API com credencial local (GitHub)"),
            mo.callout(
                mo.md(
                    "Execute localmente com `GITHUB_TOKEN` no ambiente para consultar a API do GitHub "
                    "sem expor o token no HTML publicado."
                ),
                kind="info",
            ),
        ])
    else:
        import json as _json
        from urllib.request import Request as _Req, urlopen as _urlopen

        _token = get_local_secret("GITHUB_TOKEN")
        if not _token:
            github_result = mo.vstack([
                mo.md("## API com credencial local (GitHub)"),
                mo.callout(
                    mo.md(
                        "`GITHUB_TOKEN` não encontrado no ambiente. "
                        "Defina a variável antes de abrir o notebook para ativar esta célula:\n\n"
                        "```sh\nexport GITHUB_TOKEN=ghp_...\nuv run marimo edit etl-demo.py\n```"
                    ),
                    kind="warn",
                ),
            ])
        else:
            try:
                _req = _Req(
                    "https://api.github.com/repos/aretw0/vault-seed",
                    headers={
                        "Authorization": f"Bearer {_token}",
                        "Accept": "application/vnd.github+json",
                        "X-GitHub-Api-Version": "2022-11-28",
                    },
                )
                with _urlopen(_req, timeout=10) as _resp:
                    _repo = _json.loads(_resp.read())
                github_result = mo.vstack([
                    mo.md("## API com credencial local (GitHub)"),
                    mo.md(
                        f"Repositório: **{_repo.get('full_name')}**\n\n"
                        f"- stars: {_repo.get('stargazers_count', 0)}\n"
                        f"- forks: {_repo.get('forks_count', 0)}\n"
                        f"- issues abertas: {_repo.get('open_issues_count', 0)}\n"
                        f"- última atualização: `{_repo.get('updated_at', '—')[:10]}`\n\n"
                        "O token foi lido via `get_local_secret('GITHUB_TOKEN')` e nunca foi "
                        "serializado no notebook nem no HTML publicado."
                    ),
                ])
            except Exception as _exc:
                github_result = mo.vstack([
                    mo.md("## API com credencial local (GitHub)"),
                    mo.callout(mo.md(f"Erro ao consultar a API: {_exc}"), kind="warn"),
                ])

    github_result
    return


@app.cell
def _(mo):
    mo.md(
        "## Ciclo ETL no CI\n\n"
        "O workflow `refresh-lab-data.yml` repete este ciclo diariamente:\n\n"
        "1. **Extract** — `pnpm run notebooks:etl` lê as notas do vault e as fontes externas\n"
        "2. **Transform** — scripts em `scripts/` normalizam e enriquecem os dados\n"
        "3. **Load** — os arquivos em `.dgk/` são commitados com `[skip ci]` "
        "para não disparar novamente o workflow de deploy\n\n"
        "O notebook é a interface humana para o mesmo ciclo. "
        "O CI é a automação sem interface. "
        "Os datasets em `.dgk/` são o ponto de encontro entre os dois."
    )
    return


if __name__ == "__main__":
    app.run()
