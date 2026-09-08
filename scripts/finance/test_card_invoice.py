#!/usr/bin/env python3
"""Testes do extrator de fatura de cartão Santander (duas colunas)."""

from __future__ import annotations

import json
import unittest
from decimal import Decimal
from pathlib import Path

import parse_card_invoice as fatura

FIXTURE = (Path(__file__).resolve().parent / "fixtures" / "fatura-sanitizada.txt").read_text(
    encoding="utf-8"
)

EMISSOR_LINHA = "Banco Santander (Brasil) S.A. - CNPJ: 90.400.888/0001-42"


COLUNA_2 = 80


def _duas_colunas(esquerda: str = "", direita: str = "") -> str:
    """Monta uma linha de duas colunas com a coluna 2 numa posição FIXA e
    conhecida (`COLUNA_2`), em vez de contar espaços à mão — foi exatamente
    contar espaços à mão que produziu um teste que não testava o que devia
    (a linha VALOR TOTAL saindo alinhada com a coluna 1 por acidente, no
    primeiro rascunho deste arquivo).
    """
    if not direita:
        return esquerda.rstrip()
    enchimento = " " * max(1, COLUNA_2 - len(esquerda))
    return (esquerda + enchimento + direita).rstrip()


def _texto_basico(corpo_detalhamento: str, *, total_a_pagar="0,00", inicio="04/08/26", fim="02/09/26") -> str:
    """Documento mínimo (cabeçalho + região Detalhamento) para testes pontuais
    que não precisam da fixture inteira — mesmo padrão do `_texto_basico` do
    extrator Sicoob.
    """
    return "\n".join(
        [
            f"                    R$ {total_a_pagar}   Esta Fatura   {inicio} a {fim}",
            EMISSOR_LINHA,
            "",
            "Detalhamento da Fatura",
            corpo_detalhamento,
            "",
            "Resumo da Fatura",
        ]
    )


def lancamento(envelope, descricao_contendo, valor=None):
    """Acha o único lançamento cuja descrição contém a substring dada.

    Falha alto e claro (não `None` silencioso) quando zero ou mais de um
    lançamento casa — mesmo padrão usado no teste do extrator Sicoob.
    """
    achados = [l for l in envelope["lancamentos"] if descricao_contendo in l["descricao"]]
    if valor is not None:
        achados = [l for l in achados if l["valor"] == valor]
    assert len(achados) == 1, (
        f"esperava 1 lançamento contendo {descricao_contendo!r} (valor={valor!r}), "
        f"achei {len(achados)}"
    )
    return achados[0]


