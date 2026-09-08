#!/usr/bin/env python3
"""Testes do extrator de contracheque, contra a fixture sanitizada de um
contracheque real (formato Serpro/SIAPE) — mas o extrator em si não conhece
esse empregador; ele é passado explicitamente, como qualquer chamador real
precisa fazer (ver docstring de `parse_payslip.parse_text`)."""

from __future__ import annotations

import json
import unittest
from decimal import Decimal
from pathlib import Path

import parse_payslip

FIXTURE = (Path(__file__).resolve().parent / "fixtures" / "contracheque-sanitizado.txt").read_text(
    encoding="utf-8"
)

EMPREGADOR_FIXTURE = "SERVIÇO FEDERAL DE PROCESSAMENTO DE DADOS - SERPRO"


class ExtracaoTest(unittest.TestCase):
    def setUp(self):
        self.envelope = parse_payslip.parse_text(FIXTURE, empregador=EMPREGADOR_FIXTURE)

    def test_classe_e_competencia(self):
        self.assertEqual(self.envelope["classe"], "contracheque")
        self.assertEqual(self.envelope["competencia"], "2026-08")

    def test_empregador_preservado_como_contraparte(self):
        self.assertIn("SERPRO", self.envelope["emissor"]["nome"])

    def test_totais_conferem(self):
        totais = self.envelope["totais"]
        self.assertEqual(totais["proventos"], "12684.14")
        self.assertEqual(totais["descontos"], "5474.37")
        self.assertEqual(totais["liquido"], "7209.77")

    def test_soma_dos_lancamentos_reproduz_os_totais(self):
        entradas = sum(
            Decimal(l["valor"]) for l in self.envelope["lancamentos"] if l["natureza"] == "entrada"
        )
        saidas = sum(
            Decimal(l["valor"]) for l in self.envelope["lancamentos"] if l["natureza"] == "saida"
        )
        self.assertEqual(entradas, Decimal("12684.14"))
        self.assertEqual(saidas, Decimal("5474.37"))

    def test_conta_as_linhas(self):
        entradas = [l for l in self.envelope["lancamentos"] if l["natureza"] == "entrada"]
        saidas = [l for l in self.envelope["lancamentos"] if l["natureza"] == "saida"]
        self.assertEqual(len(entradas), 3)
        self.assertEqual(len(saidas), 11)

    def test_tiquete_alimentacao_e_a_contrapartida_do_beneficio(self):
        alvo = [l for l in self.envelope["lancamentos"] if "TIQUETE" in l["descricao"]]
        self.assertEqual(len(alvo), 1)
        self.assertEqual(alvo[0]["valor"], "110.04")

    def test_nao_copia_identificador_do_titular(self):
        texto = json.dumps(self.envelope, ensure_ascii=False)
        for proibido in ("000.000.000-00", "0000000-0", "PESSOA DE TESTE", "00000-0"):
            self.assertNotIn(proibido, texto)

    def test_conta_sinais_sem_reproduzi_los(self):
        self.assertGreaterEqual(self.envelope["sinais_privacidade"]["cpf_formatado"], 1)

    def test_invariante_quebrado_interrompe(self):
        adulterado = FIXTURE.replace("R$ 7.209,77", "R$ 9.999,99")
        with self.assertRaises(ValueError) as erro:
            parse_payslip.parse_text(adulterado, empregador=EMPREGADOR_FIXTURE)
        self.assertIn("líquido", str(erro.exception).lower())

    def test_envelope_satisfaz_o_contrato(self):
        # Reaproveita o módulo `contrato` (o validador vendorizado) que
        # `parse_payslip` já importou — evita duplicar a resolução do
        # pacote `@refarm.dev/document-extraction-contract-v1` aqui.
        self.assertEqual(parse_payslip.contrato.validar(self.envelope), [])

    def test_codigo_de_lote_entre_o_rotulo_e_o_valor_nao_vira_competencia_falsa(self):
        # Achado de revisão: um texto entre o rótulo "Mês/Ano Pagamento" e o
        # valor real, no formato MM/AAAA (um código de lote, por exemplo),
        # não pode ser aceito como se fosse a competência. A heurística
        # anterior ("primeiro MM/AAAA numa janela de 400 caracteres após o
        # rótulo") caía nisso silenciosamente: devolvia competencia ==
        # "3456-12", sem levantar exceção nenhuma.
        adversario = FIXTURE.replace(
            "Mês/Ano Pagamento\n\nSERPRO - REGIONAL RECIFE",
            "Mês/Ano Pagamento\n\nCod.Lote 12/3456\n\nSERPRO - REGIONAL RECIFE",
        )
        with self.assertRaises(ValueError) as erro:
            parse_payslip.parse_text(adversario, empregador=EMPREGADOR_FIXTURE)
        self.assertIn("competência", str(erro.exception).lower())

    def test_dois_tokens_adjacentes_na_linha_do_valor_nao_confundem_a_regex(self):
        # Achado de re-revisão: a regex antiga delimitava o casamento com
        # `(?:^|\s)...(?:\s|$)`, que CONSOME o espaço compartilhado entre dois
        # tokens MM/AAAA adjacentes. Com a linha do valor virando
        # "... LOTACAO-DEMO/0001 07/2050 08/2026" (o token real "08/2026"
        # mantido na MESMA coluna de sempre, só um intruso inserido antes
        # dele), `findall` devolvia só [('07','2050')] e `parse_text`
        # devolvia "2050-07" sem exceção nenhuma. A âncora de coluna resolve:
        # "07/2050" fica a 8 colunas do rótulo (fora da tolerância) e é
        # descartado, sobrando só o "08/2026" real.
        adversario = FIXTURE.replace(
            "SERPRO - REGIONAL RECIFE                         LOTACAO-DEMO/0001"
            "                                   08/2026",
            "SERPRO - REGIONAL RECIFE                         LOTACAO-DEMO/0001"
            "                           07/2050 08/2026",
        )
        self.assertNotEqual(adversario, FIXTURE, "a substituição não encontrou a linha esperada")
        envelope = parse_payslip.parse_text(adversario, empregador=EMPREGADOR_FIXTURE)
        self.assertEqual(envelope["competencia"], "2026-08")
        # Achado do round 3: a ambiguidade existiu (dois candidatos brutos)
        # mesmo tendo sido resolvida pela coluna, e isso não pode ficar
        # invisível — tem que sobrar registrado em avisos.
        avisos_desempate = [a for a in envelope["avisos"] if "desempat" in a.lower()]
        self.assertEqual(len(avisos_desempate), 1)
        self.assertIn("competência", avisos_desempate[0].lower())

    def test_intruso_com_ano_plausivel_como_linha_seguinte_nao_vira_competencia(self):
        # Achado de re-revisão: ancorar só em LINHA (rótulo + linha seguinte)
        # não bastava. Inserindo "Cod.Lote 12/2050" como uma linha inteira
        # entre o rótulo e o valor real, o intruso passa a SER a "linha não
        # vazia seguinte", o valor real fica de fora do alcance, e como 2050
        # é um ano plausível (dentro de 2000-2099), a checagem de ano não
        # pegava — resultado "2050-12" sem exceção. A âncora de coluna pega:
        # "12/2050" começa na coluna 9 (logo após "Cod.Lote "), longe da
        # coluna 101 do rótulo, e é descartado — sobra zero candidato, que
        # interrompe em vez de inventar.
        adversario = FIXTURE.replace(
            "Mês/Ano Pagamento\n\nSERPRO - REGIONAL RECIFE",
            "Mês/Ano Pagamento\n\nCod.Lote 12/2050\n\nSERPRO - REGIONAL RECIFE",
        )
        with self.assertRaises(ValueError) as erro:
            parse_payslip.parse_text(adversario, empregador=EMPREGADOR_FIXTURE)
        self.assertIn("competência", str(erro.exception).lower())

    def test_rotulo_duplicado_antes_do_real_interrompe(self):
        # Achado de re-revisão: um segundo "Mês/Ano Pagamento" antes do real
        # fazia o código pegar o primeiro (sem checar se havia outro),
        # resolvendo o bloco falso sozinho — resultado "2077-12" sem exceção,
        # mesmo com o rótulo e o valor de verdade intactos mais adiante no
        # documento. Agora o rótulo precisa aparecer exatamente uma vez no
        # documento inteiro; duas ocorrências interrompem antes mesmo de
        # olhar para colunas.
        adversario = "Mês/Ano Pagamento\n\nBLOCO FALSO ANTERIOR 12/2077\n\n" + FIXTURE
        with self.assertRaises(ValueError) as erro:
            parse_payslip.parse_text(adversario, empregador=EMPREGADOR_FIXTURE)
        self.assertIn("competência", str(erro.exception).lower())

    # --- Casos de não regressão (round 3): verificados manualmente nos dois
    # rounds anteriores e só agora formalizados como teste — a ausência de
    # teste foi exatamente o que deixou os dois rounds anteriores caírem.

    def test_ano_1999_e_implausivel_e_interrompe(self):
        adversario = FIXTURE.replace("08/2026", "08/1999")
        with self.assertRaises(ValueError) as erro:
            parse_payslip.parse_text(adversario, empregador=EMPREGADOR_FIXTURE)
        self.assertIn("implausível", str(erro.exception).lower())

    def test_ano_2100_e_implausivel_e_interrompe(self):
        adversario = FIXTURE.replace("08/2026", "08/2100")
        with self.assertRaises(ValueError) as erro:
            parse_payslip.parse_text(adversario, empregador=EMPREGADOR_FIXTURE)
        self.assertIn("implausível", str(erro.exception).lower())

    def test_mes_00_e_invalido_e_interrompe(self):
        adversario = FIXTURE.replace("08/2026", "00/2026")
        with self.assertRaises(ValueError) as erro:
            parse_payslip.parse_text(adversario, empregador=EMPREGADOR_FIXTURE)
        self.assertIn("mês", str(erro.exception).lower())

    def test_mes_13_e_invalido_e_interrompe(self):
        adversario = FIXTURE.replace("08/2026", "13/2026")
        with self.assertRaises(ValueError) as erro:
            parse_payslip.parse_text(adversario, empregador=EMPREGADOR_FIXTURE)
        self.assertIn("mês", str(erro.exception).lower())

    def test_valor_separado_do_rotulo_por_linha_extra_ainda_resolve(self):
        # Uma linha em branco a mais entre o rótulo e a linha de dados (além
        # da que já existe no layout real) não pode impedir o
        # reconhecimento: "próxima linha não vazia" continua pulando linhas
        # em branco até achar conteúdo.
        adversario = FIXTURE.replace(
            "Mês/Ano Pagamento\n\nSERPRO", "Mês/Ano Pagamento\n\n\nSERPRO"
        )
        self.assertNotEqual(adversario, FIXTURE)
        envelope = parse_payslip.parse_text(adversario, empregador=EMPREGADOR_FIXTURE)
        self.assertEqual(envelope["competencia"], "2026-08")

    def test_token_espurio_na_linha_do_rotulo_e_ignorado_pela_coluna(self):
        # Um token MM/AAAA solto na própria linha do rótulo, mas em coluna
        # bem distante (aqui, dentro do preenchimento entre "Sede/Regional" e
        # "Lotação" — column 18, contra a coluna 101 do rótulo e do valor
        # real), não pode ser confundido com a competência. A troca preserva
        # o comprimento da linha, então a coluna do próprio rótulo não se
        # desloca.
        linha_original = (
            "Sede/Regional                                    Lotação"
            "                                             Mês/Ano Pagamento"
        )
        linha_com_espurio = (
            "Sede/Regional     99/1234                        Lotação"
            "                                             Mês/Ano Pagamento"
        )
        self.assertEqual(len(linha_original), len(linha_com_espurio))
        self.assertIn(linha_original, FIXTURE)
        adversario = FIXTURE.replace(linha_original, linha_com_espurio)
        envelope = parse_payslip.parse_text(adversario, empregador=EMPREGADOR_FIXTURE)
        self.assertEqual(envelope["competencia"], "2026-08")


if __name__ == "__main__":
    unittest.main()
