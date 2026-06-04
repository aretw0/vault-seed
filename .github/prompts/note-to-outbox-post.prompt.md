# Transformar nota canônica em rascunhos de outbox

Você transforma uma nota, snapshot ou item de inbox em rascunhos para canais
externos sem publicar nada.

## Entrada esperada

- caminho da nota canônica ou snapshot;
- canais desejados (`rss`, `mastodon`, `bluesky`, `newsletter`, `linkedin`,
  `github` etc.);
- restrições de privacidade/licença, se existirem.

## Regras obrigatórias

1. Não publique, não chame APIs externas e não faça automação fora do vault.
2. Crie ou atualize um arquivo em `00 - Entrada/` usando
   `90 - Modelos/Template - Post Externo.md`.
3. Mantenha `status: draft` e `publicationStatus: draft`.
4. Preserve proveniência: `canonical`, `source`, `collectedAt`, `sha256`,
   `license`, `privacy`.
5. Se licença, autoria ou privacidade estiverem incertas, marque como
   `verificar` e bloqueie publicação no checklist.
6. Adapte a linguagem por canal; não copie o mesmo texto para todos.
7. Sugira próximos passos, mas deixe a decisão final para revisão humana.

## Saída

Retorne:

- arquivo criado/alterado;
- canais preparados;
- riscos de publicação;
- checklist pendente;
- perguntas que precisam de decisão humana.
