#!/usr/bin/env python3
"""Testes do extrator de extrato de conta corrente Sicoob."""

from __future__ import annotations

import json
import re
import unittest
from decimal import Decimal
from pathlib import Path

import parse_sicoob_statement as sicoob

FIXTURE = (Path(__file__).resolve().parent / "fixtures" / "sicoob-sanitizado.txt").read_text(
    encoding="utf-8"
)


def _texto_basico(linhas_movimentacao, linhas_resumo=()):
    """Documento mínimo (cabeçalho + janela de movimentação) para testes
    pontuais que não precisam da fixture inteira — mesmo padrão do teste de
    virada de ano já existente.

    `linhas_resumo` (opcional) preenche o bloco RESUMO depois do marcador —
    usado pelos testes de reconciliação SALDO EM CONTA x SALDO DO DIA
    (ACHADO 1 do fix final), que precisam de um RESUMO com conteúdo, não só
    o marcador vazio que os demais testes usam.
    """
    return "\n".join(
        [
            "COOP.: 3025-2 / SICOOB SERTÃO",
            "CONTA: 00.000-0 / TITULAR DE TESTE",
            "PERÍODO: 01/08/2026 - 31/08/2026",
            "",
            "                       HISTÓRICO DE MOVIMENTAÇÃO",
            "DATA    HISTÓRICO                                                VALOR",
            *linhas_movimentacao,
            "",
            "                                RESUMO",
            *linhas_resumo,
        ]
    )


