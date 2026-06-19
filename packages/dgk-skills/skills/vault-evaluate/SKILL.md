---
name: vault-evaluate
description: Avalia a qualidade de escrita de notas do vault com regras determinísticas
version: 0.1.0
---

# Vault Evaluate

Avalie a qualidade de escrita de uma nota com `dgk evaluate`. `dgk check`
também roda essa avaliação em batch e inclui a prosa dos notebooks Marimo de
apresentação como parte da verificação geral de saúde do vault.

```bash
# Avaliação de uma nota específica
dgk evaluate "40 - Recursos/Jardim digital.md"

# Com perfil mais rigoroso
dgk evaluate "40 - Recursos/Jardim digital.md" --profile ultra-rigor

# Avaliação em batch de todas as notas configuradas
dgk evaluate

# Avaliação da prosa dos slides Marimo
dgk evaluate --presentations
```

O output é um relatório Markdown com status, achados e frases longas.

## Interpretando o resultado

O relatório tem três severidades:

- **fail** — bloqueante; a nota não deve ser promovida a `status: published` sem correção
- **warn** — requer revisão editorial antes de publicar
- **info** — aviso não bloqueante (ex.: frase longa dentro do limite de `info`)

O status geral é:
- `PASS` — nenhum achado
- `PASS_WITH_WARNINGS` — apenas `warn` ou `info`
- `FAIL` — ao menos um `fail`

## Regras disponíveis

| Regra | O que detecta |
|---|---|
| `mechanical-opener-repeat` | Abertura de parágrafo repetida em janela deslizante (ex.: "Além disso", "Por fim") |
| `paragraph-starter-repeat` | N-grama de 2 palavras repetido no início de parágrafos em janela de 12 |
| `sentence-starter-repeat` | N-grama de 3 palavras repetido no início de frases em janela de 10 |
| `parallel-copula-repeat` | Frases consecutivas com mesma abertura + verbo "é" (ex.: "O X é... O X é...") |
| `paragraph-template-repeat` | Template sintático abstrato de abertura repetido em janela de 14 |
| `long-sentence` | Frase acima do limite de palavras configurado por público |
| `ai-chatbot-artifacts` | Frases conversacionais de chatbot ("espero que isso ajude", "me avise se") |
| `ai-atribuicao-vaga` | Atribuições sem fonte ("especialistas afirmam", "relatórios do setor") |
| `ai-tropo-persuasivo` | Retórica de autoridade sem conteúdo ("no cerne da questão", "fundamentalmente") |
| `ai-conclusao-generica` | Conclusões genéricas/promocionais sem dado verificável ("rumo à excelência") — severidade `fail` |
| `ai-filler-hedging` | Hedging excessivo ("poderia potencialmente", "de certa forma") |
| `draft-markers` | Marcadores de rascunho não removidos (TODO, FIXME, PENDENTE) — severidade `fail` |
| `metatransicao-redundante` | Frases de costura que só anunciam o próximo parágrafo |
| `autopromocao` | Autoelogio retórico explícito ("somos incríveis", "ferramenta revolucionária") |

## Fluxo recomendado

1. Leia a nota com `vault-read` para entender o contexto
2. Avalie com `vault-evaluate`
3. Para cada `warn` ou `fail`, leia o trecho no campo `snippet` do achado
4. Sugira revisão concreta ao usuário antes de promover a nota
5. Re-avalie após correção para confirmar o status `PASS`

## Limites por público

O campo `audience` do frontmatter da nota ajusta o limite de frase longa:

| `audience` | limite de palavras |
|---|---:|
| iniciante | 32 |
| intermediario | 45 |
| avancado | 55 |
| todos | 45 |

Para notas sem `audience` declarado, o padrão é 45 palavras.
