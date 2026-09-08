#!/usr/bin/env python3
"""Leitura protegida de PDF, extraída de inspect_pdf.py.

inspect_pdf.py e parse_pluxee_statement.py implementavam, cada um por si,
a mesma leitura protegida de PDF: limites de tamanho e de páginas, recusa de
symlink, timeout e setrlimit no processo filho do poppler. Este módulo
concentra essas proteções para que novos extratores as consumam sem
duplicá-las de novo.

`ler_pdf` é o ponto de entrada normal: lê o caminho com todas as proteções,
roda o pdfinfo uma única vez e devolve um `PdfLido` com o conteúdo, o
SHA-256, a contagem de páginas já validada contra `max_pages` e o texto cru
do pdfinfo (para quem também precisa de campos como "Encrypted" ou
"PDF version"). Não há cache: os bytes do conteúdo não persistem além do
escopo de quem os pediu. `pdfinfo_bruto` continua exportada, pura e sem
estado, para quem já tem o conteúdo em mãos e só quer os metadados do
pdfinfo sem passar pelas checagens de caminho de `ler_pdf`.
"""

from __future__ import annotations

import hashlib
import re
import resource
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

TOOL_TIMEOUT_SECONDS = 20
MAX_PDFINFO_BYTES = 1024 * 1024
MAX_TEXT_BYTES = 10 * 1024 * 1024

SIGNALS = {
    "cpf_formatado": re.compile(r"\b\d{3}\.\d{3}\.\d{3}-\d{2}\b"),
    "email": re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I),
    "telefone_br": re.compile(r"(?:\+?55\s*)?\(?\d{2}\)?\s*9?\d{4}[-\s]?\d{4}"),
    "cartao_rotulado": re.compile(r"(?i)cart[aã]o.{0,24}\d{4}"),
}


def _rodar_poppler(command: list[str], content: bytes, *, max_output_bytes: int) -> bytes:
    def limit_child() -> None:
        resource.setrlimit(resource.RLIMIT_FSIZE, (max_output_bytes, max_output_bytes))
        resource.setrlimit(resource.RLIMIT_CPU, (TOOL_TIMEOUT_SECONDS, TOOL_TIMEOUT_SECONDS))
        resource.setrlimit(resource.RLIMIT_AS, (512 * 1024 * 1024, 512 * 1024 * 1024))

    try:
        with tempfile.TemporaryFile() as output:
            process = subprocess.Popen(
                command,
                stdin=subprocess.PIPE,
                stdout=output,
                stderr=subprocess.DEVNULL,
                preexec_fn=limit_child,
            )
            try:
                process.communicate(input=content, timeout=TOOL_TIMEOUT_SECONDS)
            except subprocess.TimeoutExpired as error:
                process.kill()
                process.communicate()
                raise RuntimeError(f"{command[0]} excedeu {TOOL_TIMEOUT_SECONDS}s") from error
            if process.returncode != 0:
                raise RuntimeError(f"{command[0]} recusou o PDF ou excedeu limites")
            size = output.tell()
            if size > max_output_bytes:
                raise RuntimeError(f"{command[0]} excedeu o limite de saída")
            output.seek(0)
            return output.read()
    except FileNotFoundError as error:
        raise RuntimeError(f"dependência ausente: {command[0]}") from error


def _contar_paginas(pdfinfo_output: str) -> int:
    for line in pdfinfo_output.splitlines():
        key, separator, value = line.partition(":")
        if not separator:
            continue
        if key.strip().lower() == "pages" and value.strip().isdigit():
            return int(value.strip())
    raise RuntimeError("pdfinfo não informou a quantidade de páginas")


def pdfinfo_bruto(conteudo: bytes) -> str:
    """Devolve a saída crua do pdfinfo para um conteúdo já lido em memória.

    Função pura, sem cache: cada chamada roda o processo pdfinfo de novo.
    Use-a quando já se tem o conteúdo do PDF (por exemplo, o `conteudo` de
    um `PdfLido`) e se precisa de campos que `ler_pdf` não expõe em seus
    campos próprios — mas, para o caso comum de ler um PDF do disco e
    também precisar desses campos, prefira `ler_pdf`: ela já chama esta
    função uma única vez e devolve o texto cru em `PdfLido.pdfinfo`, sem
    exigir uma segunda chamada (e um segundo processo) sobre o mesmo PDF.
    """
    return _rodar_poppler(
        ["pdfinfo", "-"], conteudo, max_output_bytes=MAX_PDFINFO_BYTES
    ).decode("utf-8", errors="replace")


@dataclass(frozen=True)
class PdfLido:
    """Resultado de `ler_pdf`: o PDF já lido, hasheado e com páginas contadas."""

    conteudo: bytes
    sha256: str
    paginas: int
    pdfinfo: str


def ler_pdf(path: Path, *, max_bytes: int, max_pages: int) -> PdfLido:
    path = path.expanduser()
    if path.is_symlink():
        raise ValueError("links simbólicos não são aceitos")
    if not path.is_file() or path.suffix.lower() != ".pdf":
        raise ValueError("o caminho deve apontar para um PDF existente")
    size = path.stat().st_size
    if size > max_bytes:
        raise ValueError(f"PDF excede o limite de {max_bytes} bytes")
    with path.open("rb") as handle:
        content = handle.read(max_bytes + 1)
    if len(content) > max_bytes:
        raise ValueError(f"PDF excede o limite de {max_bytes} bytes")

    info_output = pdfinfo_bruto(content)
    pages = _contar_paginas(info_output)
    if pages > max_pages:
        raise ValueError(f"PDF excede o limite de {max_pages} páginas")

    return PdfLido(
        conteudo=content,
        sha256=hashlib.sha256(content).hexdigest(),
        paginas=pages,
        pdfinfo=info_output,
    )


def extrair_texto(conteudo: bytes, *, layout: bool = True) -> str:
    command = ["pdftotext"]
    if layout:
        command.append("-layout")
    command += ["-", "-"]
    return _rodar_poppler(command, conteudo, max_output_bytes=MAX_TEXT_BYTES).decode(
        "utf-8", errors="replace"
    )


def contar_sinais(texto: str) -> dict[str, int]:
    return {name: len(pattern.findall(texto)) for name, pattern in SIGNALS.items()}
