---
title: Publicando e Consumindo RSS no Vault
aliases:
  - RSS no Vault
  - Feeds no Jardim Digital
  - Sindicação do Vault
tags:
  - meta/site
  - meta/dados
  - meta/lab
  - meta/automacao
status: published
created: 2026-05-26
updated: 2026-05-26
category: workflow
audience: todos
related:
  - "[[Publicando seu Vault como Site]]"
  - "[[Preparando Dados para o Lab]]"
  - "[[Coletando Dados Locais com Scraping e OCR]]"
---

# Publicando e Consumindo RSS no Vault

RSS é uma peça simples de soberania digital: você publica atualizações em um
formato aberto, pessoas podem assinar sem algoritmo, e o próprio Lab pode tratar
feeds como dados auditáveis.

No `vault-seed`, RSS tem dois papéis:

1. **Produzir seu feed:** o site gera `/rss.xml` com as notas publicadas.
2. **Consumir feeds externos:** o Lab local pode baixar RSS/Atom, normalizar os
   itens e gravar snapshots em `dados/lab/`.

## Produzindo Seu Feed

Ao rodar o build do site, o Astro gera:

```text
/rss.xml
```

O feed lista as notas publicadas mais recentes, usando `updated` ou `created` do
frontmatter quando esses campos existem.

Para que os links do feed fiquem corretos em produção, o deploy deve informar o
endereço público do site. O workflow de GitHub Pages do template já passa
`ASTRO_SITE` e `ASTRO_BASE` no build. Em uma publicação própria, mantenha essa
mesma ideia:

```bash
ASTRO_SITE="https://usuario.github.io" \
ASTRO_BASE="/meu-vault" \
pnpm run site:build
```

Se você rodar localmente sem `ASTRO_SITE`, o feed ainda é gerado para validação,
mas os links usam um endereço local de fallback.

## Onde O Feed Aparece

O site também inclui um `<link rel="alternate" type="application/rss+xml">` no
`<head>`, permitindo que leitores RSS detectem o feed automaticamente.

Você pode divulgar diretamente:

```text
https://SEU_SITE/rss.xml
```

ou, em GitHub Pages com base de repositório:

```text
https://USUARIO.github.io/REPOSITORIO/rss.xml
```

## Consumindo Feeds Como Dados

Feeds externos devem ser consumidos no modo local do Lab, antes da publicação.
Isso evita depender de CORS, disponibilidade de terceiros e rede do visitante.

Use a primitiva `fetch_local_feed()`:

```python
from _lab_notebook_runtime import fetch_local_feed, write_local_json_snapshot

feed = fetch_local_feed("https://example.com/feed.xml")
write_local_json_snapshot("dados/lab/feed-exemplo.json", feed)
```

O snapshot gerado tem uma forma simples:

```json
{
  "schemaVersion": 1,
  "kind": "feed",
  "format": "rss",
  "source": "https://example.com/feed.xml",
  "title": "Exemplo",
  "itemCount": 10,
  "items": [
    {
      "title": "Título do item",
      "url": "https://example.com/post",
      "published": "...",
      "updated": "...",
      "summary": "...",
      "guid": "..."
    }
  ]
}
```

Depois declare o snapshot em `.site/lab.datasets.json`:

```json
{
  "id": "feed-exemplo",
  "title": "Feed Exemplo",
  "description": "Itens normalizados de um feed RSS externo",
  "source": "dados/lab/feed-exemplo.json",
  "output": "feed-exemplo.json",
  "format": "json",
  "publish": true
}
```

Finalize com:

```bash
pnpm run notebooks:etl
pnpm run notebooks:check
```

## Analisando Um Feed No Lab

No notebook, leia o dataset já empacotado:

```python
import pandas as pd
from _lab_notebook_runtime import load_lab_manifest, read_lab_dataset

manifest = load_lab_manifest()
feed = read_lab_dataset("feed-exemplo", manifest)
items = pd.DataFrame(feed["items"])
items[["title", "url", "published"]]
```

A partir daí, você pode:

- contar frequência de publicação;
- listar domínios citados;
- comparar feeds diferentes;
- transformar itens em notas de leitura;
- cruzar feeds com tags e MOCs do vault;
- gerar alertas ou dashboards locais.

## Feed Não É Rede Social Fechada

RSS não substitui todas as redes sociais, mas oferece um contrato melhor para um
jardim digital:

- o formato é aberto;
- o leitor é escolhido pela pessoa;
- a lista de assinaturas pode ser exportada;
- o histórico pode virar snapshot versionado;
- agentes e notebooks conseguem auditar o que foi publicado.

Quando uma API social exigir token, rate limit ou contrato instável, trate como
uma fonte local de ETL: colete com segredo no computador, normalize, grave um
snapshot e publique apenas o recorte que faz sentido.

## Boas Práticas

- Publique só notas com `status: published`.
- Mantenha `created` e `updated` no frontmatter das notas importantes.
- Use títulos humanos; eles aparecem no leitor RSS.
- Não coloque segredos ou dados privados em snapshots publicados.
- Prefira snapshots pequenos para o Lab publicado.
- Guarde feeds externos como evidência quando eles fundamentarem uma análise.

RSS é pequeno, mas fecha um ciclo importante: o vault deixa de ser apenas um site
e passa a ser também uma fonte assinável e uma bancada para auditar fontes
assináveis de outras pessoas.
