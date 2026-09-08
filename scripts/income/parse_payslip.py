#!/usr/bin/env python3
"""Extrai uma prévia determinística de contracheque, sem aplicar dados.

O contracheque é um documento de página única, com pares rótulo/valor e duas
tabelas (Proventos, Descontos) seguidas de um bloco de totais. O empregador é
contraparte de todo lançamento e por isso é preservado; nada que identifique o
titular (nome, CPF, matrícula, banco, agência, conta salário, chave de
validação) entra no envelope.

O layout (rótulos, tabelas, bloco de totais) é genérico o bastante para
qualquer contracheque nesse formato — o nome do empregador não é. Por isso
`--empregador` é obrigatório na CLI (e `empregador` é parâmetro obrigatório
de `parse_text`/`parse`): o extrator confere que o texto literal do
empregador informado aparece no documento (rejeitando um layout que não é o
esperado) e usa esse mesmo texto como emissor/contraparte no envelope. Nenhum
nome de empregador fica embutido no código — foi assim que a versão original
deste extrator, escrita contra o contracheque de um empregador específico,
generalizou para qualquer um.

O invariante é triplo e interrompe: a soma das linhas de Proventos precisa
bater com o Total Proventos, a soma das linhas de Descontos precisa bater com
o Total Descontos, e Total Proventos menos Total Descontos precisa dar o Total
Líquido. Qualquer divergência levanta ValueError citando qual das três falhou.
"""

from __future__ import annotations

import argparse
import calendar
import hashlib
import json
import re
import sys
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
MAX_PAGES = 1

ROTULO_COMPETENCIA = "Mês/Ano Pagamento"

# Faixa plausível de ano de competência. O contracheque eletrônico neste
# layout não existia antes dos anos 2000, e um valor de quatro dígitos fora
# do intervalo abaixo é sinal de leitura errada (ex.: um código de lote com a
# forma MM/AAAA), não uma competência real.
ANO_COMPETENCIA_MINIMO = 2000
ANO_COMPETENCIA_MAXIMO = 2099

# Tolerância de coluna entre o início do rótulo "Mês/Ano Pagamento" e o
# início do token MM/AAAA candidato, medida em caracteres na linha bruta do
# `pdftotext -layout` (sem colapsar espaços). Medido no PDF real de
# 2026-08 (e reproduzido de propósito na fixture sanitizada, que preserva o
# mesmo layout): a coluna do rótulo e a coluna do valor "08/2026" na linha de
# dados abaixo são EXATAMENTE iguais — 101 nos dois casos, porque o
# `-layout` alinha cabeçalho e valor pela borda esquerda da mesma coluna do
# formulário. Uma tolerância pequena absorve variação de rendering entre
# versões do poppler sem alcançar nenhum dos intrusos observados (o mais
# próximo, um segundo token colado na mesma linha de dados, fica a 8+
# colunas; um "Cod.Lote" solto no início de uma linha fica a ~90).
TOLERANCIA_COLUNA_COMPETENCIA = 3

ITEM = re.compile(r"^(?P<descricao>.+?)\s+(?P<valor>\d{1,3}(?:\.\d{3})*,\d{2})$")
# Lookaround (não consumidor) em vez de \s/^/$ delimitando o casamento: dois
# tokens MM/AAAA adjacentes, separados por um único espaço, são encontrados
# os dois — com delimitadores consumidos pelo primeiro casamento, o segundo
# perdia o espaço de que precisava e desaparecia do resultado (achado de
# revisão, comprovado por experimento: `findall` sobre "07/2050 08/2026"
# devolvia só o primeiro).
COMPETENCIA = re.compile(r"(?<!\d)(\d{2})/(\d{4})(?!\d)")
TOTAL_VALOR = re.compile(r"R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})")


def money(value: str) -> Decimal:
    return Decimal(value.replace(".", "").replace(",", "."))


def _linhas_compactadas(texto: str) -> list[str]:
    """Cada linha não vazia, com espaços internos colapsados em um só.

    O colapso apaga as colunas largas do layout do pdftotext -layout, mas a
    fronteira entre descrição e valor continua reconhecível: o valor é sempre
    o último token, no formato de dinheiro brasileiro.
    """
    compactadas = (" ".join(linha.split()) for linha in texto.splitlines())
    return [linha for linha in compactadas if linha]


