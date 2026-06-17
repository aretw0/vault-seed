---
title: Rotina de Curadoria Editorial
aliases:
  - Curadoria Editorial do Vault
  - Revisão Editorial do Vault
tags:
  - meta/organizacao
  - meta/site
status: published
created: 2026-05-26
updated: 2026-05-26
category: workflow
audience: intermediário
related:
  - "[[Exploracao Guiada do Vault]]"
  - "[[MOC Vault Seed]]"
  - "[[Preparando Dados para o Lab]]"
  - "[[Publicando seu Vault como Site]]"
---

# Rotina de Curadoria Editorial

Esta rotina transforma a organização do vault em um ciclo visível. A ideia não é
obedecer cegamente aos avisos automáticos, mas usar sinais consistentes para
apoiar decisão humana e escolher pequenas melhorias editoriais com alto retorno.

## Quando Rodar

Rode esta rotina quando você:

- publicar ou reclassificar notas;
- mexer em tags, categoria ou público;
- perceber repetição entre onboarding, recursos e documentação técnica;
- preparar uma Proposta de Melhoria;
- quiser decidir qual nota merece expansão, promoção ou conexão.

## Ciclo Recomendado

1. **Verifique a saúde do vault:**

   ```bash
   dgk check
   ```

   Para contribuidores do template, o pipeline completo de qualidade é `pnpm run validate` (dev-only).

2. **Leia os sinais editoriais no terminal:**

   ```bash
   pnpm run audit:ia
   pnpm run site:audit:sidebar
   ```

   `pnpm run audit:ia` avalia cobertura por intenção e candidatas à promoção usando o dataset `curadoria-ia.json`. Use como ponto de partida para a decisão humana sobre o que expandir ou reclassificar.

3. **Abra a exploração pública:**

   ```bash
   pnpm run site:build
   pnpm run site:preview
   ```

   Depois revise `/explorar/`. A seção de curadoria mostra candidatas a promoção,
   recursos curtos e avisos editoriais usando o mesmo contrato da validação. Para
   revisar a cobertura por intenção sem depender de JavaScript, use também
   `/explorar/intencoes/`, que destaca hubs e notas principais por caminho editorial.

4. **Use o Lab quando quiser investigar como dado:**

   ```bash
   dgk etl
   pnpm run site:dev:lab
   ```

   O dataset `curadoria-ia.json` pode ser lido pelo notebook ETL junto com o
   perfil do vault. Isso ajuda a comparar sinais editoriais com tamanho das
   notas, tags, pastas e distribuição por intenção.

5. **Faça uma decisão pequena por vez:**

   - expandir uma nota curta;
   - mover uma nota conceitual para `40 - Recursos/`;
   - ajustar `category`, `audience` ou `tags`;
   - criar links para reduzir órfãs;
   - deixar uma nota onde está quando ela é claramente operacional.

## Como Interpretar os Sinais

| Sinal | O que significa | Ação provável |
| --- | --- | --- |
| Recurso curto | Uma nota publicada em `40 - Recursos/` tem pouco corpo explicativo. | Expandir, fundir ou reclassificar. |
| Candidata a promoção | Uma nota conceitual em `99 - Meta e Anexos/` parece mais perene que operacional. | Avaliar mover para `40 - Recursos/`. |
| Nota órfã | O graph não encontrou links internos resolvidos. | Criar links de contexto ou aceitar como apêndice isolado. |
| Hub | A nota conecta muitos caminhos. | Usar como porta de entrada ou MOC leve. |
| Muitas intenções | A nota aparece em seções demais. | Verificar se tags estão amplas demais. |

## Critério de Boa Curadoria

Uma intervenção boa melhora pelo menos um destes pontos sem criar ruído:

- a nota fica mais fácil de encontrar;
- a sidebar por intenção fica mais coerente;
- o site público explica melhor o vault;
- o Lab ganha dados mais úteis para análise;
- a validação passa com menos aviso recorrente;
- o vault gerado continua enxuto e compreensível.

A curadoria editorial é parte do trabalho de manutenção. Ela deve acumular
clareza, não burocracia.