class ExtracaoTest(unittest.TestCase):
    def setUp(self):
        self.envelope = fatura.parse_text(FIXTURE)

    # --- Os dez testes mínimos do brief ------------------------------------

    def test_linha_com_dois_lancamentos_produz_dois(self):
        # "IMPERIO DA MACAXEIRA" (coluna 1) e "KEYLAPATRICIA" (coluna 2)
        # dividem a MESMA linha de texto na fixture — exatamente o exemplo
        # citado no brief.
        esquerda = lancamento(self.envelope, "IMPERIO DA MACAXEIRA", valor="47.99")
        direita = lancamento(self.envelope, "KEYLAPATRICIA", valor="13.00")
        self.assertEqual(esquerda["data"], "2026-08-04")
        self.assertEqual(direita["data"], "2026-08-17")

    def test_lancamento_com_parcela_preserva_a_parcela(self):
        item = lancamento(self.envelope, "LOJA DA ESQUINA")
        self.assertEqual(item["parcela"], "01/03")
        item2 = lancamento(self.envelope, "MP*TESTE PARCELADO")
        self.assertEqual(item2["parcela"], "04/12")

    def test_lancamento_em_dolar_preserva_a_moeda_estrangeira(self):
        item = lancamento(self.envelope, "OPENAI")
        self.assertEqual(item["moeda_estrangeira"], "USD 19.25")
        # o IOF (3,72) foi anexado ao valor em reais do próprio lançamento,
        # não virou um lançamento à parte.
        self.assertEqual(item["valor"], "109.91")

    def test_pagamento_de_fatura_e_entrada(self):
        item = lancamento(self.envelope, "PAGAMENTO DE FATURA-INTERNET")
        self.assertEqual(item["natureza"], "entrada")
        self.assertEqual(item["valor"], "100.00")

    def test_descricao_com_nome_de_terceiro_e_preservada(self):
        item = lancamento(self.envelope, "WELLHUB LAIS SILVA")
        self.assertEqual(item["descricao"], "WELLHUB LAIS SILVA")
        self.assertEqual(item["contraparte"], "WELLHUB LAIS SILVA")

    def test_nao_copia_digitos_do_cartao_nem_linha_digitavel(self):
        texto = json.dumps(self.envelope, ensure_ascii=False)
        proibidos = (
            "XXXX 0001",  # últimos 4 dígitos do cartão na fixture (o CNPJ do
            "XXXX 0002",  # emissor também contém "0001" — checar o padrão de
            # máscara inteiro evita esse falso positivo.
            "FULANO DE TESTE COMPLETO",  # nome do titular
            "00000.00000 00000.000000.00000",  # linha digitável
            "0000000000000",  # Nosso Número
        )
        for proibido in proibidos:
            self.assertNotIn(proibido, texto)

    def test_soma_da_secao_reproduz_o_valor_total(self):
        # Seção "ARTHUR TESTE": Parcelamentos (LOJA DA ESQUINA, 30,00) +
        # Despesas (IMPERIO DA MACAXEIRA 47,99 + WELLHUB LAIS SILVA 36,70) =
        # 114,69 — o mesmo valor impresso na linha VALOR TOTAL da fixture.
        soma = sum(
            Decimal(l["valor"])
            for l in self.envelope["lancamentos"]
            if l["descricao"] in ("LOJA DA ESQUINA", "IMPERIO DA MACAXEIRA", "WELLHUB LAIS SILVA")
        )
        self.assertEqual(soma, Decimal("114.69"))

    def test_soma_divergente_interrompe(self):
        # Adultera o valor de um lançamento sem tocar no VALOR TOTAL da
        # seção: a soma deixa de bater e o extrator tem que recusar, não
        # absorver o erro.
        quebrado = FIXTURE.replace("IMPERIO DA MACAXEIRA                             47,99",
                                    "IMPERIO DA MACAXEIRA                             99,99")
        self.assertNotEqual(quebrado, FIXTURE)
        with self.assertRaises(ValueError) as erro:
            fatura.parse_text(quebrado)
        self.assertIn("invariante quebrado", str(erro.exception))

    def test_lancamentos_saem_ordenados_por_data(self):
        datas = [l["data"] for l in self.envelope["lancamentos"]]
        self.assertEqual(datas, sorted(datas))
        # a fixture tem datas fora de ordem de impressão de propósito (a data
        # mais antiga, 29/05, é a última impressa na tabela de Parcelamentos)
        self.assertEqual(datas[0], "2026-05-29")

    def test_envelope_satisfaz_o_contrato(self):
        # Reaproveita o módulo `contrato` (o validador vendorizado) que
        # `parse_card_invoice` já importou — evita duplicar a resolução do
        # pacote `@refarm.dev/document-extraction-contract-v1` aqui.
        self.assertEqual(fatura.contrato.validar(self.envelope), [])

    # --- Ataques adicionais contra a própria extração -----------------------

    def test_cross_check_atacadao_e_assai_ja_assimilados_no_vault(self):
        # Conferência cruzada do brief contra o PDF real: essas duas notas
        # fiscais já foram assimiladas no vault por outro caminho. Aqui só
        # provamos que o MECANISMO de extração (contra um texto sintético
        # equivalente) preserva exatamente esses dois lançamentos — a
        # conferência contra o PDF real está no relatório da task, não em
        # teste automatizado (o PDF mora fora do controle de versão).
        texto = _texto_basico(
            "\n".join(
                [
                    "Despesas",
                    "  3     24/08 ATACADAO 056 AS                             110,63",
                    "  3     31/08 ASSAI ATACADISTA LJ16                         7,58",
                    "        VALOR TOTAL                                      118,21      0,00",
                ]
            )
        )
        envelope = fatura.parse_text(texto)
        self.assertEqual(lancamento(envelope, "ATACADAO 056 AS")["valor"], "110.63")
        self.assertEqual(lancamento(envelope, "ASSAI ATACADISTA LJ16")["valor"], "7.58")

    def test_secao_que_atravessa_coluna_1_para_coluna_2_fecha_corretamente(self):
        # O ACHADO da serpentina (ver docstring do módulo): uma tabela de
        # Parcelamentos começa na coluna 1 (com cabeçalho "Parcelamentos") e
        # CONTINUA no topo da coluna 2 da mesma página, sem repetir o
        # cabeçalho — e só ENTÃO fecha com VALOR TOTAL, também na coluna 2.
        # Isso derrubou a primeira versão do extrator (acumuladores
        # independentes por coluna); este teste é a rede contra regressão.
        linhas = [
            "Parcelamentos",
            _duas_colunas(
                "  1     10/01 PRIMEIRO ITEM                     01/02           10,00",
                "20/02 SEGUNDO ITEM                       25,00",
            ),
            # VALOR TOTAL fecha na MESMA coluna do item que só existe na
            # coluna 2 (SEGUNDO ITEM) — como no PDF real, onde é lá que a
            # seção de fato termina, não na coluna 1.
            _duas_colunas("", "VALOR TOTAL                                       35,00      0,00"),
        ]
        texto = _texto_basico("\n".join(linhas))
        envelope = fatura.parse_text(texto)
        self.assertEqual(lancamento(envelope, "PRIMEIRO ITEM")["valor"], "10.00")
        self.assertEqual(lancamento(envelope, "SEGUNDO ITEM")["valor"], "25.00")

    def test_iof_sem_lancamento_em_dolar_anterior_interrompe(self):
        texto = _texto_basico(
            "\n".join(
                [
                    "Despesas",
                    "IOF DESPESA NO EXTERIOR                3,72",
                    "        VALOR TOTAL                                        3,72      0,00",
                ]
            )
        )
        with self.assertRaises(ValueError) as erro:
            fatura.parse_text(texto)
        self.assertIn("IOF", str(erro.exception))

    def test_estorno_em_dolar_negativo_preserva_sinal(self):
        texto = _texto_basico(
            "\n".join(
                [
                    "Pagamento e Demais Créditos",
                    "        28/08 GITHUB, INC                                    -26,83   -5,16",
                ]
            )
        )
        envelope = fatura.parse_text(texto)
        item = lancamento(envelope, "GITHUB, INC")
        self.assertEqual(item["natureza"], "entrada")
        self.assertEqual(item["valor"], "26.83")
        self.assertEqual(item["moeda_estrangeira"], "USD -5.16")

    def test_pagina_de_coluna_unica_e_processada(self):
        # Sem lacuna grande entre colunas (todo o conteúdo perto da margem
        # esquerda): a página é de coluna única, não deve levantar exceção
        # nem perder lançamentos.
        texto = _texto_basico(
            "\n".join(
                [
                    "Despesas",
                    "         10/08 ITEM SOLITARIO                                50,00",
                    "         VALOR TOTAL                                        50,00      0,00",
                ]
            )
        )
        envelope = fatura.parse_text(texto)
        self.assertEqual(lancamento(envelope, "ITEM SOLITARIO")["valor"], "50.00")

    def test_secao_que_atravessa_quebra_de_pagina_soma_corretamente(self):
        # Fixa como comportamento INTENCIONAL (achado de revisão, fix round
        # 1): o acumulador de `_varrer_detalhamento` é contínuo entre
        # páginas — "\x0c" delimita onde a reconstrução de coluna
        # (`_reordenar_pagina`) é aplicada de novo, não onde uma seção é
        # forçada a fechar. Uma seção pode atravessar quebra de PÁGINA da
        # mesma forma que atravessa quebra de COLUNA dentro de uma página
        # (o ACHADO da serpentina) — isso NÃO deve levantar `ValueError`.
        texto = _texto_basico(
            "\n".join(
                [
                    "Despesas",
                    "         10/08 ITEM NA PAGINA UM                             30,00",
                    "\x0c",
                    "         20/08 ITEM NA PAGINA DOIS                           20,00",
                    "         VALOR TOTAL                                        50,00      0,00",
                ]
            )
        )
        envelope = fatura.parse_text(texto)
        self.assertEqual(lancamento(envelope, "ITEM NA PAGINA UM")["valor"], "30.00")
        self.assertEqual(lancamento(envelope, "ITEM NA PAGINA DOIS")["valor"], "20.00")

    def test_ano_cruza_virada_do_ano_escolhe_por_proximidade_e_avisa(self):
        texto = _texto_basico(
            "\n".join(
                [
                    "Despesas",
                    "         20/12 COMPRA DE NATAL                               40,00",
                    "         VALOR TOTAL                                        40,00      0,00",
                ]
            ),
            inicio="20/12/25",
            fim="15/01/26",
        )
        envelope = fatura.parse_text(texto)
        item = lancamento(envelope, "COMPRA DE NATAL")
        # 20/12 está mais perto do fim do período (15/01/26, ~26 dias) pelo
        # ano de 2025 (20/12/25, 0 dias de distância) do que pelo de 2026
        # (20/12/26 ficaria a ~11 meses do fim do período) — o ano escolhido
        # é 2025.
        self.assertEqual(item["data"], "2025-12-20")
        self.assertTrue(any("virada do ano" in aviso for aviso in envelope["avisos"]))

    def test_cotacao_dolar_nao_vira_lancamento(self):
        texto = _texto_basico(
            "\n".join(
                [
                    "Despesas",
                    "         19/08 COMPRA EM DOLAR                              50,00      10,00",
                    "               COTAÇÃO DOLAR R$ 5,5162",
                    "         VALOR TOTAL                                        50,00      10,00",
                ]
            )
        )
        envelope = fatura.parse_text(texto)
        self.assertEqual(len(envelope["lancamentos"]), 1)
        self.assertNotIn("COTA", envelope["lancamentos"][0]["descricao"])

    def test_cotacao_dolar_sem_lancamento_em_dolar_anterior_interrompe(self):
        texto = _texto_basico(
            "\n".join(
                [
                    "Despesas",
                    "         10/08 ITEM SEM USD                                  50,00",
                    "               COTAÇÃO DOLAR R$ 5,5162",
                    "         VALOR TOTAL                                        50,00      0,00",
                ]
            )
        )
        with self.assertRaises(ValueError) as erro:
            fatura.parse_text(texto)
        self.assertIn("cotação", str(erro.exception).lower())

    def test_moeda_estrangeira_none_quando_nao_ha_valor_em_usd(self):
        item = lancamento(self.envelope, "IMPERIO DA MACAXEIRA")
        self.assertIsNone(item["moeda_estrangeira"])

    def test_contraparte_espelha_a_descricao(self):
        # Nesta classe não existe uma estrutura separada de "para quem foi o
        # pagamento" além do próprio descritor do lançamento impresso — a
        # contraparte é o mesmo texto da descrição, nunca None (o envelope
        # carrega descricao e contraparte sempre, sem flag).
        for item in self.envelope["lancamentos"]:
            self.assertEqual(item["contraparte"], item["descricao"])
            self.assertIsNotNone(item["contraparte"])

    def test_valor_total_com_soma_faltando_nao_fecha_a_secao(self):
        # Lançamentos de Despesas sem uma linha VALOR TOTAL para fechar a
        # seção é um documento incompleto — recusar, não absorver em
        # silêncio.
        texto = _texto_basico(
            "\n".join(
                [
                    "Despesas",
                    "         10/08 ITEM SEM FECHAMENTO                           50,00",
                ]
            )
        )
        with self.assertRaises(ValueError) as erro:
            fatura.parse_text(texto)
        self.assertIn("VALOR TOTAL", str(erro.exception))

    def test_valores_sao_decimal_com_duas_casas(self):
        for item in self.envelope["lancamentos"]:
            valor = Decimal(item["valor"])
            self.assertEqual(valor, valor.quantize(Decimal("0.01")))

    def test_emissor_e_o_banco_santander(self):
        self.assertEqual(self.envelope["emissor"]["nome"], "Banco Santander (Brasil) S.A.")
        self.assertEqual(self.envelope["emissor"]["cnpj"], "90.400.888/0001-42")

    def test_classe_e_competencia(self):
        self.assertEqual(self.envelope["classe"], "fatura-cartao")
        self.assertEqual(self.envelope["competencia"], "2026-09")


if __name__ == "__main__":
    unittest.main()
