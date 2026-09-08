#!/usr/bin/env python3
"""Testes de `pdf_text.py`.

Cobre só as proteções que rodam ANTES de qualquer chamada ao poppler
(symlink, limite de tamanho, extensão) mais a checagem de sinais de
privacidade, e um teste de timeout com `subprocess.Popen` mockado. Nenhum
teste aqui invoca `pdftotext`/`pdfinfo` de verdade nem depende de um PDF
real — os três primeiros levantam antes de chegar lá, e o de timeout troca o
processo por um mock.
"""

from __future__ import annotations

import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import pdf_text


class PdfTextModuleTest(unittest.TestCase):
    def test_recusa_symlink(self):
        with tempfile.TemporaryDirectory() as tmp:
            alvo = Path(tmp) / "real.pdf"
            alvo.write_bytes(b"%PDF-1.4\n")
            link = Path(tmp) / "link.pdf"
            link.symlink_to(alvo)
            with self.assertRaises(ValueError) as erro:
                pdf_text.ler_pdf(link, max_bytes=1024, max_pages=10)
            self.assertIn("simbólico", str(erro.exception))

    def test_recusa_arquivo_acima_do_limite(self):
        with tempfile.TemporaryDirectory() as tmp:
            grande = Path(tmp) / "grande.pdf"
            grande.write_bytes(b"%PDF-1.4\n" + b"0" * 4096)
            with self.assertRaises(ValueError) as erro:
                pdf_text.ler_pdf(grande, max_bytes=512, max_pages=10)
            self.assertIn("limite", str(erro.exception))

    def test_recusa_caminho_que_nao_e_pdf(self):
        with tempfile.TemporaryDirectory() as tmp:
            outro = Path(tmp) / "nota.txt"
            outro.write_text("oi")
            with self.assertRaises(ValueError):
                pdf_text.ler_pdf(outro, max_bytes=1024, max_pages=10)

    def test_poppler_timeout_fails_closed(self):
        process = mock.Mock()
        process.communicate.side_effect = [subprocess.TimeoutExpired("pdfinfo", 20), None]
        with mock.patch.object(pdf_text.subprocess, "Popen", return_value=process):
            with self.assertRaises(RuntimeError):
                pdf_text._rodar_poppler(["pdfinfo", "-"], b"pdf", max_output_bytes=1024)
        process.kill.assert_called_once()

    def test_conta_sinais_sem_reproduzi_los(self):
        sinais = pdf_text.contar_sinais("CPF 123.456.789-09 e outro 987.654.321-00")
        self.assertEqual(sinais["cpf_formatado"], 2)
        self.assertNotIn("123.456.789-09", json.dumps(sinais))


if __name__ == "__main__":
    unittest.main()
