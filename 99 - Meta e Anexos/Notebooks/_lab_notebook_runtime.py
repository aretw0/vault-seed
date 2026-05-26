def is_pyodide_runtime() -> bool:
    """Detecta se o notebook está rodando empacotado no Pyodide/WASM."""
    try:
        import pyodide  # type: ignore  # noqa: F401
    except ImportError:
        return False
    return True


def lab_runtime_context(notebooks_path: str = "lab"):
    """Descreve o modo atual do notebook para células com fallback local."""
    import os as _os

    packaged = is_pyodide_runtime()
    resolved_notebooks_path = _os.environ.get("VAULT_NOTEBOOKS_PATH", notebooks_path)
    local_capabilities = {
        "filesystem": not packaged,
        "secrets": not packaged,
        "subprocess": not packaged,
        "headlessBrowser": not packaged,
        "ocr": not packaged,
        "binaryFormats": not packaged,
    }
    return {
        "runtime": "pyodide" if packaged else "local",
        "isPackaged": packaged,
        "isLocal": not packaged,
        "canRunLocalEtl": not packaged,
        "capabilities": local_capabilities,
        "notebooksPath": resolved_notebooks_path,
        "cwd": "" if packaged else _os.getcwd(),
    }


def require_local_runtime(operation: str = "esta operação"):
    """Bloqueia operações que não devem rodar no HTML empacotado."""
    context = lab_runtime_context()
    if not context["isLocal"]:
        raise RuntimeError(
            f"{operation} só pode rodar no modo local do notebook, antes do export."
        )
    return context


def normalize_dataset_path(path_or_url: str) -> str:
    """Normaliza caminhos de ativos do Lab para um formato canônico.

    - remove barras iniciais e prefixo ./
    - converte barras do Windows para barras Unix
    - remove prefixos duplicados de `assets/`
    """

    if path_or_url.startswith(("http://", "https://")):
        return path_or_url

    value = path_or_url.replace("\\", "/").strip()
    value = value.removeprefix("./").removeprefix("/")
    while value.startswith("assets/"):
        value = value.removeprefix("assets/")
    return value


def dataset_candidate_paths(path_or_url: str):
    normalized = normalize_dataset_path(path_or_url)
    if normalized.startswith(("http://", "https://")):
        return [normalized]

    candidates = []
    if normalized:
        candidates.append(normalized)
        if not normalized.startswith("assets/"):
            candidates.append(f"assets/{normalized}")
    return candidates


def _read_lab_json_runtime(candidates):
    import json as _json

    from pyodide.http import open_url  # type: ignore

    last_error = None
    for candidate in candidates:
        try:
            return _json.loads(open_url(candidate).read())
        except Exception as exc:
            last_error = exc
            continue

    if last_error:
        raise RuntimeError(
            "Não foi possível carregar o recurso de datasets."
        ) from last_error
    raise RuntimeError("Não foi possível carregar o recurso de datasets.")


def _read_lab_json_local(candidates, notebooks_path: str):
    import json as _json
    import os as _os

    _notebooks_path = _os.environ.get("VAULT_NOTEBOOKS_PATH", notebooks_path)
    last_error = None
    for candidate in candidates:
        candidate_path = _os.path.join(_os.getcwd(), "public", _notebooks_path, candidate)
        try:
            with open(candidate_path, encoding="utf-8") as f:
                return _json.load(f)
        except Exception as exc:
            last_error = exc
            continue

    if last_error:
        raise last_error
    raise RuntimeError("Não foi possível carregar o recurso de datasets.")


def read_lab_json(path_or_url: str, notebooks_path: str = "lab"):
    """Carrega JSON de dataset em ambiente Pyodide ou execução local.

    Em Pyodide usa `open_url` para buscar URLs relativas ao diretório do site;
    em execução local (CI/`uv`) cai para `public/<VAULT_NOTEBOOKS_PATH>/...`.
    """

    normalized = normalize_dataset_path(path_or_url)
    if not normalized:
        raise RuntimeError("Não foi possível carregar o recurso de datasets.")

    if normalized.startswith(("http://", "https://")):
        import json as _json
        from urllib.request import urlopen

        return _json.loads(urlopen(normalized, timeout=15).read())

    candidates = dataset_candidate_paths(normalized)
    try:
        return _read_lab_json_runtime(candidates)
    except Exception:
        pass

    return _read_lab_json_local(candidates, notebooks_path)


