# ROADMAP — @aretw0/dgk-skills

Skills declarativas do DGK para agentes Pi (e futuramente refarm).
**Canônico ao DGK** — fica neste repositório. Compatível com agents-lab via
SKILL.md puro e campo `"pi"` no package.json, mas não migra para agents-lab.
Para agents-lab vai apenas o que for agnóstico do DGK.

## v0.1.0 (publicado) → v0.2.0 (em release)

| Skill | Descrição | Status |
|---|---|---|
| `vault-context` | Contexto geral do vault (estrutura, notas recentes) | ✓ |
| `vault-search` | Busca por título, tag ou conteúdo | ✓ |
| `vault-read` | Leitura de nota por caminho | ✓ |
| `vault-create` | Criação de nota com frontmatter | ✓ |
| `vault-daily` | Nota diária (criar ou abrir) | ✓ |
| `vault-evaluate` | Avaliação de qualidade de escrita (determinístico) | ✓ v0.2.0 |
| `vault-admin` | Admin de canais, outbox e config via CLI/dashboard | ✓ v0.2.0 |

## Próximas skills

- `vault-publish` — disparar publicação de nota específica (`dgk outbox telegram`)
- `vault-inbox` — resumir inbox (`00 - Entrada/`) e sugerir ações
- `vault-changelog` — ler último entry do CHANGELOG e preparar nota de release

## Convergência de engine

1. Hoje: campo `"pi": { "skills": [...] }` — runtime Pi
2. Quando refarm tiver runtime estável: adicionar `"refarm": { "skills": [...] }`
   — sem reescrever SKILL.md (são Markdown puro)
3. Refarm como engine canônico: `"pi"` vira campo legado; package permanece aqui
