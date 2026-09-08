#!/usr/bin/env python3
"""Extrai uma prévia determinística de fatura de cartão Santander, sem aplicar dados.

Este é o extrator de maior risco do conjunto: a fatura é impressa em DUAS
COLUNAS. Com `pdftotext -layout`, uma única LINHA de texto pode conter dois
lançamentos distintos, um de cada coluna:

    3     04/08 IMPERIO DA MACAXEIRA                             47,99            3    17/08 KEYLAPATRICIA                            13,00

`re.finditer` sobre cada linha encontra os dois lados naturalmente (a
descrição de cada lançamento é lida até o próximo valor em formato de
dinheiro, então o casamento não vaza de um lado para o outro). O que
`finditer` sozinho NÃO resolve é agrupar os lançamentos em seções para
conferir o invariante de soma — e essa foi a parte que exigiu investigação
real contra o PDF de verdade (ver ACHADO abaixo), não só contra o padrão de
partida do brief.

ACHADO — a fronteira de coluna não é "coluna 1 = uma seção, coluna 2 = outra
seção". É um leiaute de jornal (serpentina): o texto de uma seção (ex.:
"Parcelamentos" de um titular) pode COMEÇAR no fim da coluna 1 de uma página
e CONTINUAR no topo da coluna 2 da MESMA página, sem repetir o cabeçalho da
subseção — porque colunas de jornal enchem a coluna 1 inteira até o fim da
página antes de vazar para o topo da coluna 2. Duas tentativas mais simples
foram derrubadas por isso, contra o PDF real:

1. Somar os lançamentos em ORDEM DE TEXTO entre "VALOR TOTAL" consecutivos —
   falha porque a coluna 2 já começou a imprimir MUITO antes da coluna 1
   terminar (elas ficam lado a lado na mesma faixa vertical da página), e a
   soma mistura lançamentos de seções diferentes.
2. Tratar coluna 1 e coluna 2 como DOIS acumuladores independentes,
   persistentes por linha — falha porque uma mesma seção pode migrar de
   coluna 1 para coluna 2 (o achado da serpentina), e cada acumulador fecha
   cedo demais ou tarde demais.

A correção: por PÁGINA, reconstruir a ordem lógica como "tudo da coluna 1,
depois tudo da coluna 2" (não intercalado por linha) — um único acumulador
processa essa ordem linear, sem precisar saber a qual titular cada trecho
pertence. A divisão em coluna 1/coluna 2 não usa um limiar fixo (a fronteira
muda de página para página, como o brief avisa): para cada página, mede-se a
maior lacuna entre as colunas onde lançamentos/cabeçalhos/VALOR TOTAL
aparecem, e corta ali. Uma página sem lacuna grande (`GAP_MINIMO`) é de coluna
única — comum nas últimas páginas, quando o conteúdo já não enche a largura
inteira. Verificado contra as quatro seções do PDF real: as quatro somas
batem exatamente com "VALOR TOTAL" — nenhuma tolerância, nenhum ajuste.

Fronteira contraparte/titular desta classe, decidida pelo dono do vault: a
descrição do lançamento é preservada como impressa, INCLUSIVE quando contém
nome de terceiro (ex.: "WELLHUB LAIS SILVA") — são gastos reais da casa, e
apagá-los destruiria a conciliação. Não copiado: nome do titular no
cabeçalho, os quatro últimos dígitos do cartão, a linha digitável, o código
de barras, "Nosso Número" e a agência/código do beneficiário — nenhum desses
é lido por este módulo.

"COTAÇÃO DOLAR" e "IOF DESPESA NO EXTERIOR" são continuação do lançamento
anterior em moeda estrangeira, não lançamentos próprios. A cotação é só
informativa (não tem valor a preservar no envelope); o IOF é um custo real da
compra e é somado ao campo `valor` (em R$) do lançamento que a antecede — é
esse lançamento, e não um lançamento à parte, que carrega o custo total da
operação em reais.

O invariante interrompe: a soma dos lançamentos de Parcelamentos+Despesas de
cada seção tem que reproduzir "VALOR TOTAL" daquela seção, nas duas moedas.
"Pagamento e Demais Créditos" fica de fora dessa soma (é o que a própria
fatura faz: o rótulo é sempre impresso só depois das duas tabelas de compra),
mas os lançamentos dessa subseção ainda entram no envelope normalmente, com
natureza "entrada" (valor negativo impresso) — é o caso do próprio pagamento
da fatura anterior.
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

MARCA_INICIO = "Detalhamento da Fatura"
MARCA_FIM = "Resumo da Fatura"

# Padrão de partida do brief, com dois ajustes feitos contra o PDF real:
# 1. `usd` também aceita sinal negativo — um estorno em moeda estrangeira
#    imprime as duas colunas negativas ("GITHUB, INC ... -26,83   -5,16").
# 2. Sem âncora `$` no fim: a mesma linha pode trazer um segundo lançamento
#    (a própria razão de ser desta task) — uma âncora de fim de linha faz o
#    primeiro casamento "engolir" até o fim da linha e esconder o segundo,
#    o mesmo tipo de erro que já derrubou a Task 4 com delimitador consumido.
LANCAMENTO = re.compile(
    r"(?:(?P<cartao>\d)\s+)?"
    r"(?P<data>\d{2}/\d{2})\s+"
    r"(?P<descricao>\S.*?)\s{2,}"
    r"(?:(?P<parcela>\d{2}/\d{2})\s+)?"
    r"(?P<valor>-?[\d.]+,\d{2})"
    r"(?:\s+(?P<usd>-?[\d.]+,\d{2}))?"
)

# As três subseções de uma "seção" (bloco de um titular/cartão). Delimitam o
# estado que decide se um lançamento entra na soma do invariante (Parcelamentos
# e Despesas) ou fica de fora dela (Pagamento e Demais Créditos), sem depender
# de reconhecer QUAL titular é — só a subseção corrente importa para a soma.
CABECALHO_SUBSECAO = re.compile(r"\b(Pagamento e Demais Cr[ée]ditos|Parcelamentos|Despesas)\b")
SUBSECOES_SOMADAS = ("Parcelamentos", "Despesas")

# Sem âncora de fim de linha, pelo mesmo motivo do LANCAMENTO: duas seções
# lado a lado podem fechar na MESMA linha de texto, uma de cada coluna (ver
# `fixtures/fatura-sanitizada.txt`, onde isso é exercitado de propósito).
VALOR_TOTAL = re.compile(r"VALOR TOTAL\s+(?P<valor>-?[\d.]+,\d{2})\s+(?P<usd>-?[\d.]+,\d{2})")
IOF_EXTERIOR = re.compile(r"IOF DESPESA NO EXTERIOR\s+(?P<valor>-?[\d.]+,\d{2})")
COTACAO_DOLAR = re.compile(r"COTA[ÇC][ÃA]O DOLAR")

# Lacuna mínima (em caracteres) entre o fim dos tokens da coluna 1 e o início
# dos da coluna 2 para considerar a página de duas colunas. Medido no PDF
# real: coluna 1 começa em ~2-9, coluna 2 em ~80-85 — lacuna de 70+
# caracteres. Uma página de coluna única (comum perto do fim do documento,
# quando sobra pouco conteúdo) não tem lacuna alguma nessa faixa. O valor
# abaixo fica bem abaixo do menor caso real e acima de qualquer variação de
# indentação dentro de uma mesma coluna (recuo do "cartão" ou de uma
# continuação de IOF, no máximo ~10 caracteres).
GAP_MINIMO = 20

EMISSOR_RE = re.compile(r"(Banco Santander \(Brasil\) S\.A\.)\s*-\s*CNPJ:\s*([\d./-]+)")
# A linha "Esta Fatura" traz, na MESMA linha, o total a pagar, o rótulo que
# identifica a fatura corrente (distinta do histórico de faturas anteriores
# ou da fatura aberta seguinte) e o período de compras em DD/MM/AA — a única
# fonte do ano dos lançamentos, que não trazem ano nenhum.
PERIODO_RE = re.compile(
    r"R\$\s*(?P<total>[\d.]+,\d{2})\s+Esta Fatura\s+"
    r"(?P<inicio>\d{2}/\d{2}/\d{2})\s+a\s+(?P<fim>\d{2}/\d{2}/\d{2})"
)


def money(value: str) -> Decimal:
    return Decimal(value.replace(".", "").replace(",", "."))


def _casamento_unico(padrao: re.Pattern[str], texto: str, nome: str) -> re.Match[str]:
    casamentos = list(padrao.finditer(texto))
    if len(casamentos) != 1:
        raise ValueError(f"{nome}: esperava exatamente 1 ocorrência, achei {len(casamentos)}")
    return casamentos[0]


def _data_ddmmyy(texto: str) -> date:
    dia, mes, ano = (int(parte) for parte in texto.split("/"))
    return date(2000 + ano, mes, dia)


def _eventos_da_linha(linha: str) -> list[tuple[int, str, re.Match[str]]]:
    """Todo achado reconhecido nesta linha, com a coluna (posição do caractere)
    onde cada um começa — é essa coluna que decide, por página, a qual das
    duas colunas visuais um achado pertence (ver `_reordenar_pagina`).
    """
    eventos: list[tuple[int, str, re.Match[str]]] = []
    for casamento in LANCAMENTO.finditer(linha):
        eventos.append((casamento.start(), "lancamento", casamento))
    for casamento in CABECALHO_SUBSECAO.finditer(linha):
        eventos.append((casamento.start(), "subsecao", casamento))
    for casamento in VALOR_TOTAL.finditer(linha):
        eventos.append((casamento.start(), "valor_total", casamento))
    for casamento in IOF_EXTERIOR.finditer(linha):
        eventos.append((casamento.start(), "iof", casamento))
    for casamento in COTACAO_DOLAR.finditer(linha):
        eventos.append((casamento.start(), "cotacao", casamento))
    return eventos


def _reordenar_pagina(linhas: list[str]) -> list[tuple[str, re.Match[str]]]:
    """Devolve os eventos da página na ordem lógica de leitura: TODOS os da
    coluna 1 (topo a fundo), depois TODOS os da coluna 2 (topo a fundo) — não
    intercalados por linha, que é como `pdftotext -layout` os imprime. Ver o
    ACHADO da serpentina no docstring do módulo para o porquê.

    A fronteira entre coluna 1 e coluna 2 é medida NESTA página, não fixada
    globalmente (`a fronteira muda de página para página`, avisa o brief): é
    a maior lacuna entre colunas de início onde algum achado aparece. Sem
    lacuna grande o bastante, a página é de coluna única e os eventos saem em
    ordem de linha simples.
    """
    todos = [
        (indice_linha, coluna, tipo, casamento)
        for indice_linha, linha in enumerate(linhas)
        for coluna, tipo, casamento in _eventos_da_linha(linha)
    ]
    if not todos:
        return []

    colunas_ordenadas = sorted({coluna for (_, coluna, _, _) in todos})
    maior_lacuna = 0
    ponto_de_corte = None
    for anterior, seguinte in zip(colunas_ordenadas, colunas_ordenadas[1:]):
        lacuna = seguinte - anterior
        if lacuna > maior_lacuna:
            maior_lacuna = lacuna
            ponto_de_corte = (anterior + seguinte) / 2

    if maior_lacuna < GAP_MINIMO:
        ordenados = sorted(todos, key=lambda evento: (evento[0], evento[1]))
        return [(tipo, casamento) for (_, _, tipo, casamento) in ordenados]

    coluna_1 = sorted(
        (evento for evento in todos if evento[1] < ponto_de_corte),
        key=lambda evento: (evento[0], evento[1]),
    )
    coluna_2 = sorted(
        (evento for evento in todos if evento[1] >= ponto_de_corte),
        key=lambda evento: (evento[0], evento[1]),
    )
    return [(tipo, casamento) for (_, _, tipo, casamento) in coluna_1] + [
        (tipo, casamento) for (_, _, tipo, casamento) in coluna_2
    ]


def _regiao_detalhamento(texto: str) -> str:
    """A janela de extração: da primeira ocorrência de "Detalhamento da
    Fatura" até a primeira ocorrência de "Resumo da Fatura". Fora dela ficam
    o resumo do topo (que tem sua própria leitura, via `PERIODO_RE` e
    `EMISSOR_RE`) e o bloco de boleto/recibo no rodapé — que é exatamente
    onde moram o nome do titular, a linha digitável e o "Nosso Número", e por
    isso nunca é varrido por `LANCAMENTO`.
    """
    inicio = texto.find(MARCA_INICIO)
    if inicio < 0:
        raise ValueError(f"marcador {MARCA_INICIO!r} não encontrado na fatura")
    fim = texto.find(MARCA_FIM, inicio)
    if fim < 0:
        raise ValueError(f"marcador {MARCA_FIM!r} não encontrado após {MARCA_INICIO!r}")
    return texto[inicio + len(MARCA_INICIO) : fim]


def _emissor(texto: str) -> tuple[str, str]:
    """Nome e CNPJ do banco emissor — dado público do banco, não do titular.

    A fatura imprime esse bloco DUAS vezes (Beneficiária e Beneficiário, nos
    dois lados do canhoto do boleto), sempre com o mesmo valor — por isso a
    checagem aqui é de VALORES distintos, não de ocorrências: mais de uma
    combinação nome/CNPJ diferente entre si é que seria ambíguo.
    """
    combinacoes = {casamento.groups() for casamento in EMISSOR_RE.finditer(texto)}
    if len(combinacoes) != 1:
        raise ValueError(
            f"emissor (Banco Santander): esperava exatamente 1 combinação nome/CNPJ, "
            f"achei {len(combinacoes)}"
        )
    return combinacoes.pop()


def _periodo_das_compras(texto: str) -> tuple[Decimal, date, date]:
    casamento = _casamento_unico(PERIODO_RE, texto, "Período das compras (linha 'Esta Fatura')")
    total = money(casamento.group("total"))
    inicio = _data_ddmmyy(casamento.group("inicio"))
    fim = _data_ddmmyy(casamento.group("fim"))
    if fim < inicio:
        raise ValueError(
            f"período das compras invertido: fim ({fim.isoformat()}) antes do início "
            f"({inicio.isoformat()})"
        )
    return total, inicio, fim


def _resolver_data(data_str: str, periodo_inicio: date, periodo_fim: date, avisos: list[str]) -> str:
    """Anexa o ano a uma data DD/MM do detalhamento — que nunca traz ano.

    Compras parceladas mostram a data ORIGINAL da compra, que rotineiramente
    fica meses antes do período desta fatura (uma parcela 08/09 comprada há
    7 meses, por exemplo) — isso é normal e não é ambiguidade: contanto que o
    período das compras não cruze a virada do ano, um único ano civil serve
    para toda data do documento, não só para as que caem dentro do período.

    Só quando o período cruza a virada do ano (`periodo_inicio.year !=
    periodo_fim.year`) existe ambiguidade de verdade: a mesma data DD/MM
    poderia cair em qualquer um dos dois anos. Nesse caso, o ano escolhido é
    o que deixa a data mais perto do FIM do período (a data de fechamento
    desta fatura é a referência mais confiável que se tem), e o desempate
    sempre vai para `avisos` — mesmo resolvido, a ambiguidade existiu.
    """
    dia, mes = (int(parte) for parte in data_str.split("/"))
    if periodo_inicio.year == periodo_fim.year:
        try:
            return date(periodo_inicio.year, mes, dia).isoformat()
        except ValueError as error:
            raise ValueError(f"data de lançamento inválida: {data_str}/{periodo_inicio.year}") from error

    candidatos = []
    for ano in (periodo_inicio.year, periodo_fim.year):
        try:
            candidatos.append(date(ano, mes, dia))
        except ValueError:
            continue
    if not candidatos:
        raise ValueError(f"data de lançamento inválida: {data_str}")
    escolhido = min(candidatos, key=lambda candidato: abs((candidato - periodo_fim).days))
    if len(candidatos) > 1:
        avisos.append(
            f"lançamento {data_str}: período das compras cruza a virada do ano "
            f"({periodo_inicio.isoformat()} a {periodo_fim.isoformat()}); o ano foi "
            f"escolhido por proximidade ao fim do período ({escolhido.isoformat()})"
        )
    return escolhido.isoformat()


def _varrer_detalhamento(
    texto_regiao: str, periodo_inicio: date, periodo_fim: date
) -> tuple[list[dict[str, object]], list[str]]:
    """Varre a região "Detalhamento da Fatura" e devolve os lançamentos.

    `_reordenar_pagina` corrige a ordem lógica DENTRO de cada página (coluna
    1 inteira, depois coluna 2 — ver o ACHADO da serpentina no docstring do
    módulo). O acumulador de estado e soma que roda por cima dessa lista de
    eventos, abaixo, é CONTÍNUO entre páginas — `\\x0c` só delimita onde
    `_reordenar_pagina` é chamada de novo, ele não reinicia `subsecao_atual`
    nem `acumulado_r`/`acumulado_usd`. Isso não é uma lacuna: é o
    comportamento certo para o leiaute de jornal — uma seção pode legitimamente
    atravessar uma quebra de PÁGINA da mesma forma que atravessa uma quebra de
    COLUNA (ver `test_secao_que_atravessa_quebra_de_pagina_soma_corretamente`
    em `test_card_invoice.py`), e tratá-la como interrupção seria inventar uma
    fronteira que a fatura não tem. O invariante de soma continua sendo a
    rede: qualquer lançamento perdido ou duplicado, atravessando página ou
    não, ainda diverge de `VALOR TOTAL` e ainda interrompe.
    """
    paginas = texto_regiao.split("\x0c")
    eventos: list[tuple[str, re.Match[str]]] = []
    for pagina in paginas:
        eventos.extend(_reordenar_pagina(pagina.splitlines()))

    lancamentos: list[dict[str, object]] = []
    avisos: list[str] = []
    subsecao_atual: str | None = None
    acumulado_r = Decimal("0")
    acumulado_usd = Decimal("0")
    ultimo_lancamento: dict[str, object] | None = None

    for tipo, casamento in eventos:
        if tipo == "subsecao":
            subsecao_atual = casamento.group(1)
            continue

        if tipo == "valor_total":
            esperado_r = money(casamento.group("valor"))
            esperado_usd = money(casamento.group("usd"))
            if esperado_r != acumulado_r or esperado_usd != acumulado_usd:
                raise ValueError(
                    "invariante quebrado: VALOR TOTAL da seção "
                    f"(R$ {esperado_r}, US$ {esperado_usd}) diverge da soma dos "
                    f"lançamentos de Parcelamentos+Despesas apurada "
                    f"(R$ {acumulado_r}, US$ {acumulado_usd})"
                )
            acumulado_r = Decimal("0")
            acumulado_usd = Decimal("0")
            subsecao_atual = None
            continue

        if tipo == "cotacao":
            # Só informativa (a taxa de câmbio usada, não um valor a
            # preservar no envelope) — mas exige o mesmo contexto do IOF: só
            # faz sentido depois de um lançamento em moeda estrangeira. Serve
            # de checagem barata de que a reconstrução da ordem lógica
            # (`_reordenar_pagina`) não embaralhou as colunas.
            if ultimo_lancamento is None or ultimo_lancamento["moeda_estrangeira"] is None:
                raise ValueError(
                    f"cotação de dólar ({casamento.group(0)!r}) sem um lançamento em moeda "
                    "estrangeira imediatamente anterior"
                )
            continue

        if tipo == "iof":
            valor_iof = money(casamento.group("valor"))
            if ultimo_lancamento is None or ultimo_lancamento["moeda_estrangeira"] is None:
                raise ValueError(
                    f"IOF de despesa no exterior ({casamento.group(0)!r}) sem um lançamento "
                    "em moeda estrangeira imediatamente anterior para anexar"
                )
            ultimo_lancamento["valor"] = ultimo_lancamento["valor"] + valor_iof
            if subsecao_atual in SUBSECOES_SOMADAS:
                acumulado_r += valor_iof
            continue

        # tipo == "lancamento"
        valor = money(casamento.group("valor"))
        usd = money(casamento.group("usd")) if casamento.group("usd") else None
        natureza = "entrada" if valor < 0 else "saida"
        descricao = " ".join(casamento.group("descricao").split())
        data_iso = _resolver_data(casamento.group("data"), periodo_inicio, periodo_fim, avisos)
        lancamento = {
            "data": data_iso,
            "descricao": descricao,
            "valor": abs(valor),
            "natureza": natureza,
            "contraparte": descricao,
            "parcela": casamento.group("parcela"),
            "moeda_estrangeira": (f"USD {usd:.2f}" if usd is not None else None),
        }
        lancamentos.append(lancamento)
        ultimo_lancamento = lancamento
        if subsecao_atual in SUBSECOES_SOMADAS:
            acumulado_r += valor
            if usd is not None:
                acumulado_usd += usd

    if acumulado_r != 0 or acumulado_usd != 0:
        raise ValueError(
            "seção sem VALOR TOTAL de fechamento: "
            f"R$ {acumulado_r} / US$ {acumulado_usd} de lançamentos ficaram sem uma linha "
            "VALOR TOTAL para conferir"
        )

    return lancamentos, avisos


def parse_text(texto: str, *, fonte: dict[str, object] | None = None) -> dict[str, object]:
    """Extrai o envelope `documento-extraido/v1` (classe `fatura-cartao`) do texto.

    Quando `fonte` não é passado, `fonte.sha256`/`fonte.bytes` são calculados
    sobre o próprio `texto` recebido aqui — não sobre os bytes do PDF de
    origem. Quem precisa do sha256/tamanho do arquivo PDF real deve usar
    `parse(path)`.
    """
    emissor_nome, emissor_cnpj = _emissor(texto)

    total_a_pagar, periodo_inicio, periodo_fim = _periodo_das_compras(texto)
    competencia = f"{periodo_fim.year:04d}-{periodo_fim.month:02d}"

    regiao = _regiao_detalhamento(texto)
    lancamentos, avisos = _varrer_detalhamento(regiao, periodo_inicio, periodo_fim)
    if not lancamentos:
        raise ValueError("nenhum lançamento reconhecido no detalhamento da fatura")

    lancamentos.sort(key=lambda lancamento: lancamento["data"])
    lancamentos_serializados = [
        {
            "data": lancamento["data"],
            "descricao": lancamento["descricao"],
            "valor": f"{lancamento['valor']:.2f}",
            "natureza": lancamento["natureza"],
            "contraparte": lancamento["contraparte"],
            "parcela": lancamento["parcela"],
            "moeda_estrangeira": lancamento["moeda_estrangeira"],
        }
        for lancamento in lancamentos
    ]

    fonte_final = fonte or _fonte_a_partir_do_texto(texto)

    envelope = contrato.envelope(
        "fatura-cartao",
        fonte_final,
        emissor={"nome": emissor_nome, "cnpj": emissor_cnpj},
        competencia=competencia,
        totais={"total_a_pagar": f"{total_a_pagar:.2f}"},
        lancamentos=lancamentos_serializados,
        sinais_privacidade=pdf_text.contar_sinais(texto),
        avisos=[
            "A prévia não altera nada; nenhum dado foi aplicado.",
            "Identificadores do titular (nome no cabeçalho, últimos 4 dígitos do cartão, "
            "linha digitável, código de barras, Nosso Número e agência/código do "
            "beneficiário) não são copiados; a descrição do lançamento é preservada como "
            "impressa, mesmo quando cita nome de terceiro (ex.: uso compartilhado de um "
            "benefício).",
            *avisos,
        ],
    )
    contrato.exigir_valido(envelope)
    return envelope


def _fonte_a_partir_do_texto(texto: str) -> dict[str, object]:
    texto_bytes = texto.encode("utf-8")
    return {
        "sha256": hashlib.sha256(texto_bytes).hexdigest(),
        "bytes": len(texto_bytes),
        "paginas": texto.count("\x0c") + 1 if texto else 0,
        "extraido_em": contrato.agora_local(),
    }


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
    print("Fatura de cartão Santander (somente relatório)")
    print(f"- Emissor: {envelope['emissor']['nome']}")
    print(f"- Competência: {envelope['competencia']}")
    print(f"- Total a Pagar: R$ {envelope['totais']['total_a_pagar']}")
    print(
        f"- Lançamentos reconhecidos: {len(envelope['lancamentos'])} "
        f"({len(entradas)} entrada(s), {len(saidas)} saída(s))"
    )
    if envelope["avisos"]:
        print("- Avisos:")
        for aviso in envelope["avisos"]:
            print(f"  · {aviso}")
    print("Nenhum dado foi aplicado; use a prévia para revisão humana.")


if __name__ == "__main__":
    main()