def _indice_rotulo(linhas: list[str], rotulo: str, inicio: int = 0) -> int:
    for indice in range(inicio, len(linhas)):
        linha = linhas[indice]
        if linha == rotulo or linha.startswith(rotulo + " "):
            return indice
    raise ValueError(f"rótulo não encontrado no contracheque: {rotulo!r}")


def _extrair_tabela(
    linhas: list[str], rotulo: str, fim_rotulos: tuple[str, ...], inicio: int = 0
) -> tuple[list[str], int]:
    """Lê os itens da tabela iniciada por `rotulo`, até um rótulo de parada.

    Devolve a lista de linhas de item (com o rótulo da primeira linha já
    removido) e o índice da linha de parada que encerrou a leitura.
    """
    indice = _indice_rotulo(linhas, rotulo, inicio)
    primeira = linhas[indice][len(rotulo):].strip()
    itens = [primeira] if primeira else []
    indice += 1
    while indice < len(linhas) and not any(
        linhas[indice].startswith(fim) for fim in fim_rotulos
    ):
        itens.append(linhas[indice])
        indice += 1
    if indice >= len(linhas):
        raise ValueError(f"tabela {rotulo!r} não encontrou seu marcador de fim no contracheque")
    return itens, indice


def _itens_para_lancamentos(linhas_item: list[str], natureza: str) -> list[dict[str, str]]:
    lancamentos = []
    for linha in linhas_item:
        casamento = ITEM.match(linha)
        if not casamento:
            raise ValueError(f"linha de lançamento não reconhecida: {linha!r}")
        lancamentos.append(
            {
                "descricao": casamento.group("descricao").strip(),
                "valor": money(casamento.group("valor")),
                "natureza": natureza,
            }
        )
    return lancamentos


def _competencia(texto: str) -> tuple[str, list[str]]:
    """Lê a competência ancorada em COLUNA, não só em linha.

    Duas rodadas de revisão já derrubaram versões mais frouxas desta função:
    uma janela larga de 400 caracteres aceitava o primeiro MM/AAAA que
    aparecesse, mesmo sendo um código de lote; e ancorar só em linha (rótulo
    ou linha seguinte) ainda caía em três ataques — dois tokens MM/AAAA
    adjacentes na mesma linha (a regex antiga "comia" o espaço entre eles e
    só via o primeiro), um intruso plausível ocupando o lugar de "linha
    seguinte" quando inserido entre o rótulo e o valor real, e um segundo
    rótulo "Mês/Ano Pagamento" antes do verdadeiro. As três regras abaixo
    fecham os três buracos ao mesmo tempo:

    1. o rótulo tem que aparecer exatamente uma vez no documento inteiro —
       zero ou mais de uma vez interrompe, sem tentar adivinhar qual é o
       "de verdade";
    2. os candidatos a valor são os tokens MM/AAAA na própria linha do
       rótulo e na linha não vazia seguinte — nunca em qualquer lugar mais
       distante do documento;
    3. cada candidato só sobrevive se a coluna onde ele começa (medida na
       linha bruta, sem colapsar espaços) estiver dentro de
       `TOLERANCIA_COLUNA_COMPETENCIA` da coluna onde o rótulo começa — um
       intruso solto ou um segundo token na mesma linha fica em outra
       coluna e é descartado antes mesmo de chegar à checagem de ano.

    Sobrando um único candidato depois disso, ele é a competência. Zero ou
    mais de um: `ValueError`. A faixa de ano plausível continua sendo a
    última linha de defesa, não a primeira.

    Devolve `(competencia, avisos)`. Quando mais de um candidato MM/AAAA
    aparece nas linhas varridas e o filtro de coluna desempata para
    exatamente um, a ambiguidade existiu — mesmo resolvida, ela não pode
    ficar invisível no envelope (achado de revisão: um desempate silencioso
    é indistinguível de um documento sem ambiguidade nenhuma). `avisos`
    carrega essa nota quando isso acontece, e vem vazia no caso comum (um
    único candidato, sem nada para desempatar) — como no PDF real, que não
    tem ambiguidade.
    """
    ocorrencias = texto.count(ROTULO_COMPETENCIA)
    if ocorrencias == 0:
        raise ValueError(f"rótulo não encontrado no contracheque: {ROTULO_COMPETENCIA!r}")
    if ocorrencias > 1:
        raise ValueError(
            f"rótulo {ROTULO_COMPETENCIA!r} aparece {ocorrencias} vezes no contracheque "
            "(esperava exatamente uma) — competência ambígua"
        )

    linhas_brutas = texto.splitlines()
    indice_rotulo = next(i for i, linha in enumerate(linhas_brutas) if ROTULO_COMPETENCIA in linha)
    linha_rotulo = linhas_brutas[indice_rotulo]
    coluna_rotulo = linha_rotulo.index(ROTULO_COMPETENCIA)

    indice_proxima = indice_rotulo + 1
    while indice_proxima < len(linhas_brutas) and not linhas_brutas[indice_proxima].strip():
        indice_proxima += 1

    linhas_candidatas = [linha_rotulo]
    if indice_proxima < len(linhas_brutas):
        linhas_candidatas.append(linhas_brutas[indice_proxima])

    todos_candidatos = [
        casamento for linha in linhas_candidatas for casamento in COMPETENCIA.finditer(linha)
    ]
    candidatos = [
        casamento.groups()
        for casamento in todos_candidatos
        if abs(casamento.start() - coluna_rotulo) <= TOLERANCIA_COLUNA_COMPETENCIA
    ]
    if len(candidatos) != 1:
        raise ValueError(
            "competência (Mês/Ano Pagamento) não reconhecida: esperava exatamente um "
            "valor MM/AAAA alinhado à coluna do rótulo (tolerância "
            f"{TOLERANCIA_COLUNA_COMPETENCIA}), achei {len(candidatos)}"
        )
    mes, ano = candidatos[0]
    mes_num, ano_num = int(mes), int(ano)
    if not 1 <= mes_num <= 12:
        raise ValueError(f"mês de competência inválido: {mes}")
    if not ANO_COMPETENCIA_MINIMO <= ano_num <= ANO_COMPETENCIA_MAXIMO:
        raise ValueError(
            f"ano de competência implausível: {ano} (esperado entre "
            f"{ANO_COMPETENCIA_MINIMO} e {ANO_COMPETENCIA_MAXIMO})"
        )

    avisos: list[str] = []
    if len(todos_candidatos) > 1:
        avisos.append(
            f"competência: {len(todos_candidatos)} candidatos MM/AAAA nas linhas do rótulo; "
            f"a coluna desempatou para {mes}/{ano}"
        )
    return f"{ano}-{mes}", avisos


