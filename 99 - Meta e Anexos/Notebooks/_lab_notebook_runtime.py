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
    return {
        "runtime": "pyodide" if packaged else "local",
        "isPackaged": packaged,
        "isLocal": not packaged,
        "canRunLocalEtl": not packaged,
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
