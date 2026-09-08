#!/usr/bin/env python3
"""Testes do extrator de extratos Pluxee, nas duas carteiras."""

from __future__ import annotations

import unittest
from decimal import Decimal

import parse_pluxee_statement as pluxee

SHA_FALSO = "0" * 64

# Fixture derivada do texto REAL do extrato, extraído com `pdftotext -layout`.
# Não a reescreva "mais limpa": o extrator exige os marcadores "saldo
# disponivel", "filtros aplicados" e "pdf gerado em", e reconhece o saldo por
# posição relativa. Uma fixture idealizada falha por layout, não por carteira —
# medido nesta sessão.
ALIMENTACAO = "\n".join(
    [
        "           Pluxee",
        "           Alimentação",
        "",
        "",
        "   Saldo disponível",
        "                                                               Extrato atualizado em 04/09/2026 15:46",
        "   R$ 365,18",
        "Filtros aplicados: 90 dias | Mais recentes",
        "",
        "",
        "31 agosto 2026",
        "",
        "           Assai Atacadista                                                              -R$ 199,46",
        "           Compra no Alimentação • 21:14",
        "",
        "",
        "                               PDF gerado em 04/09/2026 15:46",
        "",
    ]
)

REFEICAO = ALIMENTACAO.replace("Alimentação", "Refeição").replace("365,18", "59,16")

# `parse_text` compara os lançamentos do layout contra os valores assinados do
# texto cru; passar a lista esperada é obrigatório.
ESPERADOS = [("-", Decimal("199.46"))]


class CarteiraTest(unittest.TestCase):
    def resultado(self, texto):
        return pluxee.parse_text(texto, SHA_FALSO, expected_signed_amounts=ESPERADOS)

    def test_reconhece_carteira_refeicao(self):
        r = self.resultado(REFEICAO)
        self.assertEqual(r["carteira"], "refeicao")
        self.assertEqual(r["account"], "Pluxee Refeição")

    def test_reconhece_carteira_alimentacao(self):
        r = self.resultado(ALIMENTACAO)
        self.assertEqual(r["carteira"], "alimentacao")
        self.assertEqual(r["account"], "Pluxee Alimentação")

    def test_carteira_desconhecida_e_recusada(self):
        with self.assertRaises(ValueError) as erro:
            self.resultado(REFEICAO.replace("Refeição", "Combustível"))
        self.assertIn("carteira", str(erro.exception).lower())

    def test_lancamento_de_outra_carteira_no_meio_e_recusado(self):
        with self.assertRaises(ValueError):
            self.resultado(REFEICAO.replace("Compra no Refeição", "Compra no Alimentação"))

    def test_as_duas_carteiras_geram_fingerprints_distintas(self):
        a = self.resultado(ALIMENTACAO)["entries"][0]["fingerprint"]
        r = self.resultado(REFEICAO)["entries"][0]["fingerprint"]
        self.assertNotEqual(a, r)


class FingerprintEstavelTest(unittest.TestCase):
    """A fingerprint da carteira Alimentação NÃO pode mudar.

    Notas de transação já existentes no vault referenciam essas fingerprints em
    `source_fingerprint`. O valor abaixo foi MEDIDO contra o código
    atual, antes de qualquer alteração. Se depois da mudança ele divergir, o
    teste reprova e a task para.
    """

    FINGERPRINT_ESPERADA = "2be263787bfa10bbbefe"

    def test_fingerprint_de_alimentacao_nao_muda(self):
        r = pluxee.parse_text(ALIMENTACAO, SHA_FALSO, expected_signed_amounts=ESPERADOS)
        self.assertEqual(r["entries"][0]["fingerprint"], self.FINGERPRINT_ESPERADA)


if __name__ == "__main__":
    unittest.main()
