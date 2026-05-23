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
    def normalize_path(path_or_url):
        if path_or_url.startswith(("http://", "https://")):
            return path_or_url

        value = path_or_url.replace("\\", "/").strip()
        value = value.removeprefix("./").removeprefix("/")
        while value.startswith("assets/"):
            value = value.removeprefix("assets/")
        return value

    def candidate_paths(path_or_url):
        normalized = normalize_path(path_or_url)
        if normalized.startswith(("http://", "https://")):
            return [normalized]

        candidates = []
        if normalized:
            candidates.append(normalized)
            if not normalized.startswith("assets/"):
                candidates.append(f"assets/{normalized}")

        return candidates

    try:
        from pyodide.http import open_url  # type: ignore

        def read_json(path_or_url):
            last_error = None
            for candidate in candidate_paths(path_or_url):
                try:
                    return json.loads(open_url(candidate).read())
                except Exception as exc:
                    last_error = exc
                    continue
            if last_error:
                raise last_error
            raise RuntimeError("Não foi possível carregar o recurso de datasets.")

        manifest = None
        for path in candidate_paths("datasets/manifest.json"):
            try:
                manifest = read_json(path)
                break
            except Exception:
                manifest = None

        if manifest is None:
            raise RuntimeError(
                "Não foi possível carregar o manifest de datasets."
            ) from None
    except ImportError:
        from urllib.request import urlopen

        def read_json(path_or_url):
            if path_or_url.startswith("http"):
                return json.loads(urlopen(path_or_url, timeout=15).read())

            _notebooks_path = os.environ.get("VAULT_NOTEBOOKS_PATH", "lab")
            last_error = None
            for candidate in candidate_paths(path_or_url):
                _path = os.path.join(os.getcwd(), "public", _notebooks_path, candidate)
                try:
                    with open(_path, encoding="utf-8") as _f:
                        return json.load(_f)
                except Exception as exc:
                    last_error = exc
                    continue
            if last_error:
                raise last_error
            raise RuntimeError("Não foi possível carregar o recurso de datasets.")

        manifest = None
        for path in candidate_paths("datasets/manifest.json"):
            try:
                manifest = read_json(path)
                break
            except Exception:
                manifest = None

        if manifest is None:
            raise RuntimeError(
                "Não foi possível carregar o manifest de datasets."
            ) from None

    datasets = {dataset["id"]: dataset for dataset in manifest["datasets"]}
    snapshot = read_json(normalize_path(datasets["perfil-do-vault"]["assetPath"]))
    runtime_sources = [
        dataset for dataset in manifest["datasets"] if dataset["kind"] == "runtime"
    ]
    return datasets, manifest, read_json, runtime_sources, snapshot


@app.cell
def _(manifest, mo, snapshot):
    mo.md(
        f"# ETL para o Lab\n\n"
        f"Este notebook lê um snapshot gerado antes do export e empacotado junto com o Lab.\n\n"
        f"- datasets no manifesto: **{manifest['datasetCount']}**\n"
        f"- notas no snapshot local: **{snapshot['noteCount']}**\n"
        f"- palavras estimadas: **{snapshot['totalWords']}**\n"
        f"- média por nota: **{snapshot['averageWords']}**"
    )
    return


@app.cell
def _(mo, snapshot):
    import pandas as pd

    folders = pd.DataFrame(snapshot["folders"])
    mo.md("## Snapshot empacotado")
    mo.ui.table(folders)
    return pd


@app.cell
def _(mo, pd, snapshot):
    tags = pd.DataFrame(snapshot["tags"])
    mo.md("## Tags mais frequentes")
    mo.ui.table(tags)
    return


@app.cell
def _(mo, pd, snapshot):
    largest = pd.DataFrame(snapshot["largestNotes"])
    mo.md("## Maiores notas por contagem aproximada de palavras")
    mo.ui.table(largest[["title", "folder", "status", "words"]])
    return


@app.cell
def _(mo, runtime_sources):
    load_remote = mo.ui.checkbox(
        label="Carregar exemplo remoto no navegador",
        value=False,
    )
    mo.md(
        "## Fonte remota opcional\n\n"
        "O notebook publicado também pode buscar JSON remoto em runtime, desde que a fonte aceite CORS e o visitante tenha rede."
    )
    return load_remote


@app.cell
def _(load_remote, mo, read_json, runtime_sources):
    if not runtime_sources:
        message = "Nenhuma fonte remota declarada no manifesto."
    elif not load_remote.value:
        message = "A fonte remota está declarada, mas não foi carregada."
    else:
        remote = runtime_sources[0]
        data = read_json(remote["url"])
        message = (
            f"Fonte carregada: **{remote['title']}**\n\n"
            f"Chaves retornadas: `{', '.join(sorted(data.keys())[:12])}`"
        )
    mo.md(message)
    return


if __name__ == "__main__":
    app.run()
