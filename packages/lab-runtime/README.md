# dgk-lab-runtime

Lab notebook runtime utilities from the [Digital Gardening Kit](https://github.com/aretw0/vault-seed).

Designed for Marimo notebooks that live alongside an Obsidian vault — handles the runtime boundary between local ETL (filesystem, secrets, network) and the published HTML/WASM notebook. Works with any vault layout; the defaults follow the `vault-seed` conventions (`lab/` as the notebooks path, `public/lab/` as the dataset directory) which you can override via environment variables or function arguments.

## Install

```bash
pip install dgk-lab-runtime
# with scraping support (Playwright)
pip install "dgk-lab-runtime[scraping]"
# with OCR support (Tesseract)
pip install "dgk-lab-runtime[ocr]"
```

## Usage

```python
from dgk_lab_runtime import (
    lab_runtime_context,
    read_lab_json,
    load_lab_manifest,
    read_lab_dataset,
    write_local_json_snapshot,
    lab_altair_chart,
    lab_altair_status_color,
    fetch_wasm_feed,
    fetch_wasm_json,
    fetch_local_feed,
    fingerprint_data,
    with_data_provenance,
)

ctx = lab_runtime_context()
# {"runtime": "local", "isPackaged": False, "capabilities": {...}, ...}

# Read a dataset from the Lab manifest (local or Pyodide/WASM)
data = read_lab_dataset("my-dataset")

# Write a local JSON snapshot for the ETL/export boundary
write_local_json_snapshot(".dgk/my-dataset.json", data)

# Keep charts aligned with the Lab shell instead of Vega defaults
chart = lab_altair_chart(chart.encode(color=lab_altair_status_color("status:N")))
```

## Configuration

| Environment variable | Default | Description |
|---|---|---|
| `VAULT_NOTEBOOKS_PATH` | `lab` | URL segment where notebooks are published |

## Runtime boundary

Every function that writes files, reads secrets, or makes local outbound requests calls `require_local_runtime()` and raises `RuntimeError` when running inside a packaged HTML/WASM notebook. Browser-safe helpers such as `fetch_wasm_json()` and `fetch_wasm_feed()` use Pyodide's `pyfetch` with `cache="no-store"`. This boundary is intentional: ETL logic runs locally before export; the published notebook only reads pre-generated snapshots or public CORS-friendly endpoints.

## Vault-seed compatibility

If you use [vault-seed](https://github.com/aretw0/vault-seed), the `_lab_notebook_runtime.py` shim in `99 - Meta e Anexos/Notebooks/` imports this package transparently when installed, so existing notebooks work unchanged. Without installation the shim uses an inline fallback — same API, no external dependency.

## License

GPL-3.0-only — see [LICENSE.md](../../LICENSE.md) in the repository root.
