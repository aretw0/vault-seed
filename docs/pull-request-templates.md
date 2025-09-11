# Estratégia de Templates para Pull Requests

Este documento detalha a estratégia e os tipos de templates de Pull Request (PR) utilizados neste repositório. O objetivo é padronizar as contribuições, facilitar o processo de revisão e garantir a qualidade tanto do conteúdo do vault quanto da sua estrutura técnica.

**Analogia:** Pense nos templates de PR como formulários padronizados para "solicitar permissão para plantar ou podar" no seu jardim digital. Eles garantem que todas as informações necessárias sejam fornecidas para que o "jardineiro-chefe" possa aprovar a mudança.

## Localização dos Templates

Todos os templates de Pull Request estão localizados na pasta `.github/PULL_REQUEST_TEMPLATE/` na raiz do repositório. O GitHub automaticamente detecta e oferece esses templates ao abrir um novo Pull Request.

## Tipos de Templates de Pull Request

Os templates são categorizados para cobrir tanto a aquisição e refinamento de conhecimento (conteúdo do vault) quanto a manutenção técnica e evolução do framework.

### 1. Para Aquisição e Refinamento de Conhecimento (Conteúdo do Vault)

Estes templates são focados em mudanças no conteúdo principal do seu vault.

*   **`feat-knowledge-note.md` (Nova Nota de Conhecimento)**
    *   **Uso:** Para adicionar uma nota completamente nova ao vault (conceito, resumo de artigo, ideia, etc.).
    *   **Foco:** Garantir que a nova nota se encaixe na estrutura, tenha links e tags adequados.
    *   **Exemplo de Título de PR:** `feat(note): Adiciona conceito sobre o método PARA`

*   **`refactor-knowledge-note.md` (Refinamento/Atualização de Nota)**
    *   **Uso:** Para melhorar, expandir, corrigir ou refatorar o conteúdo de uma nota existente.
    *   **Foco:** Clareza, precisão, atualização de informações, melhoria de links/tags.
    *   **Exemplo de Título de PR:** `refactor(note): Melhora explicação sobre MOCs`

### 2. Para Manutenção Técnica e Evolução do Framework (Estrutura do Vault)

Estes templates são focados em mudanças na estrutura, scripts, automações ou meta-documentação do vault.

*   **`fix-technical.md` (Correção Técnica)**
    *   **Uso:** Para corrigir bugs ou problemas na estrutura do vault, scripts, automações ou meta-documentação (`docs/`, `99-Meta/`).
    *   **Foco:** Descrição do problema, solução implementada, impacto.
    *   **Exemplo de Título de PR:** `fix(script): Corrige erro no script de limpeza`

*   **`feat-technical-enhancement.md` (Melhoria/Nova Funcionalidade Técnica)**
    *   **Uso:** Para adicionar novas funcionalidades ao framework do vault (novos scripts, workflows, automações, etc.).
    *   **Foco:** Descrição da funcionalidade, como testar, impacto.
    *   **Exemplo de Título de PR:** `feat(workflow): Adiciona automação para notas diárias`

*   **`docs-update.md` (Atualização de Documentação Técnica)**
    *   **Uso:** Para atualizar ou adicionar documentação específica sobre o funcionamento técnico do repositório (ex: `docs/git-workflow.md`).
    *   **Foco:** Clareza, precisão, relevância da informação técnica.
    *   **Exemplo de Título de PR:** `docs(git): Atualiza guia de workflow Git`

*   **`chore-maintenance.md` (Tarefa de Manutenção)**
    *   **Uso:** Para tarefas de manutenção de rotina que não adicionam funcionalidades nem corrigem bugs (ex: atualização de dependências, ajustes de linter, limpeza de arquivos temporários).
    *   **Foco:** Descrição da tarefa, justificativa.
    *   **Exemplo de Título de PR:** `chore(deps): Atualiza dependências do projeto`

## Estrutura Básica de um Template

Cada template segue uma estrutura comum para garantir que todas as informações relevantes sejam capturadas.

```markdown
---
name: Nome do Template (ex: Nova Nota de Conhecimento)
about: Descrição breve do propósito deste template de PR.
title: "tipo(escopo): Título conciso do PR"
labels:
  - "tipo/feature" # ou tipo/bug, tipo/docs, etc.
assignees:
  - seu-usuario-github # Opcional: pode ser removido ou preenchido automaticamente
---

## Descrição

<!-- Descreva em detalhes o que esta Pull Request faz e por que ela é necessária. -->

## Tipo de Mudança

<!-- Marque com um 'x' entre os colchetes as opções que se aplicam. -->
- [ ] Nova Nota de Conhecimento
- [ ] Refinamento/Atualização de Nota
- [ ] Correção Técnica
- [ ] Melhoria/Nova Funcionalidade Técnica
- [ ] Atualização de Documentação Técnica
- [ ] Tarefa de Manutenção

## Contexto/Problema (se aplicável)

<!-- Se esta PR resolve um problema ou se relaciona a um contexto específico, descreva aqui. -->

## Como Testar (se aplicável)

<!-- Descreva os passos para testar as mudanças. -->

## Checklist

<!-- Antes de abrir o PR, certifique-se de que: -->
- [ ] Minha nota/código segue as convenções de nomeação e estilo do projeto.
- [ ] Adicionei/atualizei os links internos relevantes.
- [ ] Adicionei/atualizei as tags apropriadas.
- [ ] (Para notas de conhecimento) A informação é precisa e bem fundamentada.
- [ ] (Para mudanças técnicas) Os testes automatizados (se houver) foram executados e passaram.

## Observações para o Revisor

<!-- Qualquer informação adicional que o revisor precise saber. -->
```
