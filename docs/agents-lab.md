# Agents Lab

[`agents-lab`](https://github.com/aretw0/agents-lab) e outro projeto do mesmo
ecossistema, usado como laboratorio de agentes para curar capacidades que podem
apoiar o desenvolvimento do `vault-seed`, especialmente skills, extensoes,
tools e pesquisas operacionais sobre agentes.

Ele nao faz parte deste repositorio e tambem nao faz parte do vault gerado para
o usuario final. Nesta maquina de desenvolvimento, o checkout local fica em
`../../agents-lab`; essa localizacao e contexto de mantenedor, nao contrato do
template.

Referencias a esse projeto devem ficar em documentacao tecnica do template,
specs, planos ou notas de manutencao. Notas em `99 - Meta e Anexos/` devem falar
com o usuario final e evitar depender de caminhos locais.

## Relacao Com O Vault Seed

Use `agents-lab` como ambiente de incubacao quando uma capacidade de agente
precisa ser reutilizavel fora de uma unica sessao de Codex ou Claude. O
`vault-seed` deve receber apenas o que ja virou contrato claro para o usuario:
scripts, documentacao, validacoes ou arquivos versionados.

## Marimo

Para Marimo, a recomendacao atual e separar duas camadas:

- **Arquivo e terminal:** fluxo estavel hoje. O agente edita notebooks `.py`,
  roda `pnpm run notebooks:check`, valida execucao de sessao e revisa
  `git diff`.
- **Runtime Marimo:** fluxo a estudar. `marimo pair`, MCP e ACP podem dar acesso
  a celulas, variaveis em memoria e UI, mas devem entrar como integracao
  governada, com testes e fallback para o fluxo de arquivo.

Um backlog natural para `agents-lab` e uma skill/tool Marimo que:

- inicia `pnpm run notebooks:dev`;
- gera prompts com `pnpm run notebooks:pair`;
- lista notebooks em `99 - Meta e Anexos/Notebooks/`;
- executa `pnpm run notebooks:check`;
- inspeciona diffs antes de publicar;
- orienta quando atualizar `.site/lab.notebooks.json`.

Essa integracao deve documentar explicitamente se esta operando so por arquivo
ou se esta conectada ao runtime vivo do Marimo.

## Refarm

`refarm` pode servir como referencia de operacao e orquestracao no ecossistema,
mas nao e dependencia do `vault-seed`. Qualquer padrao inspirado nele deve
chegar aqui como contrato pequeno: arquivo, comando, validacao ou documentacao
que funcione sem checkout local de outro repositorio.
