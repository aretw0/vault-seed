---
title: Criando uma Distribuição Personalizada
description: Como derivar uma instância do arcabouço a partir do vault-seed template
---

# Criando uma Distribuição Personalizada

O vault-seed é um **arcabouço base** — um template que produz *distribuições
personalizadas*. Cada distribuição é uma instância soberana com identidade,
conteúdo e configuração próprios, mas herdando a estrutura PARA, o pipeline Lab
e a governança Git do template original.

## O que é uma distribuição

Uma distribuição é um repositório Git inicializado a partir do vault-seed que:

- Mantém a estrutura PARA (`00 - Entrada`, `10 - Diário`, `20 - Projetos`,
  `30 - Áreas`, `40 - Recursos`, `50 - Arquivo`, `90 - Modelos`, `99 - Meta e Anexos`)
- Herda o pipeline Lab (ETL, notebooks, outbox multi-canal)
- Possui identidade própria: nome, README, CONTRIBUTING e AGENTS específicos
- Pode estender o arcabouço com pacotes adicionais (ingestion, scraping, etc.)
- Não depende do template original após a inicialização — é soberana

## Fluxo de inicialização

```
1. Usuário cria novo repositório no GitHub usando vault-seed como template
2. No primeiro push para `main`, o workflow initialize.yml executa
3. O workflow:
   a. Renomeia arquivos template (README.template.md → README.md, etc.)
   b. Remove estrutura de desenvolvimento (docs/, packages/cli, workflows de CI do template)
   c. Habilita GitHub Pages automaticamente
4. O resultado é um vault limpo, pronto para uso
```

O arquivo `.github/workflows/initialize.yml` é o único ponto de acoplamento
entre o template e a distribuição. Após executar, ele se auto-destrói.
Ele não configura proteção de branches: um repositório recém-criado ainda não
tem secrets administrativos próprios, e o `GITHUB_TOKEN` da primeira execução
não deve ser tratado como permissão de administração. A proteção de `main` e
`develop` é uma etapa de governança pós-criação, descrita em
[`docs/git-workflow.md`](git-workflow.md).

### Contrato técnico do initialize.yml

Esta seção é documentação para mantenedores do template. Ela fica em `docs/`
porque o usuário final recebe o vault já inicializado e não precisa manter uma
nota sobre a automação interna que gerou o repositório.

O workflow roda apenas fora do repositório `aretw0/vault-seed`. Em um vault
criado a partir do template, ele:

1. Renomeia arquivos `.template` para os nomes finais usados no vault.
2. Remove pastas, workflows e scripts que pertencem só ao desenvolvimento do
   template.
3. Mantém a stack que o usuário realmente usa: Git, GitHub Actions, Astro,
   Obsidian, VS Code/Foam e Marimo.
4. Publica apenas a nota de boas-vindas inicial.
5. Habilita GitHub Pages com o `GITHUB_TOKEN` padrão do repositório gerado.
6. Remove o próprio `.github/workflows/initialize.yml` após a recepção, para
   garantir que a inicialização rode uma única vez.

Esse contrato não deve depender de secrets pré-configurados no repositório do
usuário. Qualquer ação que exija permissão administrativa, como proteger
branches, precisa acontecer depois que a distribuição já existe.

Se precisar auditar esse comportamento, revise `.github/workflows/initialize.yml`
antes de criar ou validar uma nova distribuição.

## O que o template remove durante a inicialização

Arquivos e pastas presentes no vault-seed que **não chegam** à distribuição:

| Removido | Motivo |
| --- | --- |
| `docs/` | Documentação do template, não do vault do usuário |
| `packages/cli/` | O CLI é publicado no npm; o usuário instala via `npm i -g @aretw0/dgk-cli` |
| `.changeset/` | Governança de release do template |
| `scripts/audience_boundary.test.js` e outros testes de template | Testes internos de integridade do template |
| Workflows de CI do template | `prepare-release-pr.yml`, `release.yml`, `publish-cli.yml`, etc. |

O que **fica** na distribuição:

| Mantido | Função |
| --- | --- |
| Estrutura PARA de pastas | Organização do conhecimento |
| `99 - Meta e Anexos/Notebooks/` | Notebooks Lab interativos |
| `.github/workflows/ci.yml` | CI básico de validação |
| `.github/workflows/refresh-lab-data.yml` | Atualização automática dos dados do Lab |
| `.site/` e `dados/` | Site estático + dados Lab |
| `package.json` (renomeado de `package.template.json`) | Scripts npm para o vault |

## Personalizando a distribuição

Após a inicialização, a distribuição é independente. Personalizações comuns:

### Namespace semântico próprio

Se a distribuição for institucional, defina um vocabulário próprio em vez de
usar o `dgk:` padrão. Exemplo (`scripts/lab_etl_demo.mjs`):

```javascript
// Substituir "dgk:" pelo namespace da sua organização
dgk: "https://sua-org.example.com/vocab/1.0#",
```

### Frontmatter canônico

Adicione campos específicos ao frontmatter padrão das notas:

```yaml
---
title: Título
status: draft
tipo_registro: requisito | decisão | registro       # campo da distribuição
source: jira | confluence | manual                  # origem do dado
---
```

### Pipeline de ingestão customizado

Adicione scripts em `scripts/` para ingestão de fontes específicas
e registre-os em `package.json`:

```json
"scripts": {
  "lab:ingest:jira": "node scripts/ingest_jira.mjs",
  "lab:ingest:notion": "node scripts/ingest_notion.mjs"
}
```

### Extensões Pi (skills e ferramentas de agentes)

Crie skills específicas da distribuição com `dgk publish skill`:

```bash
dgk publish skill pesquisa-academica
# edita packages/pesquisa-academica/skills/pesquisa-academica/SKILL.md
npm publish --provenance
```

## Exemplo: distribuição de equipe de produto

Uma equipe que gerencia um produto pode criar uma distribuição que ingere
tarefas do Jira e documentos do Notion:

```
vault-produto/
├── 20 - Projetos/
│   └── v2.0/
│       ├── historia-001.md           # frontmatter: source: jira, tipo: historia
│       └── decisao-api.md
├── 40 - Recursos/
│   └── Design/
│       └── guia-de-estilo.md         # importado do Notion
├── scripts/
│   └── ingest_jira.mjs               # busca issues via Jira REST API
└── packages/
    └── produto-skills/               # skill Pi para o contexto da equipe
        ├── package.json              # "pi": { "skills": ["skills/produto-skills"] }
        └── skills/produto-skills/
            └── SKILL.md
```

## Exemplo: distribuição de pesquisadora

Uma pesquisadora com material de mestrado (PDFs, OCR, scraping) pode criar
uma distribuição que organiza e publica sua curadoria:

```
vault-pesquisa/
├── 40 - Recursos/
│   └── Literatura/
│       └── artigo-ocr-001.md         # nota gerada via OCR de PDF
├── scripts/
│   └── ingest_pdf_ocr.mjs            # pipeline de extração de texto
└── packages/
    └── ocr-skills/                   # ensina agentes sobre o acervo
        ├── package.json
        └── skills/ocr-skills/
            └── SKILL.md
```

O vault do usuário final não sabe que partiu do vault-seed — ele é soberano.
O template é apenas a origem; a distribuição é o destino.

## Referências

- `initialize.yml` — workflow de inicialização com lista completa de arquivos
  removidos e renomeados
- `packages/dgk-skills/` — exemplo de skill Pi publicada como pacote npm
- `dgk publish skill|extension` — scaffold para criar novas skills/extensões
