#!/usr/bin/env python3
"""Extrai uma prévia determinística de extratos PDF da Pluxee, sem aplicar dados."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from datetime import date, datetime
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

# A carteira deixa de ser fixa. `normalize` já remove acento e caixa, então a
# chave de comparação é sempre a forma sem acento. Só a CHAVE normalizada é
# fixa aqui — são os dois únicos tipos de carteira que a Pluxee emite no
# Brasil, parte do layout do documento, não uma escolha de quem usa este
# extrator. O RÓTULO de exibição ("account" no relatório) não vem de uma
# tabela fixa: é montado a partir do próprio cabeçalho do documento (ver
# `header_original`/`account` em `parse_text`) para não embutir no código o
# nome que um vault específico dá à conta — essa nomeação é decisão de quem
# usa a ferramenta, não do documento.
CARTEIRAS_CONHECIDAS = ("alimentacao", "refeicao")

MONTHS = {
    "janeiro": 1,
    "fevereiro": 2,
    "marco": 3,
    "abril": 4,
    "maio": 5,
    "junho": 6,
    "julho": 7,
    "agosto": 8,
    "setembro": 9,
    "outubro": 10,
    "novembro": 11,
    "dezembro": 12,
}
DATE_HEADER = re.compile(r"^(\d{1,2})\s+([A-Za-zçÇãÃ]+)\s+(\d{4})$")
ENTRY = re.compile(r"^(?P<description>.+?)\s+(?P<sign>[+-])R\$\s*(?P<value>\d{1,3}(?:\.\d{3})*,\d{2})$")
SIGNED_AMOUNT = re.compile(
    r"(?P<sign>[+-])\s*R\s*\$\s*(?P<value>\d{1,3}(?:(?:\.|\s)\d{3})*,\s*\d{2})"
)


def normalize(value: str) -> str:
    return "".join(
        character
        for character in unicodedata.normalize("NFD", value.casefold())
        if unicodedata.category(character) != "Mn"
    )


def money(value: str) -> Decimal:
    return Decimal(value.replace(".", "").replace(",", "."))


def signed_amounts(text: str) -> list[tuple[str, Decimal]]:
    result: list[tuple[str, Decimal]] = []
    for match in SIGNED_AMOUNT.finditer(text):
        raw_value = re.sub(r"\s+", "", match.group("value"))
        result.append((match.group("sign"), money(raw_value)))
    return result


def classify_entry(sign: str, description: str, detail: str, carteira: str) -> str:
    description_key = normalize(description)
    detail_key = normalize(detail)
    if sign == "+" and description_key == "disponibilizacao de valor":
        return "credito-beneficio"
    if sign == "+":
        return "entrada-nao-classificada"
    if f"compra no {carteira}" in detail_key:
        return "compra"
    return "saida-nao-classificada"


def parse_text(
    text: str,
    document_sha256: str,
    *,
    include_descriptions: bool = False,
    expected_signed_amounts: list[tuple[str, Decimal]] | None = None,
) -> dict[str, object]:
    normalized_document = normalize(text)
    # `header_original` preserva a grafia como impressa (acento, maiúscula);
    # `header` é a forma normalizada usada para reconhecer o layout. O
    # rótulo de conta ("account", abaixo) é montado a partir do original —
    # nunca de uma tabela fixa no código — para ecoar exatamente o que o
    # documento diz, e não uma convenção de nomeação de um vault específico.
    header_original = [line.strip() for line in text.splitlines() if line.strip()][:4]
    header = [normalize(line) for line in header_original]
    indice_carteira = next(
        (indice for indice in (1, 2) if indice < len(header) and header[indice] in CARTEIRAS_CONHECIDAS),
        None,
    )
    carteira = header[indice_carteira] if indice_carteira is not None else None
    if not header or header[0] != "pluxee" or carteira is None:
        raise ValueError(
            "carteira Pluxee não reconhecida: o extrato precisa dizer Alimentação ou Refeição"
        )
    account = f"{header_original[0]} {header_original[indice_carteira]}"
    required_markers = ("saldo disponivel", "filtros aplicados")
    missing = [marker for marker in required_markers if marker not in normalized_document]
    if missing:
        raise ValueError(f"layout {account} incompleto: " + ", ".join(missing))
    if "pdf gerado em" not in normalized_document:
        raise ValueError("rodapé de geração do extrato não reconhecido")

    compact = "\n".join(" ".join(line.split()) for line in text.splitlines())
    balance_match = re.search(
        r"Saldo dispon.vel[\s\S]{0,100}?R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})",
        compact,
        re.I,
    )
    updated_match = re.search(
        r"Extrato atualizado em (\d{2}/\d{2}/\d{4})\s+(\d{2}:\d{2})",
        compact,
        re.I,
    )
    if not balance_match or not updated_match:
        raise ValueError("saldo ou data de atualização não reconhecidos")

    current_date: date | None = None
    entries: list[dict[str, object]] = []
    parsed_signed_amounts: list[tuple[str, Decimal]] = []
    identities: defaultdict[str, int] = defaultdict(int)
    lines = [" ".join(line.split()) for line in text.splitlines()]
    if expected_signed_amounts is None:
        expected_signed_amounts = signed_amounts(text)
    for index, line in enumerate(lines):
        date_match = DATE_HEADER.match(line)
        if date_match:
            day, month_name, year = date_match.groups()
            month = MONTHS.get(normalize(month_name))
            if not month:
                raise ValueError(f"mês não reconhecido: {month_name}")
            current_date = date(int(year), month, int(day))
            continue
        entry_match = ENTRY.match(line)
        if not entry_match:
            continue
        if current_date is None:
            raise ValueError("lançamento encontrado antes de uma data")
        sign = entry_match.group("sign")
        value = money(entry_match.group("value"))
        detail = lines[index + 1] if index + 1 < len(lines) else ""
        detail_key = normalize(detail)
        outras_carteiras = [chave for chave in CARTEIRAS_CONHECIDAS if chave != carteira]
        if carteira not in detail_key or any(outra in detail_key for outra in outras_carteiras):
            raise ValueError(
                f"lançamento sem detalhe explícito da carteira {account}"
            )
        time_match = re.search(r"(\d{2}:\d{2})$", detail)
        if not time_match:
            raise ValueError("lançamento sem hora observada")
        observed_time = time_match.group(1)
        try:
            datetime.strptime(observed_time, "%H:%M")
        except ValueError as error:
            raise ValueError(f"hora de lançamento inválida: {observed_time}") from error
        description = entry_match.group("description").strip()
        kind = classify_entry(sign, description, detail, carteira)
        identity = (
            f"pluxee-{carteira}:{current_date.isoformat()}:{observed_time}:"
            f"{sign}:{value}"
        )
        identities[identity] += 1
        occurrence = identities[identity]
        fingerprint_basis = f"{identity}:ocorrencia:{occurrence}"
        entry: dict[str, object] = {
            "date": current_date.isoformat(),
            "time": observed_time,
            "nature": "entrada" if sign == "+" else "saida",
            "kind": kind,
            "value": float(value),
            "occurrence": occurrence,
            "fingerprint": hashlib.sha256(fingerprint_basis.encode()).hexdigest()[:20],
        }
        if include_descriptions:
            entry["description"] = description
        entries.append(entry)
        parsed_signed_amounts.append((sign, value))

    if not entries:
        raise ValueError("nenhum lançamento reconhecido")
    if Counter(parsed_signed_amounts) != Counter(expected_signed_amounts):
        raise ValueError(
            "extração parcial: valores assinados da extração raw divergem dos lançamentos do layout"
        )
    fingerprints = [entry["fingerprint"] for entry in entries]
    if len(fingerprints) != len(set(fingerprints)):
        raise ValueError("fingerprints duplicadas na prévia")

    balance = money(balance_match.group(1))
    net = sum(
        (
            Decimal(str(entry["value"]))
            if entry["nature"] == "entrada"
            else -Decimal(str(entry["value"]))
        )
        for entry in entries
    )
    derived_opening = balance - net
    update_date, update_time = updated_match.groups()
    try:
        observed_update = datetime.strptime(
            f"{update_date} {update_time}", "%d/%m/%Y %H:%M"
        )
    except ValueError as error:
        raise ValueError("data ou hora de atualização inválida") from error
    return {
        "mode": "report-only",
        "account": account,
        "carteira": carteira,
        "documentSha256": document_sha256,
        "updatedAt": observed_update.strftime("%Y-%m-%dT%H:%M:00-03:00"),
        "balance": float(balance),
        "entryCount": len(entries),
        "entries": entries,
        "observedBenefitCredits": [
            entry for entry in entries if entry["kind"] == "credito-beneficio"
        ],
        "netMovementInVisibleWindow": float(net),
        "derivedOpeningBalance": float(derived_opening),
        "coverage": {
            "rawSignedAmounts": len(expected_signed_amounts),
            "layoutParsedEntries": len(entries),
            "multisetMatchesRawExtraction": True,
        },
        "fingerprintVersion": "pluxee-pdf-v3-time-value-occurrence",
        "descriptionsIncluded": include_descriptions,
        "caveats": [
            "Um único crédito observado não prova valor fixo mensal.",
            "Saldo inicial derivado não prova ausência de eventos anteriores à janela.",
            "A prévia não cria transações nem altera saldo.",
            "Descrições ficam ocultas por padrão; inclusão explícita permanece local.",
        ],
    }


def _read_and_parse(
    path: Path, *, include_descriptions: bool = False
) -> tuple[dict[str, object], "pdf_text.PdfLido", str, list[tuple[str, Decimal]]]:
    lido = pdf_text.ler_pdf(path, max_bytes=MAX_PDF_BYTES, max_pages=MAX_PAGES)
    layout_text = pdf_text.extrair_texto(lido.conteudo, layout=True)
    raw_text = pdf_text.extrair_texto(lido.conteudo, layout=False)
    expected = signed_amounts(raw_text)
    report = parse_text(
        layout_text,
        lido.sha256,
        include_descriptions=include_descriptions,
        expected_signed_amounts=expected,
    )
    return report, lido, layout_text, expected


def parse(path: Path, *, include_descriptions: bool = False) -> dict[str, object]:
    report, _lido, _layout_text, _expected = _read_and_parse(
        path, include_descriptions=include_descriptions
    )
    return report


def build_envelope(
    report: dict[str, object], lido: "pdf_text.PdfLido", layout_text: str
) -> dict[str, object]:
    """Monta o envelope documento-extraido/v1 (classe extrato-pluxee).

    `descricao`/`contraparte` sempre carregam a descrição comercial do
    lançamento — o nome do estabelecimento é contraparte, não titular (ver
    docs/extracao-de-documentos.md, seção "Fronteira contraparte/titular":
    a contraparte é preservada, sem opt-in). Isso é independente da bandeira
    `--include-descriptions` da CLI, que governa só o relatório humano e o
    retorno de `parse()`/`parse_text()`: o `report` recebido aqui precisa ter
    vindo de um `parse_text(..., include_descriptions=True, ...)`, senão
    `entry["description"]` não existe e este código levanta `KeyError` de
    propósito, em vez de inventar um valor.
    """
    fonte = {
        "sha256": lido.sha256,
        "bytes": len(lido.conteudo),
        "paginas": lido.paginas,
        "extraido_em": contrato.agora_local(),
    }
    lancamentos = [
        {
            "data": entry["date"],
            "descricao": entry["description"],
            "valor": f"{entry['value']:.2f}",
            "natureza": entry["nature"],
            "contraparte": entry["description"],
        }
        for entry in report["entries"]
    ]
    # Os quatro avisos de `parse_text` incluem um sobre descrições ficarem
    # ocultas por padrão — verdadeiro para o relatório humano, falso aqui,
    # onde `descricao`/`contraparte` sempre vêm preenchidos. Não repetir esse
    # aviso específico no envelope.
    avisos = [caveat for caveat in report["caveats"] if "Descrições" not in caveat]
    envelope = contrato.envelope(
        "extrato-pluxee",
        fonte,
        totais={
            "saldo": f"{report['balance']:.2f}",
            "movimento_liquido_janela_visivel": f"{report['netMovementInVisibleWindow']:.2f}",
            "saldo_inicial_derivado": f"{report['derivedOpeningBalance']:.2f}",
        },
        lancamentos=lancamentos,
        sinais_privacidade=pdf_text.contar_sinais(layout_text),
        avisos=avisos,
    )
    contrato.exigir_valido(envelope)
    return envelope


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--json", action="store_true")
    parser.add_argument(
        "--include-descriptions",
        action="store_true",
        help="inclui descrições comerciais na saída local; pode conter dados sensíveis",
    )
    args = parser.parse_args()
    try:
        report, lido, layout_text, expected = _read_and_parse(
            args.pdf, include_descriptions=args.include_descriptions
        )
    except (ValueError, RuntimeError, OSError) as error:
        parser.error(str(error))

    if args.json:
        # O envelope preserva contraparte incondicionalmente (ver
        # build_envelope); `--include-descriptions` não se aplica a ele, só ao
        # `report` usado no relatório humano abaixo.
        report_com_descricoes = parse_text(
            layout_text,
            lido.sha256,
            include_descriptions=True,
            expected_signed_amounts=expected,
        )
        envelope = build_envelope(report_com_descricoes, lido, layout_text)
        print(json.dumps(envelope, ensure_ascii=False, indent=2))
        return
    print("Extrato Pluxee (somente relatório)")
    print(f"- Atualizado em: {report['updatedAt']}")
    print(f"- Saldo: R$ {report['balance']:.2f}")
    print(f"- Lançamentos reconhecidos: {report['entryCount']}")
    print(f"- Cobertura layout/raw: {report['coverage']['layoutParsedEntries']}/{report['coverage']['rawSignedAmounts']}")
    print(f"- Movimento líquido visível: R$ {report['netMovementInVisibleWindow']:.2f}")
    print(f"- Saldo inicial derivado: R$ {report['derivedOpeningBalance']:.2f}")
    for credit in report["observedBenefitCredits"]:
        print(f"- Crédito de benefício observado: {credit['date']} · R$ {credit['value']:.2f}")
    print("Nenhum dado foi aplicado; use a prévia para revisão humana.")


if __name__ == "__main__":
    main()