def _totais(linhas: list[str], indice_bloco: int) -> dict[str, Decimal]:
    """Lê a linha de valores logo após o rótulo `Total Proventos ...`."""
    if indice_bloco + 1 >= len(linhas):
        raise ValueError("bloco de totais do contracheque incompleto")
    valores = TOTAL_VALOR.findall(linhas[indice_bloco + 1])
    if len(valores) != 3:
        raise ValueError("bloco de totais do contracheque não tem os três valores esperados")
    proventos, descontos, liquido = (money(valor) for valor in valores)
    return {"proventos": proventos, "descontos": descontos, "liquido": liquido}


def parse_text(
    texto: str, *, empregador: str, fonte: dict[str, object] | None = None
) -> dict[str, object]:
    """Extrai o envelope `documento-extraido/v1` (classe `contracheque`) do texto.

    `empregador` é obrigatório e não tem valor padrão: é o texto literal que
    precisa aparecer no contracheque para o layout ser aceito, e o mesmo
    texto vira `emissor.nome` e a contraparte de todo lançamento. Este
    extrator não assume qual é o empregador — quem chama é quem sabe.

    Quando `fonte` não é passado, `fonte.sha256`/`fonte.bytes` são calculados
    sobre o próprio `texto` recebido aqui — não sobre os bytes do PDF de
    origem. Isso satisfaz o contrato para quem chama `parse_text` isolado
    (como os testes), mas quem precisa do sha256/tamanho do arquivo PDF real
    deve usar `parse(path, empregador)`, que lê o PDF com `pdf_text.ler_pdf`
    e repassa `fonte` com os valores do arquivo antes de chamar esta função.
    """
    if empregador not in texto:
        raise ValueError("empregador não reconhecido: layout do contracheque não é o esperado")

    competencia, avisos_competencia = _competencia(texto)
    ultimo_dia = calendar.monthrange(int(competencia[:4]), int(competencia[5:]))[1]
    data_lancamento = f"{competencia}-{ultimo_dia:02d}"

    linhas = _linhas_compactadas(texto)
    itens_proventos, fim_proventos = _extrair_tabela(linhas, "Proventos", ("Tipo",))
    itens_descontos, fim_descontos = _extrair_tabela(
        linhas, "Descontos", ("Total Proventos",), inicio=fim_proventos
    )
    totais = _totais(linhas, fim_descontos)

    proventos = _itens_para_lancamentos(itens_proventos, "entrada")
    descontos = _itens_para_lancamentos(itens_descontos, "saida")

    soma_proventos = sum((item["valor"] for item in proventos), Decimal("0"))
    soma_descontos = sum((item["valor"] for item in descontos), Decimal("0"))

    if soma_proventos != totais["proventos"]:
        raise ValueError(
            "invariante quebrado: soma dos proventos "
            f"({soma_proventos}) diverge do Total Proventos ({totais['proventos']})"
        )
    if soma_descontos != totais["descontos"]:
        raise ValueError(
            "invariante quebrado: soma dos descontos "
            f"({soma_descontos}) diverge do Total Descontos ({totais['descontos']})"
        )
    if totais["proventos"] - totais["descontos"] != totais["liquido"]:
        raise ValueError(
            "invariante quebrado: Total Proventos menos Total Descontos diverge do Total "
            f"Líquido ({totais['proventos']} - {totais['descontos']} != {totais['liquido']})"
        )

    lancamentos = [
        {
            "data": data_lancamento,
            "descricao": item["descricao"],
            "valor": f"{item['valor']:.2f}",
            "natureza": item["natureza"],
            "contraparte": empregador,
        }
        for item in (*proventos, *descontos)
    ]

    if fonte is None:
        texto_bytes = texto.encode("utf-8")
        fonte = {
            "sha256": hashlib.sha256(texto_bytes).hexdigest(),
            "bytes": len(texto_bytes),
            "paginas": 1,
            "extraido_em": contrato.agora_local(),
        }

    envelope = contrato.envelope(
        "contracheque",
        fonte,
        emissor={"nome": empregador, "cnpj": None},
        competencia=competencia,
        totais={chave: f"{valor:.2f}" for chave, valor in totais.items()},
        lancamentos=lancamentos,
        sinais_privacidade=pdf_text.contar_sinais(texto),
        avisos=[
            "Identificadores do titular (nome, CPF, matrícula, banco, agência e conta "
            "salário) não são copiados.",
            "A prévia não altera nada; nenhum dado foi aplicado.",
            *avisos_competencia,
        ],
    )
    contrato.exigir_valido(envelope)
    return envelope


