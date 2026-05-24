import json
import os


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
    from pyodide.http import open_url  # type: ignore

    last_error = None
    for candidate in candidates:
        try:
            return json.loads(open_url(candidate).read())
        except Exception as exc:
            last_error = exc
            continue

    if last_error:
        raise RuntimeError(
            "Não foi possível carregar o recurso de datasets."
        ) from last_error
    raise RuntimeError("Não foi possível carregar o recurso de datasets.")


def _read_lab_json_local(candidates, notebooks_path: str):
    _notebooks_path = os.environ.get("VAULT_NOTEBOOKS_PATH", notebooks_path)
    last_error = None
    for candidate in candidates:
        candidate_path = os.path.join(os.getcwd(), "public", _notebooks_path, candidate)
        try:
            with open(candidate_path, encoding="utf-8") as f:
                return json.load(f)
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
        from urllib.request import urlopen

        return json.loads(urlopen(normalized, timeout=15).read())

    candidates = dataset_candidate_paths(normalized)
    try:
        return _read_lab_json_runtime(candidates)
    except Exception:
        pass

    return _read_lab_json_local(candidates, notebooks_path)


def load_lab_manifest(notebooks_path: str = "lab"):
    """Carrega o manifesto de datasets do Lab."""
    return read_lab_json("datasets/manifest.json", notebooks_path)
