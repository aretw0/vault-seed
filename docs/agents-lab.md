# Agents Lab

`agents-lab` e o laboratorio de agentes usado para curar capacidades que podem
apoiar o desenvolvimento do `vault-seed`, especialmente skills, extensoes,
tools e pesquisas operacionais sobre agentes.

Ele nao faz parte do vault gerado para o usuario final. Referencias a esse
projeto devem ficar em documentacao tecnica do template, specs, planos ou notas
de manutencao. Notas em `99 - Meta e Anexos/` devem falar com o usuario final e
evitar caminhos locais como `../../agents-lab`.

## Relacao Com O Vault Seed

Use `agents-lab` como ambiente de incubacao quando uma capacidade de agente
precisa ser reutilizavel fora de uma unica sessao de Codex ou Claude. O
`vault-seed` deve receber apenas o que ja virou contrato claro para o usuario:
scripts, documentacao, validacoes ou arquivos versionados.

## Marimo

Para Marimo, a recomendacao atual e separar duas camadas:

- **Arquivo e terminal:** fluxo estavel hoje. O agente edita notebooks `.py`,
  roda `pnpm run notebooks:data`, valida Python e revisa `git diff`.
- **Runtime Marimo:** fluxo a estudar. `marimo pair`, MCP e ACP podem dar acesso
  a celulas, variaveis em memoria e UI, mas devem entrar como integracao
  governada, com testes e fallback para o fluxo de arquivo.

Um backlog natural para `agents-lab` e uma skill/tool Marimo que:

- inicia `pnpm run notebooks:dev`;
- lista notebooks em `99 - Meta e Anexos/Notebooks/`;
- regenera `vault-data.json`;
- valida notebooks com Python;
- inspeciona diffs antes de publicar;
- orienta quando atualizar `.site/lab.notebooks.json`.

Essa integracao deve documentar explicitamente se esta operando so por arquivo
ou se esta conectada ao runtime vivo do Marimo.