def parse(path: Path, empregador: str) -> dict[str, object]:
    lido = pdf_text.ler_pdf(path, max_bytes=MAX_PDF_BYTES, max_pages=MAX_PAGES)
    texto = pdf_text.extrair_texto(lido.conteudo, layout=True)
    fonte = {
        "sha256": lido.sha256,
        "bytes": len(lido.conteudo),
        "paginas": lido.paginas,
        "extraido_em": contrato.agora_local(),
    }
    return parse_text(texto, empregador=empregador, fonte=fonte)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf", type=Path)
    parser.add_argument(
        "--empregador",
        required=True,
        help="texto literal do empregador impresso no contracheque (vira emissor/contraparte)",
    )
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    try:
        envelope = parse(args.pdf, args.empregador)
    except (ValueError, RuntimeError, OSError) as error:
        parser.error(str(error))

    if args.json:
        print(json.dumps(envelope, ensure_ascii=False, indent=2))
        return
    print("Contracheque (somente relatório)")
    print(f"- Competência: {envelope['competencia']}")
    print(f"- Empregador: {envelope['emissor']['nome']}")
    print(f"- Total Proventos: R$ {envelope['totais']['proventos']}")
    print(f"- Total Descontos: R$ {envelope['totais']['descontos']}")
    print(f"- Total Líquido: R$ {envelope['totais']['liquido']}")
    print(f"- Lançamentos reconhecidos: {len(envelope['lancamentos'])}")
    print("Nenhum dado foi aplicado; use a prévia para revisão humana.")


if __name__ == "__main__":
    main()
