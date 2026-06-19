import marimo

__generated_with = "0.23.8"
app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo

    return mo


@app.cell
def _():
    import sys
    from pathlib import Path

    _notebooks_dir = Path(__file__).resolve().parents[1]
    if str(_notebooks_dir) not in sys.path:
        sys.path.insert(0, str(_notebooks_dir))

    from _lab_notebook_runtime import (
        clean_lab_text,
        extract_local_image_text,
        fetch_local_url_text,
        get_local_secret,
        lab_runtime_context,
        read_local_text_file,
        with_data_provenance,
        write_local_json_snapshot,
    )

    collect_context = lab_runtime_context()
    return (
        clean_lab_text,
        collect_context,
        extract_local_image_text,
        fetch_local_url_text,
        get_local_secret,
        read_local_text_file,
        with_data_provenance,
        write_local_json_snapshot,
    )


@app.cell
def _(collect_context, mo):
    local_status = "local" if collect_context["isLocal"] else "HTML publicado"
    mo.md(
        f"# Starter: coleta local para o Lab\n\n"
        f"Modo atual: **{local_status}**. Use este notebook como cópia inicial "
        f"quando quiser coletar dados antes de publicar um snapshot no Lab.\n\n"
        f"A regra é simples: scraping, OCR, arquivos privados e segredos rodam "
        f"apenas localmente; o site publicado consome JSON/CSV/Parquet já "
        f"preparado."
    )
    return


@app.cell
def _(mo):
    source_url = mo.ui.text(label="URL para coleta HTTP simples", value="https://example.com")
    run_url_extract = mo.ui.checkbox(label="Coletar URL agora", value=False)
    image_path = mo.ui.text(label="Imagem local para OCR", value="")
    run_ocr_extract = mo.ui.checkbox(label="Executar OCR agora", value=False)
    output_path = mo.ui.text(
        label="Snapshot JSON de saída",
        value=".dgk/minha-coleta-local.json",
    )
    token_name = mo.ui.text(label="Nome de segredo opcional", value="LAB_DEMO_TOKEN")
    mo.vstack([source_url, run_url_extract, image_path, run_ocr_extract, output_path, token_name])
    return image_path, output_path, run_ocr_extract, run_url_extract, source_url, token_name


@app.cell
def _(
    collect_context,
    extract_local_image_text,
    fetch_local_url_text,
    get_local_secret,
    image_path,
    run_ocr_extract,
    run_url_extract,
    source_url,
    token_name,
):
    raw_extracts = []
    secret_available = False

    if collect_context["isLocal"]:
        secret_available = bool(get_local_secret(token_name.value, default=None))

    if run_url_extract.value and collect_context["isLocal"]:
        page = fetch_local_url_text(source_url.value)
        raw_extracts.append(
            {
                "kind": "web-page",
                "source": page["url"],
                "title": page.get("title"),
                "text": page["text"],
            }
        )

    if run_ocr_extract.value and image_path.value.strip() and collect_context["isLocal"]:
        text = extract_local_image_text(image_path.value.strip())
        raw_extracts.append(
            {
                "kind": "ocr-image",
                "source": image_path.value.strip(),
                "text": text,
            }
        )

    return raw_extracts, secret_available


@app.cell
def _(clean_lab_text, raw_extracts, with_data_provenance):
    normalized_records = []
    for item in raw_extracts:
        normalized_records.append(
            {
                "kind": item["kind"],
                "source": item["source"],
                "title": clean_lab_text(item.get("title")),
                "text": clean_lab_text(item.get("text")),
            }
        )

    snapshot_payload = with_data_provenance(
        {
            "recordCount": len(normalized_records),
            "records": normalized_records,
        },
        source="Notebooks/starters/coleta-local.py",
        license="verificar",
        privacy="private-until-published",
    )
    return normalized_records, snapshot_payload


@app.cell
def _(mo):
    save_snapshot = mo.ui.checkbox(label="Gravar snapshot JSON local", value=False)
    save_snapshot
    return save_snapshot,


@app.cell
def _(
    collect_context,
    mo,
    output_path,
    save_snapshot,
    snapshot_payload,
    write_local_json_snapshot,
):
    if save_snapshot.value and collect_context["isLocal"]:
        write_result = write_local_json_snapshot(output_path.value, snapshot_payload)
        message = f"Snapshot escrito em `{write_result['relativePath']}`."
    elif save_snapshot.value:
        message = "Gravação bloqueada no HTML publicado. Rode localmente antes do export."
    else:
        message = "Snapshot ainda não gravado."

    mo.md(message)
    return


@app.cell
def _(mo, normalized_records, secret_available, snapshot_payload):
    mo.md(
        "## Resultado\n\n"
        f"- registros coletados: **{len(normalized_records)}**\n"
        f"- segredo opcional presente: **{secret_available}**\n"
        f"- fingerprint: `{snapshot_payload['sha256']}`\n\n"
        "Depois de gravar o snapshot, declare o arquivo em `.site/lab.datasets.json` "
        "e rode `pnpm run notebooks:etl` para empacotar o dado no Lab."
    )
    return


if __name__ == "__main__":
    app.run()
