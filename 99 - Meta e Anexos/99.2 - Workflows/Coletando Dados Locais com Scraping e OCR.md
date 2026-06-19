---
title: Coletando Dados Locais com Scraping e OCR
aliases:
  - Scraping e OCR no Lab
  - Coleta Local para o Lab
tags:
  - meta/lab
  - meta/dados
  - meta/automacao
status: published
created: 2026-05-26
updated: 2026-05-26
category: workflow
audience: intermediário
related:
  - "[[Usando o Lab (Notebooks Marimo)]]"
  - "[[Preparando Dados para o Lab]]"
---

# Coletando Dados Locais com Scraping e OCR

O Lab consegue apoiar coletas de páginas, arquivos, imagens e APIs, mas a parte
sensível deve rodar **antes da publicação**, no seu computador ou em CI. O HTML
publicado em `/lab/` deve receber snapshots prontos, como JSON, CSV ou Parquet.

Pense em três etapas:

1. **Extract local:** baixar páginas, ler arquivos privados, executar OCR ou
   chamar APIs com token.
2. **Snapshot efêmero:** gravar o resultado limpo em `.dgk/` — pasta oculta
   da CLI, gitignored, regenerada a cada execução do ETL.
3. **Lab publicado:** declarar o snapshot em `.site/lab.datasets.json` e ler o
   arquivo no notebook Marimo exportado.

## O Que Vem Pronto

O runtime compartilhado dos notebooks fica em
`99 - Meta e Anexos/Notebooks/_lab_notebook_runtime.py`. Ele entrega primitivas
para:

| Necessidade | Primitiva | Onde roda |
| --- | --- | --- |
| detectar ambiente local ou publicado | `lab_runtime_context()` | local e HTML |
| bloquear operação perigosa no HTML | `require_local_runtime()` | local e HTML |
| ler datasets publicados | `read_lab_dataset()` / `read_lab_json()` | local e HTML |
| ler arquivo privado do vault | `read_local_text_file()` / `read_local_bytes_file()` | local |
| buscar texto de página simples | `fetch_local_url_text()` | local |
| raspar página dinâmica | `scrape_local_page_text()` | local |
| extrair texto de imagem | `extract_local_image_text()` | local |
| ler segredo de ambiente | `get_local_secret()` | local |
| gravar JSON/CSV/Parquet | `write_local_json_snapshot()` / `write_local_dataframe_snapshot()` | local |
| limpar texto e gerar hash | `clean_lab_text()` / `fingerprint_data()` | local e HTML |

Essas primitivas são pequenas de propósito. Elas não tentam virar um framework de
ETL; elas dão uma base segura para a pessoa adaptar a coleta ao próprio domínio.

## Diagnóstico Da Bancada Local

Para verificar se o ambiente tem as ferramentas opcionais de scraping, OCR e
Parquet, rode:

```bash
pnpm run notebooks:extract:check
```

Esse comando usa `requirements.local-etl.txt` e informa se estão disponíveis:

- Playwright para páginas dinâmicas;
- Chromium do Playwright;
- Pillow e pytesseract para OCR;
- binário `tesseract` no sistema;
- PyArrow para snapshots Parquet opcionais;
- Requests para coletas HTTP simples.

Se o Chromium do Playwright não estiver instalado, rode:

```bash
pnpm run notebooks:extract:browser
```

Para OCR, você também precisa instalar o binário `tesseract` no sistema. Em
Linux, isso costuma ser um pacote do sistema. Em Windows, instale o Tesseract e
garanta que o executável esteja no `PATH` antes de abrir o notebook.

## Começando Por Um Starter

Copie o starter:

```text
99 - Meta e Anexos/Notebooks/starters/coleta-local.py
```

para, por exemplo:

```text
99 - Meta e Anexos/Notebooks/minha-coleta.py
```

Depois abra o Lab local:

```bash
dgk lab minha-coleta
```

O starter já traz campos para:

- coletar uma URL simples;
- executar OCR em uma imagem local;
- verificar se um segredo de ambiente existe;
- gravar um snapshot JSON em `.dgk/`;
- bloquear a escrita quando o notebook estiver publicado em HTML.

## Receita: Página Simples

Essa receita serve quando a página tem HTML suficiente sem precisar de navegador real:

```python
from _lab_notebook_runtime import fetch_local_url_text, write_local_json_snapshot

page = fetch_local_url_text("https://example.com")
write_local_json_snapshot(
    ".dgk/minha-pagina.json",
    {
        "schemaVersion": 1,
        "source": page["url"],
        "title": page["title"],
        "text": page["text"],
    },
)
```

## Receita: Página Dinâmica

Escolha esta opção quando a página precisa renderizar JavaScript. A função é assíncrona:

```python
from _lab_notebook_runtime import scrape_local_page_text, write_local_json_snapshot

page = await scrape_local_page_text("https://example.com")
write_local_json_snapshot(".dgk/minha-pagina-dinamica.json", page)
```

Se o navegador local ainda não existir, rode `pnpm run notebooks:extract:browser`.

## Receita: OCR De Imagem

Para dados em imagem, print ou documento já convertido para imagem:

```python
from _lab_notebook_runtime import extract_local_image_text, write_local_json_snapshot

text = extract_local_image_text("anexos/exemplo.png", languages="por+eng")
write_local_json_snapshot(
    ".dgk/ocr-exemplo.json",
    {
        "schemaVersion": 1,
        "source": "anexos/exemplo.png",
        "text": text,
    },
)
```

O OCR local depende de Pillow, pytesseract e do binário `tesseract` instalado.

## Receita: API Com Token

Segredos devem ficar em variáveis de ambiente, nunca no notebook publicado:

```python
from urllib.request import Request, urlopen
import json

from _lab_notebook_runtime import get_local_secret, write_local_json_snapshot

token = get_local_secret("MINHA_API_TOKEN", required=True)
request = Request(
    "https://api.example.com/data",
    headers={"Authorization": f"Bearer {token}"},
)
with urlopen(request, timeout=20) as response:
    payload = json.loads(response.read())

write_local_json_snapshot(".dgk/minha-api.json", payload)
```

Depois que o snapshot existir, declare o arquivo em `.site/lab.datasets.json`:

```json
{
  "id": "minha-api",
  "title": "Minha API",
  "description": "Snapshot local gerado antes da publicação",
  "source": ".dgk/minha-api.json",
  "output": "minha-api.json",
  "format": "json",
  "publish": true
}
```

Finalize com:

```bash
dgk etl
pnpm run notebooks:check  # verificação extra (dev)
```

## Limites Intencionais

O kit não tenta burlar paywalls, termos de uso, autenticação de terceiros ou
políticas de robots. Ele oferece uma bancada local para dados que você tem
direito de acessar, transformar e versionar.

Também não coloca tokens, arquivos privados ou OCR bruto dentro do site sem uma
decisão explícita. Publicar um dataset é sempre uma escolha feita no manifesto.