def lancamento(envelope, descricao_contendo, valor=None):
    """Acha o único lançamento cuja descrição contém a substring dada.

    Falha alto e claro (não `None` silencioso) quando zero ou mais de um
    lançamento casa — um teste que compara contra o item errado por engano é
    pior do que um teste que não roda.
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
        self.envelope = sicoob.parse_text(FIXTURE)

    # --- Os dez testes mínimos do brief ------------------------------------

    def test_sufixo_na_mesma_linha_e_na_linha_seguinte_sao_equivalentes(self):
        # PIX EMIT.OUTRA IF 1.300,00 tem o D na linha seguinte; PIX EMIT.OUTRA
        # IF 90,00D tem o D colado na mesma linha. As duas formas produzem a
        # mesma natureza ("saida") e o mesmo formato de valor.
        quebrado = lancamento(self.envelope, "PIX EMIT.OUTRA IF", valor="1300.00")
        mesma_linha = lancamento(self.envelope, "PIX EMIT.OUTRA IF", valor="90.00")
        self.assertEqual(quebrado["natureza"], "saida")
        self.assertEqual(mesma_linha["natureza"], "saida")

    def test_saldo_do_dia_nao_vira_lancamento(self):
        descricoes = [l["descricao"] for l in self.envelope["lancamentos"]]
        self.assertNotIn("SALDO DO DIA", descricoes)
        saldos = self.envelope["totais"]["saldos_por_dia"]
        rotulos = [s["descricao"] for s in saldos]
        self.assertGreaterEqual(rotulos.count("SALDO DO DIA"), 4)

    def test_credito_e_debito_tem_natureza_correta(self):
        credito = lancamento(self.envelope, "CR.TED CTA SALARIO")
        debito = lancamento(self.envelope, "PIX EMIT.OUTRA IF", valor="1300.00")
        self.assertEqual(credito["natureza"], "entrada")
        self.assertEqual(debito["natureza"], "saida")

    def test_contraparte_por_cnpj_e_preservada(self):
        alvo = lancamento(self.envelope, "PIX EMIT.OUTRA IF", valor="90.00")
        self.assertIn("27.730.879 0001-83", alvo["contraparte"])

    def test_contraparte_por_nome_de_pessoa_e_preservada(self):
        alvo = lancamento(self.envelope, "PIX RECEB.OUTRA IF")
        self.assertIn("Pessoa Fisica Teste 1", alvo["contraparte"])

    def test_contraparte_por_nome_de_estabelecimento_e_preservada(self):
        alvo = lancamento(self.envelope, "PIX EMIT.OUTRA IF", valor="127.20")
        self.assertIn("Domino s Pizza 19798", alvo["contraparte"])

    def test_cpf_mascarado_pela_fonte_e_preservado_como_veio(self):
        alvo = lancamento(self.envelope, "PIX RECEB.OUTRA IF")
        self.assertIn("***.181.114-**", alvo["contraparte"])

    def test_nao_copia_titular_nem_numero_da_conta(self):
        texto = json.dumps(self.envelope, ensure_ascii=False)
        for proibido in ("TITULAR DE TESTE", "00.000-0", "3025-2"):
            self.assertNotIn(proibido, texto)

    def test_periodo_vira_competencia(self):
        self.assertEqual(self.envelope["competencia"], "2026-08")

    def test_envelope_satisfaz_o_contrato(self):
        # Reaproveita o módulo `contrato` (o validador vendorizado) que
        # `parse_sicoob_statement` já importou — evita duplicar a resolução
        # do pacote `@refarm.dev/document-extraction-contract-v1` aqui.
        self.assertEqual(sicoob.contrato.validar(self.envelope), [])
        self.assertEqual(self.envelope["classe"], "extrato-sicoob")

    # --- Ataques adicionais, achados ao ler o PDF real ----------------------
    #
    # As três seções abaixo (valor invertido, sufixo asterisco, titular
    # vazando pela CR.TED CTA SALARIO) não aparecem no texto de exemplo do
    # brief. Apareceram no PDF real (Passo 6) e cada uma quebrava uma versão
    # anterior deste parser silenciosamente — sem elas, "ler o PDF real e
    # conferir visualmente" teria sido a única rede de segurança, e a lição
    # da Task 4 é exatamente que isso não basta.

    def test_valor_antes_da_data_e_reassociado_por_posicao(self):
        # Achado no PDF real: quando duas linhas consecutivas têm a MESMA
        # descrição ("DÉB.EMPRÉSTIMO" repetido), o agrupamento por linha do
        # `pdftotext -layout` erra e o valor da segunda ocorrência aparece
        # sozinho, numa linha ANTES da linha de data. A fixture reproduz o
        # padrão exato observado no PDF real.
        alvo = lancamento(self.envelope, "DÉB.EMPRÉSTIMO", valor="1225.45")
        self.assertEqual(alvo["natureza"], "saida")
        self.assertEqual(alvo["documento"], "1445450")
        avisos_reassociacao = [a for a in self.envelope["avisos"] if "reassociado" in a.lower()]
        self.assertEqual(len(avisos_reassociacao), 1)
        self.assertIn("1.225,45", avisos_reassociacao[0])

    def test_duas_ocorrencias_da_mesma_descricao_ficam_separadas(self):
        ocorrencias = [
            l for l in self.envelope["lancamentos"] if l["descricao"] == "DÉB.EMPRÉSTIMO"
        ]
        self.assertEqual(len(ocorrencias), 2)
        self.assertEqual({o["valor"] for o in ocorrencias}, {"255.28", "1225.45"})

    def test_sufixo_asterisco_em_saldo_bloqueado_nao_vira_lancamento(self):
        # SALDO BLOQ.ANTERIOR usa "*" em vez de C/D — nem todo marcador de
        # saldo do Sicoob usa o par C/D; o "*" é preservado como veio, não
        # traduzido para C ou D (isso seria inventar sentido).
        descricoes = [l["descricao"] for l in self.envelope["lancamentos"]]
        self.assertNotIn("SALDO BLOQ.ANTERIOR", descricoes)
        saldos = self.envelope["totais"]["saldos_por_dia"]
        bloqueado = [s for s in saldos if s["descricao"] == "SALDO BLOQ.ANTERIOR"]
        self.assertEqual(len(bloqueado), 1)
        self.assertEqual(bloqueado[0]["indicador"], "*")

    def test_saldo_anterior_com_sufixo_na_linha_seguinte_e_lido(self):
        saldos = self.envelope["totais"]["saldos_por_dia"]
        anterior = [s for s in saldos if s["descricao"] == "SALDO ANTERIOR"]
        self.assertEqual(len(anterior), 1)
        self.assertEqual(anterior[0]["valor"], "6341.08")
        self.assertEqual(anterior[0]["indicador"], "C")

    def test_sufixo_asterisco_fora_de_saldo_interrompe(self):
        # Um "*" colado a um lançamento de verdade (não um marcador SALDO) é
        # uma estrutura não reconhecida — não dá pra adivinhar se é crédito
        # ou débito, e inventar seria pior que interromper.
        adversario = FIXTURE.replace(
            "27/08   PIX EMIT.OUTRA IF                                        90,00D",
            "27/08   PIX EMIT.OUTRA IF                                        90,00*",
        )
        self.assertNotEqual(adversario, FIXTURE)
        with self.assertRaises(ValueError) as erro:
            sicoob.parse_text(adversario)
        self.assertIn("*", str(erro.exception))

    def test_titular_no_bloco_de_detalhe_e_descartado_nao_copiado(self):
        # PASSADA 1+2 (fix round 1, ACHADO 1): a CR.TED CTA SALARIO do PDF
        # real mostra o NOME e o CPF do próprio titular no MESMO bloco de
        # detalhe — não de um terceiro. É exatamente esse par (nome + CPF no
        # mesmo bloco) que ensina qual CPF é do titular; sem ele, o CPF não
        # seria descartado (ver os dois testes seguintes).
        credito = lancamento(self.envelope, "CR.TED CTA SALARIO")
        self.assertNotIn("TITULAR DE TESTE", (credito["contraparte"] or ""))
        self.assertNotIn("000.000.000-00", (credito["contraparte"] or ""))
        # O código TED, que não identifica o titular, continua preservado.
        self.assertIn("CODIGO TED: T1089160949", credito["contraparte"])
        texto = json.dumps(self.envelope, ensure_ascii=False)
        self.assertNotIn("000.000.000-00", texto)
        avisos_titular = [a for a in self.envelope["avisos"] if "titular" in a.lower()]
        self.assertTrue(avisos_titular)

    def test_cpf_pleno_de_terceiro_sem_par_com_nome_do_titular_e_preservado(self):
        # O teste que mais importa (ACHADO 1 do fix round 1). Um bloco pareia
        # nome+CPF do titular (aprende "000.000.000-00"); um bloco DIFERENTE,
        # de um lançamento distinto, tem um CPF pleno de TERCEIRO — sem o
        # nome do titular por perto. Esse CPF não pode ser tocado: a regra
        # antiga ("todo CPF pleno é do titular") apagaria justamente o dado
        # que a especificação manda preservar.
        texto = _texto_basico(
            [
                "31/08   CR.TED CTA SALARIO                                      7.209,77C",
                "        TITULAR DE TESTE",
                "        000.000.000-00",
                "        DOC.: 373272891",
                "20/08   PIX RECEB.OUTRA IF                                       50,00C",
                "        Recebimento Pix",
                "        Fulano de Tal",
                "        222.333.444-55",
                "        DOC.: Pix",
            ]
        )
        envelope = sicoob.parse_text(texto)
        terceiro = lancamento(envelope, "PIX RECEB.OUTRA IF")
        self.assertIn("222.333.444-55", terceiro["contraparte"])
        self.assertIn("Fulano de Tal", terceiro["contraparte"])
        credito = lancamento(envelope, "CR.TED CTA SALARIO")
        self.assertNotIn("000.000.000-00", (credito["contraparte"] or ""))
        texto_json = json.dumps(envelope, ensure_ascii=False)
        self.assertNotIn("000.000.000-00", texto_json)
        # O CPF de terceiro sobrevive até o JSON final — preservado de verdade.
        self.assertIn("222.333.444-55", texto_json)

    def test_documento_sem_pareamento_nome_cpf_nao_descarta_e_avisa(self):
        # Nenhum bloco do documento tem o nome do titular — a passada 1 não
        # aprende CPF nenhum. Sem saber a quem atribuir, o CPF pleno
        # encontrado é PRESERVADO (não adivinhamos), e a ferramenta admite a
        # limitação num aviso com a contagem, sem citar o valor do CPF.
        texto = _texto_basico(
            [
                "20/08   PIX RECEB.OUTRA IF                                       50,00C",
                "        Recebimento Pix",
                "        Fulano de Tal",
                "        222.333.444-55",
                "        DOC.: Pix",
            ]
        )
        envelope = sicoob.parse_text(texto)
        lanc = lancamento(envelope, "PIX RECEB.OUTRA IF")
        self.assertIn("222.333.444-55", lanc["contraparte"])
        avisos_nao_atribuido = [
            a for a in envelope["avisos"] if "atribu" in a.lower() and "cpf" in a.lower()
        ]
        self.assertEqual(len(avisos_nao_atribuido), 1)
        self.assertIn("1 CPF", avisos_nao_atribuido[0])
        # O aviso conta a ocorrência, mas não repete o CPF em si.
        self.assertNotIn("222.333.444-55", avisos_nao_atribuido[0])

    def test_dois_cpfs_plenos_pareados_com_titular_em_blocos_diferentes_e_ambiguo(self):
        # Dois blocos distintos, cada um pareando o nome do titular com um
        # CPF pleno DIFERENTE — não dá pra saber qual dos dois é o de
        # verdade sem adivinhar, então a extração levanta em vez de escolher
        # um dos dois às cegas.
        texto = _texto_basico(
            [
                "31/08   CR.TED CTA SALARIO                                      7.209,77C",
                "        TITULAR DE TESTE",
                "        000.000.000-00",
                "        DOC.: 373272891",
                "20/08   CR.TED CTA SALARIO                                       50,00C",
                "        TITULAR DE TESTE",
                "        999.999.999-99",
                "        DOC.: 1",
            ]
        )
        with self.assertRaises(ValueError) as erro:
            sicoob.parse_text(texto)
        self.assertIn("ambígu", str(erro.exception).lower())

    def test_cpf_mascarado_nunca_e_confundido_com_cpf_pleno(self):
        # Não pode existir falso positivo na direção oposta: um CPF já
        # mascarado pela fonte (***.181.114-**) não é descartado — ele É a
        # contraparte que a especificação pede para preservar.
        alvo = lancamento(self.envelope, "PIX RECEB.OUTRA IF")
        self.assertIn("***.181.114-**", alvo["contraparte"])

    def test_linha_em_branco_no_meio_da_contraparte_nao_trunca(self):
        # A fixture tem uma linha em branco entre "Pagamento Pix" e o CNPJ da
        # Domino's Pizza, reproduzindo a quebra de página real do
        # `pdftotext -layout` no meio de um bloco de detalhe. As duas partes
        # do bloco continuam preservadas e juntas.
        alvo = lancamento(self.envelope, "PIX EMIT.OUTRA IF", valor="127.20")
        self.assertIn("Pagamento Pix", alvo["contraparte"])
        self.assertIn("50.724.770 0001-55", alvo["contraparte"])
        self.assertIn("Domino s Pizza 19798", alvo["contraparte"])

    def test_documento_extraido_da_linha_doc(self):
        pix = lancamento(self.envelope, "PIX RECEB.OUTRA IF")
        self.assertEqual(pix["documento"], "Pix")
        emprestimo = lancamento(self.envelope, "DÉB.EMPRÉSTIMO", valor="255.28")
        self.assertEqual(emprestimo["documento"], "1445450")
        # A linha DOC.: nunca aparece dentro do texto da contraparte.
        self.assertNotIn("DOC.:", pix["contraparte"])

    def test_sufixo_ausente_sem_linha_seguinte_valida_interrompe(self):
        # Adultera a linha do sufixo quebrado do primeiro lançamento (SALDO
        # DO DIA), que usa o formato de sufixo na linha seguinte.
        adversario = FIXTURE.replace(
            "31/08   SALDO DO DIA                                            5.819,77\n"
            "                                                                       C\n",
            "31/08   SALDO DO DIA                                            5.819,77\n"
            "                                                                       X\n",
        )
        self.assertNotEqual(adversario, FIXTURE)
        with self.assertRaises(ValueError) as erro:
            sicoob.parse_text(adversario)
        self.assertIn("sufixo", str(erro.exception).lower())

    def test_linha_nao_reconhecida_na_tabela_interrompe(self):
        adversario = FIXTURE.replace(
            "27/08   SALDO DO DIA                                              0,00C\n",
            "27/08   SALDO DO DIA                                              0,00C\n"
            "LINHA COMPLETAMENTE INESPERADA SEM FORMATO\n",
        )
        self.assertNotEqual(adversario, FIXTURE)
        with self.assertRaises(ValueError):
            sicoob.parse_text(adversario)

    def test_periodo_ausente_interrompe(self):
        adversario = FIXTURE.replace("PERÍODO: 01/08/2026 - 31/08/2026\n", "")
        self.assertNotEqual(adversario, FIXTURE)
        with self.assertRaises(ValueError) as erro:
            sicoob.parse_text(adversario)
        self.assertIn("período", str(erro.exception).lower())

    def test_periodo_duplicado_interrompe(self):
        adversario = FIXTURE.replace(
            "PERÍODO: 01/08/2026 - 31/08/2026\n",
            "PERÍODO: 01/08/2026 - 31/08/2026\nPERÍODO: 01/07/2026 - 31/07/2026\n",
        )
        self.assertNotEqual(adversario, FIXTURE)
        with self.assertRaises(ValueError) as erro:
            sicoob.parse_text(adversario)
        self.assertIn("período", str(erro.exception).lower())

    def test_marcador_resumo_ausente_interrompe(self):
        adversario = FIXTURE.replace("\n                                RESUMO\n", "\n")
        self.assertNotEqual(adversario, FIXTURE)
        with self.assertRaises(ValueError):
            sicoob.parse_text(adversario)

    def test_periodo_cruzando_virada_do_ano_resolve_pela_proximidade_e_avisa(self):
        texto = "\n".join(
            [
                "COOP.: 3025-2 / SICOOB SERTÃO",
                "CONTA: 00.000-0 / TITULAR DE TESTE",
                "PERÍODO: 15/12/2025 - 15/01/2026",
                "",
                "                       HISTÓRICO DE MOVIMENTAÇÃO",
                "DATA    HISTÓRICO                                                VALOR",
                "10/01   PIX RECEB.OUTRA IF                                       50,00C",
                "        Recebimento Pix",
                "        Fulano de Tal",
                "        DOC.: Pix",
                "20/12   PIX EMIT.OUTRA IF                                        30,00D",
                "        Pagamento Pix",
                "        Beltrano da Silva",
                "        DOC.: Pix",
                "",
                "                                RESUMO",
            ]
        )
        envelope = sicoob.parse_text(texto)
        janeiro = lancamento(envelope, "PIX RECEB.OUTRA IF")
        dezembro = lancamento(envelope, "PIX EMIT.OUTRA IF")
        self.assertEqual(janeiro["data"], "2026-01-10")
        self.assertEqual(dezembro["data"], "2025-12-20")
        self.assertEqual(envelope["competencia"], "2025-12")
        avisos_virada = [a for a in envelope["avisos"] if "virada do ano" in a.lower()]
        self.assertEqual(len(avisos_virada), 1)

    def test_data_fora_do_periodo_apos_virada_interrompe(self):
        # Uma data que não cai em NENHUM dos dois anos candidatos dentro do
        # intervalo do período é ambígua/implausível — levantar, não
        # adivinhar.
        texto = "\n".join(
            [
                "COOP.: 3025-2 / SICOOB SERTÃO",
                "CONTA: 00.000-0 / TITULAR DE TESTE",
                "PERÍODO: 15/12/2025 - 15/01/2026",
                "",
                "                       HISTÓRICO DE MOVIMENTAÇÃO",
                "DATA    HISTÓRICO                                                VALOR",
                "01/06   PIX RECEB.OUTRA IF                                       50,00C",
                "        Recebimento Pix",
                "        Fulano de Tal",
                "        DOC.: Pix",
                "",
                "                                RESUMO",
            ]
        )
        with self.assertRaises(ValueError) as erro:
            sicoob.parse_text(texto)
        self.assertIn("período", str(erro.exception).lower())

    def test_valores_sao_decimal_com_duas_casas(self):
        for item in self.envelope["lancamentos"]:
            valor = Decimal(item["valor"])
            self.assertEqual(valor, valor.quantize(Decimal("0.01")))

    def test_sinais_privacidade_contados_sem_reproduzir_o_texto_bruto(self):
        self.assertIn("cpf_formatado", self.envelope["sinais_privacidade"])

    def test_emissor_preserva_nome_da_cooperativa_sem_o_numero(self):
        self.assertEqual(self.envelope["emissor"]["nome"], "SICOOB SERTÃO")
        texto = json.dumps(self.envelope, ensure_ascii=False)
        self.assertNotIn("3025-2", texto)

    # --- Cobertura da tabela de movimentação, em tempo de execução (ACHADO 2
    # do fix round 1) -------------------------------------------------------
    #
    # O relatório da primeira rodada apresentou "56 linhas DD/MM → 41
    # lançamentos + 15 marcadores de saldo" como prova de que nada se perdeu
    # no PDF real — mas era só uma contagem manual, feita uma vez, sem
    # nenhum código a executá-la de novo. `_verificar_cobertura` fecha isso:
    # roda dentro de `_varrer_tabela`, em toda chamada de `parse_text`.

    def test_cobertura_da_fixture_bate_lancamentos_mais_saldos(self):
        # Contagem INDEPENDENTE, feita aqui no teste (não chama nenhuma
        # função do módulo) — toda linha DD/MM entre o cabeçalho da tabela e
        # o RESUMO tem que virar um lançamento ou um marcador de saldo.
        linhas = FIXTURE.splitlines()
        inicio = next(i for i, l in enumerate(linhas) if l.startswith("DATA") and "HIST" in l)
        fim = next(i for i, l in enumerate(linhas) if l.strip() == "RESUMO")
        esperado = sum(1 for l in linhas[inicio + 1 : fim] if re.match(r"^\d{2}/\d{2}\s", l))
        obtido = len(self.envelope["lancamentos"]) + len(
            self.envelope["totais"]["saldos_por_dia"]
        )
        self.assertEqual(obtido, esperado)

    def test_verificar_cobertura_reprova_quando_um_lancamento_se_perde(self):
        # Prova direta de que a checagem REPROVA, não só de que ela passa no
        # caso feliz: 3 linhas ancoradas na janela, só 2 registros
        # produzidos (um lançamento "se perdeu").
        janela = [
            "01/08   PIX EMIT.OUTRA IF                                        10,00D",
            "02/08   PIX EMIT.OUTRA IF                                        20,00D",
            "03/08   SALDO DO DIA                                             30,00C",
        ]
        lancamentos = [
            {
                "data": "2026-08-01",
                "descricao": "PIX EMIT.OUTRA IF",
                "valor": "10.00",
                "natureza": "saida",
                "contraparte": None,
                "documento": None,
            }
        ]
        saldos = [
            {"data": "2026-08-03", "descricao": "SALDO DO DIA", "valor": "30.00", "indicador": "C"}
        ]
        with self.assertRaises(ValueError) as erro:
            sicoob._verificar_cobertura(janela, lancamentos, saldos)
        mensagem = str(erro.exception)
        self.assertIn("3", mensagem)
        self.assertIn("2", mensagem)

    def test_verificar_cobertura_nao_reprova_quando_contagem_bate(self):
        janela = ["01/08   PIX EMIT.OUTRA IF                                        10,00D"]
        lancamentos = [
            {
                "data": "2026-08-01",
                "descricao": "PIX EMIT.OUTRA IF",
                "valor": "10.00",
                "natureza": "saida",
                "contraparte": None,
                "documento": None,
            }
        ]
        sicoob._verificar_cobertura(janela, lancamentos, [])  # não levanta

    # --- Reconciliação SALDO EM CONTA (RESUMO) x SALDO DO DIA (ACHADO 1 do
    # fix final) ---------------------------------------------------------
    #
    # `_verificar_cobertura` pega lançamento perdido ou duplicado, mas não
    # pega um sufixo C/D lido errado (a linha continua sendo UM registro, só
    # com a natureza trocada). O RESUMO traz um segundo total independente
    # (SALDO EM CONTA) que, no PDF real, bate exatamente com o SALDO DO DIA
    # mais recente — essa comparação é o que os três testes abaixo cobrem.

    def test_fixture_sanitizada_reconcilia_sem_aviso(self):
        # Caso feliz: SALDO EM CONTA do RESUMO (5.819,77 C) bate com o
        # SALDO DO DIA mais recente (31/08, também 5.819,77 C) — nenhum
        # aviso de reconciliação é adicionado, e o parse não levanta.
        avisos_reconciliacao = [
            a for a in self.envelope["avisos"] if "SALDO EM CONTA" in a
        ]
        self.assertEqual(avisos_reconciliacao, [])

    def test_saldo_em_conta_do_resumo_diverge_do_saldo_do_dia_interrompe(self):
        # Ataque no espírito do que o revisor demonstrou: um valor
        # divergente entre os dois totais independentes do documento tem
        # que interromper a extração, citando os dois valores.
        texto = _texto_basico(
            [
                "20/08   PIX RECEB.OUTRA IF                                       50,00C",
                "        Recebimento Pix",
                "        Fulano de Tal",
                "        222.333.444-55",
                "        DOC.: Pix",
                "01/08   SALDO DO DIA                                             30,00C",
            ],
            linhas_resumo=["(+) SALDO EM CONTA:                                50,00C"],
        )
        with self.assertRaises(ValueError) as erro:
            sicoob.parse_text(texto)
        mensagem = str(erro.exception)
        self.assertIn("50.00", mensagem)
        self.assertIn("30.00", mensagem)

    def test_sem_saldo_do_dia_na_janela_nao_interrompe_so_avisa(self):
        # Extrato legítimo de período sem nenhum "SALDO DO DIA" na janela
        # (só lançamentos) — não há o que comparar. Não inventa, não
        # levanta: registra que a reconciliação não pôde ser feita e segue.
        texto = _texto_basico(
            [
                "20/08   PIX RECEB.OUTRA IF                                       50,00C",
                "        Recebimento Pix",
                "        Fulano de Tal",
                "        222.333.444-55",
                "        DOC.: Pix",
            ],
            linhas_resumo=["(+) SALDO EM CONTA:                                50,00C"],
        )
        envelope = sicoob.parse_text(texto)  # não levanta
        avisos_reconciliacao = [a for a in envelope["avisos"] if "SALDO EM CONTA" in a]
        self.assertEqual(len(avisos_reconciliacao), 1)
        self.assertIn("SALDO DO DIA", avisos_reconciliacao[0])

    def test_resumo_sem_saldo_em_conta_no_formato_esperado_nao_interrompe_so_avisa(self):
        # RESUMO existe (o marcador é exigido), mas sem a linha SALDO EM
        # CONTA no formato esperado — mesmo tratamento: avisa, não inventa,
        # não levanta.
        texto = _texto_basico(
            [
                "20/08   PIX RECEB.OUTRA IF                                       50,00C",
                "        Recebimento Pix",
                "        Fulano de Tal",
                "        222.333.444-55",
                "        DOC.: Pix",
                "01/08   SALDO DO DIA                                             30,00C",
            ],
            linhas_resumo=["(+) SALDO EM RDC AUTOMÁTICO:                        0,00C"],
        )
        envelope = sicoob.parse_text(texto)  # não levanta
        avisos_reconciliacao = [a for a in envelope["avisos"] if "SALDO EM CONTA" in a]
        self.assertEqual(len(avisos_reconciliacao), 1)


if __name__ == "__main__":
    unittest.main()
