# Guia Rápido: Segurança de Segredos com Git

Este repositório utiliza filtros Git para proteger segredos (ex: chaves de API) em arquivos versionados.

## Como funciona
- O segredo real nunca é salvo no histórico do Git.
- O arquivo versionado traz apenas um placeholder.
- Na sua máquina, o segredo é restaurado automaticamente usando o arquivo `.env`.

## Passos para colaboradores
1. Adicione sua chave de API ao arquivo `.env`.
2. Nunca commit o arquivo `.env`.
3. Ao editar arquivos sensíveis, o filtro irá proteger o segredo automaticamente.

## Referência
Consulte `docs/gerenciando-segredos-com-git.md` para detalhes técnicos e analogias.
