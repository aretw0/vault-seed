#!/usr/bin/env python3
"""Diagnóstico opcional da bancada local de coleta do Lab.

O objetivo é orientar a pessoa usuária antes de rodar scraping, OCR ou geração
local de snapshots. O HTML publicado do Marimo não depende dessas ferramentas.
"""

from __future__ import annotations

import argparse
import importlib.util
import shutil
import subprocess
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


MODULES = {
    "marimo": "notebooks Marimo",
    "pandas": "transformação tabular",
    "playwright": "scraping com navegador real",
    "PIL": "leitura de imagens para OCR",
    "pytesseract": "ponte Python para OCR",
    "pyarrow": "snapshots Parquet opcionais",
    "requests": "coleta HTTP simples",
}


def module_available(name: str) -> bool:
    return importlib.util.find_spec(name) is not None


def tesseract_version() -> str | None:
    binary = shutil.which("tesseract")
    if not binary:
        return None
    try:
        result = subprocess.run(
            [binary, "--version"],
            check=False,
            capture_output=True,
            text=True,
            timeout=10,
        )
    except Exception:
        return binary
    first_line = (result.stdout or result.stderr).splitlines()[0:1]
    return first_line[0] if first_line else binary


def playwright_browser_status() -> tuple[bool, str]:
    if not module_available("playwright"):
        return False, "pacote Python ausente"
    try:
        from playwright.sync_api import sync_playwright

        with sync_playwright() as p:
            executable = Path(p.chromium.executable_path)
            if executable.exists():
                return True, str(executable)
            return False, str(executable)
    except Exception as exc:
        return False, str(exc)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--strict",
        action="store_true",
        help="retorna código 1 quando alguma capacidade local opcional estiver ausente",
    )
    args = parser.parse_args()

    missing = []
    print("Lab local extract tools")
    print("=======================")
    for module, purpose in MODULES.items():
        ok = module_available(module)
        status = "OK" if ok else "ausente"
        print(f"[{status}] {module} — {purpose}")
        if not ok:
            missing.append(module)

    browser_ok, browser_detail = playwright_browser_status()
    print(
        f"[{'OK' if browser_ok else 'atenção'}] chromium Playwright — {browser_detail}"
    )
    if not browser_ok:
        missing.append("playwright chromium")

    version = tesseract_version()
    print(
        f"[{'OK' if version else 'atenção'}] tesseract binário — {version or 'não encontrado no PATH'}"
    )
    if not version:
        missing.append("tesseract")

    print()
    if missing:
        print("Capacidades ausentes ou incompletas:")
        for item in missing:
            print(f"- {item}")
        print()
        print("Próximos passos úteis:")
        print("- pnpm run notebooks:extract:browser")
        print("- instalar o binário tesseract no sistema quando precisar de OCR")
        print("- rodar este diagnóstico novamente com pnpm run notebooks:extract:check")
    else:
        print("Todas as capacidades opcionais de coleta local parecem disponíveis.")

    return 1 if args.strict and missing else 0


if __name__ == "__main__":
    raise SystemExit(main())