def load_lab_manifest(notebooks_path: str = "lab"):
    """Carrega o manifesto de datasets do Lab."""
    return read_lab_json("datasets/manifest.json", notebooks_path)


def get_lab_dataset(dataset_id: str, manifest=None, notebooks_path: str = "lab"):
    """Busca uma entrada do manifesto por id."""
    manifest = manifest or load_lab_manifest(notebooks_path)
    for dataset in manifest.get("datasets", []):
        if dataset.get("id") == dataset_id:
            return dataset
    raise KeyError(f"Dataset não declarado no manifesto do Lab: {dataset_id}")


def read_lab_dataset(dataset_or_id, manifest=None, notebooks_path: str = "lab"):
    """Lê um dataset declarado no manifesto, localmente ou no HTML publicado."""
    dataset = (
        get_lab_dataset(dataset_or_id, manifest, notebooks_path)
        if isinstance(dataset_or_id, str)
        else dataset_or_id
    )
    location = dataset.get("assetPath") or dataset.get("path") or dataset.get("url")
    if not location:
        raise RuntimeError(
            f"Dataset {dataset.get('id', '<sem id>')} não possui assetPath, path ou url."
        )
    return read_lab_json(location, notebooks_path)


def _safe_relative_path(relative_path: str) -> str:
    import os as _os

    value = str(relative_path or "").replace("\\", "/").strip().lstrip("/")
    normalized = _os.path.normpath(value).replace("\\", "/")
    if not value or normalized == "." or normalized.startswith("../") or normalized == "..":
        raise RuntimeError("Caminho de snapshot local inválido.")
    return normalized


def local_vault_path(relative_path: str):
    """Resolve um caminho seguro dentro do repositório local do vault."""
    import os as _os

    context = require_local_runtime("resolver caminho local do vault")
    normalized = _safe_relative_path(relative_path)
    root = _os.path.abspath(context["cwd"])
    target = _os.path.abspath(_os.path.join(root, normalized))
    if _os.path.commonpath([root, target]) != root:
        raise RuntimeError("Caminho de snapshot local sai do vault.")
    return target


def _local_write_result(relative_path: str, target: str):
    import os as _os

    return {
        "path": target,
        "relativePath": _safe_relative_path(relative_path),
        "bytes": _os.path.getsize(target),
    }


def write_local_json_snapshot(relative_path: str, payload, *, indent: int = 2):
    """Escreve um snapshot JSON versionável no vault local.

    Use para etapas de Extract que precisam de filesystem, binários, navegador,
    rede autenticada ou outros recursos indisponíveis no HTML/WASM publicado.
    """
    import json as _json
    import os as _os

    target = local_vault_path(relative_path)
    _os.makedirs(_os.path.dirname(target), exist_ok=True)
    with open(target, "w", encoding="utf-8") as f:
        _json.dump(payload, f, ensure_ascii=False, indent=indent)
        f.write("\n")
    return _local_write_result(relative_path, target)


def write_local_dataframe_snapshot(dataframe, relative_path: str, *, format: str = None):
    """Escreve DataFrame local como CSV, JSON ou Parquet.

    Parquet é opcional: só funciona quando `pyarrow` ou engine compatível estiver
    instalado no ambiente local. O HTML publicado deve consumir snapshots já
    gerados, não tentar escrever arquivos.
    """
    import os as _os

    target = local_vault_path(relative_path)
    _os.makedirs(_os.path.dirname(target), exist_ok=True)
    resolved_format = (format or _os.path.splitext(target)[1].lstrip(".")).lower()

    if resolved_format == "csv":
        dataframe.to_csv(target, index=False)
    elif resolved_format == "json":
        dataframe.to_json(target, orient="records", force_ascii=False, indent=2)
        with open(target, "a", encoding="utf-8") as f:
            f.write("\n")
    elif resolved_format == "parquet":
        dataframe.to_parquet(target, index=False)
    else:
        raise RuntimeError("Formato de snapshot tabular suportado: csv, json ou parquet.")

    return _local_write_result(relative_path, target)


def get_local_secret(name: str, default=None, *, required: bool = False):
    """Lê segredo do ambiente local sem expor credenciais no HTML publicado."""
    import os as _os

    require_local_runtime(f"ler segredo local {name}")
    value = _os.environ.get(name, default)
    if required and not value:
        raise RuntimeError(f"Segredo local ausente: {name}")
    return value


