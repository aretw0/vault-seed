# Agents Lab

[`agents-lab`](https://github.com/aretw0/agents-lab) é outro projeto do mesmo
ecossistema, usado como laboratório de agentes para curar capacidades que podem
apoiar o desenvolvimento do `vault-seed`, especialmente skills, extensões,
tools e pesquisas operacionais sobre agentes.

Ele não faz parte deste repositório e também não faz parte do vault gerado para
o usuário final. Onde cada mantenedor mantém esse projeto é detalhe do ambiente
local, não contrato do template — nenhuma documentação ou automação aqui deve
assumir um caminho específico de checkout para ele.

Referências a esse projeto devem ficar em documentação técnica do template,
specs, planos ou notas de manutenção. Notas em `99 - Meta e Anexos/` devem falar
com o usuário final e evitar depender de caminhos locais.

## Relação Com O Vault Seed

Use `agents-lab` como ambiente de incubação quando uma capacidade de agente
precisa ser reutilizável fora de uma única sessão de Codex ou Claude. O
`vault-seed` deve receber apenas o que já virou contrato claro para o usuário:
scripts, documentação, validações ou arquivos versionados.

## Marimo

Para Marimo, a recomendação atual é separar duas camadas:

- **Arquivo e terminal:** fluxo estável hoje. O agente edita notebooks `.py`,
  roda `pnpm run notebooks:check`, valida execução de sessão e revisa
  `git diff`.
- **Runtime Marimo:** fluxo a estudar. `marimo pair`, MCP e ACP podem dar acesso
  a células, variáveis em memória e UI, mas devem entrar como integração
  governada, com testes e fallback para o fluxo de arquivo.

Um backlog natural para `agents-lab` é uma skill/tool Marimo que:

- inicia `pnpm run notebooks:dev`;
- gera prompts com `pnpm run notebooks:pair`;
- lista notebooks em `99 - Meta e Anexos/Notebooks/`;
- executa `pnpm run notebooks:check`;
- inspeciona diffs antes de publicar;
- orienta quando atualizar `.site/lab.notebooks.json`.

Essa integração deve documentar explicitamente se está operando só por arquivo
ou se está conectada ao runtime vivo do Marimo.

## Refarm

`refarm` pode servir como referência de operação e orquestração no ecossistema,
mas não é dependência do `vault-seed`. Qualquer padrão inspirado nele deve
chegar aqui como contrato pequeno: arquivo, comando, validação ou documentação
que funcione sem checkout local de outro repositório.
