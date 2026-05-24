import marimo

__generated_with = "0.23.8"
app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo

    return mo


@app.cell
def _():
    from _lab_notebook_runtime import lab_runtime_context, load_lab_manifest, read_lab_json

    runtime_context = lab_runtime_context()
    manifest = load_lab_manifest()

    datasets = {dataset["id"]: dataset for dataset in manifest["datasets"]}
    snapshot = read_lab_json(datasets["perfil-do-vault"]["assetPath"])
    runtime_sources = [
        dataset for dataset in manifest["datasets"] if dataset["kind"] == "runtime"
    ]
    return manifest, read_lab_json, runtime_context, runtime_sources, snapshot


@app.cell
def _(manifest, mo, runtime_context, snapshot):
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
        f"- média por nota: **{snapshot['averageWords']}**"
    )
    return


@app.cell
def _():
    import hashlib
    import json
    import re

    class DataTransformer:
        """Transformações pequenas, auditáveis e compatíveis com Pyodide."""

        def clean_text(self, text):
            text = str(text or "")
            text = re.sub(r"\s+", " ", text).strip()
            return text

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
            payload = json.dumps(data, ensure_ascii=False, sort_keys=True).encode(
                "utf-8"
            )
            return hashlib.sha256(payload).hexdigest()

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
    mo.md(
        "## Curadoria ETL em uma única interface\n\n"
        f"Operações locais agora estão **{local_status}**. O ponto é evitar drift: "
        "o notebook continua sendo a bancada de trabalho, mas células que exigem "
        "capacidades não empacotáveis ficam protegidas por `require_local_runtime`."
    )
    mo.ui.table(capabilities)
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
    mo.md("## Extract: fontes declaradas e rastreáveis")
    mo.ui.table(pd.DataFrame(manifest_rows))
    return


@app.cell
def _(dimensions_df, mo, notes_df):
    mo.md(
        "## Transform: tabelas derivadas do snapshot\n\n"
        "A transformação abaixo converte JSON aninhado em tabelas pequenas. "
        "Cada regra está no notebook e pode ser revisada pela pessoa dona do vault."
    )
    mo.ui.table(dimensions_df)
    mo.ui.table(notes_df)
    return


@app.cell
def _(export_csv, export_json, mo, snapshot_hash):
    mo.md(
        "## Load: artefatos portáveis\n\n"
        f"Fingerprint SHA-256 do snapshot bruto: `{snapshot_hash}`\n\n"
        "O resultado transformado pode ser salvo como JSON/CSV pelo pipeline local "
        "ou copiado daqui durante uma exploração manual."
    )
    mo.md(
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
    mo.md(
        "## Fonte remota opcional\n\n"
        "O notebook publicado também pode buscar JSON remoto em runtime, desde que "
        "a fonte aceite CORS e o visitante tenha rede. Essa etapa é opt-in para "
        "não vazar intenção de análise nem depender de terceiros por padrão."
    )
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


if __name__ == "__main__":
    app.run()