def clean_lab_text(text, *, lower: bool = False) -> str:
    """Normaliza texto bruto vindo de scraping, OCR, arquivos ou APIs."""
    import re as _re

    cleaned = _re.sub(r"[\n\x0c\r]+", " ", str(text or ""))
    cleaned = _re.sub(r"\s+", " ", cleaned).strip()
    return cleaned.lower() if lower else cleaned


def fingerprint_data(payload) -> str:
    """Calcula fingerprint SHA-256 estável para payloads JSON-serializáveis."""
    import hashlib as _hashlib
    import json as _json

    encoded = _json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")
    return _hashlib.sha256(encoded).hexdigest()


def read_local_text_file(relative_path: str, *, encoding: str = "utf-8"):
    """Lê arquivo de texto local dentro do vault."""
    with open(local_vault_path(relative_path), encoding=encoding) as f:
        return f.read()


def read_local_bytes_file(relative_path: str):
    """Lê arquivo binário local dentro do vault."""
    with open(local_vault_path(relative_path), "rb") as f:
        return f.read()


def fetch_local_url_text(url: str, *, timeout: int = 20, user_agent: str = "vault-seed-lab/1.0"):
    """Extrai HTML/texto de uma URL no ambiente local usando biblioteca padrão."""
    import re as _re
    from html.parser import HTMLParser as _HTMLParser
    from urllib.request import Request as _Request
    from urllib.request import urlopen as _urlopen

    require_local_runtime("extrair página web localmente")

    class _TextParser(_HTMLParser):
        def __init__(self):
            super().__init__()
            self._title = []
            self._chunks = []
            self._in_title = False
            self._ignored = 0

        def handle_starttag(self, tag, attrs):
            if tag in {"script", "style", "noscript"}:
                self._ignored += 1
            if tag == "title":
                self._in_title = True

        def handle_endtag(self, tag):
            if tag in {"script", "style", "noscript"} and self._ignored:
                self._ignored -= 1
            if tag == "title":
                self._in_title = False

        def handle_data(self, data):
            if self._ignored:
                return
            if self._in_title:
                self._title.append(data)
            self._chunks.append(data)

    request = _Request(url, headers={"User-Agent": user_agent})
    with _urlopen(request, timeout=timeout) as response:
        html = response.read().decode(response.headers.get_content_charset() or "utf-8", "replace")

    parser = _TextParser()
    parser.feed(html)
    text = clean_lab_text(" ".join(parser._chunks))
    return {
        "url": url,
        "title": clean_lab_text(" ".join(parser._title)) or None,
        "text": text,
        "textPreview": text[:500],
        "links": _re.findall(r"href=[\"']([^\"']+)", html)[:50],
    }


async def scrape_local_page_text(url: str, *, wait_until: str = "networkidle"):
    """Extrai página dinâmica localmente com Playwright, quando instalado."""
    require_local_runtime("extrair página dinâmica com Playwright")
    try:
        from playwright.async_api import async_playwright as _async_playwright
    except ImportError as exc:
        raise RuntimeError(
            "Playwright não está instalado. Instale apenas no ambiente local quando precisar de scraping dinâmico."
        ) from exc

    async with _async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto(url, wait_until=wait_until)
        title = await page.title()
        text = await page.inner_text("body")
        await browser.close()

    cleaned = clean_lab_text(text)
    return {"url": url, "title": title, "text": cleaned, "textPreview": cleaned[:500]}


def extract_local_image_text(image_input, *, languages: str = "por+eng"):
    """Executa OCR local em caminho, bytes, objeto PIL ou URL de imagem."""
    from io import BytesIO as _BytesIO
    from urllib.request import urlopen as _urlopen

    require_local_runtime("executar OCR local")
    try:
        import pytesseract as _pytesseract
        from PIL import Image as _Image
    except ImportError as exc:
        raise RuntimeError(
            "OCR local requer pillow e pytesseract instalados, além do binário tesseract."
        ) from exc

    if isinstance(image_input, str) and image_input.startswith(("http://", "https://")):
        with _urlopen(image_input, timeout=20) as response:
            image = _Image.open(_BytesIO(response.read()))
    elif isinstance(image_input, str):
        image = _Image.open(local_vault_path(image_input))
    elif isinstance(image_input, bytes):
        image = _Image.open(_BytesIO(image_input))
    else:
        image = image_input

    return clean_lab_text(_pytesseract.image_to_string(image, lang=languages))
