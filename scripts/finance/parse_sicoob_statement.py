#!/usr/bin/env python3
"""Extrai uma prévia determinística de extrato de conta corrente Sicoob, sem aplicar dados.

O extrato lista a "HISTÓRICO DE MOVIMENTAÇÃO" do mais recente para o mais
antigo, uma tabela DATA/HISTÓRICO/VALOR onde cada linha de lançamento pode
trazer, logo abaixo, linhas indentadas com quem foi a contraparte (CNPJ, CPF
já mascarado pela fonte, nome de pessoa ou de estabelecimento) e a linha
`DOC.: ...`. Essa contraparte é preservada, exatamente como impressa — é o
dado que responde "para quem eu paguei" (ver docs/extracao-de-documentos.md,
seção "Fronteira contraparte/titular"). Não copiado: o nome do titular na
linha CONTA:, o número da conta e o da cooperativa.

Duas armadilhas de layout, e uma terceira encontrada só ao ler o PDF real:

1. O sufixo C/D do valor pode vir colado (`90,00D`) ou sozinho na linha
   seguinte (`1.300,00` e depois `D` sozinho) — as duas formas valem o
   mesmo, e a letra nunca é ignorada: ela distingue crédito de débito.
2. `SALDO DO DIA` — e, no PDF real, também `SALDO ANTERIOR` e
   `SALDO BLOQ.ANTERIOR` — não são lançamentos, são marcadores de saldo. Vão
   para `totais["saldos_por_dia"]`, nunca para `lancamentos`. O terceiro usa
   `*` como indicador em vez de C/D (saldo bloqueado, não crédito/débito);
   preservado como veio, nunca traduzido para C ou D.
3. Achado só no PDF real, sem menção no brief: quando duas linhas
   consecutivas têm a MESMA descrição, o agrupamento por linha do
   `pdftotext -layout` erra e o valor da segunda ocorrência aparece sozinho
   numa linha ANTES da linha de data (`_reordenar_valor_invertido` corrige
   isso por posição, e registra um aviso — nunca inventa o valor, só
   reassocia um valor que já estava impresso).

Uma quarta descoberta, mais delicada: a CR.TED CTA SALARIO do PDF real
mostra, no bloco de detalhe, o NOME e o CPF do próprio TITULAR (não de um
terceiro) — o Sicoob usa esse bloco para confirmar o beneficiário do TED, não
para identificar quem pagou. Diferente do CPF mascarado dos Pix (preservado,
é contraparte de verdade), um CPF em formato PLENO (não mascarado com `***`)
QUE CO-OCORRE COM O NOME DO TITULAR no mesmo bloco é o CPF do titular.

Isso não é "todo CPF pleno é do titular" — essa regra mais larga foi tentada
na primeira versão e revisada (fix round 1): ela apagaria o CPF de um
terceiro no dia em que um extrato trouxesse um CPF sem máscara que não fosse
o do titular, destruindo exatamente o dado que a especificação pede para
preservar. Em vez disso, a extração roda em DUAS PASSADAS
(`_aprender_cpf_titular` + `_filtrar_contraparte`): a primeira varre todos os
blocos de detalhe do documento procurando um em que o nome do titular (lido
do cabeçalho `CONTA:`) e um CPF pleno co-ocorram — esse CPF, e só esse, é o
do titular, e fica marcado para descarte em QUALQUER bloco onde reaparecer.
Nenhum outro CPF (pleno ou já mascarado pela fonte) é tocado. Se nenhum
bloco parear nome e CPF em todo o documento, nada é descartado por CPF — o
CPF pleno encontrado é preservado como contraparte, e a contagem de quantas
vezes isso aconteceu vai para `avisos`, para revisão humana; a ferramenta
admite que não sabe atribuí-lo, em vez de adivinhar. O nome do titular,
esse sim, é sempre descartado onde aparecer — ele já é conhecido com certeza
(vem do cabeçalho, não precisa ser aprendido), a mesma regra que já barra o
nome da linha CONTA:.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from datetime import date
from decimal import Decimal
from pathlib import Path

# pdf_text mora em scripts/documents, irmão deste diretório — sem pacote
# Python instalado, o caminho precisa entrar em sys.path antes do import.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "documents"))

# O validador do contrato documento-extraido/v1 vem do pacote vendorizado
# @refarm.dev/document-extraction-contract-v1 (mesmo mecanismo de vendor/ que
# o resto do vault-seed usa para consumir pacotes @refarm.dev/*) — nunca de
# uma cópia local de contrato.py, que reintroduziria a duplicação que a
# colheita do contrato eliminou.
_PACOTE_CONTRATO = (
    Path(__file__).resolve().parents[2]
    / "node_modules"
    / "@refarm.dev"
    / "document-extraction-contract-v1"
    / "python"
)
if not (_PACOTE_CONTRATO / "validador.py").is_file():
    raise ModuleNotFoundError(
        f"validador do contrato não encontrado em {_PACOTE_CONTRATO}. "
        "Rode `pnpm install` na raiz do repositório para instalar "
        "@refarm.dev/document-extraction-contract-v1."
    )
sys.path.insert(0, str(_PACOTE_CONTRATO))

import validador as contrato  # noqa: E402
import pdf_text  # noqa: E402

MAX_PDF_BYTES = 10 * 1024 * 1024
MAX_PAGES = 20

# Uma linha de contraparte/detalhe é sempre indentada com um recuo fixo e
# pequeno (8 espaços, medido no PDF real). As linhas da COLUNA de valor —
# o sufixo C/D/* sozinho, ou um valor órfão reassociado por
# `_reordenar_valor_invertido` — ficam bem mais à direita (52 a 71 espaços no
# PDF real). O limiar abaixo fica confortavelmente entre os dois, para que
# nenhuma das duas categorias seja confundida com a outra.
LIMIAR_COLUNA_VALOR = 16

COOP_RE = re.compile(r"^COOP\.:\s*([\d-]+)\s*/\s*(.+?)\s*$", re.M)
CONTA_RE = re.compile(r"^CONTA:\s*([\d.\-]+)\s*/\s*(.+?)\s*$", re.M)
PERIODO_RE = re.compile(r"^PER[ÍI]ODO:\s*(\d{2}/\d{2}/\d{4})\s*-\s*(\d{2}/\d{2}/\d{4})\s*$", re.M)
CABECALHO_TABELA_RE = re.compile(r"^DATA\s+HIST[ÓO]RICO\b.*VALOR\s*$")

# Regex do brief para uma linha de lançamento/saldo, com o sufixo generalizado
# para [CD*]: o brief só previa C/D, mas o PDF real tem `SALDO BLOQ.ANTERIOR`
# terminando em `*` (saldo bloqueado). `*` só é aceito de fato quando a
# descrição começa por SALDO — ver `_varrer_tabela`.
LINHA_VALOR = re.compile(r"^(\d{2}/\d{2})\s+(.+?)\s+([\d.]+,\d{2})([CD*])?\s*$")
DESCRICAO_SALDO = re.compile(r"^SALDO\b", re.I)

# Pré-processamento do achado 3 (ver docstring do módulo): um valor sozinho,
# bem à direita, imediatamente seguido por uma linha DD/MM sem NENHUM valor
# nela. As duas condições juntas são raras o bastante para não colidirem com
# nada legítimo — testado contra o PDF real e a fixture inteira.
VALOR_ORFAO_RE = re.compile(r"^\s{" + str(LIMIAR_COLUNA_VALOR) + r",}([\d.]+,\d{2})\s*$")
DATA_SEM_VALOR_RE = re.compile(r"^(\d{2}/\d{2})\s+(.+)$")
VALOR_EM_QUALQUER_LUGAR = re.compile(r"[\d.]+,\d{2}")

# CPF em formato pleno (não mascarado). Reaproveita o mesmo padrão que
# `pdf_text.contar_sinais` usa para contar `cpf_formatado` — "o que conta
# como CPF pleno" não pode divergir entre os dois usos (achado de revisão,
# fix round 1: o literal estava duplicado aqui).
CPF_PLENO_RE = pdf_text.SIGNALS["cpf_formatado"]

# Toda linha DD/MM na janela de movimentação (depois do pré-processamento de
# `_reordenar_valor_invertido`) tem que virar exatamente um registro — ver
# `_verificar_cobertura`.
LINHA_ANCORADA_RE = re.compile(r"^\d{2}/\d{2}\s")

# O bloco RESUMO traz um segundo total independente: `SALDO EM CONTA` tem
# que bater com o `SALDO DO DIA` mais recente — ver `_verificar_saldo_reconciliado`
# (ACHADO 1 do fix final: protege contra um sufixo C/D de lançamento lido
# errado, que a checagem de cobertura por contagem não pega).
SALDO_EM_CONTA_RE = re.compile(r"SALDO EM CONTA:\s*([\d.]+,\d{2})([CD])\s*$")


def money(value: str) -> Decimal:
    return Decimal(value.replace(".", "").replace(",", "."))


def _casamento_unico(padrao: re.Pattern[str], texto: str, nome: str) -> re.Match[str]:
    casamentos = list(padrao.finditer(texto))
    if len(casamentos) != 1:
        raise ValueError(f"{nome}: esperava exatamente 1 ocorrência, achei {len(casamentos)}")
    return casamentos[0]


def _indice_linha_unica(
    linhas: list[str], condicao, nome: str, inicio: int = 0
) -> int:
    indices = [i for i in range(inicio, len(linhas)) if condicao(linhas[i])]
    if len(indices) != 1:
        raise ValueError(f"{nome}: esperava exatamente 1 ocorrência, achei {len(indices)}")
    return indices[0]


def _data_ddmmyyyy(texto: str) -> date:
    dia, mes, ano = (int(parte) for parte in texto.split("/"))
    return date(ano, mes, dia)


def _periodo(texto: str) -> tuple[date, date]:
    casamento = _casamento_unico(PERIODO_RE, texto, "PERÍODO")
    inicio = _data_ddmmyyyy(casamento.group(1))
    fim = _data_ddmmyyyy(casamento.group(2))
    if fim < inicio:
        raise ValueError(f"PERÍODO invertido: fim ({fim.isoformat()}) antes do início ({inicio.isoformat()})")
    return inicio, fim


def _reordenar_valor_invertido(linhas: list[str]) -> tuple[list[str], list[str]]:
    """Corrige o achado 3 (ver docstring do módulo): valor impresso antes da data.

    Só dispara quando as DUAS condições se confirmam ao mesmo tempo: uma
    linha só-valor bem à direita, e a linha seguinte é DD/MM + descrição sem
    nenhum valor embutido. Fora daí, cada linha passa intacta.
    """
    resultado: list[str] = []
    avisos: list[str] = []
    i = 0
    while i < len(linhas):
        linha = linhas[i]
        m_valor = VALOR_ORFAO_RE.match(linha)
        if m_valor and i + 1 < len(linhas):
            m_data = DATA_SEM_VALOR_RE.match(linhas[i + 1])
            if m_data and not VALOR_EM_QUALQUER_LUGAR.search(m_data.group(2)):
                data, descricao_bruta = m_data.groups()
                valor = m_valor.group(1)
                descricao = " ".join(descricao_bruta.split())
                resultado.append(f"{data}   {descricao}   {valor}")
                avisos.append(
                    f"lançamento {data} {descricao!r}: o valor {valor} apareceu numa linha "
                    "anterior à linha de data no texto extraído (a mesma descrição repetida "
                    "em lançamentos consecutivos confunde o agrupamento por linha do "
                    "pdftotext -layout); reassociado pela posição, não inventado."
                )
                i += 2
                continue
        resultado.append(linha)
        i += 1
    return resultado, avisos


def _e_nome_titular(linha: str, titular_nome: str) -> bool:
    """O nome do titular é conhecido com certeza (vem do cabeçalho `CONTA:`),
    não precisa ser aprendido — diferente do CPF pleno, que precisa (ver
    `_aprender_cpf_titular`). Comparação exata (a menos de caixa/espaço nas
    pontas): uma linha de detalhe que só CONTÉM o nome como substring não
    casa aqui, só a linha que É o nome inteiro — como observado no PDF real.
    """
    return linha.strip().casefold() == titular_nome.strip().casefold()


def _delimitar_detalhe(janela: list[str], inicio: int) -> tuple[list[str], str | None, int]:
    """Delimita o bloco de detalhe (contraparte crua + `DOC.:`) após um lançamento.

    Só DELIMITA — não decide ainda o que é titular e o que é contraparte de
    verdade. Essa decisão depende de `_aprender_cpf_titular`, que precisa ver
    TODOS os blocos do documento antes de decidir (ver `_varrer_tabela`), daí
    a separação: aqui devolvemos as linhas cruas, e `_filtrar_contraparte`
    decide depois, numa segunda passada.

    Para no primeiro sinal de que a próxima entrada de nível superior
    começou: uma linha DD/MM (novo lançamento) ou qualquer linha não
    indentada. Linhas em branco são puladas sem encerrar a coleta — um
    lançamento cujo bloco de detalhe atravessa uma quebra de página do
    `pdftotext -layout` fica com uma linha em branco no meio, e as duas
    metades continuam pertencendo ao mesmo bloco.
    """
    linhas_brutas: list[str] = []
    documento: str | None = None
    i = inicio
    while i < len(janela):
        linha = janela[i]
        if not linha.strip():
            i += 1
            continue
        if LINHA_VALOR.match(linha) or not linha.startswith(" "):
            break
        conteudo = linha.strip()
        indentacao = len(linha) - len(linha.lstrip(" "))
        if indentacao >= LIMIAR_COLUNA_VALOR and re.fullmatch(r"[\d.]+,\d{2}|[CD*]", conteudo):
            # Uma linha da coluna de valor/sufixo que escapou do
            # pré-processamento (`_reordenar_valor_invertido`) ou da
            # resolução normal de sufixo é uma estrutura que não
            # entendemos — não absorvê-la como se fosse contraparte.
            raise ValueError(f"linha de valor/sufixo órfã não reconhecida: {linha!r}")
        if conteudo.upper().startswith("DOC.:") or conteudo.upper().startswith("DOC:"):
            documento = conteudo.split(":", 1)[1].strip()
            i += 1
            continue
        linhas_brutas.append(conteudo)
        i += 1
    return linhas_brutas, documento, i


def _aprender_cpf_titular(blocos: list[list[str]], titular_nome: str) -> str | None:
    """Passada 1 (ver ACHADO 1 do fix round 1): acha o CPF pleno do titular.

    Varre todos os blocos de detalhe do documento. Só é candidato o CPF pleno
    que aparece num bloco onde o nome do titular TAMBÉM aparece — a
    co-ocorrência é o que garante que o CPF é do titular, não de um
    terceiro. Um bloco sem o nome do titular nunca contribui candidato,
    mesmo que tenha um CPF pleno (pode ser um terceiro de verdade sem
    máscara — não sabemos, e por isso não tocamos nele aqui).

    Devolve `None` quando nenhum bloco pareia nome e CPF em todo o
    documento — `_filtrar_contraparte` trata isso como "não dá pra atribuir,
    preservar e avisar", nunca como "descartar todo CPF pleno por garantia".

    Mais de um CPF distinto pareado com o nome do titular, em blocos
    diferentes, é uma ambiguidade que não sabemos resolver com confiança —
    levanta `ValueError` em vez de escolher um dos dois às cegas.
    """
    candidatos: set[str] = set()
    for bloco in blocos:
        if not any(_e_nome_titular(linha, titular_nome) for linha in bloco):
            continue
        for linha in bloco:
            candidatos.update(CPF_PLENO_RE.findall(linha))
    if not candidatos:
        return None
    if len(candidatos) > 1:
        raise ValueError(
            "mais de um CPF em formato pleno co-ocorre com o nome do titular em blocos de "
            f"detalhe diferentes ({len(candidatos)} candidatos) — ambíguo demais para "
            "decidir qual é o do titular sem adivinhar"
        )
    return candidatos.pop()


def _filtrar_contraparte(
    linhas_brutas: list[str], titular_nome: str, cpf_titular_pleno: str | None
) -> tuple[list[str], int, int]:
    """Passada 2: descarta só o nome exato do titular e o CPF já aprendido.

    Devolve `(contraparte_filtrada, descartadas_por_titular, cpf_pleno_nao_atribuido)`.
    Nenhum CPF diferente de `cpf_titular_pleno` é tocado — nem mascarado
    (nunca foi), nem pleno (é dado de terceiro de verdade, preservado). Um
    aviso não cita o conteúdo descartado (achado dos próprios testes desta
    task, fix inicial: a primeira versão citava o nome/CPF descartado dentro
    do próprio aviso, reabrindo o vazamento que a filtragem fecha).
    """
    contraparte: list[str] = []
    descartadas_por_titular = 0
    cpf_pleno_nao_atribuido = 0
    for linha in linhas_brutas:
        if _e_nome_titular(linha, titular_nome):
            descartadas_por_titular += 1
            continue
        cpfs_na_linha = CPF_PLENO_RE.findall(linha)
        if cpf_titular_pleno is not None and cpf_titular_pleno in cpfs_na_linha:
            descartadas_por_titular += 1
            continue
        if cpf_titular_pleno is None and cpfs_na_linha:
            cpf_pleno_nao_atribuido += len(cpfs_na_linha)
        contraparte.append(linha)
    return contraparte, descartadas_por_titular, cpf_pleno_nao_atribuido


def _contar_linhas_ancoradas(janela: list[str]) -> int:
    return sum(1 for linha in janela if LINHA_ANCORADA_RE.match(linha))


def _verificar_cobertura(
    janela: list[str], lancamentos: list[dict[str, object]], saldos: list[dict[str, str]]
) -> None:
    """Toda linha DD/MM na janela tem que virar exatamente um registro.

    Achado do fix round 1 (ACHADO 2): o cross-check "56 linhas → 41
    lançamentos + 15 marcadores de saldo" só existia como verificação manual
    de uma vez, relatada no relatório da task — não protegia o extrato do
    mês que vem, só este. Essa contagem roda em TODA chamada de
    `parse_text`, contra a `janela` já pré-processada (depois de
    `_reordenar_valor_invertido`, que funde duas linhas brutas em uma só
    quando corrige o valor invertido — por isso a contagem esperada usa a
    janela pós-fusão, não o texto bruto do PDF).
    """
    esperado = _contar_linhas_ancoradas(janela)
    obtido = len(lancamentos) + len(saldos)
    if obtido != esperado:
        raise ValueError(
            f"cobertura da tabela de movimentação divergiu: {esperado} linha(s) "
            f"ancorada(s) em DD/MM na janela de movimentação, mas {obtido} registro(s) "
            "produzidos (lançamentos + marcadores de saldo) — alguma linha foi perdida ou "
            "duplicada"
        )


def _saldo_em_conta_do_resumo(linhas_resumo: list[str]) -> Decimal | None:
    """Lê `SALDO EM CONTA` do bloco RESUMO como Decimal com sinal, ou `None`.

    `None` quando a linha não aparece no formato esperado dentro da janela
    do RESUMO (nenhuma ocorrência, ou mais de uma) — quem chama decide se
    isso vira aviso; esta função nunca inventa nem levanta.
    """
    casamentos = [m for linha in linhas_resumo if (m := SALDO_EM_CONTA_RE.search(linha))]
    if len(casamentos) != 1:
        return None
    valor_str, sufixo = casamentos[0].groups()
    valor = money(valor_str)
    return valor if sufixo == "C" else -valor


def _saldo_do_dia_com_sinal(saldo: dict[str, str]) -> Decimal | None:
    """Decimal com sinal de um registro de `totais["saldos_por_dia"]`.

    `None` quando o indicador não é C nem D (o único caso real é `*`, usado
    só por `SALDO BLOQ.ANTERIOR` — nunca por `SALDO DO DIA`, mas a função
    não assume isso).
    """
    if saldo["indicador"] not in ("C", "D"):
        return None
    valor = Decimal(saldo["valor"])
    return valor if saldo["indicador"] == "C" else -valor


def _verificar_saldo_reconciliado(
    linhas_resumo: list[str], saldos: list[dict[str, str]]
) -> list[str]:
    """ACHADO 1 do fix final: `SALDO EM CONTA` do RESUMO tem que bater com o
    `SALDO DO DIA` mais recente.

    A checagem de cobertura (`_verificar_cobertura`) conta linhas ancoradas
    em DD/MM e pega lançamento perdido ou duplicado — mas não pega um
    sufixo C/D lido errado, porque a linha continua sendo UM registro, só
    que com a natureza trocada. O RESUMO carrega um segundo total
    independente do mesmo documento (`SALDO EM CONTA`), que no PDF real bate
    exatamente com o `SALDO DO DIA` mais recente — mesmo espírito da
    reconciliação `balance − net == derivedOpeningBalance` do extrator
    Pluxee: dado que já está no documento, não heurística nova.

    `saldos` preserva a ordem do documento (mais recente primeiro), então o
    primeiro registro com descrição exatamente "SALDO DO DIA" já é o mais
    recente. Quando falta um dos dois lados — RESUMO fora do formato
    esperado, ou nenhum `SALDO DO DIA` na janela (extrato legítimo de
    período sem movimento) — não inventa nem levanta: devolve um aviso e
    segue.
    """
    saldo_dia = next((s for s in saldos if s["descricao"] == "SALDO DO DIA"), None)
    saldo_resumo = _saldo_em_conta_do_resumo(linhas_resumo)
    saldo_dia_valor = _saldo_do_dia_com_sinal(saldo_dia) if saldo_dia is not None else None
    if saldo_dia_valor is None or saldo_resumo is None:
        return [
            "Não foi possível conferir o SALDO EM CONTA do RESUMO contra o SALDO DO DIA "
            "mais recente (RESUMO fora do formato esperado, ou nenhum SALDO DO DIA na "
            "janela de movimentação); reconciliação pulada, sem impacto nos lançamentos."
        ]
    if saldo_dia_valor != saldo_resumo:
        raise ValueError(
            f"SALDO EM CONTA do RESUMO ({saldo_resumo:.2f}) diverge do SALDO DO DIA mais "
            f"recente ({saldo_dia_valor:.2f})"
        )
    return []


def _resolver_data(data_str: str, periodo_inicio: date, periodo_fim: date) -> str:
    dia, mes = (int(parte) for parte in data_str.split("/"))
    if periodo_inicio.year == periodo_fim.year:
        try:
            return date(periodo_inicio.year, mes, dia).isoformat()
        except ValueError as error:
            raise ValueError(f"data de lançamento inválida: {data_str}/{periodo_inicio.year}") from error

    candidatos = []
    for ano in (periodo_inicio.year, periodo_fim.year):
        try:
            candidato = date(ano, mes, dia)
        except ValueError:
            continue
        if periodo_inicio <= candidato <= periodo_fim:
            candidatos.append(candidato)
    if len(candidatos) != 1:
        raise ValueError(
            f"data de lançamento {data_str} ambígua ou fora do período "
            f"({periodo_inicio.isoformat()} a {periodo_fim.isoformat()}): "
            f"{len(candidatos)} candidatos plausíveis"
        )
    return candidatos[0].isoformat()


def _varrer_tabela(
    janela: list[str], titular_nome: str, periodo_inicio: date, periodo_fim: date
) -> tuple[list[dict[str, object]], list[dict[str, str]], list[str]]:
    """Três fases: (1) varredura estrutural única — data/valor/sufixo, saldo
    vs. lançamento, delimitação crua do bloco de detalhe; (2) aprender o CPF
    do titular olhando TODOS os blocos de uma vez (`_aprender_cpf_titular`);
    (3) filtrar cada bloco com o que foi aprendido e montar os lançamentos
    finais. A fase 2 só é possível depois da 1 terminar — por isso não dá
    para filtrar a contraparte na mesma passada que descobre os blocos.
    """
    saldos: list[dict[str, str]] = []
    candidatos: list[dict[str, object]] = []
    i = 0
    while i < len(janela):
        linha = janela[i]
        if not linha.strip():
            i += 1
            continue
        casamento = LINHA_VALOR.match(linha)
        if not casamento:
            raise ValueError(f"linha não reconhecida na tabela de movimentação: {linha!r}")
        data_str, descricao_bruta, valor_str, sufixo = casamento.groups()
        descricao = " ".join(descricao_bruta.split())
        eh_saldo = bool(DESCRICAO_SALDO.match(descricao))

        if sufixo is None:
            j = i + 1
            while j < len(janela) and not janela[j].strip():
                j += 1
            candidato_sufixo = janela[j].strip() if j < len(janela) else ""
            if candidato_sufixo not in ("C", "D", "*"):
                raise ValueError(
                    f"lançamento {data_str} {descricao!r}: sufixo C/D não encontrado na "
                    "linha seguinte"
                )
            sufixo = candidato_sufixo
            proximo_indice = j + 1
        else:
            proximo_indice = i + 1

        if not eh_saldo and sufixo == "*":
            raise ValueError(
                f"lançamento {data_str} {descricao!r}: sufixo '*' não é válido para um "
                "lançamento — só é aceito em linhas de saldo (SALDO...)"
            )

        valor = money(valor_str)
        data_iso = _resolver_data(data_str, periodo_inicio, periodo_fim)

        if eh_saldo:
            saldos.append(
                {
                    "data": data_iso,
                    "descricao": descricao,
                    "valor": f"{valor:.2f}",
                    "indicador": sufixo,
                }
            )
            i = proximo_indice
            continue

        natureza = "entrada" if sufixo == "C" else "saida"
        linhas_brutas, documento, i = _delimitar_detalhe(janela, proximo_indice)
        candidatos.append(
            {
                "data_str": data_str,
                "data": data_iso,
                "descricao": descricao,
                "valor": f"{valor:.2f}",
                "natureza": natureza,
                "documento": documento,
                "linhas_brutas": linhas_brutas,
            }
        )

    cpf_titular_pleno = _aprender_cpf_titular(
        [candidato["linhas_brutas"] for candidato in candidatos], titular_nome
    )

    lancamentos: list[dict[str, object]] = []
    avisos: list[str] = []
    cpf_pleno_nao_atribuido_total = 0
    for candidato in candidatos:
        contraparte_linhas, descartadas, nao_atribuido = _filtrar_contraparte(
            candidato["linhas_brutas"], titular_nome, cpf_titular_pleno
        )
        cpf_pleno_nao_atribuido_total += nao_atribuido
        if descartadas:
            avisos.append(
                f"lançamento {candidato['data_str']} {candidato['descricao']!r}: "
                f"{descartadas} linha(s) de detalhe descartada(s) por identificar o "
                "titular (nome ou CPF em formato pleno), não copiada(s) para a contraparte"
            )
        lancamentos.append(
            {
                "data": candidato["data"],
                "descricao": candidato["descricao"],
                "valor": candidato["valor"],
                "natureza": candidato["natureza"],
                "contraparte": " ".join(contraparte_linhas) if contraparte_linhas else None,
                "documento": candidato["documento"],
            }
        )

    if cpf_pleno_nao_atribuido_total:
        avisos.append(
            f"{cpf_pleno_nao_atribuido_total} CPF(s) em formato pleno encontrado(s) no "
            "detalhe de lançamentos sem que fosse possível atribuí-los ao titular (nenhum "
            "bloco pareia esse CPF com o nome do titular); preservados como contraparte, "
            "para revisão humana."
        )

    _verificar_cobertura(janela, lancamentos, saldos)
    return lancamentos, saldos, avisos


def _fonte_a_partir_do_texto(texto: str) -> dict[str, object]:
    texto_bytes = texto.encode("utf-8")
    return {
        "sha256": hashlib.sha256(texto_bytes).hexdigest(),
        "bytes": len(texto_bytes),
        "paginas": texto.count("\x0c") + 1 if texto else 0,
        "extraido_em": contrato.agora_local(),
    }


def parse_text(texto: str, *, fonte: dict[str, object] | None = None) -> dict[str, object]:
    coop = _casamento_unico(COOP_RE, texto, "COOP.:")
    coop_nome = coop.group(2)

    conta = _casamento_unico(CONTA_RE, texto, "CONTA:")
    titular_nome = conta.group(2)

    periodo_inicio, periodo_fim = _periodo(texto)
    competencia = f"{periodo_inicio.year:04d}-{periodo_inicio.month:02d}"

    linhas = texto.splitlines()
    idx_cabecalho = _indice_linha_unica(
        linhas,
        lambda l: CABECALHO_TABELA_RE.match(l) is not None,
        "cabeçalho DATA/HISTÓRICO/VALOR",
    )
    idx_resumo = _indice_linha_unica(
        linhas, lambda l: l.strip() == "RESUMO", "marcador RESUMO", inicio=idx_cabecalho + 1
    )
    janela = linhas[idx_cabecalho + 1 : idx_resumo]

    fim_resumo = idx_resumo + 1
    while fim_resumo < len(linhas) and linhas[fim_resumo].strip():
        fim_resumo += 1
    linhas_resumo = linhas[idx_resumo + 1 : fim_resumo]

    janela, avisos_reordenacao = _reordenar_valor_invertido(janela)

    avisos_periodo: list[str] = []
    if periodo_inicio.year != periodo_fim.year:
        avisos_periodo.append(
            f"PERÍODO cruza a virada do ano ({periodo_inicio.isoformat()} a "
            f"{periodo_fim.isoformat()}); o ano de cada lançamento foi resolvido pela "
            "posição de cada data dentro do intervalo do período."
        )

    lancamentos, saldos, avisos_varredura = _varrer_tabela(
        janela, titular_nome, periodo_inicio, periodo_fim
    )
    if not lancamentos:
        raise ValueError("nenhum lançamento reconhecido na tabela de movimentação")

    avisos_reconciliacao = _verificar_saldo_reconciliado(linhas_resumo, saldos)

    fonte_final = fonte or _fonte_a_partir_do_texto(texto)

    envelope = contrato.envelope(
        "extrato-sicoob",
        fonte_final,
        emissor={"nome": coop_nome, "cnpj": None},
        competencia=competencia,
        totais={"saldos_por_dia": saldos},
        lancamentos=lancamentos,
        sinais_privacidade=pdf_text.contar_sinais(texto),
        avisos=[
            "A prévia não altera nada; nenhum dado foi aplicado.",
            "Identificadores do titular (nome na linha CONTA:, número da conta e da "
            "cooperativa) não são copiados; o nome do titular dentro do detalhe de um "
            "lançamento também é descartado, e o CPF do titular em formato pleno é "
            "descartado quando aprendido por co-ocorrer com o nome em algum bloco (CPF de "
            "terceiro, mascarado ou não, nunca é tocado).",
            *avisos_periodo,
            *avisos_reordenacao,
            *avisos_varredura,
            *avisos_reconciliacao,
        ],
    )
    contrato.exigir_valido(envelope)
    return envelope


def parse(path: Path) -> dict[str, object]:
    lido = pdf_text.ler_pdf(path, max_bytes=MAX_PDF_BYTES, max_pages=MAX_PAGES)
    texto = pdf_text.extrair_texto(lido.conteudo, layout=True)
    fonte = {
        "sha256": lido.sha256,
        "bytes": len(lido.conteudo),
        "paginas": lido.paginas,
        "extraido_em": contrato.agora_local(),
    }
    return parse_text(texto, fonte=fonte)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    try:
        envelope = parse(args.pdf)
    except (ValueError, RuntimeError, OSError) as error:
        parser.error(str(error))

    if args.json:
        print(json.dumps(envelope, ensure_ascii=False, indent=2))
        return
    entradas = [l for l in envelope["lancamentos"] if l["natureza"] == "entrada"]
    saidas = [l for l in envelope["lancamentos"] if l["natureza"] == "saida"]
    print("Extrato Sicoob (somente relatório)")
    print(f"- Emissor: {envelope['emissor']['nome']}")
    print(f"- Competência: {envelope['competencia']}")
    print(f"- Lançamentos reconhecidos: {len(envelope['lancamentos'])} ({len(entradas)} entrada(s), {len(saidas)} saída(s))")
    print(f"- Marcadores de saldo: {len(envelope['totais']['saldos_por_dia'])}")
    if envelope["avisos"]:
        print("- Avisos:")
        for aviso in envelope["avisos"]:
            print(f"  · {aviso}")
    print("Nenhum dado foi aplicado; use a prévia para revisão humana.")


if __name__ == "__main__":
    main()
